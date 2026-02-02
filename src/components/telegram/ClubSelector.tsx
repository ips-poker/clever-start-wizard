import React, { useState, useEffect } from 'react';
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
  Spade
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { GlitchText } from '@/components/ui/glitch-text';
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

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      // Fetch clubs with member count
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

      // Get member counts for each club
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Загрузка клубов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="p-4 flex items-center gap-3">
          <img 
            src={syndikateLogo} 
            alt="Syndicate" 
            className="h-10 w-auto"
          />
          <div className="flex-1">
            <GlitchText 
              text="SYNDICATE" 
              className="text-xl font-black tracking-wider"
              glitchIntensity="low"
            />
            <p className="text-xs text-muted-foreground">Выберите клуб</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск клуба..."
              className="pl-10 bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Featured Syndicate Card */}
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card 
            className="relative overflow-hidden bg-gradient-to-br from-syndikate-orange/20 via-black to-syndikate-red/20 border-syndikate-orange/30 cursor-pointer group"
            onClick={onContinueWithoutClub}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-syndikate-orange to-syndikate-red flex items-center justify-center">
                    <Spade className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-syndikate-orange flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black">SYNDICATE POKER</h3>
                    <Badge className="bg-syndikate-orange/20 text-syndikate-orange border-syndikate-orange/30">
                      <Star className="w-3 h-3 mr-1" />
                      VIP
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Официальный покерный клуб Syndicate
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>∞ игроков</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Все турниры</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Gem className="w-3.5 h-3.5" />
                  <span>Полный функционал</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Clubs List */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Клубы партнёров
          </h2>
          <Badge variant="outline" className="text-xs">
            {filteredClubs.length} клубов
          </Badge>
        </div>

        <ScrollArea className="h-[calc(100vh-400px)]">
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
                      hover:border-primary/50 hover:bg-white/5
                      ${selectedClubId === club.id ? 'border-primary bg-primary/10 scale-[0.98]' : 'bg-black/40 border-white/10'}
                    `}
                    onClick={() => handleSelectClub(club)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Club Avatar/Logo */}
                        <div 
                          className="relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                          style={{ 
                            backgroundColor: club.primary_color ? `${club.primary_color}20` : 'rgba(255,107,53,0.1)',
                            border: `1px solid ${club.primary_color || '#ff6b35'}40`
                          }}
                        >
                          {club.logo_url ? (
                            <Avatar className="w-full h-full rounded-xl">
                              <AvatarImage src={club.logo_url} alt={club.name} className="object-cover" />
                              <AvatarFallback className="rounded-xl bg-transparent">
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
        </ScrollArea>
      </div>
    </div>
  );
}
