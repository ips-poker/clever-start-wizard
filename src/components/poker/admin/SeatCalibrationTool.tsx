// ============================================
// SEAT CALIBRATION TOOL - Точная калибровка позиций
// ============================================
// Профессиональный инструмент для точной настройки позиций игроков на столе

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Save, 
  RotateCcw, 
  Copy, 
  Upload, 
  Download,
  Monitor,
  Smartphone,
  Target,
  Grid3X3,
  Move,
  Users
} from 'lucide-react';

// Типы позиций
interface SeatPosition {
  x: number;
  y: number;
}

interface SeatConfiguration {
  desktop: Record<number, SeatPosition[]>;
  telegram: Record<number, SeatPosition[]>;
}

// Значения по умолчанию - текущие из FullscreenPokerTable.tsx
const DEFAULT_DESKTOP_POSITIONS: Record<number, SeatPosition[]> = {
  2: [
    { x: 50, y: 87 },
    { x: 50, y: 13 },
  ],
  3: [
    { x: 50, y: 87 },
    { x: 24, y: 50 },
    { x: 76, y: 50 },
  ],
  4: [
    { x: 50, y: 87 },
    { x: 24, y: 50 },
    { x: 50, y: 13 },
    { x: 76, y: 50 },
  ],
  5: [
    { x: 50, y: 87 },
    { x: 24, y: 65 },
    { x: 24, y: 35 },
    { x: 76, y: 35 },
    { x: 76, y: 65 },
  ],
  6: [
    { x: 50, y: 87 },
    { x: 24, y: 65 },
    { x: 24, y: 35 },
    { x: 50, y: 13 },
    { x: 76, y: 35 },
    { x: 76, y: 65 },
  ],
  7: [
    { x: 50, y: 87 },
    { x: 24, y: 68 },
    { x: 24, y: 50 },
    { x: 24, y: 32 },
    { x: 76, y: 32 },
    { x: 76, y: 50 },
    { x: 76, y: 68 },
  ],
  8: [
    { x: 50, y: 87 },
    { x: 24, y: 68 },
    { x: 24, y: 50 },
    { x: 24, y: 32 },
    { x: 50, y: 13 },
    { x: 76, y: 32 },
    { x: 76, y: 50 },
    { x: 76, y: 68 },
  ],
  9: [
    { x: 50, y: 87 },
    { x: 22, y: 74 },
    { x: 22, y: 54 },
    { x: 22, y: 34 },
    { x: 40, y: 13 },
    { x: 60, y: 13 },
    { x: 78, y: 34 },
    { x: 78, y: 54 },
    { x: 78, y: 74 },
  ],
};

const DEFAULT_TELEGRAM_POSITIONS: Record<number, SeatPosition[]> = {
  2: [
    { x: 50, y: 86 },
    { x: 50, y: 14 },
  ],
  3: [
    { x: 50, y: 86 },
    { x: 14, y: 50 },
    { x: 86, y: 50 },
  ],
  4: [
    { x: 50, y: 86 },
    { x: 14, y: 50 },
    { x: 50, y: 14 },
    { x: 86, y: 50 },
  ],
  5: [
    { x: 50, y: 86 },
    { x: 14, y: 64 },
    { x: 14, y: 36 },
    { x: 86, y: 36 },
    { x: 86, y: 64 },
  ],
  6: [
    { x: 50, y: 86 },
    { x: 14, y: 64 },
    { x: 14, y: 36 },
    { x: 50, y: 14 },
    { x: 86, y: 36 },
    { x: 86, y: 64 },
  ],
  7: [
    { x: 50, y: 86 },
    { x: 14, y: 68 },
    { x: 14, y: 50 },
    { x: 14, y: 32 },
    { x: 86, y: 32 },
    { x: 86, y: 50 },
    { x: 86, y: 68 },
  ],
  8: [
    { x: 50, y: 86 },
    { x: 14, y: 68 },
    { x: 14, y: 50 },
    { x: 14, y: 32 },
    { x: 50, y: 14 },
    { x: 86, y: 32 },
    { x: 86, y: 50 },
    { x: 86, y: 68 },
  ],
  9: [
    { x: 50, y: 86 },
    { x: 12, y: 74 },
    { x: 12, y: 54 },
    { x: 12, y: 34 },
    { x: 38, y: 14 },
    { x: 62, y: 14 },
    { x: 88, y: 34 },
    { x: 88, y: 54 },
    { x: 88, y: 74 },
  ],
};

