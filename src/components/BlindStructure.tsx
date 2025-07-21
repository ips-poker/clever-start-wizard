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
      { level: 6, small_blind: 600, big_blind: 1200, ante: 1200, duration: 1200, is_break: true },
      { level: 7, small_blind: 700, big_blind: 1500, ante: 1500, duration: 1200 },
      { level: 8, small_blind: 1000, big_blind: 2000, ante: 2000, duration: 1200 },
      { level: 9, small_blind: 1500, big_blind: 3000, ante: 3000, duration: 1200 },
      { level: 10, small_blind: 2000, big_blind: 4000, ante: 4000, duration: 1200 },
      { level: 11, small_blind: 3000, big_blind: 6000, ante: 6000, duration: 1200 },
      { level: 12, small_blind: 4000, big_blind: 8000, ante: 8000, duration: 1200, is_break: true },
      { level: 13, small_blind: 5000, big_blind: 10000, ante: 10000, duration: 1200 },
      { level: 14, small_blind: 6000, big_blind: 12000, ante: 12000, duration: 1200 },
      { level: 15, small_blind: 7000, big_blind: 14000, ante: 14000, duration: 1200 },
      { level: 16, small_blind: 8000, big_blind: 16000, ante: 16000, duration: 1200 },
      { level: 17, small_blind: 10000, big_blind: 20000, ante: 20000, duration: 1200 },
      { level: 18, small_blind: 15000, big_blind: 30000, ante: 30000, duration: 1200, is_break: true },
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
    const nextLevel = Math.max(...blindLevels.map(l => l.level), 0) + 1;
    
    const { error } = await supabase
      .from('blind_levels')
      .insert([{
        tournament_id: tournamentId,
        level: nextLevel,
        ...newLevel
      }]);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось добавить уровень", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Уровень добавлен" });
      setNewLevel({ small_blind: 100, big_blind: 200, ante: 200, duration: 1200, is_break: false });
      setIsDialogOpen(false);
      loadBlindLevels();
    }
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
    setNewLevel({ small_blind: 100, big_blind: 200, ante: 200, duration: 1200, is_break: false });
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
        <div className="text-sm text-gray-600">
          Всего уровней: {blindLevels.length}
        </div>
        <Button onClick={openAddDialog} size="sm" className="bg-gradient-button text-white">
          <Plus className="w-4 h-4 mr-2" />
          Добавить уровень
        </Button>
      </div>

      <div className="bg-white/50 rounded-lg border border-gray-200/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200/50">
              <TableHead className="text-gray-600 font-medium">Уровень</TableHead>
              <TableHead className="text-gray-600 font-medium">Малый блайнд</TableHead>
              <TableHead className="text-gray-600 font-medium">Большой блайнд</TableHead>
              <TableHead className="text-gray-600 font-medium">Анте</TableHead>
              <TableHead className="text-gray-600 font-medium">Длительность</TableHead>
              <TableHead className="text-gray-600 font-medium">Тип</TableHead>
              <TableHead className="text-gray-600 font-medium">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blindLevels.map((level) => (
              <TableRow key={level.id} className="border-gray-200/50 hover:bg-gray-50/50">
                <TableCell className="font-medium text-gray-800">
                  {level.level}
                </TableCell>
                <TableCell className="text-gray-600">
                  {level.is_break ? '-' : level.small_blind.toLocaleString()}
                </TableCell>
                <TableCell className="text-gray-600">
                  {level.is_break ? '-' : level.big_blind.toLocaleString()}
                </TableCell>
                <TableCell className="text-gray-600">
                  {level.is_break ? '-' : level.ante.toLocaleString()}
                </TableCell>
                <TableCell className="text-gray-600">
                  {formatTime(level.duration)}
                </TableCell>
                <TableCell>
                  {level.is_break ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Coffee className="w-3 h-3 mr-1" />
                      Перерыв
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Игра
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => openEditDialog(level)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteLevel(level.id, level.level)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Редактировать уровень' : 'Добавить уровень'}
            </DialogTitle>
            <DialogDescription>
              {editingLevel ? 'Измените параметры уровня блайндов' : 'Создайте новый уровень блайндов или перерыв'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_break"
                checked={newLevel.is_break}
                onChange={(e) => setNewLevel(prev => ({ ...prev, is_break: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_break">Это перерыв</Label>
            </div>

            {!newLevel.is_break && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="small_blind">Малый блайнд</Label>
                  <Input
                    id="small_blind"
                    type="number"
                    value={newLevel.small_blind}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      small_blind: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="big_blind">Большой блайнд</Label>
                  <Input
                    id="big_blind"
                    type="number"
                    value={newLevel.big_blind}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      big_blind: parseInt(e.target.value) || 0,
                      ante: parseInt(e.target.value) || 0 // Анте равно большому блайнду
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ante">Анте</Label>
                  <Input
                    id="ante"
                    type="number"
                    value={newLevel.ante}
                    onChange={(e) => setNewLevel(prev => ({ 
                      ...prev, 
                      ante: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="duration">Длительность (секунды)</Label>
              <Input
                id="duration"
                type="number"
                value={newLevel.duration}
                onChange={(e) => setNewLevel(prev => ({ 
                  ...prev, 
                  duration: parseInt(e.target.value) || 1200 
                }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
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
                {editingLevel ? 'Обновить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlindStructure;