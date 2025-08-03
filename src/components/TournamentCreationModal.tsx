import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  DollarSign, 
  PlayCircle,
  UserPlus,
  Repeat,
  Plus,
  Timer,
  Target,
  AlertCircle,
  Settings,
  Coins,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TournamentCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentCreated: () => void;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

export default function TournamentCreationModal({ 
  open, 
  onOpenChange, 
  onTournamentCreated 
}: TournamentCreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  // Основные настройки турнира
  const [basicForm, setBasicForm] = useState({
    name: '',
    description: '',
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // Через час
    max_players: 9,
    tournament_format: 'freezeout'
  });

  // Финансовые настройки
  const [financialForm, setFinancialForm] = useState({
    buy_in: 1000,
    starting_chips: 10000,
    rebuy_cost: 1000,
    rebuy_chips: 10000,
    addon_cost: 1500,
    addon_chips: 15000,
    rebuy_end_level: 6,
    addon_level: 7
  });

  // Настройки структуры
  const [structureForm, setStructureForm] = useState({
    timer_duration: 1200, // 20 минут
    break_start_level: 4,
    break_duration: 10, // 10 минут
    starting_small_blind: 10,
    starting_big_blind: 20,
    blind_increase_type: 'standard' // standard, turbo, hyper
  });

  // Настройки блайндов по умолчанию
  const getDefaultBlindStructure = () => {
    const blinds = [];
    let smallBlind = structureForm.starting_small_blind;
    let bigBlind = structureForm.starting_big_blind;
    
    for (let level = 1; level <= 20; level++) {
      blinds.push({
        level,
        small_blind: smallBlind,
        big_blind: bigBlind,
        ante: level >= 3 ? Math.round(smallBlind / 5) : 0,
        duration: structureForm.timer_duration,
        is_break: level === structureForm.break_start_level || 
                 (level > structureForm.break_start_level && (level - structureForm.break_start_level) % 4 === 0)
      });

      // Увеличение блайндов
      if (structureForm.blind_increase_type === 'turbo') {
        smallBlind = Math.round(smallBlind * 2);
        bigBlind = Math.round(bigBlind * 2);
      } else if (structureForm.blind_increase_type === 'hyper') {
        smallBlind = Math.round(smallBlind * 2.5);
        bigBlind = Math.round(bigBlind * 2.5);
      } else {
        smallBlind = Math.round(smallBlind * 1.5);
        bigBlind = Math.round(bigBlind * 1.5);
      }
    }
    
    return blinds;
  };

  const createTournament = async () => {
    if (!basicForm.name.trim()) {
      toast({ title: "Ошибка", description: "Введите название турнира", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      // Создаем турнир
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: basicForm.name,
          description: basicForm.description,
          start_time: basicForm.start_time,
          max_players: basicForm.max_players,
          tournament_format: basicForm.tournament_format,
          buy_in: financialForm.buy_in,
          starting_chips: financialForm.starting_chips,
          rebuy_cost: financialForm.rebuy_cost,
          rebuy_chips: financialForm.rebuy_chips,
          addon_cost: financialForm.addon_cost,
          addon_chips: financialForm.addon_chips,
          rebuy_end_level: financialForm.rebuy_end_level,
          addon_level: financialForm.addon_level,
          break_start_level: structureForm.break_start_level,
          timer_duration: structureForm.timer_duration,
          current_small_blind: structureForm.starting_small_blind,
          current_big_blind: structureForm.starting_big_blind,
          status: 'scheduled'
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Создаем структуру блайндов
      const blindStructure = getDefaultBlindStructure();
      const blindsToInsert = blindStructure.map(blind => ({
        ...blind,
        tournament_id: tournament.id
      }));

      const { error: blindsError } = await supabase
        .from('blind_levels')
        .insert(blindsToInsert);

      if (blindsError) throw blindsError;

      toast({ title: "Успех", description: "Турнир создан успешно!" });
      onTournamentCreated();
      onOpenChange(false);
      
      // Сброс форм
      setBasicForm({
        name: '',
        description: '',
        start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
        max_players: 9,
        tournament_format: 'freezeout'
      });
      setActiveTab('basic');
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось создать турнир", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-blue-600" />
            Создание нового турнира
          </DialogTitle>
          <DialogDescription>
            Настройте параметры турнира. Все настройки можно изменить позже.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Финансы
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Структура
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Итоги
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Основные настройки
                </CardTitle>
                <CardDescription>
                  Название, описание и основные параметры турнира
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название турнира *</Label>
                    <Input
                      id="name"
                      placeholder="Weekly Poker Tournament"
                      value={basicForm.name}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_players">Максимум игроков</Label>
                    <Select
                      value={basicForm.max_players.toString()}
                      onValueChange={(value) => setBasicForm(prev => ({ ...prev, max_players: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 игроков</SelectItem>
                        <SelectItem value="9">9 игроков</SelectItem>
                        <SelectItem value="18">18 игроков</SelectItem>
                        <SelectItem value="27">27 игроков</SelectItem>
                        <SelectItem value="36">36 игроков</SelectItem>
                        <SelectItem value="54">54 игрока</SelectItem>
                        <SelectItem value="81">81 игрок</SelectItem>
                        <SelectItem value="108">108 игроков</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    placeholder="Еженедельный турнир для игроков всех уровней"
                    value={basicForm.description}
                    onChange={(e) => setBasicForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Время начала</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={basicForm.start_time}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="format">Формат турнира</Label>
                    <Select
                      value={basicForm.tournament_format}
                      onValueChange={(value) => setBasicForm(prev => ({ ...prev, tournament_format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freezeout">Freezeout (без ребаев)</SelectItem>
                        <SelectItem value="rebuy">Rebuy (с ребаями)</SelectItem>
                        <SelectItem value="rebuy_addon">Rebuy + Addon</SelectItem>
                        <SelectItem value="sit_and_go">Sit & Go</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Финансовые настройки
                </CardTitle>
                <CardDescription>
                  Настройка бай-инов, ребаев и аддонов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy_in">Бай-ин (₽)</Label>
                    <Input
                      id="buy_in"
                      type="number"
                      value={financialForm.buy_in}
                      onChange={(e) => setFinancialForm(prev => ({ ...prev, buy_in: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="starting_chips">Стартовые фишки</Label>
                    <Input
                      id="starting_chips"
                      type="number"
                      value={financialForm.starting_chips}
                      onChange={(e) => setFinancialForm(prev => ({ ...prev, starting_chips: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                {basicForm.tournament_format !== 'freezeout' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Repeat className="w-4 h-4" />
                        Настройки ребаев
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rebuy_cost">Стоимость ребая (₽)</Label>
                          <Input
                            id="rebuy_cost"
                            type="number"
                            value={financialForm.rebuy_cost}
                            onChange={(e) => setFinancialForm(prev => ({ ...prev, rebuy_cost: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rebuy_chips">Фишки за ребай</Label>
                          <Input
                            id="rebuy_chips"
                            type="number"
                            value={financialForm.rebuy_chips}
                            onChange={(e) => setFinancialForm(prev => ({ ...prev, rebuy_chips: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rebuy_end_level">Последний уровень ребаев</Label>
                          <Input
                            id="rebuy_end_level"
                            type="number"
                            value={financialForm.rebuy_end_level}
                            onChange={(e) => setFinancialForm(prev => ({ ...prev, rebuy_end_level: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {basicForm.tournament_format === 'rebuy_addon' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Настройки аддонов
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="addon_cost">Стоимость аддона (₽)</Label>
                          <Input
                            id="addon_cost"
                            type="number"
                            value={financialForm.addon_cost}
                            onChange={(e) => setFinancialForm(prev => ({ ...prev, addon_cost: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addon_chips">Фишки за аддон</Label>
                          <Input
                            id="addon_chips"
                            type="number"
                            value={financialForm.addon_chips}
                            onChange={(e) => setFinancialForm(prev => ({ ...prev, addon_chips: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addon_level">Уровень аддона</Label>
                          <Input
                            id="addon_level"
                            type="number"
                            value={financialForm.addon_level}
                            onChange={(e) => setFinancialForm(prev => ({ ...prev, addon_level: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Структура турнира
                </CardTitle>
                <CardDescription>
                  Настройка времени уровней и структуры блайндов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timer_duration">Длительность уровня (сек)</Label>
                    <Select
                      value={structureForm.timer_duration.toString()}
                      onValueChange={(value) => setStructureForm(prev => ({ ...prev, timer_duration: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="600">10 минут</SelectItem>
                        <SelectItem value="900">15 минут</SelectItem>
                        <SelectItem value="1200">20 минут</SelectItem>
                        <SelectItem value="1500">25 минут</SelectItem>
                        <SelectItem value="1800">30 минут</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blind_increase_type">Тип увеличения блайндов</Label>
                    <Select
                      value={structureForm.blind_increase_type}
                      onValueChange={(value) => setStructureForm(prev => ({ ...prev, blind_increase_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Стандарт (×1.5)</SelectItem>
                        <SelectItem value="turbo">Турбо (×2)</SelectItem>
                        <SelectItem value="hyper">Гипер (×2.5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starting_small_blind">Стартовый малый блайнд</Label>
                    <Input
                      id="starting_small_blind"
                      type="number"
                      value={structureForm.starting_small_blind}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, starting_small_blind: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="starting_big_blind">Стартовый большой блайнд</Label>
                    <Input
                      id="starting_big_blind"
                      type="number"
                      value={structureForm.starting_big_blind}
                      onChange={(e) => setStructureForm(prev => ({ ...prev, starting_big_blind: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="break_start_level">Первый перерыв после уровня</Label>
                  <Input
                    id="break_start_level"
                    type="number"
                    value={structureForm.break_start_level}
                    onChange={(e) => setStructureForm(prev => ({ ...prev, break_start_level: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Итоги настроек
                </CardTitle>
                <CardDescription>
                  Проверьте все параметры перед созданием турнира
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Основная информация</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Название:</span>
                        <span className="font-medium">{basicForm.name || 'Не указано'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Максимум игроков:</span>
                        <Badge variant="secondary">{basicForm.max_players}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Формат:</span>
                        <Badge variant="outline">{basicForm.tournament_format}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Время начала:</span>
                        <span className="font-medium">
                          {new Date(basicForm.start_time).toLocaleString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Финансы</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Бай-ин:</span>
                        <span className="font-medium text-green-600">{formatCurrency(financialForm.buy_in)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Стартовые фишки:</span>
                        <span className="font-medium">{financialForm.starting_chips.toLocaleString()}</span>
                      </div>
                      {basicForm.tournament_format !== 'freezeout' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ребай:</span>
                            <span className="font-medium text-blue-600">{formatCurrency(financialForm.rebuy_cost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Фишки за ребай:</span>
                            <span className="font-medium">{financialForm.rebuy_chips.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      {basicForm.tournament_format === 'rebuy_addon' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Аддон:</span>
                            <span className="font-medium text-purple-600">{formatCurrency(financialForm.addon_cost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Фишки за аддон:</span>
                            <span className="font-medium">{financialForm.addon_chips.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Структура</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{formatTime(structureForm.timer_duration)}</div>
                      <div className="text-sm text-gray-600">Длительность уровня</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{structureForm.starting_small_blind}/{structureForm.starting_big_blind}</div>
                      <div className="text-sm text-gray-600">Стартовые блайнды</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{structureForm.break_start_level}</div>
                      <div className="text-sm text-gray-600">Первый перерыв</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {structureForm.blind_increase_type === 'standard' ? '×1.5' : 
                         structureForm.blind_increase_type === 'turbo' ? '×2' : '×2.5'}
                      </div>
                      <div className="text-sm text-gray-600">Рост блайндов</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ['basic', 'financial', 'structure', 'summary'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
                disabled={loading}
              >
                Назад
              </Button>
            )}
            {activeTab !== 'summary' ? (
              <Button
                onClick={() => {
                  const tabs = ['basic', 'financial', 'structure', 'summary'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                disabled={loading}
              >
                Далее
              </Button>
            ) : (
              <Button
                onClick={createTournament}
                disabled={loading || !basicForm.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Создание..." : "Создать турнир"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}