// Получение сохранённых позиций из localStorage
const getSavedPositions = (): SeatConfiguration | null => {
  try {
    const saved = localStorage.getItem('syndikate_seat_positions');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export function SeatCalibrationTool() {
  const [mode, setMode] = useState<'desktop' | 'telegram'>('desktop');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [selectedSeat, setSelectedSeat] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showRail, setShowRail] = useState(true);
  const [livePreview, setLivePreview] = useState(true);
  
  // Позиции
  const [positions, setPositions] = useState<SeatConfiguration>({
    desktop: { ...DEFAULT_DESKTOP_POSITIONS },
    telegram: { ...DEFAULT_TELEGRAM_POSITIONS }
  });
  
  // Загрузить сохранённые при монтировании
  useEffect(() => {
    const saved = getSavedPositions();
    if (saved) {
      setPositions(saved);
      toast.info('Загружены сохранённые позиции');
    }
  }, []);
  
  // Текущие позиции для текущего режима и количества игроков
  const currentPositions = positions[mode][maxPlayers] || [];
  
  const updatePosition = useCallback((seatIndex: number, axis: 'x' | 'y', value: number) => {
    setPositions(prev => {
      const newPositions = { ...prev };
      const modePositions = { ...newPositions[mode] };
      const seatPositions = [...(modePositions[maxPlayers] || [])];
      
      if (seatPositions[seatIndex]) {
        seatPositions[seatIndex] = {
          ...seatPositions[seatIndex],
          [axis]: value
        };
      }
      
      modePositions[maxPlayers] = seatPositions;
      newPositions[mode] = modePositions;
      
      return newPositions;
    });
  }, [mode, maxPlayers]);
  
  const resetToDefault = useCallback(() => {
    const defaultPositions = mode === 'desktop' 
      ? DEFAULT_DESKTOP_POSITIONS 
      : DEFAULT_TELEGRAM_POSITIONS;
    
    setPositions(prev => ({
      ...prev,
      [mode]: { ...defaultPositions }
    }));
    toast.success('Сброшено к значениям по умолчанию');
  }, [mode]);
  
  const savePositions = useCallback(() => {
    try {
      localStorage.setItem('syndikate_seat_positions', JSON.stringify(positions));
      toast.success('Позиции сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    }
  }, [positions]);
  
  const exportPositions = useCallback(() => {
    const json = JSON.stringify(positions, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seat_positions.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Экспортировано в JSON');
  }, [positions]);
  
  const generateCode = useCallback(() => {
    const modePositions = positions[mode];
    const code = `const ${mode.toUpperCase()}_SEAT_POSITIONS_BY_COUNT: Record<number, Array<{ x: number; y: number }>> = ${JSON.stringify(modePositions, null, 2)};`;
    navigator.clipboard.writeText(code);
    toast.success('Код скопирован в буфер обмена');
  }, [positions, mode]);
  
  // Размеры бортика стола
  const getRailBounds = () => {
    if (mode === 'telegram') {
      return { left: 14, right: 86, top: 14, bottom: 86 };
    }
    return { left: 24, right: 76, top: 13, bottom: 87 };
  };
  
  const rail = getRailBounds();
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Калибровка позиций игроков
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={resetToDefault}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Сброс
              </Button>
              <Button size="sm" variant="outline" onClick={generateCode}>
                <Copy className="h-4 w-4 mr-1" />
                Код
              </Button>
              <Button size="sm" variant="outline" onClick={exportPositions}>
                <Download className="h-4 w-4 mr-1" />
                Экспорт
              </Button>
              <Button size="sm" onClick={savePositions}>
                <Save className="h-4 w-4 mr-1" />
                Сохранить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mode & Player Count Selection */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label>Режим:</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'desktop' | 'telegram')}>
                <TabsList className="h-8">
                  <TabsTrigger value="desktop" className="text-xs px-3">
                    <Monitor className="h-3 w-3 mr-1" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="telegram" className="text-xs px-3">
                    <Smartphone className="h-3 w-3 mr-1" />
                    Telegram
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Игроков:</Label>
              <div className="flex gap-1">
                {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <Button
                    key={n}
                    size="sm"
                    variant={maxPlayers === n ? 'default' : 'outline'}
                    className="w-8 h-8 p-0"
                    onClick={() => setMaxPlayers(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                <Label className="text-xs">Сетка</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showRail} onCheckedChange={setShowRail} />
                <Label className="text-xs">Бортик</Label>
              </div>
            </div>
          </div>
          
          {/* Preview Canvas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Visual Preview */}
            <div 
              className="relative bg-gradient-to-b from-emerald-900 to-emerald-950 rounded-lg overflow-hidden"
              style={{ aspectRatio: mode === 'telegram' ? '9/16' : '16/9' }}
            >
              {/* Grid overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  {/* Vertical lines every 10% */}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
                    <div
                      key={`v-${x}`}
                      className="absolute top-0 bottom-0 w-px bg-white"
                      style={{ left: `${x}%` }}
                    />
                  ))}
                  {/* Horizontal lines every 10% */}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(y => (
                    <div
                      key={`h-${y}`}
                      className="absolute left-0 right-0 h-px bg-white"
                      style={{ top: `${y}%` }}
                    />
                  ))}
                </div>
              )}
              
              {/* Rail bounds */}
              {showRail && (
                <div
                  className="absolute border-2 border-yellow-500/50 rounded-[40%/18%] pointer-events-none"
                  style={{
                    left: `${rail.left}%`,
                    right: `${100 - rail.right}%`,
                    top: `${rail.top}%`,
                    bottom: `${100 - rail.bottom}%`
                  }}
                />
              )}
              
              {/* Center crosshair */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-4 h-px bg-white/30" />
                <div className="h-4 w-px bg-white/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              {/* Seats */}
              {currentPositions.map((pos, idx) => (
                <div
                  key={idx}
                  className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${
                    selectedSeat === idx
                      ? 'border-yellow-500 bg-yellow-500/30 text-yellow-500 scale-125'
                      : idx === 0
                        ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
                        : 'border-white/50 bg-white/10 text-white/70'
                  }`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`
                  }}
                  onClick={() => setSelectedSeat(idx)}
                >
                  {idx === 0 ? 'H' : idx}
                </div>
              ))}
              
              {/* Coordinates display */}
              <div className="absolute bottom-1 left-1 text-[10px] text-white/50 font-mono">
                Seat {selectedSeat}: ({currentPositions[selectedSeat]?.x.toFixed(0)}%, {currentPositions[selectedSeat]?.y.toFixed(0)}%)
              </div>
            </div>
            
            {/* Controls */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {/* Selected seat controls */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={selectedSeat === 0 ? 'default' : 'outline'}>
                      Seat {selectedSeat} {selectedSeat === 0 && '(Hero)'}
                    </Badge>
                    <div className="flex gap-1 ml-auto">
                      {currentPositions.map((_, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant={selectedSeat === idx ? 'default' : 'ghost'}
                          className="w-6 h-6 p-0 text-xs"
                          onClick={() => setSelectedSeat(idx)}
                        >
                          {idx}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {currentPositions[selectedSeat] && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">X (горизонталь)</Label>
                          <Input
                            type="number"
                            className="w-16 h-6 text-xs"
                            value={currentPositions[selectedSeat].x}
                            onChange={(e) => updatePosition(selectedSeat, 'x', Number(e.target.value))}
                            min={0}
                            max={100}
                          />
                        </div>
                        <Slider
                          value={[currentPositions[selectedSeat].x]}
                          onValueChange={([v]) => updatePosition(selectedSeat, 'x', v)}
                          min={0}
                          max={100}
                          step={0.5}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Y (вертикаль)</Label>
                          <Input
                            type="number"
                            className="w-16 h-6 text-xs"
                            value={currentPositions[selectedSeat].y}
                            onChange={(e) => updatePosition(selectedSeat, 'y', Number(e.target.value))}
                            min={0}
                            max={100}
                          />
                        </div>
                        <Slider
                          value={[currentPositions[selectedSeat].y]}
                          onValueChange={([v]) => updatePosition(selectedSeat, 'y', v)}
                          min={0}
                          max={100}
                          step={0.5}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* All positions table */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Все позиции ({maxPlayers} игроков)</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Seat</th>
                          <th className="p-2 text-center">X%</th>
                          <th className="p-2 text-center">Y%</th>
                          <th className="p-2 text-center">На бортике</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPositions.map((pos, idx) => {
                          const onRail = 
                            (pos.x <= rail.left + 2 || pos.x >= rail.right - 2 ||
                             pos.y <= rail.top + 2 || pos.y >= rail.bottom - 2);
                          return (
                            <tr 
                              key={idx}
                              className={`border-t cursor-pointer ${selectedSeat === idx ? 'bg-primary/10' : ''}`}
                              onClick={() => setSelectedSeat(idx)}
                            >
                              <td className="p-2">{idx === 0 ? 'Hero' : `Seat ${idx}`}</td>
                              <td className="p-2 text-center font-mono">{pos.x.toFixed(1)}</td>
                              <td className="p-2 text-center font-mono">{pos.y.toFixed(1)}</td>
                              <td className="p-2 text-center">
                                {onRail ? (
                                  <Badge variant="outline" className="text-emerald-500 text-[10px]">✓</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-500 text-[10px]">✗</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Rail reference */}
                <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                  <Label className="font-medium">Границы бортика ({mode})</Label>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>Left: {rail.left}%</div>
                    <div>Right: {rail.right}%</div>
                    <div>Top: {rail.top}%</div>
                    <div>Bottom: {rail.bottom}%</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SeatCalibrationTool;
