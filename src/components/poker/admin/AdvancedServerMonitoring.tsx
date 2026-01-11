/**
 * Advanced Server Monitoring Panel
 * PokerStars-level monitoring with RNG verification, state machine, and performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield,
  Activity,
  Cpu,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Lock,
  Shuffle,
  TrendingUp,
  FileText,
  Database,
  Gauge
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceReport {
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  throughput: {
    actionsPerSecond: number;
    messagesPerSecond: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  bottlenecks: string[];
}

interface RNGComplianceReport {
  reportId: string;
  generatedAt: number;
  totalOperations: number;
  statisticalTests: {
    testName: string;
    passed: boolean;
    pValue: number;
  }[];
  overallCompliance: boolean;
  recommendations: string[];
}

interface StateMachineStats {
  totalTransitions: number;
  invalidAttempts: number;
  currentStates: Record<string, number>;
  recentErrors: string[];
}

export function AdvancedServerMonitoring() {
  const [activeTab, setActiveTab] = useState('performance');
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceReport | null>(null);
  const [rngCompliance, setRngCompliance] = useState<RNGComplianceReport | null>(null);
  const [stateMachine, setStateMachine] = useState<StateMachineStats | null>(null);
  const [actionQueueStats, setActionQueueStats] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vps-api', {
        body: { endpoint: '/api/performance' }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setPerformanceData(data.report);
        setStateMachine(data.stateMachine);
        setActionQueueStats(data.actionQueue);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      toast.error('Ошибка загрузки данных производительности');
    }
    setLoading(false);
  }, []);

  const fetchRNGCompliance = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('vps-api', {
        body: { endpoint: '/api/rng/compliance?period=24' }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setRngCompliance(data.report);
      }
    } catch (err) {
      console.error('Failed to fetch RNG compliance:', err);
    }
  }, []);

  useEffect(() => {
    fetchPerformanceData();
    fetchRNGCompliance();
    
    const interval = setInterval(() => {
      fetchPerformanceData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchPerformanceData, fetchRNGCompliance]);

  const formatLatency = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-green-500';
    if (ms < 150) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              PokerStars-Level Monitoring
              <Badge variant="outline">Pro</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              {lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => { fetchPerformanceData(); fetchRNGCompliance(); }}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Latency
          </TabsTrigger>
          <TabsTrigger value="rng" className="flex items-center gap-1">
            <Shuffle className="h-3 w-3" />
            RNG
          </TabsTrigger>
          <TabsTrigger value="state" className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            States
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Queue
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {performanceData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">P50 Latency</p>
                      <p className={`text-2xl font-bold ${getLatencyColor(performanceData.latency.p50)}`}>
                        {formatLatency(performanceData.latency.p50)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">P95 Latency</p>
                      <p className={`text-2xl font-bold ${getLatencyColor(performanceData.latency.p95)}`}>
                        {formatLatency(performanceData.latency.p95)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">P99 Latency</p>
                      <p className={`text-2xl font-bold ${getLatencyColor(performanceData.latency.p99)}`}>
                        {formatLatency(performanceData.latency.p99)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Actions/sec</p>
                      <p className="text-2xl font-bold text-primary">
                        {performanceData.throughput.actionsPerSecond.toFixed(1)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Memory Usage */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Heap Used</span>
                        <span>{(performanceData.memory.heapUsed / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <Progress 
                        value={(performanceData.memory.heapUsed / performanceData.memory.heapTotal) * 100}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bottlenecks */}
              {performanceData.bottlenecks.length > 0 && (
                <Card className="border-yellow-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-500">
                      <AlertTriangle className="h-4 w-4" />
                      Detected Bottlenecks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {performanceData.bottlenecks.map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading performance data...
            </div>
          )}
        </TabsContent>

        {/* RNG Compliance Tab */}
        <TabsContent value="rng" className="space-y-4">
          {rngCompliance ? (
            <>
              <Card className={rngCompliance.overallCompliance ? 'border-green-500/50' : 'border-red-500/50'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${rngCompliance.overallCompliance ? 'text-green-500' : 'text-red-500'}`} />
                    RNG Compliance Status
                    <Badge variant={rngCompliance.overallCompliance ? 'default' : 'destructive'}>
                      {rngCompliance.overallCompliance ? 'COMPLIANT' : 'NON-COMPLIANT'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {rngCompliance.totalOperations.toLocaleString()} operations in last 24h
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rngCompliance.statisticalTests.map((test, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          {test.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs font-medium">{test.testName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          p-value: {test.pValue.toFixed(4)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {rngCompliance.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {rngCompliance.recommendations.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <Shuffle className="h-5 w-5 animate-spin mr-2" />
              Loading RNG compliance data...
            </div>
          )}
        </TabsContent>

        {/* State Machine Tab */}
        <TabsContent value="state" className="space-y-4">
          {stateMachine ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Transitions</p>
                      <p className="text-2xl font-bold text-primary">
                        {stateMachine.totalTransitions.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Invalid Attempts</p>
                      <p className={`text-2xl font-bold ${stateMachine.invalidAttempts > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {stateMachine.invalidAttempts}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Active Tables</p>
                      <p className="text-2xl font-bold">
                        {Object.keys(stateMachine.currentStates).length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Current Table States
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(stateMachine.currentStates).map(([tableId, state]) => (
                        <div key={tableId} className="p-2 rounded border text-xs">
                          <p className="font-mono truncate">{tableId.slice(0, 8)}...</p>
                          <Badge variant="outline" className="mt-1">{String(state)}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {stateMachine.recentErrors.length > 0 && (
                <Card className="border-red-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      Recent State Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm font-mono">
                      {stateMachine.recentErrors.slice(0, 5).map((e, i) => (
                        <li key={i} className="text-red-400">{e}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Loading state machine data...
            </div>
          )}
        </TabsContent>

        {/* Action Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          {actionQueueStats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Actions</p>
                      <p className="text-2xl font-bold text-primary">
                        {actionQueueStats.totalActions?.toLocaleString() || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Processed</p>
                      <p className="text-2xl font-bold text-green-500">
                        {actionQueueStats.processedActions?.toLocaleString() || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Avg Time</p>
                      <p className="text-2xl font-bold">
                        {formatLatency(actionQueueStats.avgProcessingTime || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Active Queues</p>
                      <p className="text-2xl font-bold">
                        {actionQueueStats.activeQueues || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Queue Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="text-green-500">
                        {actionQueueStats.totalActions > 0 
                          ? ((actionQueueStats.processedActions / actionQueueStats.totalActions) * 100).toFixed(1)
                          : 100}%
                      </span>
                    </div>
                    <Progress 
                      value={actionQueueStats.totalActions > 0 
                        ? (actionQueueStats.processedActions / actionQueueStats.totalActions) * 100 
                        : 100}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Loading queue statistics...
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
