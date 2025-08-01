import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to avoid recursion
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        await createUserProfile(userId);
        return;
      }

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data as UserProfile);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .insert([
          {
            user_id: userId,
            email: user?.email,
            user_role: 'user' as const
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return;
      }

      setUserProfile(data as UserProfile);
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