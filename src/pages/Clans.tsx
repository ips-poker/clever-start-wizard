import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, Users, Crown, TrendingUp, Shield, 
  ChevronRight, Swords
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClanEmblemDisplay } from "@/components/clan/ClanEmblemDisplay";
import { CLAN_HIERARCHY, ClanRole } from "@/utils/clanEmblems";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Clan {
  id: string;
  name: string;
  don_player_id: string;
  emblem_id: number;
  seal_id: number;
  description: string | null;
  total_rating: number;
  created_at: string;
  don_player?: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  members_count?: number;
}

interface ClanMember {
  id: string;
  player_id: string;
  hierarchy_role: string;
  player?: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
}

export default function Clans() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    loadClans();
  }, []);

  const loadClans = async () => {
    try {
      const { data, error } = await supabase
        .from('clans')
        .select(`
          *,
          don_player:players!clans_don_player_id_fkey(id, name, avatar_url, elo_rating)
        `)
        .order('total_rating', { ascending: false });

      if (error) throw error;

      // Загружаем количество членов для каждого клана
      const clansWithCounts = await Promise.all(
        (data || []).map(async (clan) => {
          const { count } = await supabase
            .from('clan_members')
            .select('*', { count: 'exact', head: true })
            .eq('clan_id', clan.id);

          return { ...clan, members_count: (count || 0) + 1 }; // +1 for don
        })
      );

      setClans(clansWithCounts);
    } catch (error) {
      console.error('Error loading clans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClanMembers = async (clanId: string) => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('clan_members')
        .select(`
          *,
          player:players(id, name, avatar_url, elo_rating)
        `)
        .eq('clan_id', clanId);

      if (error) throw error;
      setClanMembers(data || []);
    } catch (error) {
      console.error('Error loading clan members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleClanClick = (clan: Clan) => {
    setSelectedClan(clan);
    loadClanMembers(clan.id);
  };

  const totalClans = clans.length;
  const totalMembers = clans.reduce((sum, c) => sum + (c.members_count || 1), 0);
  const avgRating = totalClans > 0 
    ? Math.round(clans.reduce((sum, c) => sum + c.total_rating, 0) / totalClans) 
    : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0" />
      <motion.div 
        className="fixed w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] opacity-40 -top-32 -left-24 z-0"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <FloatingParticles />
      
      <Header />
      
      <main className="container mx-auto px-4 pt-24 md:pt-20 pb-8 space-y-6 relative z-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 mb-4">
            <Swords className="w-5 h-5 text-primary" />
            <span className="text-primary font-semibold">Семейные кланы</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Рейтинг <span className="neon-orange">кланов</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Соревнование между семьями. Объединяйтесь, чтобы доминировать.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="brutal-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Всего кланов</p>
                <p className="text-3xl font-bold neon-orange">{totalClans}</p>
              </div>
              <Shield className="w-10 h-10 text-primary opacity-50" />
            </CardContent>
          </Card>
          <Card className="brutal-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Всего членов</p>
                <p className="text-3xl font-bold text-green-400">{totalMembers}</p>
              </div>
              <Users className="w-10 h-10 text-green-400 opacity-50" />
            </CardContent>
          </Card>
          <Card className="brutal-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Средний рейтинг</p>
                <p className="text-3xl font-bold text-purple-400">{avgRating}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-400 opacity-50" />
            </CardContent>
          </Card>
        </div>

        {/* Clans List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Загрузка кланов...</p>
          </div>
        ) : clans.length === 0 ? (
          <Card className="brutal-border">
            <CardContent className="py-16 text-center">
              <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">Кланы ещё не созданы</h3>
              <p className="text-muted-foreground">
                Достигните ранга Дон, чтобы создать свой клан
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clans.map((clan, index) => (
              <motion.div
                key={clan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="brutal-border bg-card hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => handleClanClick(clan)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-10 h-10">
                        {index === 0 && (
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                        )}
                        {index === 1 && (
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                            <span className="text-white font-bold">2</span>
                          </div>
                        )}
                        {index === 2 && (
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                            <span className="text-white font-bold">3</span>
                          </div>
                        )}
                        {index > 2 && (
                          <div className="w-10 h-10 bg-secondary border border-border flex items-center justify-center">
                            <span className="font-bold text-muted-foreground">{index + 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Emblem */}
                      <ClanEmblemDisplay
                        emblemId={clan.emblem_id}
                        sealId={clan.seal_id}
                        clanName={clan.name}
                        size="sm"
                        showName={false}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg truncate">{clan.name}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            {clan.don_player?.name || 'Неизвестно'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {clan.members_count}/20
                          </span>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${index < 3 ? 'neon-orange' : 'text-foreground'}`}>
                          {clan.total_rating}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">RPS</div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Clan Details Modal */}
      <Dialog open={!!selectedClan} onOpenChange={() => setSelectedClan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedClan && (
                <>
                  <ClanEmblemDisplay
                    emblemId={selectedClan.emblem_id}
                    sealId={selectedClan.seal_id}
                    clanName={selectedClan.name}
                    size="sm"
                    showName={false}
                  />
                  <div>
                    <h2 className="text-xl font-bold">{selectedClan.name}</h2>
                    <p className="text-sm text-muted-foreground font-normal">
                      {selectedClan.total_rating} RPS • {selectedClan.members_count} членов
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedClan && (
            <div className="space-y-4">
              {selectedClan.description && (
                <p className="text-muted-foreground italic">"{selectedClan.description}"</p>
              )}

              {/* Don */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-yellow-500">
                    <AvatarImage src={selectedClan.don_player?.avatar_url || undefined} />
                    <AvatarFallback>{selectedClan.don_player?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{selectedClan.don_player?.name}</span>
                      <Badge className="bg-yellow-500 text-black">
                        <Crown className="w-3 h-3 mr-1" />
                        Дон
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedClan.don_player?.elo_rating} RPS
                    </p>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Члены семьи
                </h4>
                {loadingMembers ? (
                  <p className="text-muted-foreground text-sm">Загрузка...</p>
                ) : clanMembers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Пока только Дон</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {clanMembers.map((member) => {
                      const role = CLAN_HIERARCHY[member.hierarchy_role as ClanRole] || CLAN_HIERARCHY.soldier;
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.player?.avatar_url || undefined} />
                            <AvatarFallback>{member.player?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{member.player?.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{role.name}</Badge>
                          <span className="text-sm text-muted-foreground">{member.player?.elo_rating}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
