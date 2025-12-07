import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trophy, Coins, Users, Clock, Loader2 } from 'lucide-react';

interface CreateTournamentModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  onCreated: () => void;
}

export function CreateTournamentModal({ open, onClose, playerId, onCreated }: CreateTournamentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    buy_in: 1000,
    starting_chips: 5000,
    max_players: 9,
    min_players: 2,
    level_duration: 300
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Введите название турнира');
      return;
    }

    setLoading(true);
    try {
      // Create tournament
      const { data: tournament, error: createError } = await supabase
        .from('online_poker_tournaments')
        .insert({
          ...formData,
          created_by: playerId
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create default blind structure
      await supabase.rpc('create_tournament_blind_structure', {
        tournament_id_param: tournament.id
      });

      toast.success('Турнир создан!');
      onCreated();
      onClose();
      setFormData({
        name: '',
        description: '',
        buy_in: 1000,
        starting_chips: 5000,
        max_players: 9,
        min_players: 2,
        level_duration: 300
      });
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания турнира');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Создать турнир
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название турнира</Label>
            <Input
              id="name"
              placeholder="Вечерний турнир"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Textarea
              id="description"
              placeholder="Описание турнира..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                Бай-ин
              </Label>
              <Input
                type="number"
                value={formData.buy_in}
                onChange={(e) => setFormData(prev => ({ ...prev, buy_in: parseInt(e.target.value) || 0 }))}
                min={100}
                step={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Начальные фишки</Label>
              <Input
                type="number"
                value={formData.starting_chips}
                onChange={(e) => setFormData(prev => ({ ...prev, starting_chips: parseInt(e.target.value) || 0 }))}
                min={1000}
                step={1000}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Макс. игроков: {formData.max_players}
            </Label>
            <Slider
              value={[formData.max_players]}
              onValueChange={([val]) => setFormData(prev => ({ ...prev, max_players: val }))}
              min={2}
              max={27}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Длительность уровня: {Math.floor(formData.level_duration / 60)} мин
            </Label>
            <Slider
              value={[formData.level_duration]}
              onValueChange={([val]) => setFormData(prev => ({ ...prev, level_duration: val }))}
              min={60}
              max={600}
              step={60}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
