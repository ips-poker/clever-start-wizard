/**
 * TournamentInfoPanel - Professional tournament information panel
 * Shows PKO bounties, satellite progress, or regular tournament info
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, Coins, Target, Ticket, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BountyDisplay } from './BountyDisplay';
import { BountyLeaderboard } from './BountyLeaderboard';
import { SatelliteProgress } from './SatelliteProgress';
import { usePKOBounty } from '@/hooks/usePKOBounty';
import { useSatellite } from '@/hooks/useSatellite';

interface TournamentInfoPanelProps {
  tournamentId: string;
  playerId?: string;
  tournamentName?: string;
  prizePool?: number;
  playersRemaining?: number;
  totalPlayers?: number;
  currentLevel?: number;
  smallBlind?: number;
  bigBlind?: number;
  ante?: number;
  className?: string;
}

export function TournamentInfoPanel({
  tournamentId,
  playerId,
  tournamentName,
  prizePool = 0,
  playersRemaining = 0,
  totalPlayers = 0,
  currentLevel = 1,
  smallBlind = 0,
  bigBlind = 0,
  ante = 0,
  className
}: TournamentInfoPanelProps) {
  const { isPKO, bountyData, leaderboard } = usePKOBounty(tournamentId, playerId);
  const { satelliteInfo } = useSatellite(tournamentId, playerId);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex flex-col gap-3",
        className
      )}
    >
      {/* Tournament Name & Prize */}
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-white font-bold text-lg truncate mb-2">
          {tournamentName || 'Tournament'}
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-white/50 text-xs">Призовой фонд</div>
              <div className="text-amber-400 font-bold">
                {prizePool.toLocaleString()} 💎
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-white/50 text-xs">Игроков</div>
              <div className="text-white font-bold">
                {playersRemaining}/{totalPlayers}
              </div>
            </div>
          </div>
        </div>

        {/* Blinds Info */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-400" />
              <span className="text-white/60 text-sm">Уровень {currentLevel}</span>
            </div>
            <div className="text-white font-mono text-sm">
              {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()}
              {ante > 0 && <span className="text-white/50"> ({ante})</span>}
            </div>
          </div>
        </div>
      </div>

      {/* PKO Bounty Panel */}
      {isPKO && playerId && (
        <BountyDisplay
          tournamentId={tournamentId}
          playerId={playerId}
        />
      )}

      {/* PKO Leaderboard */}
      {isPKO && leaderboard.length > 0 && (
        <BountyLeaderboard
          tournamentId={tournamentId}
          currentPlayerId={playerId}
          maxPlayers={5}
        />
      )}

      {/* Satellite Progress */}
      {satelliteInfo.isSatellite && (
        <SatelliteProgress
          tournamentId={tournamentId}
          currentPlayerId={playerId}
        />
      )}

      {/* Tournament Format Badge */}
      <div className="flex items-center gap-2 justify-center">
        {isPKO && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
            <Crosshair className="h-3 w-3 text-red-400" />
            <span className="text-red-400 text-xs font-medium">PKO</span>
          </div>
        )}
        {satelliteInfo.isSatellite && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
            <Ticket className="h-3 w-3 text-amber-400" />
            <span className="text-amber-400 text-xs font-medium">Satellite</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default TournamentInfoPanel;
