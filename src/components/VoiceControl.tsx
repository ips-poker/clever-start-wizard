import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, BarChart3, Settings, Bell, TestTube } from 'lucide-react';
import { ProfessionalVoiceAssistant } from '@/components/voice/ProfessionalVoiceAssistant';
import { VoiceAnalytics } from '@/components/voice/VoiceAnalytics';
import { VoiceSettings } from '@/components/voice/VoiceSettings';
import { VoiceNotifications } from '@/components/voice/VoiceNotifications';
import { VoiceTester } from '@/components/voice/VoiceTester';

interface VoiceControlProps {
  selectedTournament?: any;
  onVoiceAction?: (action: string, data?: any) => void;
}

export function VoiceControl({ selectedTournament, onVoiceAction }: VoiceControlProps) {

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Профессиональные вкладки */}
      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="control" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 md:p-3">
            <Mic className="h-4 w-4" />
            <span className="text-xs md:text-sm">Управление</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 md:p-3">
            <TestTube className="h-4 w-4" />
            <span className="text-xs md:text-sm">Тестирование</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 md:p-3">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs md:text-sm">Аналитика</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 md:p-3">
            <Bell className="h-4 w-4" />
            <span className="text-xs md:text-sm">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 md:p-3">
            <Settings className="h-4 w-4" />
            <span className="text-xs md:text-sm">Настройки</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-6">
          <ProfessionalVoiceAssistant 
            selectedTournament={selectedTournament} 
            onStatusChange={onVoiceAction}
          />
        </TabsContent>

        <TabsContent value="test">
          <VoiceTester selectedTournament={selectedTournament} />
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