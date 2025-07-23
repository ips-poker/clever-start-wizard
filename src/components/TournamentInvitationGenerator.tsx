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
          className="flex items-center gap-2"
        >
          <Eye size={16} />
          {showPreview ? 'Скрыть превью' : 'Показать превью'}
        </Button>
        <Button
          onClick={generatePDF}
          className="flex items-center gap-2"
        >
          <Download size={16} />
          Скачать PDF
        </Button>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Превью приглашения</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="invitation-preview" className="max-w-4xl mx-auto bg-gradient-primary border border-poker-border overflow-hidden relative shadow-dramatic rounded-lg">
              {/* Elegant Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-16 left-16 text-6xl text-poker-accent animate-float [animation-delay:0s]">♠</div>
                <div className="absolute top-32 right-24 text-5xl text-poker-accent animate-float [animation-delay:1s]">♥</div>
                <div className="absolute bottom-32 left-24 text-6xl text-poker-accent animate-float [animation-delay:2s]">♦</div>
                <div className="absolute bottom-16 right-16 text-5xl text-poker-accent animate-float [animation-delay:3s]">♣</div>
              </div>

              {/* Premium Header */}
              <div className="relative bg-gradient-accent text-white p-8 shadow-elevated">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center p-4 shadow-floating">
                      <img 
                        src={ipsLogo} 
                        alt="IPS Logo" 
                        className="w-full h-full object-contain drop-shadow-lg"
                      />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black text-white leading-none tracking-tight">IPS</h1>
                      <p className="text-xl text-white/95 font-semibold">International Poker Style</p>
                      <p className="text-sm text-white/80 font-medium">Премиальный покерный клуб</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-white/20 text-white border-white/30 px-6 py-3 text-lg font-bold backdrop-blur-sm shadow-subtle">
                      ЭКСКЛЮЗИВНО
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tournament Title Section */}
              <div className="p-8 text-center bg-gradient-hero">
                <h2 className="text-5xl font-black mb-4 text-poker-text-primary tracking-tight">
                  {tournamentData.title}
                </h2>
                <p className="text-xl text-poker-text-secondary mb-6 font-medium max-w-2xl mx-auto leading-relaxed">
                  {tournamentData.description}
                </p>
                <div className="flex justify-center items-center gap-4">
                  <Badge className="bg-poker-accent text-white px-4 py-2 font-semibold shadow-accent">
                    РЕЙТИНГОВЫЙ ТУРНИР
                  </Badge>
                  <Badge className="bg-poker-success text-white px-4 py-2 font-semibold shadow-success">
                    ELO СИСТЕМА
                  </Badge>
                </div>
              </div>

              {/* Main Information Grid */}
              <div className="px-8 pb-8 bg-gradient-surface">
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Left Column - Event Details */}
                  <div className="space-y-6">
                    <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-poker-border shadow-card">
                      <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-poker-text-primary">
                        <CalendarDays className="w-6 h-6 text-poker-accent" />
                        Детали события
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Дата:</span>
                          <span className="font-bold text-poker-accent text-lg">{tournamentData.date}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Время:</span>
                          <span className="font-bold text-poker-accent text-lg">{tournamentData.time}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Место:</span>
                          <span className="font-semibold text-poker-text-primary">{tournamentData.location}</span>
                        </div>
                        <div className="text-sm text-poker-text-muted bg-poker-surface p-3 rounded-lg border border-poker-border">
                          <MapPin className="w-4 h-4 inline mr-2 text-poker-accent" />
                          {tournamentData.address}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-poker-border shadow-card">
                      <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-poker-text-primary">
                        <DollarSign className="w-6 h-6 text-poker-success" />
                        Финансовые условия
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Бай-ин:</span>
                          <span className="font-black text-3xl text-poker-success">{tournamentData.buyIn}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Призовой фонд:</span>
                          <span className="font-bold text-xl text-poker-success">{tournamentData.prizePool}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="text-center p-3 bg-poker-surface rounded-lg border border-poker-border">
                            <div className="text-sm text-poker-text-muted">Ребай</div>
                            <div className="font-semibold text-poker-text-primary">{tournamentData.rebuyAmount}</div>
                          </div>
                          <div className="text-center p-3 bg-poker-surface rounded-lg border border-poker-border">
                            <div className="text-sm text-poker-text-muted">Аддон</div>
                            <div className="font-semibold text-poker-text-primary">{tournamentData.addonAmount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Tournament Structure */}
                  <div className="space-y-6">
                    <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-poker-border shadow-card">
                      <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-poker-text-primary">
                        <Trophy className="w-6 h-6 text-poker-accent" />
                        Структура турнира
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Формат:</span>
                          <Badge variant="secondary" className="bg-poker-accent text-white font-semibold">{tournamentData.format}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Максимум игроков:</span>
                          <span className="font-bold text-poker-text-primary">{tournamentData.maxPlayers}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Стартовые фишки:</span>
                          <span className="font-bold text-poker-text-primary">{tournamentData.startingChips}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-poker-text-secondary font-medium">Уровень:</span>
                          <span className="font-bold text-poker-text-primary">{tournamentData.levels}</span>
                        </div>
                        <div className="text-sm text-poker-text-muted bg-poker-surface p-3 rounded-lg border border-poker-border mt-4">
                          <Clock className="w-4 h-4 inline mr-2 text-poker-accent" />
                          {tournamentData.rebuyInfo}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-poker-border shadow-card">
                      <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-poker-text-primary">
                        <Star className="w-6 h-6 text-poker-accent" />
                        Преимущества участия
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-poker-surface rounded-lg border border-poker-border">
                          <Shield className="w-5 h-5 text-poker-accent flex-shrink-0" />
                          <span className="text-sm font-medium text-poker-text-primary">Рейтинговый турнир ELO</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-poker-surface rounded-lg border border-poker-border">
                          <Award className="w-5 h-5 text-poker-success flex-shrink-0" />
                          <span className="text-sm font-medium text-poker-text-primary">Профессиональная организация</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-poker-surface rounded-lg border border-poker-border">
                          <TrendingUp className="w-5 h-5 text-poker-accent flex-shrink-0" />
                          <span className="text-sm font-medium text-poker-text-primary">Рост в рейтинге игроков</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-poker-surface rounded-lg border border-poker-border">
                          <Users className="w-5 h-5 text-poker-success flex-shrink-0" />
                          <span className="text-sm font-medium text-poker-text-primary">Элитное сообщество</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Text Section */}
                <div className="bg-gradient-accent rounded-xl p-8 border border-poker-accent/30 mb-8 text-white shadow-accent">
                  <h3 className="text-3xl font-black text-center mb-8">
                    🎯 Почему стоит участвовать?
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                      <h4 className="font-bold text-xl mb-3">💰 Крупный призовой фонд</h4>
                      <p className="text-sm text-white/90 leading-relaxed">Гарантированные выплаты победителям и призерам турнира</p>
                    </div>
                    <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                      <h4 className="font-bold text-xl mb-3">🏆 Престиж и статус</h4>
                      <p className="text-sm text-white/90 leading-relaxed">Победа в турнире IPS повышает ваш статус в покерном сообществе</p>
                    </div>
                    <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                      <h4 className="font-bold text-xl mb-3">🎓 Развитие навыков</h4>
                      <p className="text-sm text-white/90 leading-relaxed">Игра с профессионалами значительно улучшит ваше мастерство</p>
                    </div>
                  </div>
                </div>

                {/* Contact and Registration */}
                <div className="bg-gradient-card rounded-xl p-8 border border-poker-border shadow-elevated">
                  <div className="text-center">
                    <h3 className="text-3xl font-black mb-6 text-poker-text-primary">Регистрация и контакты</h3>
                    <p className="text-lg mb-6 text-poker-text-secondary font-medium">Для участия в турнире свяжитесь с нами:</p>
                    <div className="text-2xl font-bold text-poker-accent mb-8">{tournamentData.contactInfo}</div>
                    
                    <div className="flex justify-center items-center gap-6 mb-8">
                      <Badge className="bg-poker-error text-white px-6 py-3 text-sm font-bold animate-pulse shadow-floating">
                        ОГРАНИЧЕННЫЕ МЕСТА!
                      </Badge>
                      <Badge className="bg-poker-success text-white px-6 py-3 text-sm font-bold shadow-success">
                        РЕГИСТРАЦИЯ ОТКРЫТА
                      </Badge>
                    </div>
                    
                    <div className="border-t border-poker-border pt-6">
                      <p className="text-sm text-poker-text-muted font-medium">
                        Генерировано системой IPS Tournament Manager • {new Date().toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}