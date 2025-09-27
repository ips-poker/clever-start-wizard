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
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={shareCard} className="border-slate-200">
            <Share2 className="w-4 h-4 mr-2" />
            Поделиться
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="border-slate-200">
            <Copy className="w-4 h-4 mr-2" />
            Копировать ссылку
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsImage} className="border-slate-200">
            <Download className="w-4 h-4 mr-2" />
            Скачать
          </Button>
        </div>

        {/* Tournament Card */}
        <Card 
          id="invitation-card"
          className="w-full min-h-[600px] bg-white text-slate-900 relative overflow-hidden border border-slate-200"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
        >
          <CardContent className="p-0">
            {/* Minimal background accents */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/10 to-transparent"></div>

            <div className="relative h-full flex flex-col p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <img src={ipsLogo} alt="IPS" className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg tracking-tight text-slate-900">IPS POKER</div>
                    <div className="text-xs text-slate-500 font-medium">International Style</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                    TOURNAMENT
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-light text-slate-900 mb-2 tracking-tight leading-tight">
                  {cardData.title.replace('🏆 ', '')}
                </h1>
                <div className="text-slate-600 text-sm font-normal">
                  {cardData.description}
                </div>
              </div>

              {/* Main info */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center py-4">
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Date & Time</div>
                    <div className="text-lg font-light text-slate-900 mb-1">{cardData.date}</div>
                    <div className="text-xl font-normal text-slate-900">{cardData.time}</div>
                  </div>
                  <div className="text-center py-4">
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Location</div>
                    <div className="text-lg font-light text-slate-900">{cardData.location}</div>
                  </div>
                </div>
                
                <div className="w-full h-px bg-slate-200 my-4"></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center py-3">
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Buy-in</div>
                    <div className="text-xl font-light text-slate-900">{cardData.buyIn}</div>
                  </div>
                  <div className="text-center py-3">
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Prize Pool</div>
                    <div className="text-xl font-light text-slate-900">{cardData.prizePool}</div>
                  </div>
                </div>
              </div>

              {/* Tournament details */}
              <div className="mb-6">
                <div className="flex justify-center gap-6 text-center mb-4">
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Players</div>
                    <div className="text-sm font-light text-slate-900">{cardData.maxPlayers}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Starting Stack</div>
                    <div className="text-sm font-light text-slate-900">{cardData.startingChips}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Format</div>
                    <div className="text-sm font-light text-slate-900">{cardData.format}</div>
                  </div>
                </div>

                {/* Additional tournament info */}
                {(cardData.timerDuration || cardData.rebuyInfo || cardData.addonInfo || cardData.breakInfo) && (
                  <>
                    <div className="w-full h-px bg-slate-200 mb-4"></div>
                    <div className="space-y-3">
                      <div className="text-center text-slate-500 text-xs font-medium tracking-wide uppercase mb-4">Tournament Structure</div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        {cardData.timerDuration && (
                          <div>
                            <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Level Duration</div>
                            <div className="text-xs font-light text-slate-900">{cardData.timerDuration}</div>
                          </div>
                        )}
                        {cardData.breakInfo && (
                          <div>
                            <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Break</div>
                            <div className="text-xs font-light text-slate-900">{cardData.breakInfo}</div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        {cardData.rebuyInfo && (
                          <div>
                            <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Rebuy</div>
                            <div className="text-xs font-light text-slate-900">{cardData.rebuyInfo}</div>
                          </div>
                        )}
                        {cardData.addonInfo && (
                          <div>
                            <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Addon</div>
                            <div className="text-xs font-light text-slate-900">{cardData.addonInfo}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="mt-auto">
                <div className="text-center bg-slate-50 rounded-xl py-4">
                  <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Registration</div>
                  <div className="text-lg font-light text-slate-900">{cardData.contactInfo}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>International Poker Series</p>
          <p>#IPS #покер #турнир #poker</p>
        </div>
      </div>
    </div>
  );
}