 import { useState, useEffect, useCallback, useRef } from "react";
 import { supabase } from "@/integrations/supabase/client";
 
 export interface Player {
   id: string;
   name: string;
   elo_rating: number;
   games_played: number;
   wins: number;
  avatar_url?: string | null;
   manual_rank?: string | null;
 }
 
 interface UsePlayersDataResult {
   players: Player[];
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 const CACHE_KEY = 'players_data_cache';
 const CACHE_EXPIRY = 2 * 60 * 1000; // 2 minutes
 
 // Global subscription manager for players
 const playersSubscriptionManager = {
   channel: null as any,
   subscribers: 0,
   callbacks: new Set<() => void>(),
   setupTimeout: null as NodeJS.Timeout | null,
   
   subscribe(callback: () => void): () => void {
     this.callbacks.add(callback);
     this.subscribers++;
     
     if (this.subscribers === 1 && !this.setupTimeout) {
       this.setupTimeout = setTimeout(() => {
         this.setupTimeout = null;
         
         if (this.subscribers <= 0) return;
         
         console.log('Players: Setting up global realtime subscription');
         
         this.channel = supabase
           .channel('global_players_changes')
           .on('postgres_changes', {
             event: '*',
             schema: 'public',
             table: 'players'
           }, () => {
             this.callbacks.forEach(cb => cb());
           })
           .subscribe();
       }, 100);
     }
     
     return () => this.unsubscribe(callback);
   },
   
   unsubscribe(callback: () => void): void {
     this.callbacks.delete(callback);
     this.subscribers--;
     
     if (this.subscribers <= 0) {
       if (this.setupTimeout) {
         clearTimeout(this.setupTimeout);
         this.setupTimeout = null;
       }
       
       if (this.channel) {
         console.log('Players: Cleaning up global subscription');
         supabase.removeChannel(this.channel);
         this.channel = null;
       }
     }
   }
 };
 
 // Global cache
 let globalPlayersCache: { data: Player[]; timestamp: number } | null = null;
 
 function getCachedPlayers(): Player[] | null {
   // Check memory cache first
   if (globalPlayersCache && Date.now() - globalPlayersCache.timestamp < CACHE_EXPIRY) {
     return globalPlayersCache.data;
   }
   
   // Try localStorage
   try {
     const cached = localStorage.getItem(CACHE_KEY);
     if (cached) {
       const parsed = JSON.parse(cached);
       if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
         globalPlayersCache = parsed;
         return parsed.data;
       }
     }
   } catch (e) {
     console.warn('Failed to get cached players:', e);
   }
   
   return null;
 }
 
 function setCachedPlayers(data: Player[]): void {
   const cacheObj = { data, timestamp: Date.now() };
   globalPlayersCache = cacheObj;
   
   try {
     localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
   } catch (e) {
     console.warn('Failed to cache players:', e);
   }
 }
 
 export function usePlayersData(): UsePlayersDataResult {
   const [players, setPlayers] = useState<Player[]>(() => getCachedPlayers() || []);
   const [loading, setLoading] = useState(() => !getCachedPlayers());
   const [error, setError] = useState<string | null>(null);
   const isMountedRef = useRef(true);
   const fetchInProgressRef = useRef(false);
 
   const loadPlayers = useCallback(async (skipCache = false) => {
     if (fetchInProgressRef.current) return;
     
     // Use cache if available and not skipping
     if (!skipCache) {
       const cached = getCachedPlayers();
       if (cached) {
         setPlayers(cached);
         setLoading(false);
         return;
       }
     }
     
     fetchInProgressRef.current = true;
     setLoading(true);
     
     try {
       const { data, error: fetchError } = await supabase.rpc('get_players_public');
       
       if (fetchError) throw fetchError;
       
       const sortedPlayers = (data || []).sort((a: Player, b: Player) => b.elo_rating - a.elo_rating);
       
       if (isMountedRef.current) {
         setPlayers(sortedPlayers);
         setCachedPlayers(sortedPlayers);
         setError(null);
       }
     } catch (err: any) {
       console.error('Error loading players:', err);
       if (isMountedRef.current) {
         setError(err.message || 'Failed to load players');
       }
     } finally {
       fetchInProgressRef.current = false;
       if (isMountedRef.current) {
         setLoading(false);
       }
     }
   }, []);
 
   useEffect(() => {
     isMountedRef.current = true;
     
     // Initial load
     const cached = getCachedPlayers();
     if (cached) {
       setPlayers(cached);
       setLoading(false);
     } else {
       loadPlayers(false);
     }
     
     // Subscribe to changes
     const unsubscribe = playersSubscriptionManager.subscribe(() => {
       loadPlayers(true);
     });
     
     return () => {
       isMountedRef.current = false;
       unsubscribe();
     };
   }, [loadPlayers]);
 
   const refetch = useCallback(() => {
     globalPlayersCache = null;
     try {
       localStorage.removeItem(CACHE_KEY);
     } catch (e) {}
     loadPlayers(true);
   }, [loadPlayers]);
 
   return { players, loading, error, refetch };
 }