import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Zap
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
}

export function SocialInvitationGenerator() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("whatsapp");
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
    startingChips: "10 000"
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
      startingChips: tournament.starting_chips.toLocaleString()
    });
  };

  const updateField = (field: keyof TournamentData, value: string) => {
    setTournamentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateWhatsAppText = () => {
    return `${tournamentData.title}

📅 ${tournamentData.date} в ${tournamentData.time}
📍 ${tournamentData.location}
💰 Бай-ин: ${tournamentData.buyIn}
🏆 Призовой фонд: ${tournamentData.prizePool}
👥 Игроков: ${tournamentData.maxPlayers}
🎯 Фишки: ${tournamentData.startingChips}

${tournamentData.description}

Регистрация: ${tournamentData.contactInfo}

#IPS #покер #турнир`;
  };

  const generateTelegramText = () => {
    return `🎰 <b>${tournamentData.title}</b>

📅 <b>Дата:</b> ${tournamentData.date} в ${tournamentData.time}
📍 <b>Место:</b> ${tournamentData.location}
💰 <b>Бай-ин:</b> ${tournamentData.buyIn}
🏆 <b>Призы:</b> ${tournamentData.prizePool}
👥 <b>Мест:</b> ${tournamentData.maxPlayers}
🎯 <b>Стек:</b> ${tournamentData.startingChips}

<i>${tournamentData.description}</i>

🚀 <b>Регистрация:</b> ${tournamentData.contactInfo}

#IPS #покер #турнир #ELO`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано!",
        description: "Текст приглашения скопирован в буфер обмена",
      });
    });
  };

  const generateImage = async (format: 'square' | 'story') => {
    const elementId = format === 'square' ? 'social-square-preview' : 'social-story-preview';
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });

      const link = document.createElement('a');
      link.download = `poker-invitation-${format}-${tournamentData.date.replace(/\./g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Изображение сохранено",
        description: `Изображение в формате ${format} готово для публикации`,
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
                  className="w-[400px] h-[400px] bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden"
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-8 left-8 text-4xl">♠</div>
                    <div className="absolute top-8 right-8 text-4xl">♥</div>
                    <div className="absolute bottom-8 left-8 text-4xl">♦</div>
                    <div className="absolute bottom-8 right-8 text-4xl">♣</div>
                  </div>

                  <div className="relative h-full flex flex-col p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <img src={ipsLogo} alt="IPS" className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">IPS</div>
                          <div className="text-xs opacity-80">Poker Club</div>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500 text-black">ТУРНИР</Badge>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold mb-2">{tournamentData.title}</h2>
                      <p className="text-sm opacity-80">{tournamentData.description}</p>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Дата и время</span>
                        </div>
                        <span className="font-semibold">{tournamentData.date} {tournamentData.time}</span>
                      </div>

                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Место</span>
                        </div>
                        <span className="font-semibold">{tournamentData.location}</span>
                      </div>

                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm">Бай-ин</span>
                        </div>
                        <span className="font-semibold text-yellow-400">{tournamentData.buyIn}</span>
                      </div>

                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm">Призы</span>
                        </div>
                        <span className="font-semibold text-green-400">{tournamentData.prizePool}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4">
                      <div className="text-sm mb-2">Регистрация: {tournamentData.contactInfo}</div>
                      <div className="text-xs opacity-60">#IPS #покер #турнир</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => generateImage('square')}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать квадратное изображение
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
                  className="w-[300px] h-[533px] bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden"
                >
                  {/* Background elements */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-16 left-8 text-6xl animate-pulse">♠</div>
                    <div className="absolute top-32 right-8 text-5xl animate-pulse delay-1000">♥</div>
                    <div className="absolute bottom-32 left-8 text-6xl animate-pulse delay-2000">♦</div>
                    <div className="absolute bottom-16 right-8 text-5xl animate-pulse delay-3000">♣</div>
                  </div>

                  <div className="relative h-full flex flex-col p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                        <img src={ipsLogo} alt="IPS" className="w-12 h-12" />
                      </div>
                      <div className="font-bold text-2xl">IPS POKER</div>
                      <div className="text-sm opacity-80">International Poker Style</div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold mb-4">{tournamentData.title}</h2>
                      <Badge className="bg-yellow-500 text-black px-4 py-2">РЕЙТИНГОВЫЙ ТУРНИР</Badge>
                    </div>

                    {/* Main info */}
                    <div className="space-y-4 flex-1">
                      <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-5 h-5" />
                          <span className="font-semibold">КОГДА</span>
                        </div>
                        <div className="text-lg">{tournamentData.date} в {tournamentData.time}</div>
                      </div>

                      <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin className="w-5 h-5" />
                          <span className="font-semibold">ГДЕ</span>
                        </div>
                        <div className="text-lg">{tournamentData.location}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                          <DollarSign className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-sm opacity-80">БАЙ-ИН</div>
                          <div className="text-xl font-bold text-yellow-400">{tournamentData.buyIn}</div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                          <Trophy className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-sm opacity-80">ПРИЗЫ</div>
                          <div className="text-xl font-bold text-green-400">{tournamentData.prizePool}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                          <Users className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-sm opacity-80">МЕСТ</div>
                          <div className="text-lg font-bold">{tournamentData.maxPlayers}</div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                          <Zap className="w-6 h-6 mx-auto mb-2" />
                          <div className="text-sm opacity-80">СТЕК</div>
                          <div className="text-lg font-bold">{tournamentData.startingChips}</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                      <div className="text-sm mb-2 opacity-80">РЕГИСТРАЦИЯ</div>
                      <div className="text-xl font-bold">{tournamentData.contactInfo}</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => generateImage('story')}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать для Stories
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}