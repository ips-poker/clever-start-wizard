import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Coffee, 
  Save, 
  Loader2,
  ChevronUp,
  ChevronDown,
  Copy
} from 'lucide-react';

interface BlindLevel {
  id?: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface ClubBlindStructureProps {
  tournamentId: string;
  currentLevel?: number;
  onUpdate?: () => void;
}

export function ClubBlindStructure({ tournamentId, currentLevel = 1, onUpdate }: ClubBlindStructureProps) {
  const { toast } = useToast();
  const [levels, setLevels] = useState<BlindLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load blind levels
  useEffect(() => {
    loadLevels();
  }, [tournamentId]);

  const loadLevels = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('level', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setLevels(data);
      } else {
        // Create default structure
        setLevels(getDefaultLevels());
      }
    } catch (error) {
      console.error('Error loading levels:', error);
      setLevels(getDefaultLevels());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultLevels = (): BlindLevel[] => [
    { level: 1, small_blind: 25, big_blind: 50, ante: 0, duration: 900, is_break: false },
    { level: 2, small_blind: 50, big_blind: 100, ante: 0, duration: 900, is_break: false },
    { level: 3, small_blind: 75, big_blind: 150, ante: 0, duration: 900, is_break: false },
    { level: 4, small_blind: 100, big_blind: 200, ante: 25, duration: 900, is_break: false },
    { level: 5, small_blind: 0, big_blind: 0, ante: 0, duration: 600, is_break: true },
    { level: 6, small_blind: 150, big_blind: 300, ante: 50, duration: 900, is_break: false },
    { level: 7, small_blind: 200, big_blind: 400, ante: 50, duration: 900, is_break: false },
    { level: 8, small_blind: 300, big_blind: 600, ante: 75, duration: 900, is_break: false },
    { level: 9, small_blind: 400, big_blind: 800, ante: 100, duration: 900, is_break: false },
    { level: 10, small_blind: 0, big_blind: 0, ante: 0, duration: 600, is_break: true },
    { level: 11, small_blind: 500, big_blind: 1000, ante: 100, duration: 900, is_break: false },
    { level: 12, small_blind: 600, big_blind: 1200, ante: 200, duration: 900, is_break: false },
  ];

  const updateLevel = (index: number, field: keyof BlindLevel, value: any) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
  };

  const addLevel = (isBreak: boolean = false) => {
    const lastLevel = levels[levels.length - 1];
    const newLevel: BlindLevel = {
      level: levels.length + 1,
      small_blind: isBreak ? 0 : (lastLevel?.big_blind || 0) * 1.5,
      big_blind: isBreak ? 0 : (lastLevel?.big_blind || 0) * 2,
      ante: isBreak ? 0 : Math.round((lastLevel?.ante || 0) * 1.5),
      duration: isBreak ? 600 : 900,
      is_break: isBreak
    };
    setLevels([...levels, newLevel]);
  };

  const removeLevel = (index: number) => {
    if (levels.length <= 1) return;
    const newLevels = levels.filter((_, i) => i !== index);
    // Renumber levels
    newLevels.forEach((level, i) => level.level = i + 1);
    setLevels(newLevels);
  };

  const moveLevel = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === levels.length - 1) return;

    const newLevels = [...levels];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLevels[index], newLevels[swapIndex]] = [newLevels[swapIndex], newLevels[index]];
    // Renumber levels
    newLevels.forEach((level, i) => level.level = i + 1);
    setLevels(newLevels);
  };

  const saveLevels = async () => {
    setIsSaving(true);
    try {
      // Delete existing levels
      await supabase
        .from('blind_levels')
        .delete()
        .eq('tournament_id', tournamentId);

      // Insert new levels
      const { error } = await supabase
        .from('blind_levels')
        .insert(levels.map(level => ({
          tournament_id: tournamentId,
          level: level.level,
          small_blind: level.small_blind,
          big_blind: level.big_blind,
          ante: level.ante || 0,
          duration: level.duration,
          is_break: level.is_break
        })));

      if (error) throw error;

      toast({ title: "Структура блайндов сохранена" });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving levels:', error);
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} мин`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Структура блайндов
        </CardTitle>
        <CardDescription>
          {levels.length} уровней • {levels.filter(l => l.is_break).length} перерывов
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level List */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {levels.map((level, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${
                level.is_break 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : level.level === currentLevel 
                    ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                    : 'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 text-center">
                  <Badge variant={level.is_break ? "secondary" : level.level === currentLevel ? "default" : "outline"}>
                    {level.level}
                  </Badge>
                </div>

                {level.is_break ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-amber-500">Перерыв</span>
                    <Input
                      type="number"
                      value={Math.floor(level.duration / 60)}
                      onChange={(e) => updateLevel(index, 'duration', parseInt(e.target.value) * 60)}
                      className="w-16 h-8 text-center"
                    />
                    <span className="text-sm text-muted-foreground">мин</span>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">SB</Label>
                      <Input
                        type="number"
                        value={level.small_blind}
                        onChange={(e) => updateLevel(index, 'small_blind', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">BB</Label>
                      <Input
                        type="number"
                        value={level.big_blind}
                        onChange={(e) => updateLevel(index, 'big_blind', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Анте</Label>
                      <Input
                        type="number"
                        value={level.ante}
                        onChange={(e) => updateLevel(index, 'ante', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Время</Label>
                      <Input
                        type="number"
                        value={Math.floor(level.duration / 60)}
                        onChange={(e) => updateLevel(index, 'duration', parseInt(e.target.value) * 60)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveLevel(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveLevel(index, 'down')}
                    disabled={index === levels.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeLevel(index)}
                    disabled={levels.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => addLevel(false)}>
            <Plus className="w-4 h-4 mr-1" />
            Добавить уровень
          </Button>
          <Button variant="outline" size="sm" onClick={() => addLevel(true)}>
            <Coffee className="w-4 h-4 mr-1" />
            Добавить перерыв
          </Button>
          <Button 
            className="ml-auto" 
            onClick={saveLevels}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
