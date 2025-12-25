import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Edit,
  Coffee,
  Clock,
  Layers,
  Timer,
  Save,
  FolderOpen,
  Zap,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export interface OnlineBlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface OnlineBlindStructureEditorProps {
  blindLevels: OnlineBlindLevel[];
  onBlindLevelsChange: (levels: OnlineBlindLevel[]) => void;
  levelDuration: number;
}

const DEFAULT_STRUCTURES = {
  standard: [
    { level: 1, small_blind: 25, big_blind: 50, ante: 0, duration: 600, is_break: false },
    { level: 2, small_blind: 50, big_blind: 100, ante: 0, duration: 600, is_break: false },
    { level: 3, small_blind: 75, big_blind: 150, ante: 0, duration: 600, is_break: false },
    { level: 4, small_blind: 100, big_blind: 200, ante: 25, duration: 600, is_break: false },
    { level: 5, small_blind: 150, big_blind: 300, ante: 50, duration: 600, is_break: false },
    { level: 6, small_blind: 200, big_blind: 400, ante: 50, duration: 600, is_break: false },
    { level: 7, small_blind: 0, big_blind: 0, ante: 0, duration: 300, is_break: true },
    { level: 8, small_blind: 300, big_blind: 600, ante: 75, duration: 600, is_break: false },
    { level: 9, small_blind: 400, big_blind: 800, ante: 100, duration: 600, is_break: false },
    { level: 10, small_blind: 500, big_blind: 1000, ante: 100, duration: 600, is_break: false },
    { level: 11, small_blind: 600, big_blind: 1200, ante: 150, duration: 600, is_break: false },
    { level: 12, small_blind: 800, big_blind: 1600, ante: 200, duration: 600, is_break: false },
  ],
  turbo: [
    { level: 1, small_blind: 25, big_blind: 50, ante: 0, duration: 300, is_break: false },
    { level: 2, small_blind: 50, big_blind: 100, ante: 0, duration: 300, is_break: false },
    { level: 3, small_blind: 100, big_blind: 200, ante: 25, duration: 300, is_break: false },
    { level: 4, small_blind: 150, big_blind: 300, ante: 50, duration: 300, is_break: false },
    { level: 5, small_blind: 200, big_blind: 400, ante: 50, duration: 300, is_break: false },
    { level: 6, small_blind: 300, big_blind: 600, ante: 75, duration: 300, is_break: false },
    { level: 7, small_blind: 400, big_blind: 800, ante: 100, duration: 300, is_break: false },
    { level: 8, small_blind: 600, big_blind: 1200, ante: 150, duration: 300, is_break: false },
    { level: 9, small_blind: 800, big_blind: 1600, ante: 200, duration: 300, is_break: false },
    { level: 10, small_blind: 1000, big_blind: 2000, ante: 250, duration: 300, is_break: false },
  ],
  hyperTurbo: [
    { level: 1, small_blind: 50, big_blind: 100, ante: 0, duration: 180, is_break: false },
    { level: 2, small_blind: 100, big_blind: 200, ante: 25, duration: 180, is_break: false },
    { level: 3, small_blind: 150, big_blind: 300, ante: 50, duration: 180, is_break: false },
    { level: 4, small_blind: 250, big_blind: 500, ante: 75, duration: 180, is_break: false },
    { level: 5, small_blind: 400, big_blind: 800, ante: 100, duration: 180, is_break: false },
    { level: 6, small_blind: 600, big_blind: 1200, ante: 150, duration: 180, is_break: false },
    { level: 7, small_blind: 1000, big_blind: 2000, ante: 250, duration: 180, is_break: false },
    { level: 8, small_blind: 1500, big_blind: 3000, ante: 400, duration: 180, is_break: false },
  ],
  deepstack: [
    { level: 1, small_blind: 25, big_blind: 50, ante: 0, duration: 900, is_break: false },
    { level: 2, small_blind: 50, big_blind: 100, ante: 0, duration: 900, is_break: false },
    { level: 3, small_blind: 75, big_blind: 150, ante: 0, duration: 900, is_break: false },
    { level: 4, small_blind: 100, big_blind: 200, ante: 25, duration: 900, is_break: false },
    { level: 5, small_blind: 0, big_blind: 0, ante: 0, duration: 600, is_break: true },
    { level: 6, small_blind: 125, big_blind: 250, ante: 25, duration: 900, is_break: false },
    { level: 7, small_blind: 150, big_blind: 300, ante: 50, duration: 900, is_break: false },
    { level: 8, small_blind: 200, big_blind: 400, ante: 50, duration: 900, is_break: false },
    { level: 9, small_blind: 250, big_blind: 500, ante: 75, duration: 900, is_break: false },
    { level: 10, small_blind: 0, big_blind: 0, ante: 0, duration: 600, is_break: true },
    { level: 11, small_blind: 300, big_blind: 600, ante: 75, duration: 900, is_break: false },
    { level: 12, small_blind: 400, big_blind: 800, ante: 100, duration: 900, is_break: false },
  ],
};

