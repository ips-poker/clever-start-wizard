import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ClubProvider, useClub } from "@/contexts/ClubContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubOverview } from "@/components/club/ClubOverview";
import { ClubTournaments } from "@/components/club/ClubTournaments";
import { ClubPlayers } from "@/components/club/ClubPlayers";
import { ClubRating } from "@/components/club/ClubRating";
import { ClubStaffManagement } from "@/components/club/ClubStaffManagement";
import { ClubSubscriptionPanel } from "@/components/club/ClubSubscriptionPanel";
import { ClubSettings } from "@/components/club/ClubSettings";
import { CreateClubForm } from "@/components/club/CreateClubForm";
import { Loader2, Building2, Trophy, Users, CreditCard, Settings, TrendingUp, UserCheck } from "lucide-react";

function ClubAdminContent() {
  const { club, loading, hasClub, role, isOwner, isAdmin, isDirector } = useClub();
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasClub) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CreateClubForm 
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["user-club"] });
          }} 
        />
      </div>
    );
  }

  if (!isDirector) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <Users className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Доступ ограничен</h1>
          <p className="text-muted-foreground">
            У вас нет прав для доступа к панели управления клубом.
            Обратитесь к владельцу клуба.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{club?.name}</h1>
          <p className="text-muted-foreground">Панель управления клубом</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 gap-1 h-auto p-1 bg-card/50">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Турниры</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Игроки</span>
          </TabsTrigger>
          <TabsTrigger value="rating" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Рейтинг</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="staff" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Персонал</span>
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="subscription" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Подписка</span>
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="settings" className="flex items-center gap-2 py-2 data-[state=active]:bg-primary/20">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ClubOverview />
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <ClubTournaments />
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <ClubPlayers />
        </TabsContent>

        <TabsContent value="rating" className="space-y-6">
          <ClubRating />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="staff" className="space-y-6">
            <ClubStaffManagement />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="subscription" className="space-y-6">
            <ClubSubscriptionPanel />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="settings" className="space-y-6">
            <ClubSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function ClubAdmin() {
  return (
    <ClubProvider>
      <div className="min-h-screen bg-background">
        <ClubAdminContent />
      </div>
    </ClubProvider>
  );
}
