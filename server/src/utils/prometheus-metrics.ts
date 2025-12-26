/**
 * Prometheus-compatible Metrics Exporter
 * Professional-grade metrics for monitoring and alerting
 */

interface MetricValue {
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface Histogram {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  labels: Record<string, string>;
}

class PrometheusRegistry {
  private counters: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue[]> = new Map();
  private histograms: Map<string, Histogram[]> = new Map();
  private summaries: Map<string, number[]> = new Map();
  
  private metricHelp: Map<string, string> = new Map();
  private metricTypes: Map<string, 'counter' | 'gauge' | 'histogram' | 'summary'> = new Map();

  constructor() {
    this.registerDefaultMetrics();
  }

  private registerDefaultMetrics(): void {
    // Poker-specific metrics
    this.registerMetric('poker_active_tables', 'gauge', 'Number of active poker tables');
    this.registerMetric('poker_active_players', 'gauge', 'Number of connected players');
    this.registerMetric('poker_active_tournaments', 'gauge', 'Number of running tournaments');
    this.registerMetric('poker_hands_dealt_total', 'counter', 'Total number of hands dealt');
    this.registerMetric('poker_hands_completed_total', 'counter', 'Total number of hands completed');
    this.registerMetric('poker_actions_total', 'counter', 'Total player actions by type');
    this.registerMetric('poker_pots_won_total', 'counter', 'Total chips won in pots');
    
    // Performance metrics
    this.registerMetric('poker_hand_evaluation_duration_seconds', 'histogram', 'Hand evaluation duration');
    this.registerMetric('poker_action_processing_duration_seconds', 'histogram', 'Action processing duration');
    this.registerMetric('poker_broadcast_duration_seconds', 'histogram', 'State broadcast duration');
    this.registerMetric('poker_db_query_duration_seconds', 'histogram', 'Database query duration');
    
    // Connection metrics
    this.registerMetric('poker_websocket_connections_total', 'counter', 'Total WebSocket connections');
    this.registerMetric('poker_websocket_disconnections_total', 'counter', 'Total WebSocket disconnections');
    this.registerMetric('poker_websocket_errors_total', 'counter', 'Total WebSocket errors');
    this.registerMetric('poker_websocket_messages_received_total', 'counter', 'Total messages received');
    this.registerMetric('poker_websocket_messages_sent_total', 'counter', 'Total messages sent');
    
    // System metrics
    this.registerMetric('poker_memory_heap_used_bytes', 'gauge', 'Heap memory used');
    this.registerMetric('poker_memory_heap_total_bytes', 'gauge', 'Total heap memory');
    this.registerMetric('poker_memory_external_bytes', 'gauge', 'External memory');
    this.registerMetric('poker_memory_rss_bytes', 'gauge', 'Resident set size');
    this.registerMetric('poker_cpu_usage_percent', 'gauge', 'CPU usage percentage');
    this.registerMetric('poker_event_loop_lag_seconds', 'gauge', 'Event loop lag');
    
    // Circuit breaker metrics
    this.registerMetric('poker_circuit_breaker_state', 'gauge', 'Circuit breaker state (0=closed, 1=open, 2=half-open)');
    this.registerMetric('poker_circuit_breaker_failures_total', 'counter', 'Circuit breaker failure count');
    
    // Load manager metrics
    this.registerMetric('poker_load_level', 'gauge', 'Current load level (0=normal, 1=high, 2=critical)');
    this.registerMetric('poker_spectators_disconnected_total', 'counter', 'Spectators disconnected due to load');
    
    // Message queue metrics
    this.registerMetric('poker_message_queue_size', 'gauge', 'Current message queue size');
    this.registerMetric('poker_message_queue_processed_total', 'counter', 'Total messages processed');
    
    // Object pool metrics
    this.registerMetric('poker_object_pool_size', 'gauge', 'Object pool size by type');
    this.registerMetric('poker_object_pool_acquired', 'counter', 'Objects acquired from pool');
    this.registerMetric('poker_object_pool_released', 'counter', 'Objects released to pool');
    
    // Worker pool metrics
    this.registerMetric('poker_worker_pool_active', 'gauge', 'Active workers');
    this.registerMetric('poker_worker_pool_queue_size', 'gauge', 'Worker queue size');
    this.registerMetric('poker_worker_tasks_completed_total', 'counter', 'Total worker tasks completed');
  }

