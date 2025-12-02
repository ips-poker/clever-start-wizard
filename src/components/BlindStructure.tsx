import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Coffee, Clock, Layers, Timer, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break?: boolean;
}

interface BlindStructureProps {
  tournamentId: string;
}

const BlindStructure = ({ tournamentId }: BlindStructureProps) => {
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<BlindLevel | null>(null);
  const [newLevel, setNewLevel] = useState({
    small_blind: 100,
    big_blind: 200,
    ante: 200,
    duration: 1200,
    is_break: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBlindLevels();
  }, [tournamentId]);

  const loadBlindLevels = async () => {
    const { data, error } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('level', { ascending: true });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить структуру блайндов", variant: "destructive" });
    } else {
      setBlindLevels(data || []);
    }
  };

  const createDefaultStructure = async () => {
    const { error } = await supabase.rpc('create_default_blind_structure_safe', {
      p_tournament_id: tournamentId
    });

    if (error) {
      toast({ 
        title: "Ошибка", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }

    loadBlindLevels();
    toast({ title: "Успех", description: "Создана стандартная структура блайндов" });
  };

  const addLevel = async () => {
    if (newLevel.is_break) {
      const gameLevels = blindLevels.filter(l => !l.is_break).sort((a, b) => a.level - b.level);
      
      if (gameLevels.length === 0) {
        toast({ title: "Ошибка", description: "Нельзя добавить перерыв без игровых уровней", variant: "destructive" });
        return;
      }
      
      const lastGameLevel = gameLevels[gameLevels.length - 1];
      const insertPosition = lastGameLevel.level + 1;
      
      const levelsToUpdate = blindLevels.filter(l => l.level >= insertPosition);
      for (const level of levelsToUpdate) {
        await supabase
          .from('blind_levels')
          .update({ level: level.level + 1 })
          .eq('id', level.id);
      }
      
      const { error } = await supabase
        .from('blind_levels')
        .insert([{
          tournament_id: tournamentId,
          level: insertPosition,
          ...newLevel
        }]);

      if (error) {
        toast({ title: "Ошибка", description: "Не удалось добавить перерыв", variant: "destructive" });
        return;
      }
    } else {
      const maxLevel = Math.max(...blindLevels.map(l => l.level), 0);
      
      const { error } = await supabase
        .from('blind_levels')
        .insert([{
          tournament_id: tournamentId,
          level: maxLevel + 1,
          ...newLevel
        }]);

      if (error) {
        toast({ title: "Ошибка", description: "Не удалось добавить уровень", variant: "destructive" });
        return;
      }
    }

    toast({ 
      title: "Успех", 
      description: newLevel.is_break ? "Перерыв добавлен" : "Уровень добавлен" 
    });
    setNewLevel({ small_blind: 100, big_blind: 200, ante: 200, duration: 1200, is_break: false });
    setIsDialogOpen(false);
    loadBlindLevels();
  };

  const updateLevel = async () => {
    if (!editingLevel) return;

    const { error } = await supabase
      .from('blind_levels')
      .update({
        small_blind: newLevel.small_blind,
        big_blind: newLevel.big_blind,
        ante: newLevel.ante,
        duration: newLevel.duration,
        is_break: newLevel.is_break
      })
      .eq('id', editingLevel.id);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить уровень", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Уровень обновлен" });
      setEditingLevel(null);
      setIsDialogOpen(false);
      loadBlindLevels();
    }
  };

  const deleteLevel = async (levelId: string, levelNumber: number) => {
    const { error } = await supabase
      .from('blind_levels')
      .delete()
      .eq('id', levelId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить уровень", variant: "destructive" });
      return;
    }

    const levelsToUpdate = blindLevels.filter(l => l.level > levelNumber);
    for (const level of levelsToUpdate) {
      await supabase
        .from('blind_levels')
        .update({ level: level.level - 1 })
        .eq('id', level.id);
    }
    
    toast({ title: "Успех", description: "Уровень удален" });
    loadBlindLevels();
  };

  const openEditDialog = (level: BlindLevel) => {
    setEditingLevel(level);
    setNewLevel({
      small_blind: level.small_blind,
      big_blind: level.big_blind,
      ante: level.ante,
      duration: level.duration,
      is_break: level.is_break || false
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingLevel(null);
    const gamelevels = blindLevels.filter(l => !l.is_break);
    const lastGameLevel = gamelevels.length > 0 ? gamelevels[gamelevels.length - 1] : null;
    
    let nextBlinds = { small_blind: 100, big_blind: 200 };
    if (lastGameLevel) {
      const factor = lastGameLevel.big_blind >= 1000 ? 1.5 : 2;
      nextBlinds = {
        small_blind: Math.round(lastGameLevel.small_blind * factor),
        big_blind: Math.round(lastGameLevel.big_blind * factor)
      };
    }
    
    setNewLevel({ 
      ...nextBlinds, 
      ante: nextBlinds.big_blind, 
      duration: 1200, 
      is_break: false 
    });
    setIsDialogOpen(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} мин`;
  };

  const totalDuration = blindLevels.reduce((acc, level) => acc + level.duration, 0);
  const gameLevelsCount = blindLevels.filter(l => !l.is_break).length;
  const breaksCount = blindLevels.filter(l => l.is_break).length;

  if (blindLevels.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card brutal-border">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <Layers className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Структура блайндов не создана</h3>
                <p className="text-muted-foreground text-sm">
                  Создайте стандартную структуру или добавьте уровни вручную
                </p>
              </div>
              <Button 
                onClick={createDefaultStructure} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать стандартную структуру
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card brutal-border overflow-hidden">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Структура блайндов</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {gameLevelsCount} уровней
                    </span>
                    <span className="flex items-center gap-1">
                      <Coffee className="w-4 h-4" />
                      {breaksCount} перерывов
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-4 h-4" />
                      {Math.floor(totalDuration / 60)} мин
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={openAddDialog} 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить уровень
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Уровни</div>
                <div className="text-xl font-bold text-foreground">{gameLevelsCount}</div>
              </div>
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Перерывы</div>
                <div className="text-xl font-bold text-amber-500">{breaksCount}</div>
              </div>
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Общее время</div>
                <div className="text-xl font-bold text-primary">{Math.floor(totalDuration / 60)} мин</div>
              </div>
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Макс. блайнды</div>
                <div className="text-xl font-bold text-green-500">
                  {Math.max(...blindLevels.filter(l => !l.is_break).map(l => l.big_blind)).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-background/30 rounded-lg border border-border/50 overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/90 backdrop-blur-sm z-10">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-medium w-20">Уровень</TableHead>
                      <TableHead className="text-muted-foreground font-medium">SB</TableHead>
                      <TableHead className="text-muted-foreground font-medium">BB</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Анте</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Время</TableHead>
                      <TableHead className="text-muted-foreground font-medium w-28">Тип</TableHead>
                      <TableHead className="text-muted-foreground font-medium w-24">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {blindLevels.map((level, index) => (
                        <motion.tr
                          key={level.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.02 }}
                          className={`border-border/30 hover:bg-primary/5 transition-colors ${
                            level.is_break ? 'bg-amber-500/10' : index % 2 === 0 ? 'bg-background/20' : 'bg-background/40'
                          }`}
                        >
                          <TableCell className="font-semibold text-center">
                            <Badge 
                              variant="outline" 
                              className={`${level.is_break 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                                : 'bg-primary/20 text-primary border-primary/50'}`}
                            >
                              {level.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground font-medium">
                            {level.is_break ? '-' : level.small_blind.toLocaleString('ru-RU')}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">
                            {level.is_break ? '-' : level.big_blind.toLocaleString('ru-RU')}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">
                            {level.is_break ? '-' : level.ante.toLocaleString('ru-RU')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTime(level.duration)}
                          </TableCell>
                          <TableCell>
                            {level.is_break ? (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                                <Coffee className="w-3 h-3 mr-1" />
                                Перерыв
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                <Zap className="w-3 h-3 mr-1" />
                                Игра
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => openEditDialog(level)}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-primary/20 text-primary"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => deleteLevel(level.id, level.level)}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-destructive/20 text-destructive"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {editingLevel ? (
                <>
                  <Edit className="w-5 h-5 text-primary" />
                  Редактировать уровень
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-primary" />
                  Добавить уровень
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingLevel ? 'Измените параметры уровня блайндов' : 'Создайте новый уровень блайндов или перерыв'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg border border-border/50">
              <input
                type="checkbox"
                id="is_break"
                checked={newLevel.is_break}
                onChange={(e) => setNewLevel(prev => ({ 
                  ...prev, 
                  is_break: e.target.checked,
                  duration: e.target.checked ? 900 : 1200
                }))}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <Label htmlFor="is_break" className="text-foreground font-medium flex items-center gap-2">
                {newLevel.is_break ? (
                  <>
                    <Coffee className="w-4 h-4 text-amber-500" />
                    Перерыв
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-green-500" />
                    Игровой уровень
                  </>
                )}
              </Label>
            </div>

            {!newLevel.is_break && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="small_blind" className="text-sm font-medium text-muted-foreground">Малый блайнд</Label>
                  <Input
                    id="small_blind"
                    type="number"
                    value={newLevel.small_blind}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      small_blind: parseInt(e.target.value) || 0 
                    }))}
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="big_blind" className="text-sm font-medium text-muted-foreground">Большой блайнд</Label>
                  <Input
                    id="big_blind"
                    type="number"
                    value={newLevel.big_blind}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setNewLevel(prev => ({ 
                        ...prev, 
                        big_blind: value,
                        ante: value
                      }));
                    }}
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="ante" className="text-sm font-medium text-muted-foreground">Анте</Label>
                  <Input
                    id="ante"
                    type="number"
                    value={newLevel.ante}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      ante: parseInt(e.target.value) || 0 
                    }))}
                    className="mt-1 bg-background border-border text-foreground"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="duration" className="text-sm font-medium text-muted-foreground">
                Длительность ({newLevel.is_break ? 'перерыва' : 'уровня'})
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="duration"
                  type="number"
                  value={Math.floor(newLevel.duration / 60)}
                  onChange={(e) => setNewLevel(prev => ({ 
                    ...prev, 
                    duration: (parseInt(e.target.value) || 0) * 60 
                  }))}
                  className="bg-background border-border text-foreground"
                />
                <span className="text-muted-foreground text-sm">минут</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-border text-foreground hover:bg-background"
              >
                Отмена
              </Button>
              <Button 
                onClick={editingLevel ? updateLevel : addLevel}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {editingLevel ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlindStructure;
