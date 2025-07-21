import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Coffee, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    const defaultLevels = [
      { level: 1, small_blind: 100, big_blind: 200, ante: 200, duration: 1200 },
      { level: 2, small_blind: 200, big_blind: 400, ante: 400, duration: 1200 },
      { level: 3, small_blind: 300, big_blind: 600, ante: 600, duration: 1200 },
      { level: 4, small_blind: 400, big_blind: 800, ante: 800, duration: 1200 },
      { level: 5, small_blind: 500, big_blind: 1000, ante: 1000, duration: 1200 },
      { level: 6, small_blind: 600, big_blind: 1200, ante: 1200, duration: 1200 },
      { level: 7, small_blind: 700, big_blind: 1500, ante: 1500, duration: 1200 },
      { level: 8, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 1200 },
      { level: 9, small_blind: 1500, big_blind: 3000, ante: 3000, duration: 1200 },
      { level: 10, small_blind: 2000, big_blind: 4000, ante: 4000, duration: 1200 },
      { level: 11, small_blind: 3000, big_blind: 6000, ante: 6000, duration: 1200 },
      { level: 12, small_blind: 4000, big_blind: 8000, ante: 8000, duration: 1200 },
      { level: 13, small_blind: 5000, big_blind: 10000, ante: 10000, duration: 1200 },
      { level: 14, small_blind: 6000, big_blind: 12000, ante: 12000, duration: 1200 },
      { level: 15, small_blind: 7000, big_blind: 14000, ante: 14000, duration: 1200 },
      { level: 16, small_blind: 8000, big_blind: 16000, ante: 16000, duration: 1200 },
      { level: 17, small_blind: 10000, big_blind: 20000, ante: 20000, duration: 1200 },
      { level: 18, small_blind: 15000, big_blind: 30000, ante: 30000, duration: 1200 },
      { level: 19, small_blind: 20000, big_blind: 40000, ante: 40000, duration: 1200 }
    ];

    for (const level of defaultLevels) {
      await supabase.from('blind_levels').insert({
        tournament_id: tournamentId,
        ...level
      });
    }

    loadBlindLevels();
    toast({ title: "Успех", description: "Создана стандартная структура блайндов" });
  };

  const addLevel = async () => {
    // Если добавляем перерыв, нужно пересчитать все уровни
    if (newLevel.is_break) {
      // Находим все игровые уровни для определения места вставки
      const gameLevels = blindLevels.filter(l => !l.is_break).sort((a, b) => a.level - b.level);
      
      if (gameLevels.length === 0) {
        toast({ title: "Ошибка", description: "Нельзя добавить перерыв без игровых уровней", variant: "destructive" });
        return;
      }
      
      // Вставляем перерыв после последнего игрового уровня
      const lastGameLevel = gameLevels[gameLevels.length - 1];
      const insertPosition = lastGameLevel.level + 1;
      
      // Сдвигаем все уровни после позиции вставки на 1
      const levelsToUpdate = blindLevels.filter(l => l.level >= insertPosition);
      for (const level of levelsToUpdate) {
        await supabase
          .from('blind_levels')
          .update({ level: level.level + 1 })
          .eq('id', level.id);
      }
      
      // Добавляем перерыв
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
      // Для игрового уровня добавляем в конец
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
    } else {
      // Reorder levels after deletion
      const levelsToUpdate = blindLevels.filter(l => l.level > levelNumber);
      for (const level of levelsToUpdate) {
        await supabase
          .from('blind_levels')
          .update({ level: level.level - 1 })
          .eq('id', level.id);
      }
      
      toast({ title: "Успех", description: "Уровень удален" });
      loadBlindLevels();
    }
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
    // Определяем следующий логический уровень для игровых блайндов
    const gamelevels = blindLevels.filter(l => !l.is_break);
    const lastGameLevel = gamelevels.length > 0 ? gamelevels[gamelevels.length - 1] : null;
    
    let nextBlinds = { small_blind: 100, big_blind: 200 };
    if (lastGameLevel) {
      // Предлагаем следующие логичные блайнды
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

  if (blindLevels.length === 0) {
    return (
      <Card className="bg-white/50 border border-gray-200/50">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="text-gray-600">
              Структура блайндов не создана
            </div>
            <Button onClick={createDefaultStructure} className="bg-gradient-button text-white">
              <Plus className="w-4 h-4 mr-2" />
              Создать стандартную структуру
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Всего уровней: <span className="font-semibold text-gray-800">{blindLevels.length}</span>
          </div>
          <div className="text-sm text-gray-600">
            Общее время: <span className="font-semibold text-gray-800">
              {Math.floor(blindLevels.reduce((acc, level) => acc + level.duration, 0) / 60)} мин
            </span>
          </div>
        </div>
        <Button onClick={openAddDialog} size="sm" className="bg-gradient-button text-white">
          <Plus className="w-4 h-4 mr-2" />
          Добавить уровень
        </Button>
      </div>

      <div className="bg-white/50 rounded-lg border border-gray-200/50 overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm">
              <TableRow className="border-gray-200/50">
                <TableHead className="text-gray-600 font-medium w-20">Уровень</TableHead>
                <TableHead className="text-gray-600 font-medium">Малый блайнд</TableHead>
                <TableHead className="text-gray-600 font-medium">Большой блайнд</TableHead>
                <TableHead className="text-gray-600 font-medium">Анте</TableHead>
                <TableHead className="text-gray-600 font-medium">Длительность</TableHead>
                <TableHead className="text-gray-600 font-medium w-24">Тип</TableHead>
                <TableHead className="text-gray-600 font-medium w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blindLevels.map((level, index) => (
                <TableRow key={level.id} className={`border-gray-200/50 hover:bg-gray-50/50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/20' : 'bg-white/40'}`}>
                  <TableCell className="font-semibold text-gray-800 text-center">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {level.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-700 font-medium">
                    {level.is_break ? '-' : level.small_blind.toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell className="text-gray-700 font-medium">
                    {level.is_break ? '-' : level.big_blind.toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell className="text-gray-700 font-medium">
                    {level.is_break ? '-' : level.ante.toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatTime(level.duration)}
                  </TableCell>
                  <TableCell>
                    {level.is_break ? (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                        <Coffee className="w-3 h-3 mr-1" />
                        Перерыв
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        <Clock className="w-3 h-3 mr-1" />
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
                        className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteLevel(level.id, level.level)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Редактировать уровень' : 'Добавить уровень'}
            </DialogTitle>
            <DialogDescription>
              {editingLevel ? 'Измените параметры уровня блайндов' : 'Создайте новый уровень блайндов или перерыв'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
              <input
                type="checkbox"
                id="is_break"
                checked={newLevel.is_break}
                onChange={(e) => setNewLevel(prev => ({ 
                  ...prev, 
                  is_break: e.target.checked,
                  // При переключении на перерыв устанавливаем длительность 15 минут
                  duration: e.target.checked ? 900 : 1200
                }))}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <Label htmlFor="is_break" className="text-blue-800 font-medium">
                {newLevel.is_break ? '☕ Перерыв' : '🎮 Игровой уровень'}
              </Label>
            </div>

            {!newLevel.is_break && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="small_blind" className="text-sm font-medium text-gray-700">Малый блайнд</Label>
                  <Input
                    id="small_blind"
                    type="number"
                    value={newLevel.small_blind}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      small_blind: parseInt(e.target.value) || 0 
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="big_blind" className="text-sm font-medium text-gray-700">Большой блайнд</Label>
                  <Input
                    id="big_blind"
                    type="number"
                    value={newLevel.big_blind}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setNewLevel(prev => ({ 
                        ...prev, 
                        big_blind: value,
                        ante: value // Анте равно большому блайнду
                      }));
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ante" className="text-sm font-medium text-gray-700">Анте</Label>
                  <Input
                    id="ante"
                    type="number"
                    value={newLevel.ante}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      ante: parseInt(e.target.value) || 0 
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
                Длительность ({newLevel.is_break ? 'перерыва' : 'уровня'})
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="duration"
                  type="number"
                  value={Math.floor(newLevel.duration / 60)}
                  onChange={(e) => setNewLevel(prev => ({ 
                    ...prev, 
                    duration: (parseInt(e.target.value) || 20) * 60 
                  }))}
                  className="flex-1"
                  placeholder="20"
                />
                <span className="text-sm text-gray-500">минут</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Рекомендуется: {newLevel.is_break ? '15' : '20'} минут
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="bg-white/70 border-gray-200"
              >
                Отмена
              </Button>
              <Button
                onClick={editingLevel ? updateLevel : addLevel}
                className="bg-gradient-button text-white"
              >
                {editingLevel ? 'Обновить' : (newLevel.is_break ? 'Добавить перерыв' : 'Добавить уровень')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlindStructure;