/**
 * Alerting System
 * Monitors metrics and sends alerts via webhooks (Slack, Discord, PagerDuty)
 */

import { logger } from './logger.js';
import { prometheusRegistry } from './prometheus-metrics.js';

interface AlertRule {
  name: string;
  metric: string;
  labels?: Record<string, string>;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds the condition must be true
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

interface Alert {
  rule: AlertRule;
  triggeredAt: number;
  resolvedAt?: number;
  notifiedAt?: number;
  value: number;
}

interface WebhookConfig {
  url: string;
  type: 'slack' | 'discord' | 'pagerduty' | 'generic';
  enabled: boolean;
}

class AlertManager {
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private webhooks: WebhookConfig[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private alertHistory: Alert[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    // Critical alerts
    this.addRule({
      name: 'high_memory_usage',
      metric: 'poker_memory_heap_used_bytes',
      condition: 'gt',
      threshold: 800 * 1024 * 1024, // 800MB
      duration: 60,
      severity: 'critical',
      message: 'Memory usage exceeded 800MB - risk of OOM'
    });

    this.addRule({
      name: 'circuit_breaker_open',
      metric: 'poker_circuit_breaker_state',
      labels: { service: 'supabase' },
      condition: 'eq',
      threshold: 1, // OPEN state
      duration: 10,
      severity: 'critical',
      message: 'Database circuit breaker is OPEN - DB connection issues'
    });

    this.addRule({
      name: 'critical_load',
      metric: 'poker_load_level',
      condition: 'eq',
      threshold: 2, // CRITICAL
      duration: 30,
      severity: 'critical',
      message: 'Server under CRITICAL load - degraded mode active'
    });

    // Warning alerts
    this.addRule({
      name: 'high_event_loop_lag',
      metric: 'poker_event_loop_lag_seconds',
      condition: 'gt',
      threshold: 0.1, // 100ms
      duration: 30,
      severity: 'warning',
      message: 'Event loop lag > 100ms - potential performance issues'
    });

    this.addRule({
      name: 'high_message_queue',
      metric: 'poker_message_queue_size',
      condition: 'gt',
      threshold: 1000,
      duration: 60,
      severity: 'warning',
      message: 'Message queue size > 1000 - broadcast backlog'
    });

    this.addRule({
      name: 'many_ws_errors',
      metric: 'poker_websocket_errors_total',
      condition: 'gt',
      threshold: 100,
      duration: 300, // 5 minutes
      severity: 'warning',
      message: 'High WebSocket error rate detected'
    });

    this.addRule({
      name: 'low_active_tables',
      metric: 'poker_active_tables',
      condition: 'eq',
      threshold: 0,
      duration: 300,
      severity: 'info',
      message: 'No active tables - all games finished or server just started'
    });

    // Performance alerts
    this.addRule({
      name: 'slow_hand_evaluation',
      metric: 'poker_hand_evaluation_duration_seconds',
      condition: 'gt',
      threshold: 0.05, // 50ms
      duration: 60,
      severity: 'warning',
      message: 'Hand evaluation taking > 50ms'
    });

    this.addRule({
      name: 'slow_db_queries',
      metric: 'poker_db_query_duration_seconds',
      condition: 'gt',
      threshold: 1, // 1 second
      duration: 60,
      severity: 'warning',
      message: 'Database queries taking > 1 second'
    });
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    logger.info(`Alert rule registered: ${rule.name}`);
  }

  removeRule(name: string): void {
    this.rules = this.rules.filter(r => r.name !== name);
  }

  addWebhook(config: WebhookConfig): void {
    this.webhooks.push(config);
    logger.info(`Webhook added: ${config.type} - ${config.enabled ? 'enabled' : 'disabled'}`);
  }

  start(intervalMs: number = 10000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => this.checkAlerts(), intervalMs);
    logger.info('Alert manager started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Alert manager stopped');
  }

