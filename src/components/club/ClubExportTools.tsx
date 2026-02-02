import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  Trophy,
  BarChart3,
  Loader2,
  Table
} from 'lucide-react';

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    elo_rating: number;
  };
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  seat_number: number | null;
  final_position: number | null;
}

interface Tournament {
  id: string;
  name: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  starting_chips: number;
}

interface ClubExportToolsProps {
  tournament: Tournament | null;
  registrations: Registration[];
}

export function ClubExportTools({ tournament, registrations }: ClubExportToolsProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Generate CSV content
  const generateCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h] ?? '';
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export registrations list
  const exportRegistrations = () => {
    if (!tournament || registrations.length === 0) {
      toast({ title: "Нет данных для экспорта", variant: "destructive" });
      return;
    }

    const data = registrations.map((r, index) => ({
      '№': index + 1,
      'Имя': r.player.name,
      'Статус': r.status === 'playing' ? 'Активен' : r.status === 'eliminated' ? 'Выбыл' : 'Зарегистрирован',
      'Фишки': r.chips,
      'Re-entry': r.reentries,
      'Add-on': r.additional_sets,
      'Стол-Место': r.seat_number ? `Стол ${Math.ceil(r.seat_number / 9)}-${((r.seat_number - 1) % 9) + 1}` : '—',
      'RPS': r.player.elo_rating
    }));

    generateCSV(data, ['№', 'Имя', 'Статус', 'Фишки', 'Re-entry', 'Add-on', 'Стол-Место', 'RPS'], 
      `${tournament.name}_registrations_${new Date().toISOString().split('T')[0]}`);

    toast({ title: "Список регистраций экспортирован" });
  };

  // Export results
  const exportResults = () => {
    if (!tournament) {
      toast({ title: "Турнир не выбран", variant: "destructive" });
      return;
    }

    const finishedPlayers = registrations
      .filter(r => r.final_position)
      .sort((a, b) => (a.final_position || 0) - (b.final_position || 0));

    if (finishedPlayers.length === 0) {
      toast({ title: "Нет результатов для экспорта", variant: "destructive" });
      return;
    }

    const data = finishedPlayers.map(r => ({
      'Место': r.final_position,
      'Имя': r.player.name,
      'Re-entry': r.reentries,
      'Add-on': r.additional_sets,
      'RPS': r.player.elo_rating
    }));

    generateCSV(data, ['Место', 'Имя', 'Re-entry', 'Add-on', 'RPS'], 
      `${tournament.name}_results_${new Date().toISOString().split('T')[0]}`);

    toast({ title: "Результаты экспортированы" });
  };

  // Export financial summary
  const exportFinancialSummary = () => {
    if (!tournament || registrations.length === 0) {
      toast({ title: "Нет данных для экспорта", variant: "destructive" });
      return;
    }

    const totalReentries = registrations.reduce((sum, r) => sum + r.reentries, 0);
    const totalAddons = registrations.reduce((sum, r) => sum + r.additional_sets, 0);
    
    const participationTotal = registrations.length * tournament.participation_fee;
    const reentryTotal = totalReentries * tournament.reentry_fee;
    const addonTotal = totalAddons * tournament.additional_fee;
    const grandTotal = participationTotal + reentryTotal + addonTotal;

    const data = [
      { 'Категория': 'Регистрации', 'Количество': registrations.length, 'Ставка': tournament.participation_fee, 'Сумма': participationTotal },
      { 'Категория': 'Re-entry', 'Количество': totalReentries, 'Ставка': tournament.reentry_fee, 'Сумма': reentryTotal },
      { 'Категория': 'Add-on', 'Количество': totalAddons, 'Ставка': tournament.additional_fee, 'Сумма': addonTotal },
      { 'Категория': 'ИТОГО', 'Количество': '', 'Ставка': '', 'Сумма': grandTotal }
    ];

    generateCSV(data, ['Категория', 'Количество', 'Ставка', 'Сумма'], 
      `${tournament.name}_financial_${new Date().toISOString().split('T')[0]}`);

    toast({ title: "Финансовый отчёт экспортирован" });
  };

  // Export seating chart
  const exportSeating = () => {
    if (!tournament) {
      toast({ title: "Турнир не выбран", variant: "destructive" });
      return;
    }

    const seatedPlayers = registrations
      .filter(r => r.seat_number && r.status !== 'eliminated')
      .sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));

    if (seatedPlayers.length === 0) {
      toast({ title: "Нет данных рассадки", variant: "destructive" });
      return;
    }

    const data = seatedPlayers.map(r => {
      const tableNum = Math.ceil(r.seat_number! / 9);
      const seatNum = ((r.seat_number! - 1) % 9) + 1;
      return {
        'Стол': tableNum,
        'Место': seatNum,
        'Имя': r.player.name,
        'Фишки': r.chips,
        'BB': Math.round(r.chips / tournament.starting_chips * 100)
      };
    });

    generateCSV(data, ['Стол', 'Место', 'Имя', 'Фишки', 'BB'], 
      `${tournament.name}_seating_${new Date().toISOString().split('T')[0]}`);

    toast({ title: "Схема рассадки экспортирована" });
  };

  // Calculate stats
  const activePlayers = registrations.filter(r => r.status === 'playing').length;
  const totalReentries = registrations.reduce((sum, r) => sum + r.reentries, 0);
  const totalAddons = registrations.reduce((sum, r) => sum + r.additional_sets, 0);
  const prizePool = tournament 
    ? (registrations.length * tournament.participation_fee) + 
      (totalReentries * tournament.reentry_fee) + 
      (totalAddons * tournament.additional_fee)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="w-5 h-5 text-primary" />
          Экспорт данных
        </CardTitle>
        <CardDescription>
          Выгрузка статистики и списков в CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{registrations.length}</p>
            <p className="text-xs text-muted-foreground">Регистраций</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{activePlayers}</p>
            <p className="text-xs text-muted-foreground">Активных</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{totalReentries + totalAddons}</p>
            <p className="text-xs text-muted-foreground">Доп. входов</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{prizePool.toLocaleString()}₽</p>
            <p className="text-xs text-muted-foreground">Призовой</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={exportRegistrations}
            disabled={!tournament || registrations.length === 0}
            className="h-16 flex-col"
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs">Список регистраций</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={exportResults}
            disabled={!tournament}
            className="h-16 flex-col"
          >
            <Trophy className="w-5 h-5 mb-1" />
            <span className="text-xs">Результаты</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={exportSeating}
            disabled={!tournament}
            className="h-16 flex-col"
          >
            <Table className="w-5 h-5 mb-1" />
            <span className="text-xs">Схема рассадки</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={exportFinancialSummary}
            disabled={!tournament || registrations.length === 0}
            className="h-16 flex-col"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Финансовый отчёт</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Файлы экспортируются в формате CSV (Excel, Google Sheets)
        </p>
      </CardContent>
    </Card>
  );
}
