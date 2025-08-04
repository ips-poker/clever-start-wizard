import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Trophy, 
  Users, 
  Download, 
  Eye, 
  Share2,
  Copy,
  Smartphone,
  Monitor,
  FileText,
  Zap,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import html2canvas from 'html2canvas';
import ipsLogo from "/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png";

interface TournamentData {
  title: string;
  date: string;
  time: string;
  location: string;
  buyIn: string;
  format: string;
  description: string;
  contactInfo: string;
  prizePool: string;
  maxPlayers: string;
  startingChips: string;
  rebuyInfo?: string;
  addonInfo?: string;
  timerDuration?: string;
  breakInfo?: string;
  blindStructure?: string;
  rebuyEndLevel?: string;
  addonLevel?: string;
  lateRegEndLevel?: string;
  blindLevels?: string;
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  buy_in: number;
  max_players: number;
  start_time: string;
  status: string;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  rebuy_end_level: number;
  addon_level: number;
  tournament_format: string;
  timer_duration: number;
  break_start_level?: number;
}

export function SocialInvitationGenerator() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  
  const [tournamentData, setTournamentData] = useState<TournamentData>({
    title: "🏆 Покерный турнир IPS",
    date: "30.07.2025",
    time: "18:00",
    location: "TNG Lounge",
    buyIn: "2000₽",
    format: "Rebuy",
    description: "Эксклюзивный рейтинговый турнир",
    contactInfo: "@ips_poker",
    prizePool: "100 000₽",
    maxPlayers: "50",
    startingChips: "10 000",
    rebuyInfo: "1000₽ = 5000 фишек",
    addonInfo: "1000₽ = 5000 фишек",
    timerDuration: "20 мин/уровень",
    breakInfo: "Перерыв после 4 уровня",
    blindStructure: "10/20, 15/30, 20/40, 25/50...",
    rebuyEndLevel: "до 6 уровня",
    addonLevel: "на 7 уровне",
    lateRegEndLevel: "до 6 уровня",
    blindLevels: "Уровни по 20 минут"
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить турниры",
          variant: "destructive"
        });
      } else {
        setTournaments(data || []);
      }
    } catch (err) {
      console.error('Error loading tournaments:', err);
    }
  };

  const loadTournamentData = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    const formatDate = (dateString: string) => {
      try {
        return format(new Date(dateString), 'dd.MM', { locale: ru });
      } catch {
        return dateString;
      }
    };

    const formatTime = (dateString: string) => {
      try {
        return format(new Date(dateString), 'HH:mm', { locale: ru });
      } catch {
        return dateString;
      }
    };

    setTournamentData({
      title: `🏆 ${tournament.name}`,
      date: formatDate(tournament.start_time),
      time: formatTime(tournament.start_time),
      location: "TNG Lounge",
      buyIn: `${tournament.buy_in.toLocaleString()}₽`,
      format: tournament.tournament_format === 'rebuy' ? 'Rebuy' : 'Freezeout',
      description: tournament.description || "Эксклюзивный рейтинговый турнир",
      contactInfo: "@ips_poker",
      prizePool: `${(tournament.buy_in * tournament.max_players * 0.9).toLocaleString()}₽`,
      maxPlayers: tournament.max_players.toString(),
      startingChips: tournament.starting_chips.toLocaleString(),
      rebuyInfo: tournament.rebuy_cost ? `${tournament.rebuy_cost.toLocaleString()}₽ = ${tournament.rebuy_chips?.toLocaleString() || '0'} фишек` : '',
      addonInfo: tournament.addon_cost ? `${tournament.addon_cost.toLocaleString()}₽ = ${tournament.addon_chips?.toLocaleString() || '0'} фишек` : '',
      timerDuration: `${tournament.timer_duration / 60} мин/уровень`,
      breakInfo: `Перерыв после ${tournament.break_start_level || 4} уровня`,
      rebuyEndLevel: `до ${tournament.rebuy_end_level || 6} уровня`,
      addonLevel: `на ${tournament.addon_level || 7} уровне`,
      lateRegEndLevel: `до ${tournament.rebuy_end_level || 6} уровня`,
      blindStructure: `10/20, 15/30, 20/40, 25/50...`,
      blindLevels: `Уровни по ${tournament.timer_duration / 60} минут`
    });
  };

  const updateField = (field: keyof TournamentData, value: string) => {
    setTournamentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateWhatsAppText = () => {
    let text = `${tournamentData.title}

📅 ${tournamentData.date} в ${tournamentData.time}
📍 ${tournamentData.location}
💰 Бай-ин: ${tournamentData.buyIn}
🏆 Призовой фонд: ${tournamentData.prizePool}
👥 Игроков: ${tournamentData.maxPlayers}
🎯 Стартовый стек: ${tournamentData.startingChips}

${tournamentData.description}

📋 СТРУКТУРА ТУРНИРА:`;

    if (tournamentData.timerDuration) {
      text += `\n⏱️ ${tournamentData.timerDuration}`;
    }
    if (tournamentData.blindStructure) {
      text += `\n🔢 Блайнды: ${tournamentData.blindStructure}`;
    }
    if (tournamentData.rebuyInfo && tournamentData.rebuyEndLevel) {
      text += `\n🔄 Rebuy: ${tournamentData.rebuyInfo} ${tournamentData.rebuyEndLevel}`;
    }
    if (tournamentData.addonInfo && tournamentData.addonLevel) {
      text += `\n➕ Addon: ${tournamentData.addonInfo} ${tournamentData.addonLevel}`;
    }
    if (tournamentData.lateRegEndLevel) {
      text += `\n📝 Поздняя регистрация ${tournamentData.lateRegEndLevel}`;
    }
    if (tournamentData.breakInfo) {
      text += `\n☕ ${tournamentData.breakInfo}`;
    }

    text += `\n\nРегистрация: ${tournamentData.contactInfo}

#IPS #покер #турнир`;

    return text;
  };

  const generateTelegramText = () => {
    let text = `<b>${tournamentData.title.replace(/🏆 /, '')}</b>

<b>Дата:</b> ${tournamentData.date} в ${tournamentData.time}
<b>Место:</b> ${tournamentData.location}
<b>Бай-ин:</b> ${tournamentData.buyIn}
<b>Призы:</b> ${tournamentData.prizePool}
<b>Мест:</b> ${tournamentData.maxPlayers}
<b>Стек:</b> ${tournamentData.startingChips}

<i>${tournamentData.description}</i>

<b>СТРУКТУРА ТУРНИРА:</b>`;

    if (tournamentData.timerDuration) {
      text += `\n<b>Время уровней:</b> ${tournamentData.timerDuration}`;
    }
    if (tournamentData.blindStructure) {
      text += `\n<b>Блайнды:</b> ${tournamentData.blindStructure}`;
    }
    if (tournamentData.rebuyInfo && tournamentData.rebuyEndLevel) {
      text += `\n<b>Rebuy:</b> ${tournamentData.rebuyInfo} ${tournamentData.rebuyEndLevel}`;
    }
    if (tournamentData.addonInfo && tournamentData.addonLevel) {
      text += `\n<b>Addon:</b> ${tournamentData.addonInfo} ${tournamentData.addonLevel}`;
    }
    if (tournamentData.lateRegEndLevel) {
      text += `\n<b>Поздняя регистрация:</b> ${tournamentData.lateRegEndLevel}`;
    }
    if (tournamentData.breakInfo) {
      text += `\n<b>Перерыв:</b> ${tournamentData.breakInfo}`;
    }

    text += `\n\n<b>Регистрация:</b> ${tournamentData.contactInfo}

#IPS #покер #турнир #ELO`;

    return text;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано!",
        description: "Текст приглашения скопирован в буфер обмена",
      });
    });
  };

  const generateAndPreviewImage = async (format: 'square' | 'story') => {
    console.log('Начинаем генерацию изображения для формата:', format);
    
    const elementId = format === 'square' ? 'social-square-preview' : 'social-story-preview';
    const element = document.getElementById(elementId);
    
    console.log('Найден элемент:', elementId, element);
    
    if (!element) {
      console.error('Элемент не найден:', elementId);
      toast({
        title: "Ошибка",
        description: "Не удалось найти элемент для генерации изображения",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Начинаем html2canvas...');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        logging: true,
        foreignObjectRendering: true
      });

      console.log('Canvas создан, размеры:', canvas.width, 'x', canvas.height);
      
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      console.log('DataURL создан, длина:', dataUrl.length);
      
      setPreviewImage(dataUrl);
      setIsPreviewOpen(true);
      
      console.log('Состояние обновлено, превью должно открыться');

      toast({
        title: "Предпросмотр готов",
        description: `Изображение в формате ${format} готово для просмотра`,
      });
    } catch (error) {
      console.error('Ошибка генерации изображения:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать изображение: " + error.message,
        variant: "destructive"
      });
    }
  };

  const downloadImage = () => {
    if (!previewImage) return;
    
    const link = document.createElement('a');
    link.download = `poker-invitation-${tournamentData.date.replace(/\./g, '-')}.png`;
    link.href = previewImage;
    link.click();
    
    toast({
      title: "Скачано",
      description: "Изображение сохранено на устройство",
    });
  };

  return (
    <div className="space-y-6">
      {/* Tournament Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Генератор приглашений для соцсетей
          </CardTitle>
          <CardDescription>
            Создавайте стильные приглашения для WhatsApp, Telegram и Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Выберите турнир</Label>
              <Select 
                value={selectedTournamentId} 
                onValueChange={(value) => {
                  setSelectedTournamentId(value);
                  loadTournamentData(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Загрузить данные турнира..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name} - {format(new Date(tournament.start_time), 'dd.MM HH:mm')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Контакт для регистрации</Label>
              <Input
                value={tournamentData.contactInfo}
                onChange={(e) => updateField('contactInfo', e.target.value)}
                placeholder="@username или номер телефона"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Настройка приглашения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Название турнира</Label>
              <Input
                value={tournamentData.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>
            <div>
              <Label>Дата</Label>
              <Input
                value={tournamentData.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div>
              <Label>Время</Label>
              <Input
                value={tournamentData.time}
                onChange={(e) => updateField('time', e.target.value)}
              />
            </div>
            <div>
              <Label>Место</Label>
              <Input
                value={tournamentData.location}
                onChange={(e) => updateField('location', e.target.value)}
              />
            </div>
            <div>
              <Label>Бай-ин</Label>
              <Input
                value={tournamentData.buyIn}
                onChange={(e) => updateField('buyIn', e.target.value)}
              />
            </div>
            <div>
              <Label>Призовой фонд</Label>
              <Input
                value={tournamentData.prizePool}
                onChange={(e) => updateField('prizePool', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label>Описание</Label>
            <Textarea
              value={tournamentData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              placeholder="Краткое описание турнира..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Tournament Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Структура турнира
          </CardTitle>
          <CardDescription>
            Подробная информация о формате и правилах турнира
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Длительность уровней</Label>
              <Input
                value={tournamentData.timerDuration || ''}
                onChange={(e) => updateField('timerDuration', e.target.value)}
                placeholder="20 мин/уровень"
              />
            </div>
            <div>
              <Label>Структура блайндов</Label>
              <Input
                value={tournamentData.blindStructure || ''}
                onChange={(e) => updateField('blindStructure', e.target.value)}
                placeholder="10/20, 15/30, 20/40..."
              />
            </div>
            <div>
              <Label>Информация о перерыве</Label>
              <Input
                value={tournamentData.breakInfo || ''}
                onChange={(e) => updateField('breakInfo', e.target.value)}
                placeholder="Перерыв после 4 уровня"
              />
            </div>
            <div>
              <Label>Rebuy информация</Label>
              <Input
                value={tournamentData.rebuyInfo || ''}
                onChange={(e) => updateField('rebuyInfo', e.target.value)}
                placeholder="1000₽ = 5000 фишек"
              />
            </div>
            <div>
              <Label>Rebuy до уровня</Label>
              <Input
                value={tournamentData.rebuyEndLevel || ''}
                onChange={(e) => updateField('rebuyEndLevel', e.target.value)}
                placeholder="до 6 уровня"
              />
            </div>
            <div>
              <Label>Addon информация</Label>
              <Input
                value={tournamentData.addonInfo || ''}
                onChange={(e) => updateField('addonInfo', e.target.value)}
                placeholder="1000₽ = 5000 фишек"
              />
            </div>
            <div>
              <Label>Addon уровень</Label>
              <Input
                value={tournamentData.addonLevel || ''}
                onChange={(e) => updateField('addonLevel', e.target.value)}
                placeholder="на 7 уровне"
              />
            </div>
            <div>
              <Label>Поздняя регистрация</Label>
              <Input
                value={tournamentData.lateRegEndLevel || ''}
                onChange={(e) => updateField('lateRegEndLevel', e.target.value)}
                placeholder="до 6 уровня"
              />
            </div>
            <div>
              <Label>Детали уровней</Label>
              <Input
                value={tournamentData.blindLevels || ''}
                onChange={(e) => updateField('blindLevels', e.target.value)}
                placeholder="Уровни по 20 минут"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different social media formats */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Визуальные
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-green-600" />
                WhatsApp приглашение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">{generateWhatsAppText()}</pre>
              </div>
              <Button 
                onClick={() => copyToClipboard(generateWhatsAppText())}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Скопировать для WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telegram" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Telegram приглашение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: generateTelegramText()
                      .replace(/<b>/g, '<strong>')
                      .replace(/<\/b>/g, '</strong>')
                      .replace(/<i>/g, '<em>')
                      .replace(/<\/i>/g, '</em>')
                  }}
                />
              </div>
              <Button 
                onClick={() => copyToClipboard(generateTelegramText())}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Скопировать для Telegram
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="space-y-6">
          {/* Square format for Instagram/general social media */}
          <Card>
            <CardHeader>
              <CardTitle>Квадратное изображение (Instagram/Facebook)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div 
                  id="social-square-preview" 
                  className="w-[700px] h-[900px] bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden border border-white/20"
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {/* Decorative background */}
                  <div className="absolute inset-0">
                    <div className="absolute top-8 left-8 text-6xl text-yellow-400/20 transform rotate-12">♠</div>
                    <div className="absolute top-8 right-8 text-5xl text-red-400/20 transform -rotate-12">♥</div>
                    <div className="absolute bottom-8 left-8 text-5xl text-red-400/20 transform rotate-12">♦</div>
                    <div className="absolute bottom-8 right-8 text-6xl text-yellow-400/20 transform -rotate-12">♣</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  </div>

                  <div className="relative h-full flex flex-col p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
                          <img src={ipsLogo} alt="IPS" className="w-12 h-12" />
                        </div>
                        <div>
                          <div className="font-bold text-2xl">IPS POKER</div>
                          <div className="text-sm opacity-80">International Style</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-4 py-2 text-lg">
                          ТУРНИР
                        </Badge>
                        <div className="text-sm mt-1 opacity-70">Рейтинговый</div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6 bg-white/10 backdrop-blur-sm rounded-xl p-5">
                      <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent leading-tight">
                        {tournamentData.title}
                      </h2>
                      <p className="text-base opacity-90">{tournamentData.description}</p>
                    </div>

                    {/* Main info grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/15 backdrop-blur-sm rounded-xl p-5 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-3 text-blue-300" />
                        <div className="text-xs opacity-80 mb-2">ДАТА И ВРЕМЯ</div>
                        <div className="font-bold text-lg">{tournamentData.date}</div>
                        <div className="font-bold text-2xl text-blue-300">{tournamentData.time}</div>
                      </div>
                      
                      <div className="bg-white/15 backdrop-blur-sm rounded-xl p-5 text-center">
                        <MapPin className="w-8 h-8 mx-auto mb-3 text-green-300" />
                        <div className="text-xs opacity-80 mb-2">МЕСТО</div>
                        <div className="font-bold text-2xl text-green-300">{tournamentData.location}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-5 text-center border border-yellow-400/30">
                        <DollarSign className="w-8 h-8 mx-auto mb-3 text-yellow-300" />
                        <div className="text-xs opacity-80 mb-2">БАЙ-ИН</div>
                        <div className="font-bold text-2xl text-yellow-300">{tournamentData.buyIn}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-5 text-center border border-green-400/30">
                        <Trophy className="w-8 h-8 mx-auto mb-3 text-green-300" />
                        <div className="text-xs opacity-80 mb-2">ПРИЗОВОЙ ФОНД</div>
                        <div className="font-bold text-2xl text-green-300">{tournamentData.prizePool}</div>
                      </div>
                    </div>

                    {/* Tournament details */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-white/10 rounded-lg p-4 text-center">
                        <Users className="w-5 h-5 mx-auto mb-2" />
                        <div className="text-xs opacity-80">МЕСТ</div>
                        <div className="font-bold text-lg">{tournamentData.maxPlayers}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4 text-center">
                        <Zap className="w-5 h-5 mx-auto mb-2" />
                        <div className="text-xs opacity-80">СТАРТОВЫЙ СТЕК</div>
                        <div className="font-bold text-lg">{tournamentData.startingChips}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4 text-center">
                        <FileText className="w-5 h-5 mx-auto mb-2" />
                        <div className="text-xs opacity-80">ФОРМАТ</div>
                        <div className="font-bold text-lg">{tournamentData.format}</div>
                      </div>
                    </div>

                    {/* Tournament structure section */}
                    <div className="space-y-3 mb-6">
                      <div className="text-center text-lg font-bold text-yellow-300 mb-4">📋 СТРУКТУРА ТУРНИРА</div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {tournamentData.timerDuration && (
                          <div className="bg-purple-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-purple-400/30">
                            <Clock className="w-5 h-5 mx-auto mb-1 text-purple-300" />
                            <div className="text-xs opacity-80 mb-1">ВРЕМЯ УРОВНЯ</div>
                            <div className="font-bold text-sm text-purple-300">{tournamentData.timerDuration}</div>
                          </div>
                        )}
                        
                        {tournamentData.blindStructure && (
                          <div className="bg-indigo-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-indigo-400/30">
                            <div className="text-xs opacity-80 mb-1">БЛАЙНДЫ</div>
                            <div className="font-bold text-sm text-indigo-300">{tournamentData.blindStructure}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {tournamentData.rebuyInfo && tournamentData.rebuyEndLevel && (
                          <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-orange-400/30">
                            <div className="text-xs opacity-80 mb-1">REBUY</div>
                            <div className="font-semibold text-xs text-orange-300">{tournamentData.rebuyInfo}</div>
                            <div className="font-semibold text-xs text-orange-300">{tournamentData.rebuyEndLevel}</div>
                          </div>
                        )}
                        
                        {tournamentData.addonInfo && tournamentData.addonLevel && (
                          <div className="bg-cyan-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-cyan-400/30">
                            <div className="text-xs opacity-80 mb-1">ADDON</div>
                            <div className="font-semibold text-xs text-cyan-300">{tournamentData.addonInfo}</div>
                            <div className="font-semibold text-xs text-cyan-300">{tournamentData.addonLevel}</div>
                          </div>
                        )}
                      </div>
                      
                      {(tournamentData.lateRegEndLevel || tournamentData.breakInfo) && (
                        <div className="grid grid-cols-2 gap-3">
                          {tournamentData.lateRegEndLevel && (
                            <div className="bg-pink-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-pink-400/30">
                              <div className="text-xs opacity-80 mb-1">ПОЗДНЯЯ РЕГ.</div>
                              <div className="font-semibold text-xs text-pink-300">{tournamentData.lateRegEndLevel}</div>
                            </div>
                          )}
                          
                          {tournamentData.breakInfo && (
                            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-emerald-400/30">
                              <div className="text-xs opacity-80 mb-1">ПЕРЕРЫВ</div>
                              <div className="font-semibold text-xs text-emerald-300">{tournamentData.breakInfo}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur-sm rounded-xl p-5 text-center border border-purple-400/30">
                      <div className="text-sm mb-2 font-semibold">РЕГИСТРАЦИЯ</div>
                      <div className="text-2xl font-bold text-blue-300">{tournamentData.contactInfo}</div>
                      <div className="text-xs mt-3 opacity-60">#IPS #покер #турнир #ELO</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => {
                  console.log('Нажата кнопка для square формата');
                  generateAndPreviewImage('square');
                }}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Посмотреть и скачать
              </Button>
            </CardContent>
          </Card>

          {/* Story format */}
          <Card>
            <CardHeader>
              <CardTitle>Формат Stories (Instagram/VK/Telegram)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div 
                  id="social-story-preview" 
                  className="w-[350px] h-[800px] bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 text-white relative overflow-hidden border border-white/20"
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {/* Animated background elements */}
                  <div className="absolute inset-0">
                    <div className="absolute top-16 left-6 text-7xl text-yellow-400/20 animate-pulse">♠</div>
                    <div className="absolute top-24 right-6 text-6xl text-red-400/20 animate-pulse delay-1000 transform rotate-12">♥</div>
                    <div className="absolute bottom-40 left-6 text-6xl text-red-400/20 animate-pulse delay-2000 transform -rotate-12">♦</div>
                    <div className="absolute bottom-32 right-6 text-7xl text-yellow-400/20 animate-pulse delay-3000">♣</div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40"></div>
                  </div>

                  <div className="relative h-full flex flex-col p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-white to-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl">
                        <img src={ipsLogo} alt="IPS" className="w-14 h-14" />
                      </div>
                      <div className="font-bold text-3xl bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                        IPS POKER
                      </div>
                      <div className="text-sm opacity-90 mt-1">International Poker Style</div>
                      <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto mt-2 rounded-full"></div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                      <h2 className="text-2xl font-bold mb-3 leading-tight">{tournamentData.title}</h2>
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-4 py-2 text-sm">
                        РЕЙТИНГОВЫЙ ТУРНИР
                      </Badge>
                      <div className="mt-3 text-sm opacity-90">{tournamentData.description}</div>
                    </div>

                    {/* Main info */}
                    <div className="space-y-4 flex-1">
                      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-5 border border-blue-400/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Calendar className="w-6 h-6 text-blue-300" />
                          <span className="font-bold text-lg">КОГДА</span>
                        </div>
                        <div className="text-xl font-bold">{tournamentData.date}</div>
                        <div className="text-2xl font-bold text-blue-300">{tournamentData.time}</div>
                      </div>

                      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-5 border border-green-400/30">
                        <div className="flex items-center gap-3 mb-3">
                          <MapPin className="w-6 h-6 text-green-300" />
                          <span className="font-bold text-lg">ГДЕ</span>
                        </div>
                        <div className="text-2xl font-bold text-green-300">{tournamentData.location}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-yellow-500/25 to-orange-500/25 backdrop-blur-sm rounded-2xl p-4 text-center border border-yellow-400/40">
                          <DollarSign className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
                          <div className="text-xs opacity-80 mb-1">БАЙ-ИН</div>
                          <div className="text-xl font-bold text-yellow-300">{tournamentData.buyIn}</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/25 to-emerald-500/25 backdrop-blur-sm rounded-2xl p-4 text-center border border-green-400/40">
                          <Trophy className="w-8 h-8 mx-auto mb-2 text-green-300" />
                          <div className="text-xs opacity-80 mb-1">ПРИЗЫ</div>
                          <div className="text-xl font-bold text-green-300">{tournamentData.prizePool}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                          <Users className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-xs opacity-80">МЕСТ</div>
                          <div className="font-bold">{tournamentData.maxPlayers}</div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                          <Zap className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-xs opacity-80">СТЕК</div>
                          <div className="font-bold">{tournamentData.startingChips}</div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                          <FileText className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-xs opacity-80">ФОРМАТ</div>
                          <div className="font-bold">{tournamentData.format}</div>
                        </div>
                      </div>

                      {/* Tournament structure info */}
                      <div className="space-y-3">
                        <div className="text-center text-sm font-bold text-yellow-300 mb-3">📋 СТРУКТУРА</div>
                        
                        {tournamentData.timerDuration && (
                          <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-purple-400/30">
                            <Clock className="w-4 h-4 mx-auto mb-1 text-purple-300" />
                            <div className="text-xs opacity-80 mb-1">ВРЕМЯ УРОВНЯ</div>
                            <div className="font-bold text-sm text-purple-300">{tournamentData.timerDuration}</div>
                          </div>
                        )}
                        
                        {tournamentData.blindStructure && (
                          <div className="bg-indigo-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-indigo-400/30">
                            <div className="text-xs opacity-80 mb-1">БЛАЙНДЫ</div>
                            <div className="font-bold text-xs text-indigo-300">{tournamentData.blindStructure}</div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3">
                          {tournamentData.rebuyInfo && tournamentData.rebuyEndLevel && (
                            <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-orange-400/30">
                              <div className="text-xs opacity-80 mb-1">REBUY</div>
                              <div className="font-semibold text-xs text-orange-300">{tournamentData.rebuyInfo}</div>
                              <div className="font-semibold text-xs text-orange-300">{tournamentData.rebuyEndLevel}</div>
                            </div>
                          )}
                          
                          {tournamentData.addonInfo && tournamentData.addonLevel && (
                            <div className="bg-cyan-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-cyan-400/30">
                              <div className="text-xs opacity-80 mb-1">ADDON</div>
                              <div className="font-semibold text-xs text-cyan-300">{tournamentData.addonInfo}</div>
                              <div className="font-semibold text-xs text-cyan-300">{tournamentData.addonLevel}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {tournamentData.lateRegEndLevel && (
                            <div className="bg-pink-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-pink-400/30">
                              <div className="text-xs opacity-80 mb-1">ПОЗДНЯЯ РЕГ.</div>
                              <div className="font-semibold text-xs text-pink-300">{tournamentData.lateRegEndLevel}</div>
                            </div>
                          )}
                          
                          {tournamentData.breakInfo && (
                            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-emerald-400/30">
                              <div className="text-xs opacity-80 mb-1">ПЕРЕРЫВ</div>
                              <div className="font-semibold text-xs text-emerald-300">{tournamentData.breakInfo}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 backdrop-blur-sm rounded-2xl p-5 text-center border border-purple-400/40 mt-4">
                      <div className="text-sm mb-2 font-semibold opacity-90">РЕГИСТРАЦИЯ</div>
                      <div className="text-2xl font-bold text-purple-300">{tournamentData.contactInfo}</div>
                      <div className="text-xs mt-3 opacity-70">#IPS #покер #турнир #ELO</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => {
                  console.log('Нажата кнопка для story формата');
                  generateAndPreviewImage('story');
                }}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Посмотреть и скачать
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Предпросмотр приглашения
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {previewImage && (
            <div className="space-y-4">
              <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                <img 
                  src={previewImage} 
                  alt="Предпросмотр приглашения" 
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
              
              <div className="flex justify-center gap-4">
                <Button onClick={downloadImage} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Скачать изображение
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}