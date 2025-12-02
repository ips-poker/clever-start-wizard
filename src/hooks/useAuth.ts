import React, { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_role: 'admin' | 'editor' | 'user';
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    let isInitialLoad = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Только для событий после инициализации, не для INITIAL_SESSION
        if (!isInitialLoad && event !== 'INITIAL_SESSION' && session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else if (!session?.user) {
          setUserProfile(null);
          lastFetchedUserId.current = null;
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session ONCE
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
      isInitialLoad = false; // Отмечаем, что начальная загрузка завершена
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    // Предотвращаем множественные загрузки одного и того же профиля
    if (lastFetchedUserId.current === userId || isFetching.current) {
      console.log('Profile already fetched or currently fetching, skipping');
      return;
    }
    
    isFetching.current = true;
    try {
      console.log('Fetching profile for user:', userId);
      
      // Используем функцию get_user_profile для обхода RLS через кастомный домен
      const { data, error } = await supabase
        .rpc('get_user_profile', { user_uuid: userId });

      console.log('Profile RPC result:', { data, error, userId });

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('Profile not found for user');
        setUserProfile(null);
        return;
      }

      // RPC возвращает массив, берем первый элемент
      const profileData = Array.isArray(data) ? data[0] : data;
      console.log('Profile fetched successfully:', profileData);
      setUserProfile(profileData as UserProfile);
      lastFetchedUserId.current = userId;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      isFetching.current = false;
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      console.log('Creating profile for user:', userId);
      const { data, error } = await supabase.rpc('create_user_profile_safe', {
        p_user_id: userId,
        p_email: user?.email || '',
        p_full_name: null,
        p_avatar_url: null
      });

      if (error) {
        console.error('Error creating user profile:', error);
        return;
      }

      const result = data as { success: boolean; error?: string; profile?: any };
      if (!result?.success) {
        console.error('Profile creation failed:', result?.error);
        return;
      }

      console.log('Profile created successfully:', result.profile);
      setUserProfile(result.profile as UserProfile);
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return { error };
      }
      
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      return { error: null };
    } catch (error) {
      console.error('Error in signOut:', error);
      return { error };
    }
  };

  return {
    user,
    session,
    userProfile,
    loading,
    signOut,
    isAdmin: userProfile?.user_role === 'admin',
    isAuthenticated: !!session && !!user
  };
}