  private checkAlerts(): void {
    const now = Date.now();

    for (const rule of this.rules) {
      const value = prometheusRegistry.getMetricValue(rule.metric, rule.labels);
      
      if (value === null) continue;

      const conditionMet = this.evaluateCondition(value, rule.condition, rule.threshold);
      const alertKey = `${rule.name}:${JSON.stringify(rule.labels || {})}`;
      const existingAlert = this.activeAlerts.get(alertKey);

      if (conditionMet) {
        if (!existingAlert) {
          // New alert
          this.activeAlerts.set(alertKey, {
            rule,
            triggeredAt: now,
            value
          });
        } else if (!existingAlert.notifiedAt) {
          // Check if duration threshold is met
          const durationMet = (now - existingAlert.triggeredAt) >= rule.duration * 1000;
          
          if (durationMet) {
            existingAlert.notifiedAt = now;
            existingAlert.value = value;
            this.sendAlert(existingAlert);
          }
        }
      } else {
        // Condition no longer met
        if (existingAlert) {
          existingAlert.resolvedAt = now;
          
          if (existingAlert.notifiedAt) {
            this.sendResolution(existingAlert);
          }
          
          // Move to history
          this.alertHistory.push(existingAlert);
          if (this.alertHistory.length > this.MAX_HISTORY) {
            this.alertHistory.shift();
          }
          
          this.activeAlerts.delete(alertKey);
        }
      }
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    const message = this.formatAlertMessage(alert, false);
    
    logger.warn(`ALERT [${alert.rule.severity}]: ${alert.rule.name} - ${alert.rule.message}`, {
      value: alert.value,
      threshold: alert.rule.threshold
    });

    for (const webhook of this.webhooks) {
      if (!webhook.enabled) continue;
      
      try {
        await this.sendWebhook(webhook, message, alert.rule.severity);
      } catch (error) {
        logger.error(`Failed to send alert to ${webhook.type}:`, error);
      }
    }
  }

  private async sendResolution(alert: Alert): Promise<void> {
    const message = this.formatAlertMessage(alert, true);
    
    logger.info(`RESOLVED: ${alert.rule.name}`, {
      duration: Math.round((alert.resolvedAt! - alert.triggeredAt) / 1000)
    });

    for (const webhook of this.webhooks) {
      if (!webhook.enabled) continue;
      
      try {
        await this.sendWebhook(webhook, message, 'resolved');
      } catch (error) {
        logger.error(`Failed to send resolution to ${webhook.type}:`, error);
      }
    }
  }

  private formatAlertMessage(alert: Alert, resolved: boolean): string {
    const status = resolved ? '✅ RESOLVED' : this.getSeverityEmoji(alert.rule.severity);
    const duration = resolved 
      ? `Duration: ${Math.round((alert.resolvedAt! - alert.triggeredAt) / 1000)}s`
      : `Triggered: ${new Date(alert.triggeredAt).toISOString()}`;
    
    return `${status} **${alert.rule.name}**
${alert.rule.message}
Value: ${alert.value} (threshold: ${alert.rule.condition} ${alert.rule.threshold})
${duration}`;
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  private async sendWebhook(
    webhook: WebhookConfig, 
    message: string, 
    severity: string
  ): Promise<void> {
    let payload: object;
    
    switch (webhook.type) {
      case 'slack':
        payload = {
          text: message,
          attachments: [{
            color: severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'good'
          }]
        };
        break;
        
      case 'discord':
        payload = {
          content: message,
          embeds: [{
            color: severity === 'critical' ? 0xFF0000 : severity === 'warning' ? 0xFFFF00 : 0x00FF00
          }]
        };
        break;
        
      case 'pagerduty':
        payload = {
          routing_key: webhook.url.split('/').pop(),
          event_action: severity === 'resolved' ? 'resolve' : 'trigger',
          payload: {
            summary: message,
            severity: severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info',
            source: 'poker-server'
          }
        };
        break;
        
      default:
        payload = { message, severity, timestamp: new Date().toISOString() };
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  }

  // Get current alerts for API
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  // Manual alert trigger (for testing or custom alerts)
  triggerManualAlert(
    name: string, 
    message: string, 
    severity: 'info' | 'warning' | 'critical' = 'info'
  ): void {
    const alert: Alert = {
      rule: {
        name,
        metric: 'manual',
        condition: 'eq',
        threshold: 1,
        duration: 0,
        severity,
        message
      },
      triggeredAt: Date.now(),
      notifiedAt: Date.now(),
      value: 1
    };

    this.sendAlert(alert);
  }
}

// Singleton instance
export const alertManager = new AlertManager();
