import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, BarChart3, Settings, Bell } from 'lucide-react';
import { ProfessionalVoiceAssistant } from '@/components/voice/ProfessionalVoiceAssistant';
import { VoiceAnalytics } from '@/components/voice/VoiceAnalytics';
import { VoiceSettings } from '@/components/voice/VoiceSettings';
import { VoiceNotifications } from '@/components/voice/VoiceNotifications';

interface VoiceControlProps {
  selectedTournament?: any;
}

export function VoiceControl({ selectedTournament }: VoiceControlProps) {

  return (
    <div className="space-y-6">
      {/* Профессиональные вкладки */}
      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="control">
            <Mic className="h-4 w-4 mr-2" />
            Управление
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-6">
          <ProfessionalVoiceAssistant selectedTournament={selectedTournament} />
        </TabsContent>

        <TabsContent value="analytics">
          <VoiceAnalytics tournamentId={selectedTournament?.id} />
        </TabsContent>

        <TabsContent value="notifications">
          <VoiceNotifications tournamentId={selectedTournament?.id} />
        </TabsContent>

        <TabsContent value="settings">
          <VoiceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}