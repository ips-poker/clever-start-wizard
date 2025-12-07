/**
 * PokerCraft Analytics Dashboard
 * Professional statistics and analytics similar to GGPoker PokerCraft
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Percent,
  Calendar,
  Clock,
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  DollarSign,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayerStats, 
  SessionStats,
  LeakAnalysis,
  calculateWinRate,
  getPlayerType,
  analyzeLeaks,
  generateSessionSummary,
  formatPercentage,
  formatBB
} from '@/utils/pokerAnalytics';

interface PokerCraftDashboardProps {
  stats: PlayerStats;
  bigBlind: number;
  className?: string;
}

export function PokerCraftDashboard({
  stats,
  bigBlind,
  className = ''
}: PokerCraftDashboardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  
  const winRate = calculateWinRate(stats);
  const playerType = getPlayerType(stats.vpip, stats.pfr);
  const leaks = analyzeLeaks(stats);
  
  const winRateColor = winRate > 5 ? 'text-green-400' :
                       winRate > 0 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <div className={`${className} space-y-6`}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label="Руки"
          value={stats.handsPlayed.toLocaleString()}
          color="text-blue-400"
        />
        <StatCard
          icon={winRate >= 0 ? TrendingUp : TrendingDown}
          label="BB/100"
          value={formatBB(winRate).replace(' BB', '')}
          color={winRateColor}
        />
        <StatCard
          icon={DollarSign}
          label="Профит"
          value={formatBB(stats.bigBlindsWon)}
          color={stats.bigBlindsWon >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          icon={Trophy}
          label="Побед"
          value={`${((stats.handsWon / Math.max(1, stats.handsPlayed)) * 100).toFixed(1)}%`}
          color="text-amber-400"
        />
      </div>
      
      {/* Player Type Badge */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
        <div className={`
          px-4 py-2 rounded-lg font-bold text-lg
          ${playerType.color === 'green' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            playerType.color === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            playerType.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            playerType.color === 'orange' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
            playerType.color === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
            playerType.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
            'bg-muted text-muted-foreground border border-border'}
        `}>
          {playerType.type}
        </div>
        <div>
          <div className="text-sm text-foreground font-medium">{playerType.description}</div>
          <div className="text-xs text-muted-foreground">
            VPIP: {formatPercentage(stats.vpip)} / PFR: {formatPercentage(stats.pfr)} / AF: {stats.afPostflop.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Main Tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="positions">Позиции</TabsTrigger>
          <TabsTrigger value="leaks">Утечки</TabsTrigger>
          <TabsTrigger value="sessions">Сессии</TabsTrigger>
        </TabsList>
        
        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4 mt-4">
          {/* Preflop Stats */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Префлоп статистика
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem
                label="VPIP"
                value={formatPercentage(stats.vpip)}
                optimal="20-28%"
                current={stats.vpip}
                optimalMin={20}
                optimalMax={28}
              />
              <StatItem
                label="PFR"
                value={formatPercentage(stats.pfr)}
                optimal="15-22%"
                current={stats.pfr}
                optimalMin={15}
                optimalMax={22}
              />
              <StatItem
                label="3-Bet"
                value={formatPercentage(stats.threeBet)}
                optimal="6-10%"
                current={stats.threeBet}
                optimalMin={6}
                optimalMax={10}
              />
              <StatItem
                label="Gap (VPIP-PFR)"
                value={formatPercentage(stats.vpip - stats.pfr)}
                optimal="<6%"
                current={stats.vpip - stats.pfr}
                optimalMin={0}
                optimalMax={6}
              />
            </CardContent>
          </Card>
          
          {/* Postflop Stats */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Постфлоп статистика
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem
                label="AF"
                value={stats.afPostflop.toFixed(2)}
                optimal="2.0-3.5"
                current={stats.afPostflop}
                optimalMin={2}
                optimalMax={3.5}
              />
              <StatItem
                label="C-Bet"
                value={formatPercentage(stats.cbet)}
                optimal="60-75%"
                current={stats.cbet}
                optimalMin={60}
                optimalMax={75}
              />
              <StatItem
                label="WTSD"
                value={formatPercentage(stats.wtsd)}
                optimal="25-32%"
                current={stats.wtsd}
                optimalMin={25}
                optimalMax={32}
              />
              <StatItem
                label="W$SD"
                value={formatPercentage(stats.wsd)}
                optimal=">50%"
                current={stats.wsd}
                optimalMin={50}
                optimalMax={100}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {Object.entries(stats.positionStats).map(([pos, posStats]) => (
                  <div key={pos} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="w-16 font-bold text-foreground">{pos}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {posStats.handsPlayed} рук
                        </span>
                        <span className={posStats.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatBB(posStats.profit / bigBlind)}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(0, posStats.winRate + 50))} 
                        className="h-1.5"
                      />
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">VPIP</div>
                      <div className="text-foreground font-mono">{formatPercentage(posStats.vpip)}</div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(stats.positionStats).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Недостаточно данных по позициям
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Leaks Tab */}
        <TabsContent value="leaks" className="space-y-4 mt-4">
          {leaks.length > 0 ? (
            <div className="space-y-3">
              {leaks.map((leak, index) => (
                <LeakCard key={index} leak={leak} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Trophy className="w-12 h-12 mx-auto text-green-400 mb-3" />
                <div className="text-lg font-medium text-foreground">Отлично!</div>
                <div className="text-sm text-muted-foreground">
                  Явных утечек в вашей игре не обнаружено
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {stats.sessions.length > 0 ? (
            <div className="space-y-3">
              {stats.sessions.slice(0, 10).map((session) => {
                const summary = generateSessionSummary(session);
                return (
                  <SessionCard key={session.sessionId} session={session} summary={summary} />
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                История сессий пуста
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  label,
  value,
  optimal,
  current,
  optimalMin,
  optimalMax
}: {
  label: string;
  value: string;
  optimal: string;
  current: number;
  optimalMin: number;
  optimalMax: number;
}) {
  const isOptimal = current >= optimalMin && current <= optimalMax;
  const color = isOptimal ? 'text-green-400' : 
                current < optimalMin ? 'text-blue-400' : 'text-red-400';
  
  return (
    <div className="text-center p-3 bg-muted/20 rounded-lg">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1">
        Оптимально: {optimal}
      </div>
    </div>
  );
}

function LeakCard({ leak }: { leak: LeakAnalysis }) {
  const severityConfig = {
    low: { color: 'border-blue-500/30 bg-blue-500/10', icon: 'text-blue-400' },
    medium: { color: 'border-yellow-500/30 bg-yellow-500/10', icon: 'text-yellow-400' },
    high: { color: 'border-orange-500/30 bg-orange-500/10', icon: 'text-orange-400' },
    critical: { color: 'border-red-500/30 bg-red-500/10', icon: 'text-red-400' }
  };
  
  const config = severityConfig[leak.severity];
  
  return (
    <Card className={`border ${config.color}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 mt-0.5 ${config.icon}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground">{leak.category}</span>
              <span className="text-xs text-red-400">
                -{leak.impactBB.toFixed(1)} BB/100
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{leak.description}</p>
            <p className="text-xs text-foreground/80 bg-muted/30 p-2 rounded">
              💡 {leak.suggestion}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({ 
  session, 
  summary 
}: { 
  session: SessionStats; 
  summary: ReturnType<typeof generateSessionSummary>;
}) {
  const verdictColors = {
    excellent: 'text-green-400',
    good: 'text-emerald-400',
    breakeven: 'text-yellow-400',
    bad: 'text-orange-400',
    terrible: 'text-red-400'
  };
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">
                {new Date(session.startTime).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {summary.duration}
                <span>•</span>
                {session.handsPlayed} рук
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${session.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {session.profit >= 0 ? '+' : ''}{session.bigBlindsWon.toFixed(1)} BB
            </div>
            <div className={`text-xs ${verdictColors[summary.verdict]}`}>
              {summary.bbPerHour.toFixed(1)} BB/час
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
