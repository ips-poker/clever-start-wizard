import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, DollarSign, Trophy, Users, Download, Eye, Star, Shield, Award, TrendingUp } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ipsLogo from "/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png";

interface TournamentData {
  title: string;
  date: string;
  time: string;
  location: string;
  address: string;
  buyIn: string;
  format: string;
  description: string;
  rebuyInfo: string;
  contactInfo: string;
  prizePool: string;
  maxPlayers: string;
  startingChips: string;
  rebuyAmount: string;
  addonAmount: string;
  levels: string;
  blindIncrease: string;
}

export function TournamentInvitationGenerator() {
  const [tournamentData, setTournamentData] = useState<TournamentData>({
    title: "Рейтинговый турнир по покеру",
    date: "30.07.2025",
    time: "18:00",
    location: "TNG Lounge",
    address: "г. Москва, Фридриха Энгельса, 64 стр 1",
    buyIn: "2000 руб",
    format: "Турнир с ребаями",
    description: "Эксклюзивный рейтинговый турнир для ценителей профессионального покера",
    rebuyInfo: "Возможность ребая до 6-го уровня",
    contactInfo: "Телеграм: @ips_poker",
    prizePool: "100 000 руб",
    maxPlayers: "50",
    startingChips: "10 000",
    rebuyAmount: "2000 руб",
    addonAmount: "3000 руб", 
    levels: "20 минут",
    blindIncrease: "Прогрессивное увеличение"
  });

  const [showPreview, setShowPreview] = useState(false);

  const updateField = (field: keyof TournamentData, value: string) => {
    setTournamentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePDF = async () => {
    const element = document.getElementById('invitation-preview');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`poker-tournament-invitation-${tournamentData.date.replace(/\./g, '-')}.pdf`);
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название турнира</Label>
            <Input
              id="title"
              value={tournamentData.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                value={tournamentData.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Время</Label>
              <Input
                id="time"
                value={tournamentData.time}
                onChange={(e) => updateField('time', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Место проведения</Label>
            <Input
              id="location"
              value={tournamentData.location}
              onChange={(e) => updateField('location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={tournamentData.address}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactInfo">Контактная информация</Label>
            <Input
              id="contactInfo"
              value={tournamentData.contactInfo}
              onChange={(e) => updateField('contactInfo', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buyIn">Бай-ин</Label>
            <Input
              id="buyIn"
              value={tournamentData.buyIn}
              onChange={(e) => updateField('buyIn', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizePool">Призовой фонд</Label>
            <Input
              id="prizePool"
              value={tournamentData.prizePool}
              onChange={(e) => updateField('prizePool', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Максимум игроков</Label>
            <Input
              id="maxPlayers"
              value={tournamentData.maxPlayers}
              onChange={(e) => updateField('maxPlayers', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startingChips">Стартовые фишки</Label>
            <Input
              id="startingChips"
              value={tournamentData.startingChips}
              onChange={(e) => updateField('startingChips', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="levels">Продолжительность уровня</Label>
            <Input
              id="levels"
              value={tournamentData.levels}
              onChange={(e) => updateField('levels', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="format">Формат турнира</Label>
            <Select value={tournamentData.format} onValueChange={(value) => updateField('format', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Турнир с ребаями">Турнир с ребаями</SelectItem>
                <SelectItem value="Фризаут">Фризаут</SelectItem>
                <SelectItem value="Турбо">Турбо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rebuyAmount">Стоимость ребая</Label>
            <Input
              id="rebuyAmount"
              value={tournamentData.rebuyAmount}
              onChange={(e) => updateField('rebuyAmount', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addonAmount">Стоимость аддона</Label>
            <Input
              id="addonAmount"
              value={tournamentData.addonAmount}
              onChange={(e) => updateField('addonAmount', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rebuyInfo">Информация о ребаях</Label>
            <Input
              id="rebuyInfo"
              value={tournamentData.rebuyInfo}
              onChange={(e) => updateField('rebuyInfo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blindIncrease">Увеличение блайндов</Label>
            <Input
              id="blindIncrease"
              value={tournamentData.blindIncrease}
              onChange={(e) => updateField('blindIncrease', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Описание и продающий текст</Label>
          <Textarea
            id="description"
            value={tournamentData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={4}
            placeholder="Напишите привлекательное описание турнира, которое заинтересует игроков..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant="outline"
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-gray-50/80 hover:shadow-subtle hover:scale-105 transition-all duration-300 group"
        >
          <Eye size={16} className="group-hover:animate-bounce transition-transform duration-300" />
          <span className="group-hover:translate-x-1 transition-transform duration-300">
            {showPreview ? 'Скрыть превью' : 'Показать превью'}
          </span>
        </Button>
        <Button
          onClick={generatePDF}
          className="flex items-center gap-2 bg-gradient-button text-white hover:shadow-elevated hover:scale-105 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <Download size={16} className="group-hover:animate-bounce transition-transform duration-300 relative z-10" />
          <span className="group-hover:translate-x-1 transition-transform duration-300 relative z-10">
            Скачать PDF
          </span>
        </Button>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Превью приглашения</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="invitation-preview" className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-floating rounded-xl overflow-hidden relative">
              {/* Elegant Background Pattern */}
              <div className="absolute inset-0 opacity-3">
                <div className="absolute top-16 left-16 text-6xl text-gray-300/40 animate-float [animation-delay:0s]">♠</div>
                <div className="absolute top-32 right-24 text-5xl text-gray-300/30 animate-float [animation-delay:1s]">♥</div>
                <div className="absolute bottom-32 left-24 text-6xl text-gray-300/40 animate-float [animation-delay:2s]">♦</div>
                <div className="absolute bottom-16 right-16 text-5xl text-gray-300/30 animate-float [animation-delay:3s]">♣</div>
              </div>

              {/* Refined Header */}
              <div className="relative bg-white/90 backdrop-blur-sm border-b border-gray-200/30 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 flex items-center justify-center p-4 shadow-subtle">
                      <img 
                        src={ipsLogo} 
                        alt="IPS Logo" 
                        className="w-full h-full object-contain drop-shadow-sm"
                      />
                    </div>
                    <div>
                      <h1 className="text-4xl font-light text-gray-800 leading-none tracking-tight">IPS</h1>
                      <p className="text-xl text-gray-600 font-light">International Poker Style</p>
                      <p className="text-sm text-gray-500 font-light">Премиальный покерный клуб</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-gray-100/80 text-gray-700 border-gray-200/50 px-6 py-3 text-lg font-light backdrop-blur-sm">
                      ЭКСКЛЮЗИВНО
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tournament Title Section */}
              <div className="p-8 text-center bg-white/60 backdrop-blur-sm">
                <h2 className="text-5xl font-light mb-4 text-gray-800 tracking-tight">
                  {tournamentData.title}
                </h2>
                <p className="text-xl text-gray-600 mb-6 font-light max-w-2xl mx-auto leading-relaxed">
                  {tournamentData.description}
                </p>
                <div className="flex justify-center items-center gap-4">
                  <Badge className="bg-gray-100/80 text-gray-700 px-4 py-2 font-light border border-gray-200/50">
                    РЕЙТИНГОВЫЙ ТУРНИР
                  </Badge>
                  <Badge className="bg-gray-100/80 text-gray-700 px-4 py-2 font-light border border-gray-200/50">
                    ELO СИСТЕМА
                  </Badge>
                </div>
              </div>

              {/* Main Information Grid */}
              <div className="px-8 pb-8 bg-white/40 backdrop-blur-sm">
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Left Column - Event Details */}
                  <div className="space-y-6">
                    <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle rounded-xl overflow-hidden">
                      <CardHeader className="bg-white/50 border-b border-gray-200/30">
                        <CardTitle className="text-xl font-light text-gray-800 flex items-center gap-3">
                          <div className="p-2 bg-gray-100/80 rounded-lg">
                            <CalendarDays className="w-5 h-5 text-gray-600" />
                          </div>
                          Детали события
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Дата:</span>
                          <span className="font-light text-lg text-gray-800">{tournamentData.date}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Время:</span>
                          <span className="font-light text-lg text-gray-800">{tournamentData.time}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Место:</span>
                          <span className="font-light text-gray-800">{tournamentData.location}</span>
                        </div>
                        <div className="text-sm text-gray-500 bg-white/50 p-3 rounded-lg border border-gray-200/30">
                          <MapPin className="w-4 h-4 inline mr-2 text-gray-400" />
                          {tournamentData.address}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle rounded-xl overflow-hidden">
                      <CardHeader className="bg-white/50 border-b border-gray-200/30">
                        <CardTitle className="text-xl font-light text-gray-800 flex items-center gap-3">
                          <div className="p-2 bg-gray-100/80 rounded-lg">
                            <DollarSign className="w-5 h-5 text-gray-600" />
                          </div>
                          Финансовые условия
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Бай-ин:</span>
                          <span className="font-light text-3xl text-gray-800">{tournamentData.buyIn}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Призовой фонд:</span>
                          <span className="font-light text-xl text-gray-700">{tournamentData.prizePool}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="text-center p-3 bg-white/50 rounded-lg border border-gray-200/30">
                            <div className="text-sm text-gray-500 font-light">Ребай</div>
                            <div className="font-light text-gray-800">{tournamentData.rebuyAmount}</div>
                          </div>
                          <div className="text-center p-3 bg-white/50 rounded-lg border border-gray-200/30">
                            <div className="text-sm text-gray-500 font-light">Аддон</div>
                            <div className="font-light text-gray-800">{tournamentData.addonAmount}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Tournament Structure */}
                  <div className="space-y-6">
                    <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle rounded-xl overflow-hidden">
                      <CardHeader className="bg-white/50 border-b border-gray-200/30">
                        <CardTitle className="text-xl font-light text-gray-800 flex items-center gap-3">
                          <div className="p-2 bg-gray-100/80 rounded-lg">
                            <Trophy className="w-5 h-5 text-gray-600" />
                          </div>
                          Структура турнира
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Формат:</span>
                          <Badge className="bg-gray-100/80 text-gray-700 font-light border border-gray-200/50">{tournamentData.format}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Максимум игроков:</span>
                          <span className="font-light text-gray-800">{tournamentData.maxPlayers}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Стартовые фишки:</span>
                          <span className="font-light text-gray-800">{tournamentData.startingChips}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-light">Уровень:</span>
                          <span className="font-light text-gray-800">{tournamentData.levels}</span>
                        </div>
                        <div className="text-sm text-gray-500 bg-white/50 p-3 rounded-lg border border-gray-200/30 mt-4">
                          <Clock className="w-4 h-4 inline mr-2 text-gray-400" />
                          {tournamentData.rebuyInfo}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle rounded-xl overflow-hidden">
                      <CardHeader className="bg-white/50 border-b border-gray-200/30">
                        <CardTitle className="text-xl font-light text-gray-800 flex items-center gap-3">
                          <div className="p-2 bg-gray-100/80 rounded-lg">
                            <Star className="w-5 h-5 text-gray-600" />
                          </div>
                          Преимущества участия
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-gray-200/30">
                          <Shield className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <span className="text-sm font-light text-gray-700">Рейтинговый турнир ELO</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-gray-200/30">
                          <Award className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <span className="text-sm font-light text-gray-700">Профессиональная организация</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-gray-200/30">
                          <TrendingUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <span className="text-sm font-light text-gray-700">Рост в рейтинге игроков</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-gray-200/30">
                          <Users className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <span className="text-sm font-light text-gray-700">Элитное сообщество</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Sales Text Section */}
                <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-card rounded-xl overflow-hidden mb-8">
                  <CardHeader className="bg-white/60 border-b border-gray-200/30 text-center">
                    <CardTitle className="text-3xl font-light text-gray-800">
                      🎯 Почему стоит участвовать?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid md:grid-cols-3 gap-6 text-center">
                      <div className="p-6 bg-white/60 rounded-xl border border-gray-200/40">
                        <h4 className="font-light text-xl mb-3 text-gray-800">💰 Крупный призовой фонд</h4>
                        <p className="text-sm text-gray-600 leading-relaxed font-light">Гарантированные выплаты победителям и призерам турнира</p>
                      </div>
                      <div className="p-6 bg-white/60 rounded-xl border border-gray-200/40">
                        <h4 className="font-light text-xl mb-3 text-gray-800">🏆 Престиж и статус</h4>
                        <p className="text-sm text-gray-600 leading-relaxed font-light">Победа в турнире IPS повышает ваш статус в покерном сообществе</p>
                      </div>
                      <div className="p-6 bg-white/60 rounded-xl border border-gray-200/40">
                        <h4 className="font-light text-xl mb-3 text-gray-800">🎓 Развитие навыков</h4>
                        <p className="text-sm text-gray-600 leading-relaxed font-light">Игра с профессионалами значительно улучшит ваше мастерство</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact and Registration */}
                <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-card rounded-xl overflow-hidden">
                  <CardHeader className="bg-white/60 border-b border-gray-200/30 text-center">
                    <CardTitle className="text-3xl font-light text-gray-800">Регистрация и контакты</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 text-center">
                    <p className="text-lg mb-6 text-gray-600 font-light">Для участия в турнире свяжитесь с нами:</p>
                    <div className="text-2xl font-light text-gray-800 mb-8">{tournamentData.contactInfo}</div>
                    
                    <div className="flex justify-center items-center gap-6 mb-8">
                      <Badge className="bg-red-50 text-red-600 border-red-200 px-6 py-3 text-sm font-light animate-pulse">
                        ОГРАНИЧЕННЫЕ МЕСТА!
                      </Badge>
                      <Badge className="bg-green-50 text-green-600 border-green-200 px-6 py-3 text-sm font-light">
                        РЕГИСТРАЦИЯ ОТКРЫТА
                      </Badge>
                    </div>
                    
                    <div className="border-t border-gray-200/50 pt-6">
                      <p className="text-sm text-gray-400 font-light">
                        Генерировано системой IPS Tournament Manager • {new Date().toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}