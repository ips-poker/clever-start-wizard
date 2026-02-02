import React, { createContext, useContext, ReactNode } from 'react';
import { useUserClub } from '@/hooks/useUserClub';
import { useClubSubscription } from '@/hooks/useClubSubscription';
import { Club, ClubSubscription, ClubRole, SubscriptionPlan } from '@/types/club';

interface ClubContextValue {
  // Данные клуба
  club: Club | null;
  subscription: ClubSubscription | null;
  
  // Роль пользователя
  role: ClubRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isDirector: boolean;
  
  // Права
  canManageTournaments: boolean;
  canManageStaff: boolean;
  
  // Лимиты подписки
  canCreateTournament: boolean;
  canAddPlayer: boolean;
  canAddStaff: boolean;
  hasFeature: (feature: 'voice_control' | 'online_poker' | 'analytics' | 'api_access') => boolean;
  
  // План
  plan: SubscriptionPlan;
  isActive: boolean;
  
  // Состояние
  loading: boolean;
  hasClub: boolean;
}

const ClubContext = createContext<ClubContextValue | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const userClub = useUserClub();
  const subscription = useClubSubscription({ clanId: userClub.club?.id });

  const value: ClubContextValue = {
    // Данные клуба
    club: userClub.club,
    subscription: subscription.subscription,
    
    // Роль пользователя
    role: userClub.role,
    isOwner: userClub.isOwner,
    isAdmin: userClub.isAdmin,
    isDirector: userClub.isDirector,
    
    // Права
    canManageTournaments: userClub.canManageTournaments && subscription.limits.canCreateTournament,
    canManageStaff: userClub.canManageStaff && subscription.limits.canAddStaff,
    
    // Лимиты подписки
    canCreateTournament: subscription.limits.canCreateTournament,
    canAddPlayer: subscription.limits.canAddPlayer,
    canAddStaff: subscription.limits.canAddStaff,
    hasFeature: subscription.hasFeature,
    
    // План
    plan: subscription.plan,
    isActive: subscription.isActive,
    
    // Состояние
    loading: userClub.loading || subscription.loading,
    hasClub: !!userClub.club
  };

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub(): ClubContextValue {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}

// Хелпер для проверки прав вне контекста (для guards)
export function useClubGuard() {
  const club = useClub();
  
  return {
    requireOwner: () => {
      if (!club.isOwner) {
        throw new Error('Требуются права владельца клуба');
      }
    },
    requireAdmin: () => {
      if (!club.isAdmin) {
        throw new Error('Требуются права администратора клуба');
      }
    },
    requireDirector: () => {
      if (!club.isDirector) {
        throw new Error('Требуются права директора клуба');
      }
    },
    requireClub: () => {
      if (!club.hasClub) {
        throw new Error('Необходимо быть членом клуба');
      }
    }
  };
}
