import React, { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, Play, Eye } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  description: string;
  buy_in: number;
  max_players: number;
  start_time: string;
  status: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_remaining: number;
  is_published: boolean;
  is_archived: boolean;
}

interface OptimizedTournamentCardProps {
  tournament: Tournament;
  registrationCount: number;
  onSelect: (tournament: Tournament) => void;
  onStart: (tournament: Tournament) => void;
  isSelected: boolean;
}

const getStatusBadge = (status: string) => {
  const variants = {
    scheduled: "secondary",
    registration: "default", 
    running: "destructive",
    finished: "outline",
    cancelled: "secondary"
  } as const;

  return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status}</Badge>;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const OptimizedTournamentCard = memo(({ 
  tournament, 
  registrationCount, 
  onSelect, 
  onStart, 
  isSelected 
}: OptimizedTournamentCardProps) => {
  const handleSelect = () => onSelect(tournament);
  const handleStart = () => onStart(tournament);

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      isSelected ? 'ring-2 ring-primary shadow-lg' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">{tournament.name}</CardTitle>
          {getStatusBadge(tournament.status)}
        </div>
        <CardDescription className="text-sm text-muted-foreground line-clamp-2">
          {tournament.description || "Без описания"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <span>{tournament.buy_in} EP</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{registrationCount}/{tournament.max_players}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatTime(tournament.timer_remaining)}</span>
          </div>
        </div>

        {tournament.status === 'running' && (
          <div className="text-sm text-center p-2 bg-muted rounded-md">
            <div>Уровень {tournament.current_level}</div>
            <div className="font-medium">
              {tournament.current_small_blind}/{tournament.current_big_blind}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            variant={isSelected ? "default" : "outline"} 
            size="sm" 
            onClick={handleSelect}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            {isSelected ? "Выбран" : "Выбрать"}
          </Button>
          
          {tournament.status === 'registration' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleStart}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-1" />
              Запустить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedTournamentCard.displayName = "OptimizedTournamentCard";