/**
 * Cross-Device Session Sync Hook
 * 6.1 - Syncs poker sessions across multiple devices using Supabase Realtime
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeviceSession {
  id: string;
  playerId: string;
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  tableId: string | null;
  tournamentId: string | null;
  lastActiveAt: number;
  isActive: boolean;
  browserInfo?: string;
  ipAddress?: string;
}

interface SyncState {
  currentDeviceId: string;
  activeSessions: DeviceSession[];
  isPrimaryDevice: boolean;
  hasConflict: boolean;
  conflictingDeviceId: string | null;
}

interface CrossDeviceSyncOptions {
  playerId: string;
  tableId?: string;
  tournamentId?: string;
  onDeviceConflict?: (otherDevice: DeviceSession) => void;
  onForcedLogout?: (reason: string) => void;
  onSessionTakeover?: () => void;
}

// Generate unique device ID
const generateDeviceId = (): string => {
  const stored = localStorage.getItem('poker_device_id');
  if (stored) return stored;
  
  const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('poker_device_id', newId);
  return newId;
};

// Detect device type
const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Get browser info
const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  const match = ua.match(/(chrome|safari|firefox|edge|opera|msie|trident)/i);
  return match ? match[1] : 'unknown';
};

export function useCrossDeviceSync(options: CrossDeviceSyncOptions | null) {
  const { 
    playerId, 
    tableId, 
    tournamentId,
    onDeviceConflict,
    onForcedLogout,
    onSessionTakeover
  } = options || {};

  const [syncState, setSyncState] = useState<SyncState>({
    currentDeviceId: '',
    activeSessions: [],
    isPrimaryDevice: true,
    hasConflict: false,
    conflictingDeviceId: null
  });

  const deviceIdRef = useRef<string>('');
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize device ID
  useEffect(() => {
    deviceIdRef.current = generateDeviceId();
    setSyncState(prev => ({ ...prev, currentDeviceId: deviceIdRef.current }));
  }, []);

  // Register this device session
  const registerSession = useCallback(async () => {
    if (!playerId || !deviceIdRef.current) return;

    const session: DeviceSession = {
      id: `${playerId}_${deviceIdRef.current}`,
      playerId,
      deviceId: deviceIdRef.current,
      deviceType: getDeviceType(),
      tableId: tableId || null,
      tournamentId: tournamentId || null,
      lastActiveAt: Date.now(),
      isActive: true,
      browserInfo: getBrowserInfo()
    };

    // Store in localStorage for quick access
    localStorage.setItem('poker_active_session', JSON.stringify(session));

    // Broadcast to other devices via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'session_update',
        payload: session
      });
    }

    console.log('[CrossDeviceSync] Session registered:', session);
  }, [playerId, tableId, tournamentId]);

  // Handle incoming session updates from other devices
  const handleSessionUpdate = useCallback((payload: { payload: DeviceSession }) => {
    const otherSession = payload.payload;
    
    if (otherSession.deviceId === deviceIdRef.current) return;
    if (otherSession.playerId !== playerId) return;

    console.log('[CrossDeviceSync] Other device session detected:', otherSession);

    // Check for conflict (same table/tournament)
    const isConflict = (
      (tableId && otherSession.tableId === tableId) ||
      (tournamentId && otherSession.tournamentId === tournamentId)
    );

    if (isConflict && otherSession.isActive) {
      setSyncState(prev => ({
        ...prev,
        hasConflict: true,
        conflictingDeviceId: otherSession.deviceId,
        activeSessions: [...prev.activeSessions.filter(s => s.deviceId !== otherSession.deviceId), otherSession]
      }));

      onDeviceConflict?.(otherSession);
      
      // The newer session takes priority
      if (otherSession.lastActiveAt > Date.now() - 5000) {
        toast.warning('Обнаружена активная сессия на другом устройстве');
      }
    }
  }, [playerId, tableId, tournamentId, onDeviceConflict]);

  // Handle takeover request from another device
  const handleTakeoverRequest = useCallback((payload: { payload: { deviceId: string; playerId: string } }) => {
    if (payload.payload.playerId !== playerId) return;
    if (payload.payload.deviceId === deviceIdRef.current) return;

    console.log('[CrossDeviceSync] Takeover request received');
    
    onSessionTakeover?.();
    
    // Force logout on this device
    toast.info('Сессия перенесена на другое устройство');
    onForcedLogout?.('Session taken over by another device');
  }, [playerId, onSessionTakeover, onForcedLogout]);

  // Request session takeover (make this device primary)
  const requestTakeover = useCallback(() => {
    if (!channelRef.current || !playerId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'takeover_request',
      payload: {
        deviceId: deviceIdRef.current,
        playerId
      }
    });

    setSyncState(prev => ({
      ...prev,
      isPrimaryDevice: true,
      hasConflict: false,
      conflictingDeviceId: null
    }));

    toast.success('Сессия перенесена на это устройство');
    console.log('[CrossDeviceSync] Takeover requested');
  }, [playerId]);

  // Heartbeat to keep session alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(() => {
      registerSession();
    }, 10000); // Every 10 seconds

    registerSession();
  }, [registerSession]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Setup Supabase Realtime channel
  useEffect(() => {
    if (!playerId) return;

    const channelName = `poker_sync_${playerId}`;
    
    channelRef.current = supabase.channel(channelName)
      .on('broadcast', { event: 'session_update' }, handleSessionUpdate)
      .on('broadcast', { event: 'takeover_request' }, handleTakeoverRequest)
      .subscribe((status) => {
        console.log('[CrossDeviceSync] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          startHeartbeat();
        }
      });

    return () => {
      stopHeartbeat();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [playerId, handleSessionUpdate, handleTakeoverRequest, startHeartbeat, stopHeartbeat]);

  // Notify when table/tournament changes
  useEffect(() => {
    if (playerId && (tableId || tournamentId)) {
      registerSession();
    }
  }, [playerId, tableId, tournamentId, registerSession]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current && playerId) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'session_update',
          payload: {
            id: `${playerId}_${deviceIdRef.current}`,
            playerId,
            deviceId: deviceIdRef.current,
            deviceType: getDeviceType(),
            tableId: null,
            tournamentId: null,
            lastActiveAt: Date.now(),
            isActive: false
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [playerId]);

  return {
    ...syncState,
    requestTakeover,
    registerSession,
    deviceType: getDeviceType(),
    browserInfo: getBrowserInfo()
  };
}

export default useCrossDeviceSync;
