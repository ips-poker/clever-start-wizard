import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Target, Calendar, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GameResult {
  id: string;
  position: number;
  elo_change: number;
  elo_after: number;
  elo_before: number;
  created_at: string;
  tournament: { name: string };
}

interface ProfileGameHistoryProps {
  gameResults: GameResult[];
}

export function ProfileGameHistory({ gameResults }: ProfileGameHistoryProps) {
  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1: return { 
        bg: 'bg-gradient-to-br from-yellow-400 to-amber-600', 
        icon: Trophy,
        shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
        badge: 'bg-yellow-500'
      };
      case 2: return { 
        bg: 'bg-gradient-to-br from-gray-300 to-gray-500', 
        icon: Medal,
        shadow: '',
        badge: 'bg-gray-400'
      };
      case 3: return { 
        bg: 'bg-gradient-to-br from-orange-400 to-orange-600', 
        icon: Award,
        shadow: '',
        badge: 'bg-orange-500'
      };
      default: return { 
        bg: 'bg-secondary', 
        icon: Target,
        shadow: '',
        badge: 'bg-muted'
      };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      year: date.getFullYear()
    };
  };

  if (gameResults.length === 0) {
    return (
      <Card className="brutal-border bg-card">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-10 w-10 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">История пуста</h3>
            <p className="text-muted-foreground">
              Сыграйте турниры, чтобы увидеть историю ваших игр
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="brutal-border bg-card overflow-hidden">
      <CardHeader className="border-b border-border bg-secondary/30">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">История игр</h3>
              <div className="h-0.5 w-16 bg-gradient-to-r from-primary to-accent mt-1" />
            </div>
          </div>
          <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-none">
            {gameResults.length} игр
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          <AnimatePresence>
            {gameResults.map((result, index) => {
              const posStyle = getPositionStyle(result.position);
              const Icon = posStyle.icon;
              const dateInfo = formatDate(result.created_at);
              
              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group flex items-center gap-4 p-4 transition-all duration-300 hover:bg-secondary/50 ${
                    result.position <= 3 ? 'bg-gradient-to-r from-primary/5 via-transparent to-transparent' : ''
                  }`}
                >
                  {/* Position Badge */}
                  <motion.div 
                    className={`relative w-14 h-14 ${posStyle.bg} ${posStyle.shadow} flex items-center justify-center shrink-0`}
                    whileHover={{ scale: 1.1, rotate: result.position === 1 ? 5 : 0 }}
                  >
                    {result.position <= 3 ? (
                      <Icon className="h-6 w-6 text-white" />
                    ) : (
                      <span className="text-lg font-black text-foreground">#{result.position}</span>
                    )}
                    {result.position === 1 && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  
                  {/* Tournament Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base group-hover:text-primary transition-colors truncate ${
                      result.position <= 3 ? 'text-foreground' : 'text-foreground/80'
                    }`}>
                      {result.tournament.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateInfo.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dateInfo.time}
                      </span>
                    </div>
                  </div>
                  
                  {/* RPS Change */}
                  <div className="text-right shrink-0">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 font-bold ${
                        result.elo_change > 0 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : result.elo_change < 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-secondary text-muted-foreground border border-border'
                      }`}
                    >
                      {result.elo_change > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : result.elo_change < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {result.elo_change > 0 ? '+' : ''}{result.elo_change}
                      </span>
                    </motion.div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {result.elo_before} → {result.elo_after} RPS
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
