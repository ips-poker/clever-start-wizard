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
    const elementId = format === 'square' ? 'social-square-preview' : 'social-story-preview';
    const element = document.getElementById(elementId);
    
    if (!element) {
      toast({
        title: "Ошибка",
        description: "Не удалось найти элемент для генерации изображения",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ждем загрузки всех изображений
      const images = element.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve; // Продолжаем даже если изображение не загрузилось
          setTimeout(resolve, 3000); // Таймаут 3 секунды
        });
      }));

      const canvas = await html2canvas(element, {
        scale: 2, // Увеличили для лучшего качества
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        foreignObjectRendering: false, // Отключаем для лучшей совместимости со стилями
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Копируем все CSS стили в клонированный документ
          const styles = Array.from(document.styleSheets);
          styles.forEach((styleSheet, index) => {
            try {
              const cssRules = Array.from(styleSheet.cssRules || styleSheet.rules || []);
              const style = clonedDoc.createElement('style');
              style.textContent = cssRules.map(rule => rule.cssText).join('\n');
              clonedDoc.head.appendChild(style);
            } catch (e) {
              // Игнорируем ошибки с внешними стилями
              console.warn('Could not clone stylesheet:', e);
            }
          });
          
          // Добавляем время для рендеринга стилей
          return new Promise(resolve => setTimeout(resolve, 1000));
        }
      });

      const dataUrl = canvas.toDataURL('image/png', 0.9);
      setPreviewImage(dataUrl);
      setIsPreviewOpen(true);

      toast({
        title: "Предпросмотр готов",
        description: `Изображение в формате ${format} создано`,
      });
    } catch (error) {
      console.error('Ошибка генерации изображения:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать изображение",
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
                  className="w-[700px] min-h-[900px] bg-white text-slate-800 relative border border-slate-200"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 30%, #ffffff 100%)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* Decorative background */}
                  <div className="absolute inset-0">
                    <div className="absolute top-8 left-8 text-6xl text-slate-200 transform rotate-12">♠</div>
                    <div className="absolute top-8 right-8 text-5xl text-slate-200 transform -rotate-12">♥</div>
                    <div className="absolute bottom-8 left-8 text-5xl text-slate-200 transform rotate-12">♦</div>
                    <div className="absolute bottom-8 right-8 text-6xl text-slate-200 transform -rotate-12">♣</div>
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  </div>

                  <div className="relative h-full flex flex-col p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center shadow-lg border border-slate-200">
                          <img src={ipsLogo} alt="IPS" className="w-12 h-12" />
                        </div>
                        <div>
                          <div className="font-bold text-2xl text-slate-800">IPS POKER</div>
                          <div className="text-sm text-slate-600">International Style</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white font-bold px-4 py-2 text-lg rounded-full shadow-lg">
                          ТУРНИР
                        </div>
                        <div className="text-sm mt-1 text-slate-600">Рейтинговый</div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200 shadow-sm">
                      <h2 className="text-3xl font-bold mb-3 text-slate-800 leading-tight">
                        {tournamentData.title}
                      </h2>
                      <p className="text-base text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200 inline-block">{tournamentData.description}</p>
                    </div>

                    {/* Main info grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 text-center border border-blue-200 shadow-sm">
                        <Calendar className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                        <div className="text-xs text-blue-700 font-medium mb-2">ДАТА И ВРЕМЯ</div>
                        <div className="font-bold text-lg text-slate-800">{tournamentData.date}</div>
                        <div className="font-bold text-2xl text-blue-600">{tournamentData.time}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 text-center border border-emerald-200 shadow-sm">
                        <MapPin className="w-8 h-8 mx-auto mb-3 text-emerald-600" />
                        <div className="text-xs text-emerald-700 font-medium mb-2">МЕСТО</div>
                        <div className="font-bold text-2xl text-emerald-600">{tournamentData.location}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 text-center border border-amber-200 shadow-sm">
                        <DollarSign className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                        <div className="text-xs text-amber-700 font-medium mb-2">БАЙ-ИН</div>
                        <div className="font-bold text-2xl text-amber-600">{tournamentData.buyIn}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 text-center border border-purple-200 shadow-sm">
                        <Trophy className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                        <div className="text-xs text-purple-700 font-medium mb-2">ПРИЗОВОЙ ФОНД</div>
                        <div className="font-bold text-2xl text-purple-600">{tournamentData.prizePool}</div>
                      </div>
                    </div>

                    {/* Tournament details */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-4 text-center border border-rose-200 shadow-sm">
                        <Users className="w-5 h-5 mx-auto mb-2 text-rose-600" />
                        <div className="text-xs text-rose-700 font-medium">МЕСТ</div>
                        <div className="font-bold text-lg text-slate-800">{tournamentData.maxPlayers}</div>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 text-center border border-indigo-200 shadow-sm">
                        <Zap className="w-5 h-5 mx-auto mb-2 text-indigo-600" />
                        <div className="text-xs text-indigo-700 font-medium">СТАРТОВЫЙ СТЕК</div>
                        <div className="font-bold text-lg text-slate-800">{tournamentData.startingChips}</div>
                      </div>
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 text-center border border-teal-200 shadow-sm">
                        <FileText className="w-5 h-5 mx-auto mb-2 text-teal-600" />
                        <div className="text-xs text-teal-700 font-medium">ФОРМАТ</div>
                        <div className="font-bold text-lg text-slate-800">{tournamentData.format}</div>
                      </div>
                    </div>

                    {/* Tournament structure section */}
                    <div className="space-y-3 mb-6">
                      <div className="text-center text-lg font-bold text-slate-700 mb-4 bg-gradient-to-r from-slate-100 to-slate-50 py-2 px-4 rounded-full border border-slate-200">📋 СТРУКТУРА ТУРНИРА</div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {tournamentData.timerDuration && (
                          <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-3 text-center border border-violet-200 shadow-sm">
                            <Clock className="w-5 h-5 mx-auto mb-1 text-violet-600" />
                            <div className="text-xs text-violet-700 font-medium mb-1">ВРЕМЯ УРОВНЯ</div>
                            <div className="font-bold text-sm text-slate-800">{tournamentData.timerDuration}</div>
                          </div>
                        )}
                        
                        {tournamentData.blindStructure && (
                          <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg p-3 text-center border border-sky-200 shadow-sm">
                            <div className="text-xs text-sky-700 font-medium mb-1">БЛАЙНДЫ</div>
                            <div className="font-bold text-sm text-slate-800">{tournamentData.blindStructure}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {tournamentData.rebuyInfo && tournamentData.rebuyEndLevel && (
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 text-center border border-orange-200 shadow-sm">
                            <div className="text-xs text-orange-700 font-medium mb-1">REBUY</div>
                            <div className="font-semibold text-xs text-slate-800">{tournamentData.rebuyInfo}</div>
                            <div className="font-semibold text-xs text-slate-600">{tournamentData.rebuyEndLevel}</div>
                          </div>
                        )}
                        
                        {tournamentData.addonInfo && tournamentData.addonLevel && (
                          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 text-center border border-cyan-200 shadow-sm">
                            <div className="text-xs text-cyan-700 font-medium mb-1">ADDON</div>
                            <div className="font-semibold text-xs text-slate-800">{tournamentData.addonInfo}</div>
                            <div className="font-semibold text-xs text-slate-600">{tournamentData.addonLevel}</div>
                          </div>
                        )}
                      </div>
                      
                      {(tournamentData.lateRegEndLevel || tournamentData.breakInfo) && (
                        <div className="grid grid-cols-2 gap-3">
                          {tournamentData.lateRegEndLevel && (
                            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 text-center border border-pink-200 shadow-sm">
                              <div className="text-xs text-pink-700 font-medium mb-1">ПОЗДНЯЯ РЕГ.</div>
                              <div className="font-semibold text-xs text-slate-800">{tournamentData.lateRegEndLevel}</div>
                            </div>
                          )}
                          
                          {tournamentData.breakInfo && (
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 text-center border border-emerald-200 shadow-sm">
                              <div className="text-xs text-emerald-700 font-medium mb-1">ПЕРЕРЫВ</div>
                              <div className="font-semibold text-xs text-slate-800">{tournamentData.breakInfo}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-5 text-center shadow-lg">
                      <div className="text-sm mb-2 font-semibold">РЕГИСТРАЦИЯ</div>
                      <div className="text-2xl font-bold">{tournamentData.contactInfo}</div>
                      <div className="text-xs mt-3 opacity-70">#IPS #покер #турнир #ELO</div>
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
                  className="w-[350px] min-h-[800px] bg-white text-slate-800 relative border border-slate-200"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* Elegant background elements */}
                  <div className="absolute inset-0">
                    <div className="absolute top-16 left-6 text-7xl text-slate-200">♠</div>
                    <div className="absolute top-24 right-6 text-6xl text-slate-200 transform rotate-12">♥</div>
                    <div className="absolute bottom-40 left-6 text-6xl text-slate-200 transform -rotate-12">♦</div>
                    <div className="absolute bottom-32 right-6 text-7xl text-slate-200">♣</div>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  </div>

                  <div className="relative h-full flex flex-col p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg border border-slate-200">
                        <img src={ipsLogo} alt="IPS" className="w-14 h-14" />
                      </div>
                      <div className="font-bold text-3xl text-slate-800">
                        IPS POKER
                      </div>
                      <div className="text-sm text-slate-600 mt-1">International Poker Style</div>
                      <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-2 rounded-full"></div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200 shadow-sm">
                      <h2 className="text-2xl font-bold mb-3 leading-tight text-slate-800">{tournamentData.title}</h2>
                      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white font-bold px-4 py-2 text-sm rounded-full shadow-lg inline-block">
                        РЕЙТИНГОВЫЙ ТУРНИР
                      </div>
                      <div className="mt-3 text-sm text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 inline-block">{tournamentData.description}</div>
                    </div>

                    {/* Main info */}
                    <div className="space-y-4 flex-1">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <Calendar className="w-6 h-6 text-blue-600" />
                          <span className="font-bold text-lg text-slate-800">КОГДА</span>
                        </div>
                        <div className="text-xl font-bold text-slate-800">{tournamentData.date}</div>
                        <div className="text-2xl font-bold text-blue-600">{tournamentData.time}</div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <MapPin className="w-6 h-6 text-emerald-600" />
                          <span className="font-bold text-lg text-slate-800">ГДЕ</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">{tournamentData.location}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 text-center border border-amber-200 shadow-sm">
                          <DollarSign className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                          <div className="text-xs text-amber-700 font-medium mb-1">БАЙ-ИН</div>
                          <div className="text-xl font-bold text-slate-800">{tournamentData.buyIn}</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center border border-purple-200 shadow-sm">
                          <Trophy className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <div className="text-xs text-purple-700 font-medium mb-1">ПРИЗЫ</div>
                          <div className="text-xl font-bold text-slate-800">{tournamentData.prizePool}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-3 text-center border border-rose-200 shadow-sm">
                          <Users className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                          <div className="text-xs text-rose-700 font-medium">МЕСТ</div>
                          <div className="font-bold text-slate-800">{tournamentData.maxPlayers}</div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-3 text-center border border-indigo-200 shadow-sm">
                          <Zap className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                          <div className="text-xs text-indigo-700 font-medium">СТЕК</div>
                          <div className="font-bold text-slate-800">{tournamentData.startingChips}</div>
                        </div>
                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-3 text-center border border-teal-200 shadow-sm">
                          <FileText className="w-5 h-5 mx-auto mb-1 text-teal-600" />
                          <div className="text-xs text-teal-700 font-medium">ФОРМАТ</div>
                          <div className="font-bold text-slate-800">{tournamentData.format}</div>
                        </div>
                      </div>

                      {/* Tournament structure info */}
                      <div className="space-y-3">
                        <div className="text-center text-sm font-bold text-slate-700 mb-3 bg-gradient-to-r from-slate-100 to-slate-50 py-1 px-3 rounded-full border border-slate-200">📋 СТРУКТУРА</div>
                        
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
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl p-5 text-center shadow-lg mt-4">
                      <div className="text-sm mb-2 font-semibold">РЕГИСТРАЦИЯ</div>
                      <div className="text-2xl font-bold">{tournamentData.contactInfo}</div>
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