import React from 'react';
import { SimpleVoiceAnnouncer } from '@/components/voice/SimpleVoiceAnnouncer';

interface VoiceControlProps {
  selectedTournament?: any;
  onVoiceAction?: (action: string, data?: any) => void;
}

export function VoiceControl({ selectedTournament, onVoiceAction }: VoiceControlProps) {
  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <SimpleVoiceAnnouncer selectedTournament={selectedTournament} />
    </div>
  );
}