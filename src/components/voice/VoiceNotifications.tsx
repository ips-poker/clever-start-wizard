import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, BellOff, Volume2, VolumeX, Calendar, AlertCircle } from 'lucide-react';

interface VoiceAnnouncement {
  id: string;
  message: string;
  announcement_type: string;
  auto_generated: boolean;
  scheduled_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface VoiceNotificationsProps {
  tournamentId?: string;
}

export function VoiceNotifications({ tournamentId }: VoiceNotificationsProps) {
  const [announcements, setAnnouncements] = useState<VoiceAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    
    // Подписка на realtime обновления
    const channel = supabase
      .channel('voice_announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_announcements',
          filter: tournamentId ? `tournament_id=eq.${tournamentId}` : undefined
        },
        (payload) => {
          const newAnnouncement = payload.new as VoiceAnnouncement;
          setAnnouncements(prev => [newAnnouncement, ...prev]);
          
          // Воспроизвести звуковое уведомление
          if (soundEnabled && newAnnouncement.announcement_type !== 'system') {
            playNotificationSound();
            toast.info(`Новое объявление: ${newAnnouncement.message.slice(0, 50)}...`);
          }
        }
      );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, soundEnabled]);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('voice_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Ошибка загрузки объявлений');
    } finally {
      setIsLoading(false);
    }
  };

  const playNotificationSound = () => {
    // Создаем простой звук уведомления
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const markAsDelivered = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('voice_announcements')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', announcementId);

      if (error) throw error;

      setAnnouncements(prev => 
        prev.map(a => 
          a.id === announcementId 
            ? { ...a, delivered_at: new Date().toISOString() }
            : a
        )
      );
      
      toast.success('Объявление отмечено как доставленное');
    } catch (error) {
      console.error('Error marking announcement as delivered:', error);
      toast.error('Ошибка обновления статуса объявления');
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return <Volume2 className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAnnouncementBadge = (announcement: VoiceAnnouncement) => {
    if (announcement.delivered_at) {
      return <Badge variant="secondary">Доставлено</Badge>;
    }
    if (announcement.scheduled_at && new Date(announcement.scheduled_at) > new Date()) {
      return <Badge variant="outline">Запланировано</Badge>;
    }
    return <Badge variant="default">Новое</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Голосовые уведомления</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Загрузка уведомлений...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Голосовые уведомления
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Звук вкл
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Звук выкл
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Пока нет голосовых уведомлений</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getAnnouncementIcon(announcement.announcement_type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">
                        {announcement.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(announcement.created_at).toLocaleString()}
                        </span>
                        {announcement.auto_generated && (
                          <Badge variant="outline" className="text-xs">
                            Авто
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getAnnouncementBadge(announcement)}
                    {!announcement.delivered_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsDelivered(announcement.id)}
                      >
                        Отметить
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}