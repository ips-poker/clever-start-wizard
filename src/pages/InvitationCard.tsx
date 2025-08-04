import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Trophy, 
  Users, 
  Download,
  Share2,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';
import ipsLogo from "/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png";

interface TournamentCardData {
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
}

export default function InvitationCard() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [cardData, setCardData] = useState<TournamentCardData | null>(null);

  useEffect(() => {
    // Получаем данные из URL параметров
    const data = {
      title: searchParams.get('title') || 'Покерный турнир IPS',
      date: searchParams.get('date') || '01.01.2025',
      time: searchParams.get('time') || '18:00',
      location: searchParams.get('location') || 'TNG Lounge',
      buyIn: searchParams.get('buyIn') || '2000₽',
      format: searchParams.get('format') || 'Rebuy',
      description: searchParams.get('description') || 'Эксклюзивный рейтинговый турнир',
      contactInfo: searchParams.get('contactInfo') || '@ips_poker',
      prizePool: searchParams.get('prizePool') || '100 000₽',
      maxPlayers: searchParams.get('maxPlayers') || '50',
      startingChips: searchParams.get('startingChips') || '10 000',
      rebuyInfo: searchParams.get('rebuyInfo') || undefined,
      addonInfo: searchParams.get('addonInfo') || undefined,
      timerDuration: searchParams.get('timerDuration') || undefined,
      breakInfo: searchParams.get('breakInfo') || undefined,
    };
    
    setCardData(data);
  }, [searchParams]);

  const shareCard = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: cardData?.title || 'Покерный турнир',
          text: `${cardData?.title} - ${cardData?.date} в ${cardData?.time}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Ошибка при попытке поделиться:', err);
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: "Ссылка скопирована!",
        description: "Ссылка на приглашение скопирована в буфер обмена",
      });
    });
  };

  const downloadAsImage = async () => {
    const element = document.getElementById('invitation-card');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `poker-invitation-${cardData?.date?.replace(/\./g, '-') || 'card'}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Карточка скачана",
        description: "Изображение сохранено на устройство",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать изображение. Попробуйте сделать скриншот.",
        variant: "destructive"
      });
    }
  };

  if (!cardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка приглашения...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={shareCard} className="border-poker-border">
            <Share2 className="w-4 h-4 mr-2" />
            Поделиться
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="border-poker-border">
            <Copy className="w-4 h-4 mr-2" />
            Копировать ссылку
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsImage} className="border-poker-border">
            <Download className="w-4 h-4 mr-2" />
            Скачать
          </Button>
        </div>

        {/* Tournament Card */}
        <Card 
          id="invitation-card"
          className="overflow-hidden bg-gradient-card border-poker-border shadow-elevated"
        >
          <CardContent className="p-0">
            {/* Header with Logo */}
            <div className="relative bg-gradient-accent text-primary-foreground p-6 text-center">
              <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <img 
                  src={ipsLogo} 
                  alt="IPS Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="pr-16">
                <h1 className="text-xl font-bold leading-tight mb-2 text-white">
                  {cardData.title}
                </h1>
                <p className="text-white/90 text-sm">
                  {cardData.description}
                </p>
              </div>
            </div>

            {/* Main Info */}
            <div className="p-6 space-y-4">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-poker-accent/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-poker-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-poker-text-secondary">Дата</p>
                    <p className="font-semibold text-poker-text-primary">{cardData.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-poker-accent/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-poker-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-poker-text-secondary">Время</p>
                    <p className="font-semibold text-poker-text-primary">{cardData.time}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-poker-accent/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-poker-accent" />
                </div>
                <div>
                  <p className="text-sm text-poker-text-secondary">Место проведения</p>
                  <p className="font-semibold text-poker-text-primary">{cardData.location}</p>
                </div>
              </div>

              {/* Tournament Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-poker-border">
                <div className="text-center">
                  <DollarSign className="w-6 h-6 text-poker-accent mx-auto mb-1" />
                  <p className="text-sm text-poker-text-secondary">Бай-ин</p>
                  <p className="font-bold text-lg text-poker-text-primary">{cardData.buyIn}</p>
                </div>
                <div className="text-center">
                  <Trophy className="w-6 h-6 text-poker-accent mx-auto mb-1" />
                  <p className="text-sm text-poker-text-secondary">Призовой фонд</p>
                  <p className="font-bold text-lg text-poker-text-primary">{cardData.prizePool}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Users className="w-6 h-6 text-poker-accent mx-auto mb-1" />
                  <p className="text-sm text-poker-text-secondary">Игроков</p>
                  <p className="font-semibold text-poker-text-primary">{cardData.maxPlayers}</p>
                </div>
                <div className="text-center">
                  <div className="w-6 h-6 rounded bg-poker-accent/20 text-poker-accent flex items-center justify-center mx-auto mb-1 text-sm font-bold">
                    T
                  </div>
                  <p className="text-sm text-poker-text-secondary">Стартовый стек</p>
                  <p className="font-semibold text-poker-text-primary">{cardData.startingChips}</p>
                </div>
              </div>

              {/* Format Badge */}
              <div className="flex justify-center pt-4">
                <Badge variant="secondary" className="text-sm px-4 py-1 bg-poker-accent/10 text-poker-accent border-poker-accent/20">
                  {cardData.format} Tournament
                </Badge>
              </div>

              {/* Additional Info */}
              {(cardData.rebuyInfo || cardData.addonInfo || cardData.timerDuration || cardData.breakInfo) && (
                <div className="pt-4 border-t border-poker-border space-y-2">
                  <h3 className="font-semibold text-sm text-poker-text-secondary uppercase tracking-wide">
                    Структура турнира
                  </h3>
                  {cardData.timerDuration && (
                    <p className="text-sm text-poker-text-primary">⏱️ {cardData.timerDuration}</p>
                  )}
                  {cardData.rebuyInfo && (
                    <p className="text-sm text-poker-text-primary">🔄 Rebuy: {cardData.rebuyInfo}</p>
                  )}
                  {cardData.addonInfo && (
                    <p className="text-sm text-poker-text-primary">➕ Addon: {cardData.addonInfo}</p>
                  )}
                  {cardData.breakInfo && (
                    <p className="text-sm text-poker-text-primary">☕ {cardData.breakInfo}</p>
                  )}
                </div>
              )}

              {/* Contact Info */}
              <div className="bg-poker-surface rounded-lg p-4 text-center border border-poker-border">
                <p className="text-sm text-poker-text-secondary mb-1">Регистрация</p>
                <p className="font-semibold text-poker-accent">{cardData.contactInfo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-poker-text-muted space-y-1">
          <p>International Poker Series</p>
          <p>#IPS #покер #турнир #poker</p>
        </div>
      </div>
    </div>
  );
}