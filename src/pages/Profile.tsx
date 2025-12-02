import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Calendar, Users, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PlayerStats } from "@/components/PlayerStats";
import { AvatarSelector } from "@/components/AvatarSelector";
import { ProfileTournaments } from "@/components/ProfileTournaments";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileAchievements } from "@/components/profile/ProfileAchievements";
import { ProfileStatsDashboard } from "@/components/profile/ProfileStatsDashboard";
import { ProfileGameHistory } from "@/components/profile/ProfileGameHistory";
import { motion } from "framer-motion";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  email?: string;
  avatar_url?: string;
}

interface GameResult {
  id: string;
  position: number;
  elo_change: number;
  elo_after: number;
  elo_before: number;
  created_at: string;
  tournament: { name: string };
}

export default function Profile() {
  const { user, userProfile } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    if (user) {
      loadPlayerData();
    }
  }, [user]);

  useEffect(() => {
    if (player?.id) {
      loadGameResults();
    }
  }, [player?.id]);

  const loadPlayerData = async () => {
    if (!user) return;

    try {
      let data, error;
      
      const userIdResult = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userIdResult.error && userIdResult.error.code === 'PGRST116') {
        const emailResult = await supabase
          .from('players')
          .select('*')
          .eq('email', user.email)
          .single();
        
        data = emailResult.data;
        error = emailResult.error;
      } else {
        data = userIdResult.data;
        error = userIdResult.error;
      }

      if (error && error.code === 'PGRST116') {
        const playerName = userProfile?.full_name || user.email?.split('@')[0] || 'Player';
        
        const { data: createResult, error: createError } = await supabase.rpc('create_player_safe', {
          p_name: playerName,
          p_email: user.email || null,
          p_telegram: null,
          p_avatar_url: userProfile?.avatar_url || null,
          p_user_id: user.id
        });

        if (createError) {
          console.error('Error creating player:', createError);
          return;
        }

        const result = createResult as { success: boolean; error?: string; player?: any; player_id?: string };
        
        if (!result?.success) {
          if (result?.player_id) {
            const { data: existingPlayer } = await supabase
              .from('players')
              .select('*')
              .eq('id', result.player_id)
              .single();
            if (existingPlayer) {
              setPlayer(existingPlayer);
              return;
            }
          }
          return;
        }
        
        setPlayer(result.player);
      } else if (error) {
        console.error('Error loading player:', error);
      } else {
        setPlayer(data);
      }
    } catch (error) {
      console.error('Error in loadPlayerData:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGameResults = async () => {
    if (!player?.id) return;

    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          tournament:tournaments(name)
        `)
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setGameResults(data || []);
    } catch (error) {
      console.error('Error loading game results:', error);
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    if (!player) {
      toast.error("Ошибка: профиль игрока не найден");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('update_player_safe', {
        p_player_id: player.id,
        p_avatar_url: avatarUrl
      });

      if (error) {
        toast.error(`Ошибка при обновлении аватара: ${error.message}`);
        throw error;
      }

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        toast.error(`Ошибка: ${result?.error || 'Не удалось обновить аватар'}`);
        return;
      }

      setPlayer({ ...player, avatar_url: avatarUrl });
      setShowAvatarSelector(false);
      toast.success("Аватар обновлен!");
    } catch (error: any) {
      console.error('Error updating avatar:', error);
    }
  };

  const handleNameUpdate = async () => {
    if (!player || !newPlayerName.trim()) return;

    try {
      const { data, error } = await supabase.rpc('update_player_safe', {
        p_player_id: player.id,
        p_name: newPlayerName.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        toast.error(`Ошибка: ${result?.error || 'Не удалось обновить имя'}`);
        return;
      }

      setPlayer({ ...player, name: newPlayerName.trim() });
      setEditingName(false);
      setNewPlayerName("");
      toast.success("Имя обновлено!");
    } catch (error) {
      console.error('Error updating player name:', error);
      toast.error("Ошибка при обновлении имени");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="w-20 h-20 border-4 border-primary/30 border-t-primary mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p 
            className="text-muted-foreground text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Загрузка профиля...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Industrial Background */}
        <div className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0" />
        
        {/* Metal grid */}
        <div
          className="fixed inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Neon glows */}
        <motion.div 
          className="fixed w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] opacity-40 -top-32 -left-24 z-0"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="fixed w-[500px] h-[500px] bg-accent/15 rounded-full blur-[150px] opacity-40 -bottom-32 -right-24 z-0"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />

        {/* Side rails */}
        <div className="fixed inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary/70 via-accent/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed inset-y-0 right-0 w-[3px] bg-gradient-to-b from-primary/70 via-accent/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary/80 to-transparent pointer-events-none z-10" />

        <FloatingParticles />
        <Header />
        
        <main className="container mx-auto px-4 pt-24 md:pt-20 pb-8 space-y-6 relative z-20">
          {/* Profile Hero */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProfileHero
              player={player}
              userFullName={userProfile?.full_name}
              editingName={editingName}
              newPlayerName={newPlayerName}
              onAvatarClick={() => setShowAvatarSelector(true)}
              onStartNameEdit={() => {
                setNewPlayerName(player?.name || "");
                setEditingName(true);
              }}
              onNameChange={setNewPlayerName}
              onNameUpdate={handleNameUpdate}
              onCancelNameEdit={() => {
                setEditingName(false);
                setNewPlayerName("");
              }}
            />
          </motion.div>

          {/* Main Content Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs defaultValue="statistics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-card border border-border h-auto p-1.5 gap-1">
                <TabsTrigger 
                  value="statistics" 
                  className="flex items-center gap-2 text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none transition-all"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Статистика</span>
                  <span className="sm:hidden">Статс</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tournaments" 
                  className="flex items-center gap-2 text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none transition-all"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Турниры</span>
                  <span className="sm:hidden">Турн</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="leaderboard" 
                  className="flex items-center gap-2 text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none transition-all"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Рейтинг</span>
                  <span className="sm:hidden">Топ</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center gap-2 text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none transition-all"
                >
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">История</span>
                  <span className="sm:hidden">Игры</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="statistics" className="space-y-6 mt-6">
                {/* Achievements */}
                <ProfileAchievements
                  gamesPlayed={player?.games_played || 0}
                  wins={player?.wins || 0}
                  rating={player?.elo_rating || 100}
                  gameResults={gameResults}
                />
                
                {/* Stats Dashboard */}
                <ProfileStatsDashboard
                  gamesPlayed={player?.games_played || 0}
                  wins={player?.wins || 0}
                  rating={player?.elo_rating || 100}
                  gameResults={gameResults}
                />
              </TabsContent>

              <TabsContent value="tournaments" className="mt-6">
                <ProfileTournaments playerId={player?.id} />
              </TabsContent>

              <TabsContent value="leaderboard" className="mt-6">
                <PlayerStats />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <ProfileGameHistory gameResults={gameResults} />
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
        
        <Footer />

        {/* Avatar Selector Dialog */}
        <Dialog open={showAvatarSelector} onOpenChange={setShowAvatarSelector}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card border-2 border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Выберите аватар
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Выберите аватар, который будет отображаться в вашем профиле и рейтинге
              </DialogDescription>
            </DialogHeader>
            <AvatarSelector 
              onSelect={handleAvatarUpdate}
              onClose={() => setShowAvatarSelector(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
