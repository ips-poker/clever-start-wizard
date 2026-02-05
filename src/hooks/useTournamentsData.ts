 import { useState, useEffect, useCallback, useRef } from "react";
 import { supabase } from "@/integrations/supabase/client";
 
 export interface Tournament {
   id: string;
   name: string;
   description: string;
   participation_fee: number;
   reentry_fee: number;
   additional_fee: number;
   reentry_chips: number;
   additional_chips: number;
   starting_chips: number;
   max_players: number;
   start_time: string;
   status: string;
   tournament_format: string;
   reentry_end_level: number;
   additional_level: number;
   break_start_level: number;
   total_reentries?: number;
   total_additional_sets?: number;
   _count?: {
     tournament_registrations: number;
   };
 }
 
 interface UseTournamentsDataResult {
   tournaments: Tournament[];
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 const CACHE_KEY = 'tournaments_data_cache';
 const CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute (tournaments change more frequently)
 
 // Global subscription manager for tournaments
 const tournamentsSubscriptionManager = {
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
         
         console.log('Tournaments: Setting up global realtime subscription');
         
         this.channel = supabase
           .channel('global_tournaments_changes')
           .on('postgres_changes', {
             event: '*',
             schema: 'public',
             table: 'tournaments'
           }, () => {
             this.callbacks.forEach(cb => cb());
           })
           .on('postgres_changes', {
             event: '*',
             schema: 'public',
             table: 'tournament_registrations'
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
         console.log('Tournaments: Cleaning up global subscription');
         supabase.removeChannel(this.channel);
         this.channel = null;
       }
     }
   }
 };
 
 // Global cache
 let globalTournamentsCache: { data: Tournament[]; timestamp: number } | null = null;
 
 function getCachedTournaments(): Tournament[] | null {
   if (globalTournamentsCache && Date.now() - globalTournamentsCache.timestamp < CACHE_EXPIRY) {
     return globalTournamentsCache.data;
   }
   
   try {
     const cached = localStorage.getItem(CACHE_KEY);
     if (cached) {
       const parsed = JSON.parse(cached);
       if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
         globalTournamentsCache = parsed;
         return parsed.data;
       }
     }
   } catch (e) {
     console.warn('Failed to get cached tournaments:', e);
   }
   
   return null;
 }
 
 function setCachedTournaments(data: Tournament[]): void {
   const cacheObj = { data, timestamp: Date.now() };
   globalTournamentsCache = cacheObj;
   
   try {
     localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
   } catch (e) {
     console.warn('Failed to cache tournaments:', e);
   }
 }
 
 export function useTournamentsData(): UseTournamentsDataResult {
   const [tournaments, setTournaments] = useState<Tournament[]>(() => getCachedTournaments() || []);
   const [loading, setLoading] = useState(() => !getCachedTournaments());
   const [error, setError] = useState<string | null>(null);
   const isMountedRef = useRef(true);
   const fetchInProgressRef = useRef(false);
 
   const loadTournaments = useCallback(async (skipCache = false) => {
     if (fetchInProgressRef.current) return;
     
     if (!skipCache) {
       const cached = getCachedTournaments();
       if (cached) {
         setTournaments(cached);
         setLoading(false);
         return;
       }
     }
     
     fetchInProgressRef.current = true;
     setLoading(true);
     
     try {
       const { data, error: fetchError } = await supabase
         .from('tournaments')
         .select(`
           *,
           tournament_registrations!tournament_id(id, reentries, additional_sets)
         `)
         .eq('is_published', true)
         .not('is_archived', 'eq', true)
         .in('status', ['scheduled', 'registration', 'running'])
         .order('start_time', { ascending: true })
         .limit(6);
 
       if (fetchError) throw fetchError;
 
       const tournamentsWithCount = data?.map(tournament => {
         const registrations = tournament.tournament_registrations || [];
         const registeredCount = registrations.length;
         const totalReentries = registrations.reduce((sum: number, reg: any) => sum + (reg.reentries || 0), 0);
         const totalAdditionalSets = registrations.reduce((sum: number, reg: any) => sum + (reg.additional_sets || 0), 0);
 
         return {
           ...tournament,
           _count: { tournament_registrations: registeredCount },
           total_reentries: totalReentries,
           total_additional_sets: totalAdditionalSets
         };
       }) || [];
 
       if (isMountedRef.current) {
         setTournaments(tournamentsWithCount);
         setCachedTournaments(tournamentsWithCount);
         setError(null);
       }
     } catch (err: any) {
       console.error('Error loading tournaments:', err);
       if (isMountedRef.current) {
         setError(err.message || 'Failed to load tournaments');
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
     
     const cached = getCachedTournaments();
     if (cached) {
       setTournaments(cached);
       setLoading(false);
     } else {
       loadTournaments(false);
     }
     
     const unsubscribe = tournamentsSubscriptionManager.subscribe(() => {
       loadTournaments(true);
     });
     
     return () => {
       isMountedRef.current = false;
       unsubscribe();
     };
   }, [loadTournaments]);
 
   const refetch = useCallback(() => {
     globalTournamentsCache = null;
     try {
       localStorage.removeItem(CACHE_KEY);
     } catch (e) {}
     loadTournaments(true);
   }, [loadTournaments]);
 
   return { tournaments, loading, error, refetch };
 }