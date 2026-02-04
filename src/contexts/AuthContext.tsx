import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
  isAdmin: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetching = useRef(false);
  const initCompleted = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initCompleted.current) return;
    initCompleted.current = true;

    let mounted = true;

    // Set up auth state listener ONCE
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        // Skip redundant INITIAL_SESSION events after first load
        if (event === 'INITIAL_SESSION' && session !== null) {
          return;
        }
        
        console.log('Auth state changed:', event, newSession?.user?.email);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user && event !== 'INITIAL_SESSION') {
          // Use setTimeout to prevent race conditions
          setTimeout(() => {
            if (mounted) fetchUserProfile(newSession.user.id);
          }, 0);
        } else if (!newSession?.user) {
          setUserProfile(null);
          lastFetchedUserId.current = null;
        }
        
        setLoading(false);
      }
    );

    // Check for existing session ONCE
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      console.log('Initial session check:', existingSession?.user?.email);
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (lastFetchedUserId.current === userId || isFetching.current) {
      return;
    }
    
    isFetching.current = true;
    try {
      console.log('Fetching profile for user:', userId);
      
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

  const refreshProfile = async () => {
    if (user) {
      lastFetchedUserId.current = null;
      isFetching.current = false;
      await fetchUserProfile(user.id);
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
      lastFetchedUserId.current = null;
      
      return { error: null };
    } catch (error) {
      console.error('Error in signOut:', error);
      return { error };
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    userProfile,
    loading,
    signOut,
    isAdmin: userProfile?.user_role === 'admin',
    isAuthenticated: !!session && !!user,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
