import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText, Database, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function StatsExport() {
  const [exportType, setExportType] = useState('players');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      const getDateFilter = () => {
        if (dateRange === 'all') return null;
        const now = new Date();
        switch (dateRange) {
          case 'today':
            now.setHours(0, 0, 0, 0);
            return now.toISOString();
          case 'week':
            now.setDate(now.getDate() - 7);
            return now.toISOString();
          case 'month':
            now.setMonth(now.getMonth() - 1);
            return now.toISOString();
          default:
            return null;
        }
      };

      const dateFilter = getDateFilter();

      switch (exportType) {
        case 'players':
          headers = ['ID', 'Имя', 'Email', 'Telegram', 'Рейтинг', 'Игр сыграно', 'Побед', 'Создан'];
          const { data: players } = await supabase
            .from('players')
            .select('*')
            .order('elo_rating', { ascending: false });
          
          data = (players || []).map(p => [
            p.id,
            p.name,
            p.email || '',
            p.telegram || '',
            p.elo_rating,
            p.games_played,
            p.wins,
            new Date(p.created_at).toISOString()
          ]);
          filename = 'players';
          break;

        case 'balances':
          headers = ['ID', 'Игрок', 'Баланс', 'Выиграно', 'Проиграно', 'Рук сыграно'];
          const { data: balances } = await supabase
            .from('player_balances')
            .select(`*, players!inner(name)`)
            .order('balance', { ascending: false });
          
          data = (balances || []).map(b => [
            b.player_id,
            (b.players as any)?.name || '',
            b.balance,
            b.total_won,
            b.total_lost,
            b.hands_played
          ]);
          filename = 'balances';
          break;

        case 'hands':
          headers = ['#', 'Стол', 'Фаза', 'Банк', 'Время', 'Завершена'];
          let handsQuery = supabase
            .from('poker_hands')
            .select(`*, poker_tables!inner(name)`)
            .order('created_at', { ascending: false })
            .limit(1000);
          
          if (dateFilter) {
            handsQuery = handsQuery.gte('created_at', dateFilter);
          }
          
          const { data: hands } = await handsQuery;
          
          data = (hands || []).map(h => [
            h.hand_number,
            (h.poker_tables as any)?.name || '',
            h.phase,
            h.pot,
            new Date(h.created_at).toISOString(),
            h.completed_at ? 'Да' : 'Нет'
          ]);
          filename = 'hands';
          break;

        case 'tables':
          headers = ['ID', 'Название', 'Статус', 'SB/BB', 'Min/Max Buy-in', 'Макс игроков', 'Создан'];
          const { data: tables } = await supabase
            .from('poker_tables')
            .select('*')
            .order('created_at', { ascending: false });
          
          data = (tables || []).map(t => [
            t.id,
            t.name,
            t.status,
            `${t.small_blind}/${t.big_blind}`,
            `${t.min_buy_in}-${t.max_buy_in}`,
            t.max_players,
            new Date(t.created_at).toISOString()
          ]);
          filename = 'tables';
          break;

        case 'actions':
          headers = ['Рука', 'Игрок', 'Действие', 'Сумма', 'Фаза', 'Время'];
          let actionsQuery = supabase
            .from('poker_actions')
            .select(`*, players!inner(name)`)
            .order('created_at', { ascending: false })
            .limit(5000);
          
          if (dateFilter) {
            actionsQuery = actionsQuery.gte('created_at', dateFilter);
          }
          
          const { data: actions } = await actionsQuery;
          
          data = (actions || []).map(a => [
            a.hand_id,
            (a.players as any)?.name || '',
            a.action_type,
            a.amount || 0,
            a.phase,
            new Date(a.created_at).toISOString()
          ]);
          filename = 'actions';
          break;
      }

      // Generate CSV
      const csv = [
        headers.join(','),
        ...data.map(row => row.map((cell: any) => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(','))
      ].join('\n');

      // Download
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poker_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Экспортировано ${data.length} записей`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте');
    } finally {
      setLoading(false);
    }
  };

  const exportOptions = [
    { value: 'players', label: 'Игроки', icon: '👤', count: 'все игроки' },
    { value: 'balances', label: 'Балансы', icon: '💰', count: 'все балансы' },
    { value: 'hands', label: 'Раздачи', icon: '🎴', count: 'до 1000' },
    { value: 'tables', label: 'Столы', icon: '🎰', count: 'все столы' },
    { value: 'actions', label: 'Действия', icon: '⚡', count: 'до 5000' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Экспорт данных
        </CardTitle>
        <CardDescription>
          Выгрузка статистики в CSV формате
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Type Selection */}
        <div className="grid gap-3 md:grid-cols-5">
          {exportOptions.map((option) => (
            <button
              key={option.value}
              className={`p-4 rounded-lg border text-left transition-all hover:border-primary ${
                exportType === option.value ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setExportType(option.value)}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.count}</div>
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label>Период:</Label>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всё время</SelectItem>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="week">Последняя неделя</SelectItem>
              <SelectItem value="month">Последний месяц</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-4">
          <Button onClick={handleExport} disabled={loading} size="lg" className="gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {loading ? 'Экспорт...' : 'Скачать CSV'}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Формат: CSV (Excel, Google Sheets)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