  private registerMetric(name: string, type: 'counter' | 'gauge' | 'histogram' | 'summary', help: string): void {
    this.metricHelp.set(name, help);
    this.metricTypes.set(name, type);
  }

  // Counter operations
  incCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, []);
    }
    
    const metrics = this.counters.get(name)!;
    const labelKey = JSON.stringify(labels);
    const existing = metrics.find(m => JSON.stringify(m.labels) === labelKey);
    
    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      metrics.push({ value, timestamp: Date.now(), labels });
    }
  }

  // Gauge operations
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, []);
    }
    
    const metrics = this.gauges.get(name)!;
    const labelKey = JSON.stringify(labels);
    const existing = metrics.find(m => JSON.stringify(m.labels) === labelKey);
    
    if (existing) {
      existing.value = value;
      existing.timestamp = Date.now();
    } else {
      metrics.push({ value, timestamp: Date.now(), labels });
    }
  }

  incGauge(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getGaugeValue(name, labels);
    this.setGauge(name, current + value, labels);
  }

  decGauge(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getGaugeValue(name, labels);
    this.setGauge(name, Math.max(0, current - value), labels);
  }

  private getGaugeValue(name: string, labels: Record<string, string>): number {
    const metrics = this.gauges.get(name);
    if (!metrics) return 0;
    
    const labelKey = JSON.stringify(labels);
    const existing = metrics.find(m => JSON.stringify(m.labels) === labelKey);
    return existing?.value ?? 0;
  }

  // Histogram operations
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    
    const histograms = this.histograms.get(name)!;
    const labelKey = JSON.stringify(labels);
    let histogram = histograms.find(h => JSON.stringify(h.labels) === labelKey);
    
    if (!histogram) {
      histogram = {
        buckets: [
          { le: 0.001, count: 0 },
          { le: 0.005, count: 0 },
          { le: 0.01, count: 0 },
          { le: 0.025, count: 0 },
          { le: 0.05, count: 0 },
          { le: 0.1, count: 0 },
          { le: 0.25, count: 0 },
          { le: 0.5, count: 0 },
          { le: 1, count: 0 },
          { le: 2.5, count: 0 },
          { le: 5, count: 0 },
          { le: 10, count: 0 },
          { le: Infinity, count: 0 }
        ],
        sum: 0,
        count: 0,
        labels
      };
      histograms.push(histogram);
    }
    
    histogram.sum += value;
    histogram.count++;
    
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  // Timer helper
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e9; // Convert to seconds
    };
  }

  // Update system metrics
  updateSystemMetrics(): void {
    const memory = process.memoryUsage();
    this.setGauge('poker_memory_heap_used_bytes', memory.heapUsed);
    this.setGauge('poker_memory_heap_total_bytes', memory.heapTotal);
    this.setGauge('poker_memory_external_bytes', memory.external);
    this.setGauge('poker_memory_rss_bytes', memory.rss);
    
    // CPU usage (approximate)
    const cpuUsage = process.cpuUsage();
    const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.setGauge('poker_cpu_usage_percent', totalCpu);
  }

  // Export in Prometheus format
  export(): string {
    this.updateSystemMetrics();
    
    const lines: string[] = [];
    
    // Export counters
    for (const [name, metrics] of this.counters) {
      const help = this.metricHelp.get(name) || '';
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} counter`);
      
      for (const metric of metrics) {
        const labelStr = this.formatLabels(metric.labels);
        lines.push(`${name}${labelStr} ${metric.value}`);
      }
    }
    
    // Export gauges
    for (const [name, metrics] of this.gauges) {
      const help = this.metricHelp.get(name) || '';
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} gauge`);
      
      for (const metric of metrics) {
        const labelStr = this.formatLabels(metric.labels);
        lines.push(`${name}${labelStr} ${metric.value}`);
      }
    }
    
    // Export histograms
    for (const [name, histograms] of this.histograms) {
      const help = this.metricHelp.get(name) || '';
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} histogram`);
      
      for (const histogram of histograms) {
        const baseLabels = this.formatLabels(histogram.labels);
        
        for (const bucket of histogram.buckets) {
          const le = bucket.le === Infinity ? '+Inf' : bucket.le.toString();
          const bucketLabels = histogram.labels 
            ? `{${Object.entries(histogram.labels).map(([k, v]) => `${k}="${v}"`).join(',')},le="${le}"}`
            : `{le="${le}"}`;
          lines.push(`${name}_bucket${bucketLabels} ${bucket.count}`);
        }
        
        lines.push(`${name}_sum${baseLabels} ${histogram.sum}`);
        lines.push(`${name}_count${baseLabels} ${histogram.count}`);
      }
    }
    
    return lines.join('\n');
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  // Get specific metric value (for alerting)
  getMetricValue(name: string, labels: Record<string, string> = {}): number | null {
    const labelKey = JSON.stringify(labels);
    
    const counter = this.counters.get(name)?.find(m => JSON.stringify(m.labels) === labelKey);
    if (counter) return counter.value;
    
    const gauge = this.gauges.get(name)?.find(m => JSON.stringify(m.labels) === labelKey);
    if (gauge) return gauge.value;
    
    return null;
  }

  // Reset all metrics (for testing)
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }
}

// Singleton instance
export const prometheusRegistry = new PrometheusRegistry();

// Convenience functions
export const metrics = {
  // Counters
  incHandsDealt: () => prometheusRegistry.incCounter('poker_hands_dealt_total'),
  incHandsCompleted: () => prometheusRegistry.incCounter('poker_hands_completed_total'),
  incAction: (type: string) => prometheusRegistry.incCounter('poker_actions_total', 1, { action: type }),
  incPotsWon: (amount: number) => prometheusRegistry.incCounter('poker_pots_won_total', amount),
  incWsConnections: () => prometheusRegistry.incCounter('poker_websocket_connections_total'),
  incWsDisconnections: () => prometheusRegistry.incCounter('poker_websocket_disconnections_total'),
  incWsErrors: () => prometheusRegistry.incCounter('poker_websocket_errors_total'),
  incWsMessagesReceived: () => prometheusRegistry.incCounter('poker_websocket_messages_received_total'),
  incWsMessagesSent: (count: number = 1) => prometheusRegistry.incCounter('poker_websocket_messages_sent_total', count),
  incCircuitBreakerFailures: (service: string) => prometheusRegistry.incCounter('poker_circuit_breaker_failures_total', 1, { service }),
  incSpectatorsDisconnected: () => prometheusRegistry.incCounter('poker_spectators_disconnected_total'),
  
  // Gauges
  setActiveTables: (count: number) => prometheusRegistry.setGauge('poker_active_tables', count),
  setActivePlayers: (count: number) => prometheusRegistry.setGauge('poker_active_players', count),
  setActiveTournaments: (count: number) => prometheusRegistry.setGauge('poker_active_tournaments', count),
  setCircuitBreakerState: (service: string, state: number) => 
    prometheusRegistry.setGauge('poker_circuit_breaker_state', state, { service }),
  setLoadLevel: (level: number) => prometheusRegistry.setGauge('poker_load_level', level),
  setMessageQueueSize: (size: number) => prometheusRegistry.setGauge('poker_message_queue_size', size),
  setEventLoopLag: (lag: number) => prometheusRegistry.setGauge('poker_event_loop_lag_seconds', lag),
  setObjectPoolSize: (type: string, size: number) => 
    prometheusRegistry.setGauge('poker_object_pool_size', size, { type }),
  setWorkerPoolActive: (count: number) => prometheusRegistry.setGauge('poker_worker_pool_active', count),
  setWorkerQueueSize: (size: number) => prometheusRegistry.setGauge('poker_worker_pool_queue_size', size),
  
  // Histograms
  observeHandEvaluation: (duration: number) => 
    prometheusRegistry.observeHistogram('poker_hand_evaluation_duration_seconds', duration),
  observeActionProcessing: (duration: number) => 
    prometheusRegistry.observeHistogram('poker_action_processing_duration_seconds', duration),
  observeBroadcast: (duration: number) => 
    prometheusRegistry.observeHistogram('poker_broadcast_duration_seconds', duration),
  observeDbQuery: (duration: number, operation: string) => 
    prometheusRegistry.observeHistogram('poker_db_query_duration_seconds', duration, { operation }),
  
  // Timer helper
  startTimer: () => prometheusRegistry.startTimer(),
  
  // Export
  export: () => prometheusRegistry.export(),
  
  // Get value (for alerting)
  getValue: (name: string, labels?: Record<string, string>) => 
    prometheusRegistry.getMetricValue(name, labels)
};
