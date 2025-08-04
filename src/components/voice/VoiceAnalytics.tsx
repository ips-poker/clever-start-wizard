import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, Mic, Clock } from 'lucide-react';

interface VoiceCommand {
  id: string;
  command: string;
  success: boolean;
  created_at: string;
  execution_time_ms: number;
}

interface VoiceAnalyticsProps {
  tournamentId?: string;
}

export function VoiceAnalytics({ tournamentId }: VoiceAnalyticsProps) {
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVoiceCommands();
  }, [tournamentId]);

  const fetchVoiceCommands = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('voice_commands_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCommands(data || []);
    } catch (error) {
      console.error('Error fetching voice commands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const commandStats = commands.reduce((acc, cmd) => {
    acc[cmd.command] = (acc[cmd.command] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(commandStats).map(([command, count]) => ({
    command: command.replace('_', ' '),
    count
  }));

  const successRate = commands.length > 0 
    ? Math.round((commands.filter(c => c.success).length / commands.length) * 100)
    : 0;

  const avgExecutionTime = commands.length > 0
    ? Math.round(commands.reduce((sum, c) => sum + (c.execution_time_ms || 0), 0) / commands.length)
    : 0;

  const pieData = [
    { name: 'Успешные', value: commands.filter(c => c.success).length, color: '#10b981' },
    { name: 'Ошибки', value: commands.filter(c => !c.success).length, color: '#ef4444' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Аналитика голосового управления</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Загрузка аналитики...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div className="text-2xl font-bold">{commands.length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Всего команд</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">{successRate}%</div>
            </div>
            <p className="text-xs text-muted-foreground">Успешность</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="text-2xl font-bold">{avgExecutionTime}ms</div>
            </div>
            <p className="text-xs text-muted-foreground">Среднее время</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-purple-500" />
              <div className="text-2xl font-bold">{Object.keys(commandStats).length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Типов команд</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График популярности команд */}
        <Card>
          <CardHeader>
            <CardTitle>Популярность команд</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="command" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Диаграмма успешности */}
        <Card>
          <CardHeader>
            <CardTitle>Соотношение успех/ошибки</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Последние команды */}
      <Card>
        <CardHeader>
          <CardTitle>Последние команды</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {commands.slice(0, 10).map((command) => (
              <div key={command.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={command.success ? "default" : "destructive"}>
                    {command.success ? "Успех" : "Ошибка"}
                  </Badge>
                  <span className="font-medium">{command.command.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {command.execution_time_ms && (
                    <span>{command.execution_time_ms}ms</span>
                  )}
                  <span>{new Date(command.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}