export function OnlineBlindStructureEditor({
  blindLevels,
  onBlindLevelsChange,
  levelDuration
}: OnlineBlindStructureEditorProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState<OnlineBlindLevel | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [newLevel, setNewLevel] = useState<OnlineBlindLevel>({
    level: 1,
    small_blind: 100,
    big_blind: 200,
    ante: 0,
    duration: levelDuration,
    is_break: false
  });

  const applyTemplate = (templateName: keyof typeof DEFAULT_STRUCTURES) => {
    const template = DEFAULT_STRUCTURES[templateName];
    onBlindLevelsChange([...template]);
    toast.success(`Применён шаблон: ${
      templateName === 'standard' ? 'Стандарт' :
      templateName === 'turbo' ? 'Турбо' :
      templateName === 'hyperTurbo' ? 'Гипер-турбо' : 'Deepstack'
    }`);
  };

  const addLevel = () => {
    const lastLevel = blindLevels.length > 0 
      ? blindLevels.filter(l => !l.is_break).pop() 
      : null;

    const newBlindLevel: OnlineBlindLevel = lastLevel ? {
      level: blindLevels.length + 1,
      small_blind: Math.round(lastLevel.big_blind),
      big_blind: Math.round(lastLevel.big_blind * 2),
      ante: Math.round(lastLevel.big_blind * 0.25),
      duration: levelDuration,
      is_break: false
    } : {
      level: 1,
      small_blind: 25,
      big_blind: 50,
      ante: 0,
      duration: levelDuration,
      is_break: false
    };

    onBlindLevelsChange([...blindLevels, newBlindLevel]);
    toast.success('Уровень добавлен');
  };

  const addBreak = () => {
    const breakLevel: OnlineBlindLevel = {
      level: blindLevels.length + 1,
      small_blind: 0,
      big_blind: 0,
      ante: 0,
      duration: 300, // 5 min break
      is_break: true
    };

    onBlindLevelsChange([...blindLevels, breakLevel]);
    toast.success('Перерыв добавлен');
  };

  const deleteLevel = (index: number) => {
    const updated = blindLevels.filter((_, i) => i !== index);
    // Renumber levels
    const renumbered = updated.map((level, i) => ({
      ...level,
      level: i + 1
    }));
    onBlindLevelsChange(renumbered);
    toast.success('Уровень удален');
  };

  const openEditDialog = (level: OnlineBlindLevel, index: number) => {
    setEditingLevel(level);
    setEditingIndex(index);
    setNewLevel({ ...level });
    setShowEditDialog(true);
  };

  const saveLevel = () => {
    if (editingIndex >= 0) {
      const updated = [...blindLevels];
      updated[editingIndex] = { ...newLevel };
      onBlindLevelsChange(updated);
      toast.success('Уровень обновлён');
    }
    setShowEditDialog(false);
    setEditingLevel(null);
    setEditingIndex(-1);
  };

  const scaleBlinds = (factor: number) => {
    const scaled = blindLevels.map(level => ({
      ...level,
      small_blind: level.is_break ? 0 : Math.round(level.small_blind * factor),
      big_blind: level.is_break ? 0 : Math.round(level.big_blind * factor),
      ante: level.is_break ? 0 : Math.round(level.ante * factor)
    }));
    onBlindLevelsChange(scaled);
    toast.success(`Блайнды ${factor > 1 ? 'увеличены' : 'уменьшены'} в ${factor > 1 ? factor : (1/factor).toFixed(1)} раз`);
  };

  const scaleTime = (factor: number) => {
    const scaled = blindLevels.map(level => ({
      ...level,
      duration: Math.round(level.duration * factor)
    }));
    onBlindLevelsChange(scaled);
    toast.success(`Время ${factor > 1 ? 'увеличено' : 'уменьшено'}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} мин`;
  };

  const totalDuration = blindLevels.reduce((acc, level) => acc + level.duration, 0);
  const gameLevelsCount = blindLevels.filter(l => !l.is_break).length;
  const breaksCount = blindLevels.filter(l => l.is_break).length;
  const maxBlinds = blindLevels.filter(l => !l.is_break).reduce((max, l) => 
    l.big_blind > max ? l.big_blind : max, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <div className="text-xs text-muted-foreground">Уровни</div>
          <div className="font-bold">{gameLevelsCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <div className="text-xs text-muted-foreground">Перерывы</div>
          <div className="font-bold text-amber-500">{breaksCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <div className="text-xs text-muted-foreground">Время</div>
          <div className="font-bold">{Math.floor(totalDuration / 60)} мин</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <div className="text-xs text-muted-foreground">Макс BB</div>
          <div className="font-bold text-green-500">{maxBlinds.toLocaleString()}</div>
        </div>
      </div>

      {/* Template Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyTemplate('standard')}
        >
          <Layers className="h-3 w-3 mr-1" />
          Стандарт (10 мин)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyTemplate('turbo')}
        >
          <Zap className="h-3 w-3 mr-1" />
          Турбо (5 мин)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyTemplate('hyperTurbo')}
        >
          <Timer className="h-3 w-3 mr-1" />
          Гипер (3 мин)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyTemplate('deepstack')}
        >
          <Download className="h-3 w-3 mr-1" />
          Deepstack (15 мин)
        </Button>
      </div>

      {/* Scale Buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Масштаб:</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => scaleBlinds(0.5)}>
          Блайнды ×0.5
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => scaleBlinds(2)}>
          Блайнды ×2
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => scaleTime(0.5)}>
          Время ×0.5
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => scaleTime(1.5)}>
          Время ×1.5
        </Button>
      </div>

      {/* Levels Table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="h-[250px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ур.</TableHead>
                <TableHead>SB</TableHead>
                <TableHead>BB</TableHead>
                <TableHead>Ante</TableHead>
                <TableHead>Время</TableHead>
                <TableHead className="w-16">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blindLevels.map((level, index) => (
                <TableRow key={index} className={level.is_break ? 'bg-amber-500/10' : ''}>
                  <TableCell className="font-medium">
                    {level.is_break ? (
                      <Badge variant="secondary" className="gap-1">
                        <Coffee className="h-3 w-3" />
                      </Badge>
                    ) : (
                      level.level
                    )}
                  </TableCell>
                  <TableCell>{level.is_break ? '-' : level.small_blind.toLocaleString()}</TableCell>
                  <TableCell>{level.is_break ? '-' : level.big_blind.toLocaleString()}</TableCell>
                  <TableCell>{level.is_break ? '-' : level.ante.toLocaleString()}</TableCell>
                  <TableCell>{formatTime(level.duration)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openEditDialog(level, index)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={() => deleteLevel(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {blindLevels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Выберите шаблон или добавьте уровни вручную
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={addLevel}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить уровень
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addBreak}>
          <Coffee className="h-4 w-4 mr-1" />
          Добавить перерыв
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingLevel?.is_break ? 'Редактировать перерыв' : 'Редактировать уровень'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!newLevel.is_break && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Малый блайнд</Label>
                    <Input
                      type="number"
                      value={newLevel.small_blind}
                      onChange={(e) => setNewLevel(prev => ({ 
                        ...prev, 
                        small_blind: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Большой блайнд</Label>
                    <Input
                      type="number"
                      value={newLevel.big_blind}
                      onChange={(e) => setNewLevel(prev => ({ 
                        ...prev, 
                        big_blind: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Анте</Label>
                  <Input
                    type="number"
                    value={newLevel.ante}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      ante: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Длительность (секунды)</Label>
              <Input
                type="number"
                value={newLevel.duration}
                onChange={(e) => setNewLevel(prev => ({ 
                  ...prev, 
                  duration: parseInt(e.target.value) || 60 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                = {Math.floor(newLevel.duration / 60)} мин {newLevel.duration % 60} сек
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отмена
            </Button>
            <Button onClick={saveLevel}>
              <Save className="h-4 w-4 mr-1" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
