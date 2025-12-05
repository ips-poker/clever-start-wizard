import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit3, Check, X, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentMafiaRank, getMafiaRankProgress, getTotalRankXP } from "@/utils/mafiaRanks";
import { WebRankProfileStyles } from "./WebRankProfileStyles";
import { GlitchAvatarFrame } from "@/components/ui/glitch-avatar-frame";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface ProfileHeroProps {
  player: Player | null;
  userFullName?: string;
  editingName: boolean;
  newPlayerName: string;
  onAvatarClick: () => void;
  onStartNameEdit: () => void;
  onNameChange: (value: string) => void;
  onNameUpdate: () => void;
  onCancelNameEdit: () => void;
}

const getLevel = (games: number, wins: number, rating: number) => {
  return Math.floor((games * 10 + wins * 50 + (rating - 100)) / 100) + 1;
};

const getLevelProgress = (games: number, wins: number, rating: number) => {
  const totalXP = games * 10 + wins * 50 + (rating - 100);
  return (totalXP % 100);
};

export function ProfileHero({
  player,
  userFullName,
  editingName,
  newPlayerName,
  onAvatarClick,
  onStartNameEdit,
  onNameChange,
  onNameUpdate,
  onCancelNameEdit
}: ProfileHeroProps) {
  const rating = player?.elo_rating || 100;
  const games = player?.games_played || 0;
  const wins = player?.wins || 0;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  
  const stats = { gamesPlayed: games, wins, rating };
  const currentRank = getCurrentMafiaRank(stats);
  const rankProgressData = getMafiaRankProgress(stats);
  const totalXP = getTotalRankXP(stats);
  
  const level = getLevel(games, wins, rating);
  const levelProgress = getLevelProgress(games, wins, rating);

  return (
    <div className="relative overflow-hidden brutal-border bg-card">
      {/* Rank-specific decorations */}
      <WebRankProfileStyles rank={currentRank} />
      
      {/* Animated background effects */}
      <div className="absolute inset-0 industrial-texture opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
      
      {/* Animated rank glow */}
      <motion.div 
        className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${currentRank.bgGradient} rounded-full blur-[100px] opacity-30`}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left: Avatar Section */}
          <div className="relative">
            {/* Level badge */}
            <motion.div 
              className="absolute -top-2 -left-2 z-20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-brutal border-2 border-background">
                  <span className="text-lg font-black text-primary-foreground">{level}</span>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">LVL</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <GlitchAvatarFrame rank={currentRank} size="lg">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 cursor-pointer" onClick={onAvatarClick}>
                  <AvatarImage src={player?.avatar_url} alt={player?.name} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                    {player?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </GlitchAvatarFrame>
              <Button
                onClick={onAvatarClick}
                className="absolute -bottom-2 -right-2 rounded-none w-10 h-10 p-0 shadow-brutal bg-primary hover:bg-primary/90 border-2 border-background z-20"
                size="sm"
              >
                <Edit3 className="h-4 w-4 text-primary-foreground" />
              </Button>
            </motion.div>
          </div>

          {/* Center: Player Info */}
          <div className="flex-1 text-center lg:text-left space-y-4">
            {/* Name & Edit */}
            <div className="space-y-2">
              {editingName ? (
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="text-center lg:text-left text-xl font-bold max-w-xs bg-secondary border-border text-foreground"
                    placeholder="Введите новое имя"
                    onKeyPress={(e) => e.key === 'Enter' && onNameUpdate()}
                    autoFocus
                  />
                  <Button onClick={onNameUpdate} size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 rounded-none" disabled={!newPlayerName.trim()}>
                    <Check className="h-4 w-4 text-white" />
                  </Button>
                  <Button onClick={onCancelNameEdit} variant="outline" size="sm" className="h-8 w-8 p-0 border-border hover:bg-secondary rounded-none">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <motion.div 
                  className="flex items-center justify-center lg:justify-start gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                    {player?.name}
                  </h1>
                  <Button onClick={onStartNameEdit} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
              
              {/* Rank Badge */}
              <motion.div 
                className="flex items-center justify-center lg:justify-start gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <img 
                  src={currentRank.avatar} 
                  alt={currentRank.name}
                  className="w-8 h-8 rounded-full border border-white/20"
                />
                <Badge className={`bg-gradient-to-r ${currentRank.bgGradient} text-white border-0 px-4 py-1.5 font-bold text-sm shadow-brutal rounded-none flex items-center gap-2`}>
                  {currentRank.name}
                </Badge>
                <span className={`text-sm ${currentRank.textColor}`}>{currentRank.title}</span>
                {currentRank.rarity === 'godfather' && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-5 w-5 text-cyan-400" />
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Level Progress Bar */}
            <div className="max-w-md mx-auto lg:mx-0">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Уровень {level} • {totalXP} XP</span>
                <span>{levelProgress}/100 XP до след.</span>
              </div>
              <div className="h-2 bg-secondary border border-border overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${levelProgress}%`,
                    backgroundPosition: ['0% 0%', '100% 0%']
                  }}
                  transition={{ 
                    width: { duration: 1, ease: "easeOut" },
                    backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" }
                  }}
                />
              </div>
            </div>

            {/* Rank Progress to Next */}
            <div className="max-w-md mx-auto lg:mx-0">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {currentRank.name}
                </span>
                {rankProgressData.next && (
                  <span className="text-primary">→ {rankProgressData.next.name}</span>
                )}
              </div>
              <div className="h-1.5 bg-secondary border border-border overflow-hidden">
                <motion.div 
                  className={`h-full bg-gradient-to-r ${currentRank.bgGradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${rankProgressData.progress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
              </div>
              {rankProgressData.details.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {rankProgressData.details.join(' • ')}
                </p>
              )}
            </div>
          </div>

          {/* Right: Quick Stats */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-3">
            {/* RPS Rating */}
            <motion.div 
              className="text-center lg:text-right p-3 bg-secondary/50 border border-border"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary))' }}
            >
              <motion.p 
                className="text-3xl lg:text-4xl font-black neon-orange"
                key={rating}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {rating}
              </motion.p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">RPS Рейтинг</p>
            </motion.div>

            {/* Wins */}
            <motion.div 
              className="text-center lg:text-right p-3 bg-secondary/50 border border-border"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary))' }}
            >
              <p className="text-3xl lg:text-4xl font-black text-green-400">{wins}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Побед</p>
            </motion.div>

            {/* Win Rate */}
            <motion.div 
              className="text-center lg:text-right p-3 bg-secondary/50 border border-border"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary))' }}
            >
              <p className={`text-3xl lg:text-4xl font-black ${winRate >= 50 ? 'text-purple-400' : 'text-foreground'}`}>
                {winRate}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Винрейт</p>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}
