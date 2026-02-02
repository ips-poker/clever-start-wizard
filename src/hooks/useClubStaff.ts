import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClubStaff, ClubRole, ClubPermissions } from "@/types/club";
import { toast } from "sonner";

interface UseClubStaffOptions {
  clanId?: string;
}

export function useClubStaff({ clanId }: UseClubStaffOptions = {}) {
  const queryClient = useQueryClient();

  const { data: staff, isLoading, error } = useQuery({
    queryKey: ["club-staff", clanId],
    queryFn: async () => {
      if (!clanId) return [];

      const { data, error } = await supabase
        .from('club_staff')
        .select(`
          *,
          player:players(id, name, avatar_url)
        `)
        .eq('clan_id', clanId)
        .eq('is_active', true)
        .order('role', { ascending: true });

      if (error) throw error;
      
      // Map DB response to ClubStaff type
      return (data || []).map(item => ({
        ...item,
        permissions: item.permissions as unknown as ClubPermissions
      })) as ClubStaff[];
    },
    enabled: !!clanId,
  });

  const addStaffMember = useMutation({
    mutationFn: async ({ 
      playerId,
      role, 
      permissions 
    }: { 
      playerId: string; 
      role: ClubRole; 
      permissions?: ClubPermissions;
    }) => {
      if (!clanId) throw new Error("No clan ID");

      const defaultPermissions: ClubPermissions = {
        manage_tournaments: role === 'director' || role === 'admin',
        manage_players: role === 'admin',
        manage_staff: false,
        view_analytics: role !== 'member'
      };

      const { data, error } = await supabase
        .from('club_staff')
        .insert({
          clan_id: clanId,
          player_id: playerId,
          role,
          permissions: JSON.parse(JSON.stringify(permissions || defaultPermissions))
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-staff", clanId] });
      toast.success("Сотрудник добавлен");
    },
    onError: (error) => {
      console.error("Error adding staff:", error);
      toast.error("Ошибка при добавлении сотрудника");
    }
  });

  const updateStaffRole = useMutation({
    mutationFn: async ({ 
      staffId, 
      role, 
      permissions 
    }: { 
      staffId: string; 
      role: ClubRole; 
      permissions?: ClubPermissions;
    }) => {
      const updateData: any = { role };
      if (permissions) updateData.permissions = permissions;

      const { data, error } = await supabase
        .from('club_staff')
        .update(updateData)
        .eq('id', staffId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-staff", clanId] });
      toast.success("Роль обновлена");
    },
    onError: (error) => {
      console.error("Error updating staff:", error);
      toast.error("Ошибка при обновлении роли");
    }
  });

  const removeStaffMember = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('club_staff')
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-staff", clanId] });
      toast.success("Сотрудник удалён");
    },
    onError: (error) => {
      console.error("Error removing staff:", error);
      toast.error("Ошибка при удалении сотрудника");
    }
  });

  return {
    staff: staff || [],
    loading: isLoading,
    error,
    addStaffMember,
    updateStaffRole,
    removeStaffMember
  };
}
