import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, TrendingUp, Target, Award, Medal, Crown, Zap, Flame, 
  Calendar, Clock, Percent, ChartLine, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

interface GameResult {
  id: string;
  position: number;
  elo_change: number;
  elo_after: number;
  elo_before: number;
  created_at: string;
  tournament: { name: string };
}

interface ProfileStatsDashboardProps {
  gamesPlayed: number;
  wins: number;
  rating: number;
  gameResults: GameResult[];
}

export function ProfileStatsDashboard({ gamesPlayed, wins, rating, gameResults }: ProfileStatsDashboardProps) {
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  const top3Count = gameResults.filter(r => r.position <= 3).length;
  const avgPosition = gameResults.length > 0 
    ? (gameResults.reduce((acc, r) => acc + r.position, 0) / gameResults.length).toFixed(1) 
    : '-';
  const totalRPSGained = gameResults.reduce((acc, r) => acc + (r.elo_change > 0 ? r.elo_change : 0), 0);
  const bestResult = gameResults.length > 0 
    ? Math.min(...gameResults.map(r => r.position)) 
    : '-';
  const currentStreak = calculateStreak(gameResults);

  // Chart data
  const eloData = gameResults.slice(0, 15).reverse().map((result, index) => ({
    game: index + 1,
    elo: result.elo_after,
    change: result.elo_change
  }));

  const positionData = [
    { position: '1 место', count: gameResults.filter(r => r.position === 1).length, color: '#FFD700' },
    { position: '2 место', count: gameResults.filter(r => r.position === 2).length, color: '#C0C0C0' },
    { position: '3 место', count: gameResults.filter(r => r.position === 3).length, color: '#CD7F32' },
    { position: 'Топ-5', count: gameResults.filter(r => r.position > 3 && r.position <= 5).length, color: 'hsl(var(--primary))' },
    { position: 'Другое', count: gameResults.filter(r => r.position > 5).length, color: 'hsl(var(--muted))' },
  ].filter(d => d.count > 0);

  function calculateStreak(results: GameResult[]): { type: 'win' | 'top3' | 'none'; count: number } {
    if (results.length === 0) return { type: 'none', count: 0 };
    
    let winStreak = 0;
    let top3Streak = 0;
    
    for (const result of results) {
      if (result.position === 1) winStreak++;
      else break;
    }
    
    if (winStreak === 0) {
      for (const result of results) {
        if (result.position <= 3) top3Streak++;
        else break;
      }
    }
    
    if (winStreak > 0) return { type: 'win', count: winStreak };
    if (top3Streak > 0) return { type: 'top3', count: top3Streak };
    return { type: 'none', count: 0 };
  }

  const mainStats = [
    { label: 'Игр сыграно', value: gamesPlayed, icon: Target, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { label: 'Побед', value: wins, icon: Trophy, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    { label: 'Топ-3', value: top3Count, icon: Medal, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    { label: 'Винрейт', value: `${winRate}%`, icon: Percent, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    { label: 'Ср. место', value: avgPosition, icon: ChartLine, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { label: 'Лучший', value: bestResult === '-' ? '-' : `#${bestResult}`, icon: Crown, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {mainStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="brutal-border bg-card hover:border-primary/50 transition-all group">
                <CardContent className="p-4 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-12 h-12 ${stat.bgColor} opacity-50 blur-xl`} />
                  <div className="relative z-10">
                    <div className={`p-2 ${stat.bgColor} border border-border w-fit mb-2`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <motion.p 
                      className={`text-2xl font-black ${stat.color}`}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: index * 0.1 + 0.2 }}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Streak & RPS Gained */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Streak */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`brutal-border bg-card overflow-hidden ${currentStreak.count > 0 ? 'border-primary/50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className={`p-3 ${currentStreak.count > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-secondary'}`}
                    animate={currentStreak.count > 0 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame className={`h-6 w-6 ${currentStreak.count > 0 ? 'text-white' : 'text-muted-foreground'}`} />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground">Текущая серия</p>
                    <p className="text-xl font-bold text-foreground">
                      {currentStreak.count > 0 
                        ? `${currentStreak.count} ${currentStreak.type === 'win' ? 'побед' : 'топ-3'} подряд!`
                        : 'Начните новую серию'
                      }
                    </p>
                  </div>
                </div>
                {currentStreak.count > 0 && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-none font-bold text-lg px-3">
                    🔥 {currentStreak.count}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total RPS Gained */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="brutal-border bg-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Всего заработано RPS</p>
                    <p className="text-xl font-bold text-green-400">+{totalRPSGained}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase">Текущий рейтинг</p>
                  <p className="text-2xl font-black neon-orange">{rating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ELO Chart */}
        <Card className="brutal-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 bg-primary">
                <ChartLine className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold uppercase">Динамика RPS</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {eloData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={eloData}>
                  <defs>
                    <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="game" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} width={35} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--border))',
                      borderRadius: '0',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [value, 'RPS']}
                    labelFormatter={(label) => `Игра ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="elo" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#eloGradient)"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 text-primary opacity-50" />
                <p className="text-sm">Сыграйте турниры для графика</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Position Distribution */}
        <Card className="brutal-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 bg-yellow-500">
                <Award className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold uppercase">Распределение мест</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {positionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={positionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="position" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} width={60} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--border))',
                      borderRadius: '0',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [value, 'раз']}
                  />
                  <Bar dataKey="count" radius={0}>
                    {positionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Medal className="h-8 w-8 mx-auto mb-2 text-primary opacity-50" />
                <p className="text-sm">Сыграйте турниры для статистики</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
