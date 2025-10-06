import React from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  DollarSign, 
  PlayCircle,
  ChevronRight,
  Coins,
  Crown,
  Target,
  Zap,
  Shield,
  Repeat,
  Lock
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  participation_fee: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format?: string;
  reentry_end_level?: number;
  additional_level?: number;
  break_start_level?: number;
  _count?: {
    tournament_registrations: number;
  };
}

interface TournamentTicketCardProps {
  tournament: Tournament;
  onViewDetails: () => void;
  onRegister: () => void;
}

export function TournamentTicketCard({ tournament, onViewDetails, onRegister }: TournamentTicketCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'registration': { 
        label: 'Регистрация открыта', 
        className: 'bg-poker-green/30 text-poker-green border-2 border-poker-green/50 shadow-lg',
        glow: 'shadow-[0_0_10px_hsl(var(--poker-green)/0.3)]'
      },
      'running': { 
        label: 'Турнир проходит', 
        className: 'bg-poker-red/30 text-poker-red-light border-2 border-poker-red/50 shadow-lg',
        glow: 'shadow-[0_0_10px_hsl(var(--poker-red)/0.3)]'
      },
      'scheduled': { 
        label: 'Запланирован', 
        className: 'bg-poker-blue/30 text-poker-blue border-2 border-poker-blue/50 shadow-lg',
        glow: 'shadow-[0_0_10px_hsl(var(--poker-blue)/0.3)]'
      },
      'completed': { 
        label: 'Завершен', 
        className: 'bg-poker-gray/30 text-muted-foreground border-2 border-poker-gray/50 shadow-lg',
        glow: ''
      },
      'paused': { 
        label: 'Приостановлен', 
        className: 'bg-poker-gray/30 text-muted-foreground border-2 border-poker-gray/50 shadow-lg',
        glow: ''
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`px-3 py-1 rounded-full text-xs font-bold ${config.className}`}>
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${config.glow ? `bg-current ${config.glow}` : 'bg-current'}`}></span>
        {config.label}
      </Badge>
    );
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case 'registration':
        return 'Зарегистрироваться';
      case 'running':
        return 'Турнир идет';
      case 'completed':
        return 'Завершен';
      default:
        return 'Недоступно';
    }
  };

  const registeredCount = tournament._count?.tournament_registrations || 0;
  const spotsLeft = tournament.max_players - registeredCount;
  const isFilling = spotsLeft <= 3 && spotsLeft > 0;
  const ticketNumber = tournament.id.split('-')[0].toUpperCase();
  const barcodeValue = tournament.id.replace(/-/g, '').substring(0, 12).toUpperCase();
  const qrCodeData = JSON.stringify({
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    startTime: tournament.start_time,
    url: `${window.location.origin}/tournaments?id=${tournament.id}`
  });
  
  // Calculate time until start
  const timeUntilStart = () => {
    const now = new Date();
    const start = new Date(tournament.start_time);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `через ${days}д`;
    }
    if (hours > 0) {
      return `через ${hours}ч ${minutes}м`;
    }
    return `через ${minutes}м`;
  };
  
  // Calculate prize pool
  const prizePool = tournament.participation_fee * registeredCount;
  
  // Get format icon
  const getFormatIcon = () => {
    switch (tournament.tournament_format) {
      case 'rebuy':
        return <Repeat className="h-3 w-3" />;
      case 'reentry':
        return <Shield className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };
  
  // Get format name
  const getFormatName = () => {
    switch (tournament.tournament_format) {
      case 'rebuy':
        return 'Rebuy';
      case 'reentry':
        return 'Re-entry';
      default:
        return 'Freezeout';
    }
  };

  return (
    <div className="group relative w-full max-w-sm mx-auto">
      {/* Holographic glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-poker-gold via-poker-accent to-poker-blue rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
      
      {/* Main ticket container */}
      <div className="relative bg-gradient-poker-card border border-poker-gold/30 rounded-2xl overflow-hidden shadow-poker-elevated group-hover:shadow-poker-gold group-hover:border-poker-gold/50 group-hover:-translate-y-1 transition-all duration-300 backdrop-blur-2xl">
        
        {/* Ticket perforations - left side */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-background rounded-full -ml-1 border border-poker-gold/30 shadow-inner"></div>
            ))}
          </div>
        </div>
        
        {/* Ticket perforations - right side */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-background rounded-full -mr-1 border border-poker-gold/30 shadow-inner"></div>
            ))}
          </div>
        </div>
        
        {/* Diagonal tear line - adjusted */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-poker-gold/20 to-transparent" style={{ top: '62%' }}></div>
        
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-6 text-3xl text-poker-gold transform rotate-12">♠</div>
          <div className="absolute top-16 left-4 text-2xl text-poker-red transform -rotate-12">♥</div>
          <div className="absolute bottom-12 right-8 text-4xl text-poker-gold transform rotate-45">♦</div>
          <div className="absolute bottom-4 left-6 text-3xl text-poker-red transform -rotate-30">♣</div>
        </div>
        
        {/* Security pattern watermark */}
        <div className="absolute inset-0 opacity-[0.02] overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
            color: 'hsl(var(--poker-gold))'
          }}></div>
        </div>
        
        {/* Premium badge watermark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <div className="text-8xl font-bold text-poker-gold tracking-widest">VIP</div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-5 relative z-10">
          {/* Ticket number badge - holographic effect */}
          <div className="absolute top-3 right-3 bg-gradient-to-br from-poker-gold/30 via-poker-gold/20 to-poker-gold-light/30 backdrop-blur-sm border-2 border-poker-gold/50 rounded-lg px-3 py-2 shadow-poker-glow">
            <div className="relative">
              <div className="absolute inset-0 bg-poker-gold opacity-20 blur-sm"></div>
              <div className="flex items-center gap-2 relative">
                <div className="flex flex-col">
                  <span className="text-[9px] text-poker-gold font-mono uppercase tracking-widest font-bold">TICKET</span>
                  <span className="text-sm text-foreground font-bold font-mono tracking-wide">#{ticketNumber}</span>
                </div>
                <Trophy className="h-4 w-4 text-poker-gold" />
              </div>
            </div>
          </div>

          {/* Header with title and status */}
          <div className="text-center mb-4 pr-20">
            <h3 className="text-xl font-bold text-foreground tracking-wide mb-2">
              {tournament.name}
            </h3>
            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-poker-gold to-transparent mx-auto mb-3"></div>
            <div className="flex justify-center gap-2 flex-wrap">
              {getStatusBadge(tournament.status)}
              
              {/* Format badge */}
              <Badge className="bg-poker-accent/30 text-foreground border-2 border-poker-accent/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                {getFormatIcon()}
                <span className="ml-1.5">{getFormatName()}</span>
              </Badge>
              
              {isFilling && (
                <Badge className="bg-poker-red/30 text-poker-red-light border-2 border-poker-red/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  <Zap className="h-3 w-3 mr-1 inline" />
                  Осталось {spotsLeft}!
                </Badge>
              )}
              {timeUntilStart() && tournament.status === 'registration' && (
                <Badge className="bg-poker-blue/30 text-foreground border-2 border-poker-blue/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {timeUntilStart()}
                </Badge>
              )}
            </div>
          </div>

          {/* Prize Pool Banner */}
          {prizePool > 0 && (
            <div className="mb-3 bg-gradient-to-r from-poker-gold/20 via-poker-gold-light/20 to-poker-gold/20 border-2 border-poker-gold/40 rounded-lg p-2.5 shadow-poker-glow relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-poker-gold/10 to-transparent"></div>
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-poker-gold rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[9px] text-poker-gold font-semibold uppercase tracking-wider">Prize Pool</p>
                    <p className="text-lg font-bold text-foreground tracking-tight">{prizePool.toLocaleString()} ₽</p>
                  </div>
                </div>
                <Crown className="h-7 w-7 text-poker-gold/30" />
              </div>
            </div>
          )}

          {/* Compact 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Date & Time */}
            <div className="bg-gradient-to-br from-foreground/10 via-foreground/5 to-foreground/10 rounded-lg p-2.5 border border-border backdrop-blur-sm shadow-card">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-poker-blue to-poker-blue rounded-md flex items-center justify-center shadow-md">
                  <Calendar className="h-3.5 w-3.5 text-foreground" />
                </div>
                <h4 className="text-[10px] font-semibold text-foreground">Дата и время</h4>
              </div>
              <p className="text-xs font-medium text-foreground mb-0.5">
                {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'short'
                })}
              </p>
              <p className="text-xs text-poker-gold font-bold">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            {/* Participants */}
            <div className="bg-gradient-to-br from-foreground/10 via-foreground/5 to-foreground/10 rounded-lg p-2.5 border border-border backdrop-blur-sm shadow-card">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-poker-accent to-poker-accent rounded-md flex items-center justify-center shadow-md">
                  <Users className="h-3.5 w-3.5 text-foreground" />
                </div>
                <h4 className="text-[10px] font-semibold text-foreground">Участники</h4>
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base font-bold text-foreground">{registeredCount}</span>
                <span className="text-muted-foreground text-sm">/</span>
                <span className="text-base font-medium text-muted-foreground">{tournament.max_players}</span>
              </div>
              <div className="bg-muted rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-poker-gold transition-all duration-500"
                  style={{ width: `${Math.min((registeredCount / tournament.max_players) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Buy-in - EMPHASIZED */}
            <div className="bg-gradient-to-br from-poker-green/20 via-poker-green/10 to-poker-green/20 rounded-lg p-2.5 border-2 border-poker-green/40 backdrop-blur-sm shadow-success">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-success rounded-md flex items-center justify-center shadow-md">
                  <DollarSign className="h-3.5 w-3.5 text-foreground" />
                </div>
                <h4 className="text-[10px] font-semibold text-poker-green">Орг. взнос</h4>
              </div>
              <p className="text-xl font-bold text-foreground">{tournament.participation_fee.toLocaleString()} ₽</p>
              {(tournament.reentry_fee && tournament.reentry_fee > 0) && (
                <p className="text-[9px] text-muted-foreground mt-0.5">Re-entry: {tournament.reentry_fee.toLocaleString()} ₽</p>
              )}
            </div>

            {/* Starting Stack */}
            <div className="bg-gradient-to-br from-foreground/10 via-foreground/5 to-foreground/10 rounded-lg p-2.5 border border-border backdrop-blur-sm shadow-card">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-poker-red to-poker-red-dark rounded-md flex items-center justify-center shadow-md">
                  <Coins className="h-3.5 w-3.5 text-foreground" />
                </div>
                <h4 className="text-[10px] font-semibold text-foreground">Стартовый стек</h4>
              </div>
              <p className="text-sm font-bold text-foreground">{tournament.starting_chips?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Actions */}
        <div className="p-4 bg-gradient-poker-surface relative backdrop-blur-md border-t border-poker-gold/10">
          {/* Barcode and QR Code - Horizontal */}
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Real Barcode */}
            <div className="flex-1">
              <div className="bg-foreground rounded-md px-2 py-2 shadow-elevated border border-border">
                <Barcode 
                  value={barcodeValue}
                  height={35}
                  width={1.2}
                  fontSize={8}
                  background="hsl(var(--foreground))"
                  lineColor="hsl(var(--background))"
                  displayValue={true}
                  margin={0}
                />
              </div>
            </div>
            
            {/* Real QR Code - Small */}
            <div className="bg-foreground rounded-md p-2 shadow-elevated border border-border flex-shrink-0">
              <QRCodeSVG 
                value={qrCodeData}
                size={60}
                level="H"
                includeMargin={false}
                bgColor="hsl(var(--foreground))"
                fgColor="hsl(var(--background))"
              />
            </div>
          </div>
          
          {/* Microtext security features */}
          <div className="flex items-center justify-between mb-3 text-[7px] text-muted-foreground font-mono px-1">
            <span>VALID • AUTHENTIC • SECURE</span>
            <span>ID:{ticketNumber}</span>
          </div>

          {/* Enhanced CTA Button with Price */}
          <Button 
            onClick={onRegister}
            disabled={tournament.status !== 'registration'}
            className="relative w-full bg-gradient-poker-gold hover:bg-gradient-poker-accent text-background font-bold py-3.5 px-4 rounded-lg shadow-poker-gold hover:shadow-poker-red transition-all duration-300 text-base disabled:opacity-50 disabled:cursor-not-allowed border-2 border-poker-gold/50 mb-2"
          >
            <div className="flex items-center justify-center gap-3">
              <PlayCircle className="h-5 w-5" />
              <span>{getButtonText(tournament.status)}</span>
              {tournament.status === 'registration' && (
                <span className="text-sm font-bold ml-auto">{tournament.participation_fee.toLocaleString()} ₽</span>
              )}
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onViewDetails}
            className="w-full border-2 border-border bg-card text-foreground hover:bg-accent hover:border-poker-gold/50 transition-all duration-300 text-sm rounded-lg group/info font-semibold py-2.5"
          >
            Подробная информация
            <ChevronRight className="h-4 w-4 ml-auto group-hover/info:translate-x-1 transition-transform" />
          </Button>
        </div>
        
        {/* Corner decorations - enhanced */}
        <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-poker-gold/30 rounded-tl-2xl"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-poker-gold/20 rounded-tl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-poker-gold/30 rounded-br-2xl"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-poker-gold/20 rounded-br-2xl"></div>
      </div>
    </div>
  );
}
