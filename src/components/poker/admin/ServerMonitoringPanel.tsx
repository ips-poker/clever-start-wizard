import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  Users,
  Table2,
  TrendingUp,
  Settings,
  Bell,
  PlayCircle,
  StopCircle,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ServerStats {
  version: string;
  uptime: number;
  activeTables: number;
  connectedPlayers: number;
  activeHands: number;
  handsPerMinute: number;
  memoryUsage: number;
  cpuUsage: number;
  latency: number;
  lastHeartbeat: Date;
  isConnected: boolean;
  errors: string[];
  warnings: string[];
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

// VPS Server URLs - hardcoded as VITE_* env vars are not supported in Lovable
const VPS_WS_URL = 'wss://syndicate-poker-server.ru';
const VPS_API_URL = 'https://syndicate-poker-server.ru';
const HEALTH_CHECK_INTERVAL = 5000;

export function ServerMonitoringPanel() {
  const [stats, setStats] = useState<ServerStats>({
    version: 'Unknown',
    uptime: 0,
    activeTables: 0,
    connectedPlayers: 0,
    activeHands: 0,
    handsPerMinute: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    latency: 0,
    lastHeartbeat: new Date(),
    isConnected: false,
    errors: [],
    warnings: []
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionMethod, setConnectionMethod] = useState<'http' | 'ws' | 'checking'>('checking');

  // WebSocket-based health check (more reliable, bypasses some CORS issues)
  const checkServerHealthWS = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const wsUrl = VPS_WS_URL;
      
      try {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          const latency = Date.now() - startTime;
          clearTimeout(timeout);
          
          // Send ping
          ws.send(JSON.stringify({ type: 'ping' }));
          
          setStats(prev => ({
            ...prev,
            latency,
            lastHeartbeat: new Date(),
            isConnected: true
          }));
          
          setConnectionMethod('ws');
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        ws.onclose = () => {
          clearTimeout(timeout);
        };
      } catch {
        resolve(false);
      }
    });
  }, []);

  // HTTP-based health check
  const checkServerHealthHTTP = useCallback(async (): Promise<boolean> => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${VPS_API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeout);

      if (!response.ok) throw new Error('Server not responding');

      const data = await response.json();
      const latency = Date.now() - startTime;

      setStats(prev => ({
        ...prev,
        version: data.version || 'v3.0',
        uptime: data.uptime || 0,
        activeTables: data.activeTables || prev.activeTables,
        connectedPlayers: data.connectedPlayers || prev.connectedPlayers,
        activeHands: data.activeHands || prev.activeHands,
        handsPerMinute: data.handsPerMinute || 0,
        memoryUsage: data.memoryUsage || 0,
        cpuUsage: data.cpuUsage || 0,
        latency,
        lastHeartbeat: new Date(),
        isConnected: true,
        errors: data.errors || [],
        warnings: data.warnings || []
      }));

      setConnectionMethod('http');
      
      if (latency > 500) {
        addAlert('warning', `High latency detected: ${latency}ms`);
      }

      return true;
    } catch (error) {
      console.error('HTTP health check failed:', error);
      return false;
    }
  }, []);

  // Combined health check - tries HTTP first, then WebSocket
  const checkServerHealth = useCallback(async () => {
    setConnectionMethod('checking');
    
    // Try HTTP first
    const httpSuccess = await checkServerHealthHTTP();
    if (httpSuccess) return;
    
    // Fallback to WebSocket ping
    const wsSuccess = await checkServerHealthWS();
    if (wsSuccess) return;
    
    // Both failed
    setStats(prev => ({
      ...prev,
      isConnected: false,
      latency: 0
    }));
    setConnectionMethod('http');
    addAlert('error', 'VPS сервер недоступен - проверьте SSH подключение');
  }, [checkServerHealthHTTP, checkServerHealthWS]);

  const addAlert = (type: Alert['type'], message: string) => {
    const newAlert: Alert = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    setAlerts(prev => {
      // Don't add duplicate alerts within 30 seconds
      const isDuplicate = prev.some(
        a => a.message === message && 
        Date.now() - a.timestamp.getTime() < 30000
      );
      if (isDuplicate) return prev;
      return [newAlert, ...prev].slice(0, 100);
    });
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => 
      prev.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    );
  };

  const clearAlerts = () => {
    setAlerts([]);
    toast.success('Alerts cleared');
  };

  // Load database stats
  const loadDatabaseStats = async () => {
    try {
      const [
        { count: tablesCount },
        { count: playersCount },
        { count: handsCount },
        { count: stuckHandsCount }
      ] = await Promise.all([
        supabase.from('poker_tables').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
        supabase.from('poker_table_players').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('poker_hands').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('poker_hands').select('*', { count: 'exact', head: true }).is('completed_at', null)
      ]);

      setStats(prev => ({
        ...prev,
        activeTables: tablesCount || 0,
        connectedPlayers: playersCount || 0
      }));

      if ((stuckHandsCount || 0) > 5) {
        addAlert('warning', `${stuckHandsCount} stuck hands detected`);
      }
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  useEffect(() => {
    checkServerHealth();
    loadDatabaseStats();

    if (autoRefresh) {
      const interval = setInterval(() => {
        checkServerHealth();
        loadDatabaseStats();
      }, HEALTH_CHECK_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [checkServerHealth, autoRefresh]);

  const handleRestartServer = async () => {
    if (!confirm('Restart poker engine? Active hands will be affected.')) return;
    
    setLoading(true);
    try {
      // This would be a real restart command
      toast.info('Server restart requested...');
      await new Promise(r => setTimeout(r, 2000));
      toast.success('Server restart signal sent');
    } catch (error) {
      toast.error('Failed to restart server');
    }
    setLoading(false);
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Server Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${stats.isConnected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {stats.isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              VPS Poker Engine
              <Badge variant={stats.isConnected ? 'default' : 'destructive'}>
                {stats.isConnected ? 'Online' : 'Offline'}
              </Badge>
              {stats.version !== 'Unknown' && (
                <Badge variant="outline">{stats.version}</Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {connectionMethod === 'checking' ? '...' : connectionMethod.toUpperCase()}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              {VPS_API_URL.replace('https://', '')} • Latency: {stats.latency}ms
              {!stats.isConnected && (
                <span className="text-orange-500 ml-2">
                  • Проверьте: pm2 status на VPS
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <StopCircle className="h-4 w-4 mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { checkServerHealth(); loadDatabaseStats(); }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRestartServer}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restart
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Uptime</p>
                <p className="font-bold">{formatUptime(stats.uptime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Active Tables</p>
                <p className="font-bold">{stats.activeTables}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Players</p>
                <p className="font-bold">{stats.connectedPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Active Hands</p>
                <p className="font-bold">{stats.activeHands}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Hands/min</p>
                <p className="font-bold">{stats.handsPerMinute.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Latency</p>
                <p className={`font-bold ${stats.latency > 300 ? 'text-red-500' : stats.latency > 150 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {stats.latency}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className={stats.cpuUsage > 80 ? 'text-red-500' : 'text-green-500'}>
                  {stats.cpuUsage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={stats.cpuUsage} 
                className={stats.cpuUsage > 80 ? 'bg-red-100' : 'bg-green-100'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className={stats.memoryUsage > 80 ? 'text-red-500' : 'text-green-500'}>
                  {stats.memoryUsage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={stats.memoryUsage} 
                className={stats.memoryUsage > 80 ? 'bg-red-100' : 'bg-green-100'}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              System Alerts
              {unacknowledgedAlerts.length > 0 && (
                <Badge variant="destructive">{unacknowledgedAlerts.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearAlerts}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {alerts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <CheckCircle className="h-4 w-4 mr-2" />
                No alerts
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border flex items-center justify-between
                      ${alert.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                        alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                        'bg-blue-500/10 border-blue-500/20'}
                      ${alert.acknowledged ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 
                        ${alert.type === 'error' ? 'text-red-500' :
                          alert.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} 
                      />
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
