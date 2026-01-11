// ============================================
// TABLE QUICK MENU - PokerStars-style sidebar menu
// ============================================
// Professional poker table menu with all essential functions

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  History, 
  Settings, 
  Palette, 
  Coffee,
  Diamond,
  BarChart3,
  MessageSquare,
  Trophy,
  Info,
  Eye,
  Wallet,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  badge?: string | number;
  disabled?: boolean;
}

const MenuItem = ({ icon, label, onClick, variant = 'default', badge, disabled }: MenuItemProps) => {
  const variants = {
    default: 'text-white/80 hover:text-white hover:bg-white/10',
    danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
    success: 'text-green-400 hover:text-green-300 hover:bg-green-500/10',
    warning: 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg',
        variants[variant],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge !== undefined && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-white/10">
          {badge}
        </span>
      )}
    </button>
  );
};

interface TableQuickMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isTournament: boolean;
  isSittingOut: boolean;
  hasPlayer: boolean;
  stack?: number;
  // Actions
  onLeave: () => void;
  onSitOut: () => void;
  onSitIn: () => void;
  onShowHandHistory: () => void;
  onShowSettings: () => void;
  onShowPersonalSettings: () => void;
  onShowRebuy?: () => void;
  onShowTournamentLobby?: () => void;
  onShowStatistics?: () => void;
  onShowChat?: () => void;
}

export function TableQuickMenu({
  isOpen,
  onClose,
  isTournament,
  isSittingOut,
  hasPlayer,
  stack,
  onLeave,
  onSitOut,
  onSitIn,
  onShowHandHistory,
  onShowSettings,
  onShowPersonalSettings,
  onShowRebuy,
  onShowTournamentLobby,
  onShowStatistics,
  onShowChat
}: TableQuickMenuProps) {
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute left-2 top-16 z-50 w-64"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, 0px) + 64px)'
            }}
          >
            <div className="bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              
              {/* Stack Display (if seated) */}
              {hasPlayer && stack !== undefined && (
                <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Ваш стек</span>
                    <div className="flex items-center gap-1.5">
                      <Diamond className="h-4 w-4 text-cyan-400" />
                      <span className="font-bold text-white">{stack.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Main Menu Items */}
              <div className="p-2">
                {/* Hand History - Primary Action */}
                <MenuItem
                  icon={<History className="h-4 w-4" />}
                  label="Последняя раздача"
                  onClick={() => { onShowHandHistory(); onClose(); }}
                  variant="warning"
                />
                
                <Separator className="my-2 bg-white/10" />
                
                {/* Sit Out / Sit In */}
                {hasPlayer && !isTournament && (
                  <MenuItem
                    icon={isSittingOut ? <RotateCcw className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                    label={isSittingOut ? 'Вернуться в игру' : 'Пропустить раздачу'}
                    onClick={() => { isSittingOut ? onSitIn() : onSitOut(); onClose(); }}
                    variant={isSittingOut ? 'success' : 'default'}
                  />
                )}
                
                {/* Rebuy (Cash game) */}
                {hasPlayer && !isTournament && onShowRebuy && (
                  <MenuItem
                    icon={<Wallet className="h-4 w-4" />}
                    label="Докупить фишки"
                    onClick={() => { onShowRebuy(); onClose(); }}
                  />
                )}
                
                {/* Tournament Lobby */}
                {isTournament && onShowTournamentLobby && (
                  <MenuItem
                    icon={<Trophy className="h-4 w-4" />}
                    label="Лобби турнира"
                    onClick={() => { onShowTournamentLobby(); onClose(); }}
                  />
                )}
                
                <Separator className="my-2 bg-white/10" />
                
                {/* Statistics */}
                {onShowStatistics && (
                  <MenuItem
                    icon={<BarChart3 className="h-4 w-4" />}
                    label="Статистика"
                    onClick={() => { onShowStatistics(); onClose(); }}
                  />
                )}
                
                {/* Settings */}
                <MenuItem
                  icon={<Settings className="h-4 w-4" />}
                  label="Настройки стола"
                  onClick={() => { onShowSettings(); onClose(); }}
                />
                
                {/* Personalization */}
                <MenuItem
                  icon={<Palette className="h-4 w-4" />}
                  label="Персонализация"
                  onClick={() => { onShowPersonalSettings(); onClose(); }}
                />
                
                <Separator className="my-2 bg-white/10" />
                
                {/* Leave Table */}
                <MenuItem
                  icon={<LogOut className="h-4 w-4" />}
                  label={isTournament ? 'Покинуть турнир' : 'Покинуть стол'}
                  onClick={() => { onLeave(); onClose(); }}
                  variant="danger"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TableQuickMenu;
