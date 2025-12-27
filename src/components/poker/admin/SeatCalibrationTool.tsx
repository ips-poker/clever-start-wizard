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
  
  // Размеры бортика стола - точно как в FullscreenPokerTable / SyndikateTableFelt
  const getTableGeometry = () => {
    if (mode === 'telegram') {
      return {
        // Wide mode margins from SyndikateTableFelt
        rail: { left: 14, right: 86, top: 10, bottom: 90 },
        felt: { left: 14, right: 86, top: 10, bottom: 90 },
        outer: { left: 10, right: 90, top: 6, bottom: 94 },
        leather: { left: 11, right: 89, top: 7, bottom: 93 },
        inner: { left: 13, right: 87, top: 9, bottom: 91 },
      };
    }
    // Standard desktop mode
    return {
      rail: { left: 24, right: 76, top: 10, bottom: 90 },
      felt: { left: 24, right: 76, top: 10, bottom: 90 },
      outer: { left: 20, right: 80, top: 6, bottom: 94 },
      leather: { left: 21, right: 79, top: 7, bottom: 93 },
      inner: { left: 23, right: 77, top: 9, bottom: 91 },
    };
  };
  
  const tableGeometry = getTableGeometry();
  const rail = tableGeometry.rail;
  
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
          
          {/* Preview Canvas - реалистичная визуализация стола */}
          <div className="grid grid-cols-2 gap-4">
            {/* Visual Preview - точная копия FullscreenPokerTable */}
            <div 
              className="relative overflow-hidden rounded-lg"
              style={{ 
                aspectRatio: mode === 'telegram' ? '9/16' : '16/9',
                background: 'linear-gradient(180deg, #0a1520 0%, #050a0f 30%, #020508 60%, #000000 100%)'
              }}
            >
              {/* Teal ambient glow */}
              <div 
                className="absolute top-0 left-0 right-0 h-[45%]"
                style={{
                  background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(20,80,100,0.4) 0%, rgba(10,40,60,0.2) 40%, transparent 70%)'
                }}
              />
              
              {/* Outer metallic rail - stadium shape */}
              <div 
                className="absolute"
                style={{
                  top: `${tableGeometry.outer.top}%`,
                  left: `${100 - tableGeometry.outer.right}%`,
                  right: `${100 - tableGeometry.outer.right}%`,
                  bottom: `${100 - tableGeometry.outer.bottom}%`,
                  borderRadius: '45% / 22%',
                  background: 'linear-gradient(180deg, #5a6a7a 0%, #3d4a5a 20%, #2a3440 50%, #3d4a5a 80%, #5a6a7a 100%)',
                  boxShadow: '0 10px 60px rgba(0,0,0,0.9)'
                }}
              />
              
              {/* Leather padding */}
              <div 
                className="absolute"
                style={{
                  top: `${tableGeometry.leather.top}%`,
                  left: `${100 - tableGeometry.leather.right}%`,
                  right: `${100 - tableGeometry.leather.right}%`,
                  bottom: `${100 - tableGeometry.leather.bottom}%`,
                  borderRadius: '44% / 21%',
                  background: 'linear-gradient(180deg, #3a2820 0%, #2a1a14 30%, #1a0f0a 60%, #2a1a14 85%, #3a2820 100%)'
                }}
              />
              
              {/* Inner metal trim */}
              <div 
                className="absolute"
                style={{
                  top: `${tableGeometry.inner.top}%`,
                  left: `${100 - tableGeometry.inner.right}%`,
                  right: `${100 - tableGeometry.inner.right}%`,
                  bottom: `${100 - tableGeometry.inner.bottom}%`,
                  borderRadius: '42% / 20%',
                  background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 50%, #1a202c 100%)',
                  border: '1px solid rgba(212,175,55,0.2)'
                }}
              />
              
              {/* Main felt surface */}
              <div 
                className="absolute"
                style={{
                  top: `${tableGeometry.felt.top}%`,
                  left: `${100 - tableGeometry.felt.right}%`,
                  right: `${100 - tableGeometry.felt.right}%`,
                  bottom: `${100 - tableGeometry.felt.bottom}%`,
                  borderRadius: '40% / 18%',
                  background: 'radial-gradient(ellipse at 50% 40%, #0d5c2e 0%, #0d5c2edd 25%, #0d5c2ebb 45%, #0d5c2e99 65%, #0d5c2e77 85%, #0d5c2e55 100%)',
                  boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)'
                }}
              >
                {/* Center logo placeholder */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white/10 font-black text-xs tracking-wider">SYNDIKATE</span>
                </div>
              </div>
              
              {/* Grid overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
                    <div
                      key={`v-${x}`}
                      className="absolute top-0 bottom-0 w-px bg-cyan-400"
                      style={{ left: `${x}%` }}
                    />
                  ))}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(y => (
                    <div
                      key={`h-${y}`}
                      className="absolute left-0 right-0 h-px bg-cyan-400"
                      style={{ top: `${y}%` }}
                    />
                  ))}
                </div>
              )}
              
              {/* Rail bounds indicator */}
              {showRail && (
                <div
                  className="absolute border-2 border-yellow-500 rounded-[40%/18%] pointer-events-none"
                  style={{
                    left: `${100 - rail.right}%`,
                    right: `${100 - rail.right}%`,
                    top: `${rail.top}%`,
                    bottom: `${100 - rail.bottom}%`
                  }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-yellow-500 font-mono bg-black/60 px-1 rounded">
                    Бортик (rail)
                  </div>
                </div>
              )}
              
              {/* Center crosshair */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-4 h-px bg-white/30" />
                <div className="h-4 w-px bg-white/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              {/* Seats - аватары игроков */}
              {currentPositions.map((pos, idx) => (
                <div
                  key={idx}
                  className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${
                    selectedSeat === idx
                      ? 'border-yellow-500 bg-yellow-500/30 text-yellow-500 scale-125 z-20'
                      : idx === 0
                        ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
                        : 'border-white/50 bg-white/20 text-white/70'
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
              <div className="absolute bottom-1 left-1 text-[10px] text-white/50 font-mono bg-black/50 px-1 rounded">
                Seat {selectedSeat}: ({currentPositions[selectedSeat]?.x.toFixed(0)}%, {currentPositions[selectedSeat]?.y.toFixed(0)}%)
              </div>
              
              {/* Mode label */}
              <div className="absolute top-1 right-1 text-[9px] text-cyan-400/70 font-mono bg-black/50 px-1 rounded">
                {mode === 'telegram' ? 'TELEGRAM MODE' : 'DESKTOP MODE'}
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
                
                {/* Application info */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs space-y-2">
                  <Label className="font-medium text-emerald-400 flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    Как применяются настройки
                  </Label>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Настройки сохраняются в <code className="bg-black/30 px-1 rounded">localStorage</code></li>
                    <li>• Применяются к <strong>FullscreenPokerTable</strong> (обёртка стола)</li>
                    <li>• Позиции аватаров рассчитываются относительно бортика</li>
                    <li>• После сохранения <strong>обновите страницу</strong> с покерным столом</li>
                  </ul>
                </div>
                
                {/* Elements legend */}
                <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                  <Label className="font-medium">Элементы стола</Label>
                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-slate-500 to-slate-700" />
                      <span>Металлический бортик (outer rail)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-amber-900 to-amber-950" />
                      <span>Кожаная обивка (leather padding)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-emerald-700 to-emerald-900" />
                      <span>Фелт (felt surface)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 border border-yellow-500" />
                      <span>Жёлтая линия — граница для размещения аватаров</span>
                    </div>
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
