import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ResultFilter = 'all' | 'won' | 'lost' | 'folded';
export type SortOption = 'newest' | 'oldest' | 'biggest_pot' | 'biggest_win';

interface HandHistoryFiltersProps {
  resultFilter: ResultFilter;
  onResultFilterChange: (filter: ResultFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalHands: number;
  filteredCount: number;
  className?: string;
}

export function HandHistoryFilters({
  resultFilter,
  onResultFilterChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  totalHands,
  filteredCount,
  className
}: HandHistoryFiltersProps) {
  const resultButtons: { value: ResultFilter; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'all', label: 'Все', icon: null, color: 'bg-slate-600' },
    { value: 'won', label: 'Выигрыши', icon: <TrendingUp className="w-3 h-3" />, color: 'bg-green-600' },
    { value: 'lost', label: 'Проигрыши', icon: <TrendingDown className="w-3 h-3" />, color: 'bg-red-600' },
    { value: 'folded', label: 'Фолды', icon: <Minus className="w-3 h-3" />, color: 'bg-slate-500' }
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and Sort Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру руки..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onSearchChange('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="oldest">Сначала старые</SelectItem>
            <SelectItem value="biggest_pot">Большой банк</SelectItem>
            <SelectItem value="biggest_win">Большой выигрыш</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Result Filter Buttons */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1">
          {resultButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={resultFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onResultFilterChange(btn.value)}
              className={cn(
                'h-7 text-xs gap-1',
                resultFilter === btn.value && btn.color
              )}
            >
              {btn.icon}
              {btn.label}
            </Button>
          ))}
        </div>
        
        {filteredCount !== totalHands && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {filteredCount} из {totalHands}
          </Badge>
        )}
      </div>
    </div>
  );
}
