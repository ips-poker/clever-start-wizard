import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Settings, Activity, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceAnnouncements } from '@/hooks/useVoiceAnnouncements';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

interface VoiceTesterProps {
  selectedTournament?: any;
}

export const VoiceTester: React.FC<VoiceTesterProps> = ({ selectedTournament }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const voiceAnnouncements = useVoiceAnnouncements({ enabled: true, volume: 0.8 });

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date()
    }]);
    setCurrentTest(null);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // 1. Тест ElevenLabs TTS
  const testElevenLabsTTS = async () => {
    setCurrentTest('ElevenLabs TTS');
    try {
      const { data, error } = await supabase.functions.invoke('voice-announcement', {
        body: {
          text: 'Тестирование ElevenLabs TTS. Если вы слышите этот голос, система работает корректно.',
          voice: 'Aria',
          volume: 0.8,
          language: 'ru'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.audioContent) {
        const audio = new Audio();
        
        // Безопасное создание blob из base64 (тот же код что в useVoiceAnnouncements)
        try {
          // Проверяем корректность base64
          if (!data.audioContent || typeof data.audioContent !== 'string') {
            throw new Error('Invalid audio content format');
          }
          
          // Очищаем base64 от возможных проблемных символов и проверяем длину
          let cleanBase64 = data.audioContent.replace(/\s/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
          
          // Если строка пустая после очистки
          if (!cleanBase64) {
            throw new Error('Empty base64 string after cleaning');
          }
          
          // Добавляем padding если нужен
          const padding = (4 - cleanBase64.length % 4) % 4;
          if (padding > 0) {
            cleanBase64 += '='.repeat(padding);
          }
          
          // Проверяем валидность base64 перед декодированием
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
            throw new Error('Invalid base64 format');
          }
          
          const binaryString = atob(cleanBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          
          audio.src = audioUrl;
          audio.volume = 0.8;
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
          };
          
          await audio.play();
          addTestResult('ElevenLabs TTS', 'success', 'ElevenLabs TTS работает корректно');
        } catch (base64Error) {
          console.error('❌ Base64 decode error in test:', base64Error);
          throw new Error('Failed to decode test audio content');
        }
      } else {
        throw new Error('Нет аудио контента в ответе');
      }
    } catch (error: any) {
      console.error('ElevenLabs TTS test failed:', error);
      addTestResult('ElevenLabs TTS', 'error', `Ошибка ElevenLabs: ${error.message}`);
    }
  };

  // 2. Тест браузерного TTS
  const testBrowserTTS = async () => {
    setCurrentTest('Browser TTS');
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          'Тестирование встроенного синтеза речи браузера. Система резервного озвучивания работает.'
        );
        utterance.lang = 'ru-RU';
        utterance.volume = 0.8;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        speechSynthesis.speak(utterance);
        addTestResult('Browser TTS', 'success', 'Браузерный TTS работает корректно');
      } else {
        throw new Error('Браузер не поддерживает speechSynthesis');
      }
    } catch (error: any) {
      addTestResult('Browser TTS', 'error', `Ошибка браузерного TTS: ${error.message}`);
    }
  };

  // 3. Тест голосовых объявлений
  const testVoiceAnnouncements = async () => {
    setCurrentTest('Voice Announcements');
    try {
      await voiceAnnouncements.announceTimeWarning(2);
      setTimeout(async () => {
        await voiceAnnouncements.announceLevelStart({
          level: 5,
          small_blind: 100,
          big_blind: 200,
          ante: 25,
          duration: 1200,
          is_break: false
        });
      }, 2000);
      
      addTestResult('Voice Announcements', 'success', 'Голосовые объявления работают корректно');
    } catch (error: any) {
      addTestResult('Voice Announcements', 'error', `Ошибка объявлений: ${error.message}`);
    }
  };

  // 4. Тест распознавания речи
  const testSpeechRecognition = async () => {
    setCurrentTest('Speech Recognition');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });

            if (error) {
              throw error;
            }

            const transcript = data?.text || "";
            if (transcript.trim()) {
              addTestResult('Speech Recognition', 'success', `Распознанный текст: "${transcript}"`);
            } else {
              addTestResult('Speech Recognition', 'error', 'Текст не был распознан');
            }
          } catch (error: any) {
            addTestResult('Speech Recognition', 'error', `Ошибка распознавания: ${error.message}`);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success('Говорите в течение 3 секунд для теста распознавания...');

      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }
      }, 3000);

    } catch (error: any) {
      addTestResult('Speech Recognition', 'error', `Ошибка доступа к микрофону: ${error.message}`);
    }
  };

  // 5. Тест голосового ассистента
  const testVoiceAssistant = async () => {
    setCurrentTest('Voice Assistant');
    try {
      if (!selectedTournament?.id) {
        throw new Error('Турнир не выбран');
      }

      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          action: 'process_command',
          text: 'показать статистику турнира',
          tournament_id: selectedTournament.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.command_recognized) {
        addTestResult('Voice Assistant', 'success', `Команда выполнена: ${data.response_text}`);
      } else {
        addTestResult('Voice Assistant', 'error', 'Команда не была распознана');
      }
    } catch (error: any) {
      addTestResult('Voice Assistant', 'error', `Ошибка ассистента: ${error.message}`);
    }
  };

  // 6. Тест интеграции с турнирным директором
  const testTournamentIntegration = async () => {
    setCurrentTest('Tournament Integration');
    try {
      if (!selectedTournament?.id) {
        throw new Error('Турнир не выбран');
      }

      // Тестируем получение данных турнира
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', selectedTournament.id)
        .single();

      if (tournamentError) {
        throw tournamentError;
      }

      // Тестируем голосовую функцию турнира
      const { data: voiceData, error: voiceError } = await supabase.functions.invoke('voice-assistant', {
        body: {
          action: 'process_command',
          text: 'запустить турнир',
          tournament_id: selectedTournament.id
        }
      });

      if (voiceError) {
        throw voiceError;
      }

      addTestResult('Tournament Integration', 'success', 'Интеграция с турнирным директором работает');
    } catch (error: any) {
      addTestResult('Tournament Integration', 'error', `Ошибка интеграции: ${error.message}`);
    }
  };

  // Запуск всех тестов
  const runAllTests = async () => {
    clearResults();
    toast.info('Запускаю все тесты...');
    
    await testBrowserTTS();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testElevenLabsTTS();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testVoiceAnnouncements();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testVoiceAssistant();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testTournamentIntegration();
    
    toast.success('Все тесты завершены');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-success/10 text-success border-success/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Тестирование голосового ассистента
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button onClick={testBrowserTTS} variant="outline" size="sm">
              Браузерный TTS
            </Button>
            <Button onClick={testElevenLabsTTS} variant="outline" size="sm">
              ElevenLabs TTS
            </Button>
            <Button onClick={testVoiceAnnouncements} variant="outline" size="sm">
              Объявления
            </Button>
            <Button 
              onClick={testSpeechRecognition} 
              variant="outline" 
              size="sm"
              disabled={isRecording}
            >
              {isRecording ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
              Распознавание
            </Button>
            <Button onClick={testVoiceAssistant} variant="outline" size="sm">
              Ассистент
            </Button>
            <Button onClick={testTournamentIntegration} variant="outline" size="sm">
              Интеграция
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runAllTests} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Запустить все тесты
            </Button>
            <Button onClick={clearResults} variant="outline">
              Очистить
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentTest && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Выполняется тест: {currentTest}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Результаты тестов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{result.test}</span>
                    <Badge variant="outline" className={getStatusColor(result.status)}>
                      {result.status === 'success' ? 'Успех' : 'Ошибка'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedTournament && (
        <Card>
          <CardHeader>
            <CardTitle>Выбранный турнир</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Название:</strong> {selectedTournament.name}</p>
              <p><strong>Статус:</strong> {selectedTournament.status}</p>
              <p><strong>Уровень:</strong> {selectedTournament.current_level}</p>
              <p><strong>ID:</strong> {selectedTournament.id}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};