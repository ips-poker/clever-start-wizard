import React from 'react';
import { ProfessionalVoiceAssistant } from '@/components/voice/ProfessionalVoiceAssistant';

interface VoiceControlProps {
  selectedTournament?: any;
  onVoiceAction?: (action: string, data?: any) => void;
  currentTime?: number;
  timerActive?: boolean;
  registrations?: any[];
}

export function VoiceControl({ 
  selectedTournament, 
  onVoiceAction,
  currentTime = 0,
  timerActive = false,
  registrations = []
}: VoiceControlProps) {
  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <ProfessionalVoiceAssistant 
        selectedTournament={selectedTournament}
        currentTime={currentTime}
        timerActive={timerActive}
        registrations={registrations}
      />
    </div>
  );
}