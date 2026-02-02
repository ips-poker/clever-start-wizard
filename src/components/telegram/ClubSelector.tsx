// ============================================
// CLUB SELECTOR - Premium Syndicate Industrial Style
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Users, 
  Trophy, 
  Star, 
  Crown,
  ChevronRight,
  Loader2,
  Shield,
  Gem,
  Spade,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
// GlitchText removed - using font-display instead for consistency with loading screen
import { CLAN_EMBLEMS } from '@/utils/clanEmblems';
import syndikateLogo from '@/assets/syndikate-logo-main.png';

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  emblem_id: number;
  primary_color: string;
  total_rating: number | null;
  member_count?: number;
  tournament_count?: number;
}

interface ClubSelectorProps {
  onSelectClub: (club: Club) => void;
  onContinueWithoutClub?: () => void;
}

export function ClubSelector({ onSelectClub, onContinueWithoutClub }: ClubSelectorProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const glowTopRef = useRef<HTMLDivElement>(null);
  const glowBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClubs();
  }, []);

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const currentScrollY = scrollRef.current.scrollTop;
        setScrollY(currentScrollY);
        
        if (glowTopRef.current) {
          glowTopRef.current.style.transform = `translate(-24px, ${-128 + currentScrollY * 0.1}px)`;
        }
        if (glowBottomRef.current) {
          glowBottomRef.current.style.transform = `translate(-120px, ${-180 + currentScrollY * 0.15}px)`;
        }
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchClubs = async () => {
    try {
      const { data: clansData, error } = await supabase
        .from('clans')
        .select(`
          id,
          name,
          description,
          logo_url,
          emblem_id,
          primary_color,
          total_rating
        `)
        .order('total_rating', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const clubsWithCounts = await Promise.all(
        (clansData || []).map(async (clan) => {
          const { count: memberCount } = await supabase
            .from('clan_members')
            .select('*', { count: 'exact', head: true })
            .eq('clan_id', clan.id);

          const { count: tournamentCount } = await supabase
            .from('tournaments')
            .select('*', { count: 'exact', head: true })
            .eq('clan_id', clan.id)
            .eq('is_published', true);

          return {
            ...clan,
            member_count: memberCount || 0,
            tournament_count: tournamentCount || 0
          };
        })
      );

      setClubs(clubsWithCounts);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEmblemIcon = (emblemId: number) => {
    const emblem = CLAN_EMBLEMS.find(e => e.id === emblemId);
    return emblem?.icon || '🎰';
  };

  const handleSelectClub = (club: Club) => {
    setSelectedClubId(club.id);
    setTimeout(() => {
      onSelectClub(club);
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        {/* Industrial Background */}
        <div className="absolute inset-0 industrial-texture opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-syndikate-orange/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-syndikate-red/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="text-center space-y-6 relative z-10">
          {/* Logo with frame */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
            className="relative mx-auto"
          >
            <div className="relative w-32 h-32 mx-auto">
              {/* Corner Brackets */}
              <div className="absolute -top-1.5 -left-1.5 w-8 h-8 border-l-3 border-t-3 border-syndikate-orange animate-pulse" style={{ borderWidth: '3px 0 0 3px' }} />
              <div className="absolute -top-1.5 -right-1.5 w-8 h-8 border-r-3 border-t-3 border-syndikate-orange animate-pulse" style={{ borderWidth: '3px 3px 0 0', animationDelay: '0.5s' }} />
              <div className="absolute -bottom-1.5 -left-1.5 w-8 h-8 border-l-3 border-b-3 border-syndikate-orange animate-pulse" style={{ borderWidth: '0 0 3px 3px', animationDelay: '1s' }} />
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 border-r-3 border-b-3 border-syndikate-orange animate-pulse" style={{ borderWidth: '0 3px 3px 0', animationDelay: '1.5s' }} />
              
              <div className="absolute inset-0 bg-syndikate-metal/50 backdrop-blur-sm border-2 border-syndikate-orange/50 flex items-center justify-center p-4">
                <motion.img
                  src={syndikateLogo}
                  alt="SYNDICATE"
                  animate={{ 
                    filter: [
                      "drop-shadow(0 0 15px rgba(255, 135, 31, 0.8))",
                      "drop-shadow(0 0 25px rgba(255, 135, 31, 1))",
                      "drop-shadow(0 0 15px rgba(255, 135, 31, 0.8))"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </motion.div>
          
          <Loader2 className="w-8 h-8 animate-spin text-syndikate-orange mx-auto" />
          <p className="text-muted-foreground uppercase tracking-wider text-sm">Загрузка клубов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" ref={scrollRef}>
      {/* Industrial Background Layers */}
      <div className="fixed inset-0 industrial-texture opacity-50 pointer-events-none" />
      
      {/* Metal Grid */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glows */}
      <div 
        ref={glowTopRef}
        className="fixed w-[400px] h-[400px] bg-syndikate-orange/25 rounded-full blur-[120px] opacity-80 animate-pulse pointer-events-none" 
        style={{ top: '-10%', left: '-5%' }}
      />
      <div 
        ref={glowBottomRef}
        className="fixed w-[350px] h-[350px] bg-syndikate-red/20 rounded-full blur-[100px] opacity-80 animate-pulse pointer-events-none" 
        style={{ bottom: '-10%', right: '-5%' }}
      />

      {/* Side Rails */}
      <div className="fixed inset-y-0 left-0 w-[2px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent pointer-events-none z-40" />
      <div className="fixed inset-y-0 right-0 w-[2px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent pointer-events-none z-40" />
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-syndikate-orange/80 to-transparent pointer-events-none z-40" />

      {/* Sparks Animation */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed w-1 h-1 bg-syndikate-orange rounded-full pointer-events-none z-10"
          initial={{ 
            x: "50vw", 
            y: "30vh",
            scale: 0,
            opacity: 0
          }}
          animate={{
            x: ["50vw", `${30 + Math.random() * 40}vw`],
            y: ["30vh", `${10 + Math.random() * 80}vh`],
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeOut"
          }}
        />
      ))}

      {/* Top Spacer for Telegram safe area */}
      <div className="h-16" />

      {/* Header - Pushed down with padding */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-syndikate-orange/20">
        <div className="pt-6 pb-4 px-4 safe-area-top">
          {/* Logo and Title */}
          <div className="flex items-center gap-4 mb-4">
            {/* Logo with Metal Frame */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="relative"
            >
              <div className="relative w-16 h-16">
                {/* Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-5 h-5" style={{ borderLeft: '2px solid', borderTop: '2px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                <div className="absolute -top-1 -right-1 w-5 h-5" style={{ borderRight: '2px solid', borderTop: '2px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                <div className="absolute -bottom-1 -left-1 w-5 h-5" style={{ borderLeft: '2px solid', borderBottom: '2px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5" style={{ borderRight: '2px solid', borderBottom: '2px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                
                <div className="absolute inset-0 bg-syndikate-metal/60 backdrop-blur-sm border border-syndikate-orange/40 flex items-center justify-center p-2">
                  <motion.img
                    src={syndikateLogo}
                    alt="SYNDICATE"
                    animate={{ 
                      filter: [
                        "drop-shadow(0 0 10px rgba(255, 135, 31, 0.7))",
                        "drop-shadow(0 0 18px rgba(255, 135, 31, 1))",
                        "drop-shadow(0 0 10px rgba(255, 135, 31, 0.7))"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </motion.div>
            
            <div className="flex-1">
              <h1 className="font-display text-2xl uppercase tracking-wider text-foreground">
                SYNDICATE
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-[2px] w-8 bg-gradient-neon" />
                <p className="font-display text-xs uppercase tracking-widest text-syndikate-orange">
                  Poker Club
                </p>
                <div className="h-[2px] w-8 bg-gradient-neon" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск клуба..."
              className="pl-10 bg-syndikate-metal/30 border-syndikate-orange/20 focus:border-syndikate-orange/60 h-12"
            />
          </div>
        </div>
      </div>

      {/* Featured Syndicate Card */}
      <div className="p-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card 
            className="relative overflow-hidden bg-syndikate-metal/40 border-2 border-syndikate-orange/50 cursor-pointer group"
            onClick={onContinueWithoutClub}
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/20 via-transparent to-syndikate-red/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-syndikate-orange/10 via-transparent to-transparent" />
            
            {/* Corner Decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-syndikate-orange" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange" />
            
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-5">
                {/* Logo with Metal Frame like Loading Screen */}
                <div className="relative w-24 h-24 flex-shrink-0">
                  {/* Glow behind */}
                  <div className="absolute inset-0 bg-syndikate-orange/30 rounded-lg blur-xl animate-pulse" />
                  
                  {/* Frame */}
                  <div className="relative w-full h-full">
                    {/* Corner Brackets */}
                    <div className="absolute -top-1 -left-1 w-6 h-6" style={{ borderLeft: '3px solid', borderTop: '3px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                    <div className="absolute -top-1 -right-1 w-6 h-6" style={{ borderRight: '3px solid', borderTop: '3px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6" style={{ borderLeft: '3px solid', borderBottom: '3px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6" style={{ borderRight: '3px solid', borderBottom: '3px solid', borderColor: 'hsl(var(--syndikate-orange))' }} />
                    
                    {/* Inner Box */}
                    <div className="absolute inset-0 bg-syndikate-metal/70 backdrop-blur-sm border border-syndikate-orange/50 flex items-center justify-center p-3">
                      <motion.img
                        src={syndikateLogo}
                        alt="SYNDICATE"
                        animate={{ 
                          filter: [
                            "drop-shadow(0 0 12px rgba(255, 135, 31, 0.8))",
                            "drop-shadow(0 0 20px rgba(255, 135, 31, 1))",
                            "drop-shadow(0 0 12px rgba(255, 135, 31, 0.8))"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl uppercase tracking-wider text-foreground">SYNDICATE POKER</h3>
                    <Badge className="bg-syndikate-orange/20 text-syndikate-orange border border-syndikate-orange/40 font-display text-[10px] tracking-wider">
                      <Crown className="w-3 h-3 mr-1" />
                      OFFICIAL
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                    Официальный покерный клуб Syndicate
                  </p>
                  <div className="flex gap-4 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-syndikate-orange" />
                      <span>∞ игроков</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Trophy className="w-3.5 h-3.5 text-syndikate-orange" />
                      <span>Все турниры</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="w-3.5 h-3.5 text-syndikate-orange" />
                      <span>Полный RPS</span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="w-6 h-6 text-syndikate-orange flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Section Divider */}
      <div className="relative h-16 flex items-center justify-center overflow-hidden mx-4">
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-syndikate-orange/50 to-transparent" />
        <div className="absolute w-3 h-3 bg-syndikate-metal border-2 border-syndikate-orange rounded-full" style={{ left: '15%' }} />
        <div className="absolute w-3 h-3 bg-syndikate-metal border-2 border-syndikate-orange rounded-full" style={{ right: '15%' }} />
      </div>

      {/* Clubs List Header */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-syndikate-orange" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Клубы партнёров
            </h2>
          </div>
          <Badge variant="outline" className="text-xs border-syndikate-orange/30 text-syndikate-orange">
            {filteredClubs.length} клубов
          </Badge>
        </div>
      </div>

      {/* Clubs List */}
      <div className="px-4 pb-24">
        <div className="space-y-3">
          <AnimatePresence>
            {filteredClubs.map((club, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card 
                  className={`
                    relative overflow-hidden cursor-pointer transition-all duration-300
                    hover:border-syndikate-orange/50 hover:bg-syndikate-metal/30
                    ${selectedClubId === club.id ? 'border-syndikate-orange bg-syndikate-orange/10 scale-[0.98]' : 'bg-syndikate-metal/20 border-white/10'}
                  `}
                  onClick={() => handleSelectClub(club)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Club Avatar/Logo */}
                      <div 
                        className="relative w-14 h-14 rounded-lg flex items-center justify-center text-2xl border"
                        style={{ 
                          backgroundColor: club.primary_color ? `${club.primary_color}20` : 'rgba(255,107,53,0.1)',
                          borderColor: `${club.primary_color || '#ff6b35'}50`
                        }}
                      >
                        {club.logo_url ? (
                          <Avatar className="w-full h-full rounded-lg">
                            <AvatarImage src={club.logo_url} alt={club.name} className="object-cover" />
                            <AvatarFallback className="rounded-lg bg-transparent">
                              {getEmblemIcon(club.emblem_id)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span>{getEmblemIcon(club.emblem_id)}</span>
                        )}
                      </div>

                      {/* Club Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">{club.name}</h3>
                          {club.total_rating && club.total_rating > 5000 && (
                            <Shield className="w-4 h-4 text-syndikate-orange flex-shrink-0" />
                          )}
                        </div>
                        {club.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {club.description}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{club.member_count}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Trophy className="w-3 h-3" />
                            <span>{club.tournament_count}</span>
                          </div>
                          {club.total_rating && (
                            <div className="flex items-center gap-1 text-xs text-syndikate-orange">
                              <Star className="w-3 h-3" />
                              <span>{club.total_rating.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredClubs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Клубы не найдены</p>
            </div>
          )}
        </div>
      </div>

      {/* Scanlines Effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02] z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)'
        }}
      />
    </div>
  );
}
