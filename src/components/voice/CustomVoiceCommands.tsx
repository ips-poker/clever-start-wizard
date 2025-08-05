import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mic2, Plus, Trash2, Edit, Clock } from 'lucide-react';

interface CustomCommand {
  id: string;
  trigger: string;
  action_type: 'timer' | 'announcement' | 'tournament';
  response_text: string;
  timer_value?: number;
  is_active: boolean;
}

interface TimeInterval {
  id: string;
  name: string;
  seconds: number;
  message: string;
  is_active: boolean;
}

export function CustomVoiceCommands() {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [intervals, setIntervals] = useState<TimeInterval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isIntervalDialogOpen, setIsIntervalDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  const [editingInterval, setEditingInterval] = useState<TimeInterval | null>(null);

  // Form state for commands
  const [formData, setFormData] = useState({
    trigger: '',
    action_type: 'announcement' as CustomCommand['action_type'],
    response_text: '',
    timer_value: 0
  });

  // Form state for intervals
  const [intervalFormData, setIntervalFormData] = useState({
    name: '',
    seconds: 60,
    message: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load custom commands
      const { data: commandsData } = await supabase
        .from('voice_custom_commands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load time intervals
      const { data: intervalsData } = await supabase
        .from('voice_time_intervals')
        .select('*')
        .eq('user_id', user.id)
        .order('seconds', { ascending: false });

      setCommands(commandsData || []);
      setIntervals(intervalsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки пользовательских команд');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCommand = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const commandData = {
        trigger: formData.trigger.toLowerCase(),
        action_type: formData.action_type,
        response_text: formData.response_text,
        timer_value: formData.action_type === 'timer' ? formData.timer_value : null,
        is_active: true,
        user_id: user.id
      };

      if (editingCommand) {
        await supabase
          .from('voice_custom_commands')
          .update(commandData)
          .eq('id', editingCommand.id);
        toast.success('Команда обновлена');
      } else {
        await supabase
          .from('voice_custom_commands')
          .insert([commandData]);
        toast.success('Команда добавлена');
      }

      setIsDialogOpen(false);
      setEditingCommand(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving command:', error);
      toast.error('Ошибка сохранения команды');
    }
  };

  const saveInterval = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const intervalData = {
        name: intervalFormData.name,
        seconds: intervalFormData.seconds,
        message: intervalFormData.message,
        is_active: true,
        user_id: user.id
      };

      if (editingInterval) {
        await supabase
          .from('voice_time_intervals')
          .update(intervalData)
          .eq('id', editingInterval.id);
        toast.success('Интервал обновлен');
      } else {
        await supabase
          .from('voice_time_intervals')
          .insert([intervalData]);
        toast.success('Интервал добавлен');
      }

      setIsIntervalDialogOpen(false);
      setEditingInterval(null);
      resetIntervalForm();
      loadData();
    } catch (error) {
      console.error('Error saving interval:', error);
      toast.error('Ошибка сохранения интервала');
    }
  };

  const deleteCommand = async (id: string) => {
    try {
      await supabase
        .from('voice_custom_commands')
        .delete()
        .eq('id', id);
      
      toast.success('Команда удалена');
      loadData();
    } catch (error) {
      console.error('Error deleting command:', error);
      toast.error('Ошибка удаления команды');
    }
  };

  const deleteInterval = async (id: string) => {
    try {
      await supabase
        .from('voice_time_intervals')
        .delete()
        .eq('id', id);
      
      toast.success('Интервал удален');
      loadData();
    } catch (error) {
      console.error('Error deleting interval:', error);
      toast.error('Ошибка удаления интервала');
    }
  };

  const resetForm = () => {
    setFormData({
      trigger: '',
      action_type: 'announcement',
      response_text: '',
      timer_value: 0
    });
  };

  const resetIntervalForm = () => {
    setIntervalFormData({
      name: '',
      seconds: 60,
      message: ''
    });
  };

  const editCommand = (command: CustomCommand) => {
    setEditingCommand(command);
    setFormData({
      trigger: command.trigger,
      action_type: command.action_type,
      response_text: command.response_text,
      timer_value: command.timer_value || 0
    });
    setIsDialogOpen(true);
  };

  const editInterval = (interval: TimeInterval) => {
    setEditingInterval(interval);
    setIntervalFormData({
      name: interval.name,
      seconds: interval.seconds,
      message: interval.message
    });
    setIsIntervalDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Commands Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic2 className="h-5 w-5" />
              Пользовательские команды
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetForm(); setEditingCommand(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить команду
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCommand ? 'Редактировать команду' : 'Новая голосовая команда'}
                  </DialogTitle>
                  <DialogDescription>
                    Создайте собственную голосовую команду для управления таймером или объявлений
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="trigger">Команда активации</Label>
                    <Input
                      id="trigger"
                      value={formData.trigger}
                      onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                      placeholder="например: остановить таймер"
                    />
                  </div>
                  <div>
                    <Label htmlFor="action_type">Тип действия</Label>
                    <select
                      id="action_type"
                      value={formData.action_type}
                      onChange={(e) => setFormData({ ...formData, action_type: e.target.value as CustomCommand['action_type'] })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="announcement">Объявление</option>
                      <option value="timer">Управление таймером</option>
                      <option value="tournament">Управление турниром</option>
                    </select>
                  </div>
                  {formData.action_type === 'timer' && (
                    <div>
                      <Label htmlFor="timer_value">Значение времени (секунды)</Label>
                      <Input
                        id="timer_value"
                        type="number"
                        value={formData.timer_value}
                        onChange={(e) => setFormData({ ...formData, timer_value: parseInt(e.target.value) })}
                        placeholder="300"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="response_text">Текст ответа</Label>
                    <Textarea
                      id="response_text"
                      value={formData.response_text}
                      onChange={(e) => setFormData({ ...formData, response_text: e.target.value })}
                      placeholder="Таймер остановлен"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={saveCommand}>
                      {editingCommand ? 'Обновить' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {commands.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Пользовательские команды не настроены
            </div>
          ) : (
            <div className="space-y-3">
              {commands.map((command) => (
                <div key={command.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">"{command.trigger}"</span>
                      <Badge variant="outline">
                        {command.action_type === 'timer' ? 'Таймер' : 
                         command.action_type === 'announcement' ? 'Объявление' : 'Турнир'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{command.response_text}</p>
                    {command.timer_value && (
                      <p className="text-xs text-blue-600">Время: {command.timer_value} сек</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => editCommand(command)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteCommand(command.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Intervals Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Временные интервалы
            </CardTitle>
            <Dialog open={isIntervalDialogOpen} onOpenChange={setIsIntervalDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetIntervalForm(); setEditingInterval(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить интервал
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingInterval ? 'Редактировать интервал' : 'Новый временной интервал'}
                  </DialogTitle>
                  <DialogDescription>
                    Настройте дополнительные временные предупреждения
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="interval_name">Название интервала</Label>
                    <Input
                      id="interval_name"
                      value={intervalFormData.name}
                      onChange={(e) => setIntervalFormData({ ...intervalFormData, name: e.target.value })}
                      placeholder="За 3 минуты до окончания"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interval_seconds">Время (секунды)</Label>
                    <Input
                      id="interval_seconds"
                      type="number"
                      value={intervalFormData.seconds}
                      onChange={(e) => setIntervalFormData({ ...intervalFormData, seconds: parseInt(e.target.value) })}
                      placeholder="180"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interval_message">Сообщение</Label>
                    <Textarea
                      id="interval_message"
                      value={intervalFormData.message}
                      onChange={(e) => setIntervalFormData({ ...intervalFormData, message: e.target.value })}
                      placeholder="Внимание! До окончания уровня осталось 3 минуты."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsIntervalDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={saveInterval}>
                      {editingInterval ? 'Обновить' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {intervals.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Дополнительные временные интервалы не настроены
            </div>
          ) : (
            <div className="space-y-3">
              {intervals.map((interval) => (
                <div key={interval.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{interval.name}</span>
                      <Badge variant="outline">{interval.seconds} сек</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{interval.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => editInterval(interval)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteInterval(interval.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}