import React from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateTotalRPSPool, formatRPSPoints, formatParticipationFee } from "@/utils/rpsCalculations";
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
  calculated_prize_pool?: number;
  total_reentries?: number;
  total_additional_sets?: number;
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
        className: 'bg-green-500/30 text-green-300 border-2 border-green-500/50 shadow-lg shadow-green-500/20',
        glow: 'shadow-green-500/30'
      },
      'running': { 
        label: 'Турнир проходит', 
        className: 'bg-red-500/30 text-red-300 border-2 border-red-500/50 shadow-lg shadow-red-500/20',
        glow: 'shadow-red-500/30'
      },
      'scheduled': { 
        label: 'Запланирован', 
        className: 'bg-blue-500/30 text-blue-300 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20',
        glow: 'shadow-blue-500/30'
      },
      'completed': { 
        label: 'Завершен', 
        className: 'bg-gray-500/30 text-gray-300 border-2 border-gray-500/50 shadow-lg',
        glow: ''
      },
      'paused': { 
        label: 'Приостановлен', 
        className: 'bg-gray-500/30 text-gray-300 border-2 border-gray-500/50 shadow-lg',
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
  
  // Calculate RPS prize pool using data from tournament
  const totalReentries = tournament.total_reentries || 0;
  const totalAdditionalSets = tournament.total_additional_sets || 0;
  const totalRPSPool = calculateTotalRPSPool(
    registeredCount,
    tournament.participation_fee,
    totalReentries,
    tournament.reentry_fee || 0,
    totalAdditionalSets,
    tournament.additional_fee || 0
  );
  
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
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
      
      {/* Main ticket container */}
      <div className="relative bg-gradient-to-br from-slate-900/98 via-black/95 to-slate-800/98 border border-amber-400/30 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/40 group-hover:border-amber-400/50 group-hover:-translate-y-1 transition-all duration-300 backdrop-blur-2xl">
        
        {/* Ticket perforations - left side */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-slate-950 rounded-full -ml-1 border border-amber-400/30 shadow-inner"></div>
            ))}
          </div>
        </div>
        
        {/* Ticket perforations - right side */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-slate-950 rounded-full -mr-1 border border-amber-400/30 shadow-inner"></div>
            ))}
          </div>
        </div>
        
        {/* Diagonal tear line - adjusted */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" style={{ top: '62%' }}></div>
        
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-6 text-3xl text-amber-400 transform rotate-12">♠</div>
          <div className="absolute top-16 left-4 text-2xl text-amber-500 transform -rotate-12">♥</div>
          <div className="absolute bottom-12 right-8 text-4xl text-amber-400 transform rotate-45">♦</div>
          <div className="absolute bottom-4 left-6 text-3xl text-amber-500 transform -rotate-30">♣</div>
        </div>
        
        {/* Security pattern watermark */}
        <div className="absolute inset-0 opacity-[0.02] overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
            color: '#fbbf24'
          }}></div>
        </div>
        
        {/* Premium badge watermark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <div className="text-8xl font-bold text-amber-400 tracking-widest">VIP</div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-5 relative z-10">
          {/* Ticket number badge - holographic effect */}
          <div className="absolute top-3 right-3 bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-amber-600/30 backdrop-blur-sm border-2 border-amber-400/50 rounded-lg px-3 py-2 shadow-2xl shadow-amber-500/20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 opacity-20 blur-sm"></div>
              <div className="flex items-center gap-2 relative">
                <div className="flex flex-col">
                  <span className="text-[9px] text-amber-300 font-mono uppercase tracking-widest font-bold">TICKET</span>
                  <span className="text-sm text-amber-200 font-bold font-mono tracking-wide bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent">#{ticketNumber}</span>
                </div>
                <Trophy className="h-4 w-4 text-amber-300" />
              </div>
            </div>
          </div>

          {/* Header with title and status */}
          <div className="text-center mb-4 pr-20">
            <h3 className="text-2xl font-bold text-white tracking-wide mb-2 bg-gradient-to-r from-white via-amber-50 to-white bg-clip-text text-transparent">
              {tournament.name}
            </h3>
            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-3"></div>
            <div className="flex justify-center gap-2 flex-wrap">
              {getStatusBadge(tournament.status)}
              
              {/* Format badge */}
              <Badge className="bg-purple-500/30 text-purple-300 border-2 border-purple-500/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                {getFormatIcon()}
                <span className="ml-1.5">{getFormatName()}</span>
              </Badge>
              
              {isFilling && (
                <Badge className="bg-red-500/30 text-red-300 border-2 border-red-500/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-red-500/20">
                  <Zap className="h-3 w-3 mr-1 inline" />
                  Осталось {spotsLeft}!
                </Badge>
              )}
              {timeUntilStart() && tournament.status === 'registration' && (
                <Badge className="bg-blue-500/30 text-blue-300 border-2 border-blue-500/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {timeUntilStart()}
                </Badge>
              )}
            </div>
          </div>

          {/* RPS Prize Pool Banner */}
          {totalRPSPool > 0 && (
            <div className="mb-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400/40 rounded-lg p-2.5 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"></div>
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-300/80 font-semibold uppercase tracking-wider">Фонд RPS баллов</p>
                    <p className="text-xl font-bold text-amber-200 tracking-tight">{formatRPSPoints(totalRPSPool)}</p>
                  </div>
                </div>
                <Crown className="h-7 w-7 text-amber-400/30" />
              </div>
            </div>
          )}

          {/* Compact 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Date & Time */}
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-lg p-2.5 border border-white/20 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-md">
                  <Calendar className="h-3.5 w-3.5 text-white" />
                </div>
                <h4 className="text-xs font-semibold text-white/90">Дата и время</h4>
              </div>
              <p className="text-sm font-light text-white mb-0.5">
                {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'short'
                })}
              </p>
              <p className="text-sm text-amber-400 font-medium">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            {/* Participants */}
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-lg p-2.5 border border-white/20 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center shadow-md">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <h4 className="text-xs font-semibold text-white/90">Участники</h4>
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base font-light text-white">{registeredCount}</span>
                <span className="text-white/40 text-sm">/</span>
                <span className="text-base font-light text-white/80">{tournament.max_players}</span>
              </div>
              <div className="bg-white/10 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${Math.min((registeredCount / tournament.max_players) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Buy-in - EMPHASIZED */}
            <div className="bg-gradient-to-br from-green-500/20 via-green-600/10 to-green-500/20 rounded-lg p-2.5 border-2 border-green-500/40 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center shadow-md">
                  <DollarSign className="h-3.5 w-3.5 text-white" />
                </div>
                <h4 className="text-xs font-semibold text-green-300">Орг. взнос</h4>
              </div>
              <p className="text-2xl font-bold text-green-200">{formatParticipationFee(tournament.participation_fee)}</p>
              {(tournament.reentry_fee && tournament.reentry_fee > 0) && (
                <p className="text-[10px] text-white/60 mt-0.5">Re-entry: {formatParticipationFee(tournament.reentry_fee)}</p>
              )}
            </div>

            {/* Starting Stack */}
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-lg p-2.5 border border-white/20 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center shadow-md">
                  <Coins className="h-3.5 w-3.5 text-white" />
                </div>
                <h4 className="text-xs font-semibold text-white/90">Стартовый стек</h4>
              </div>
              <p className="text-base font-medium text-white">{tournament.starting_chips?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Actions */}
        <div className="p-4 bg-gradient-to-br from-slate-900/80 to-black/80 relative backdrop-blur-md border-t border-amber-400/10">
          {/* Barcode and QR Code - Horizontal */}
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Real Barcode */}
            <div className="flex-1">
              <div className="bg-white rounded-md px-2 py-2 shadow-xl border border-slate-300">
                <Barcode 
                  value={barcodeValue}
                  height={35}
                  width={1.2}
                  fontSize={8}
                  background="#ffffff"
                  lineColor="#000000"
                  displayValue={true}
                  margin={0}
                />
              </div>
            </div>
            
            {/* Real QR Code - Small */}
            <div className="bg-white rounded-md p-2 shadow-xl border border-slate-300 flex-shrink-0">
              <QRCodeSVG 
                value={qrCodeData}
                size={60}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
          
          {/* Microtext security features */}
          <div className="flex items-center justify-between mb-3 text-[9px] text-white/40 font-mono px-1">
            <span>VALID • AUTHENTIC • SECURE</span>
            <span>ID:{ticketNumber}</span>
          </div>

          {/* Enhanced CTA Button with Price */}
          <Button 
            onClick={onRegister}
            disabled={tournament.status !== 'registration'}
            className="relative w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white font-bold py-4 rounded-lg shadow-2xl hover:shadow-amber-500/60 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed border-2 border-amber-400/30 mb-2"
          >
            <div className="flex items-center justify-center gap-2">
              <PlayCircle className="h-5 w-5" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">{getButtonText(tournament.status)}</span>
                {tournament.status === 'registration' && (
                  <span className="text-xs font-normal text-amber-100">Взнос: {formatParticipationFee(tournament.participation_fee)}</span>
                )}
              </div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onViewDetails}
            className="w-full border-2 border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-amber-400/50 transition-all duration-300 text-sm rounded-lg group/info font-semibold py-2.5"
          >
            Подробная информация
            <ChevronRight className="h-4 w-4 ml-auto group-hover/info:translate-x-1 transition-transform" />
          </Button>
        </div>
        
        {/* Corner decorations - enhanced */}
        <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-amber-400/30 rounded-tl-2xl"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-amber-400/20 rounded-tl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-amber-400/30 rounded-br-2xl"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-amber-400/20 rounded-br-2xl"></div>
      </div>
    </div>
  );
}
