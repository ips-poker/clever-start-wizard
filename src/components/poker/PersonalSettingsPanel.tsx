import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  X, Palette, CreditCard, RotateCcw, Eye, Volume2, Sparkles, 
  ChevronRight, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  usePokerPreferences, 
  TABLE_THEMES, 
  CARD_BACKS, 
  CARD_STYLES,
  type PokerPreferences 
} from '@/hooks/usePokerPreferences';

interface PersonalSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  maxSeats?: number;
}

const SettingsSection = ({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = true
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-white/50" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingRow = ({ 
  label, 
  description, 
  children 
}: { 
  label: string; 
  description?: string; 
  children: React.ReactNode 
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1 min-w-0">
      <Label className="text-xs text-white/80">{label}</Label>
      {description && (
        <p className="text-[10px] text-white/40 truncate">{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">
      {children}
    </div>
  </div>
);

// Theme selector component
const ThemeSelector = memo(function ThemeSelector({ 
  selected, 
  onSelect 
}: { 
  selected: string; 
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TABLE_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onSelect(theme.id)}
          className={cn(
            "relative p-2 rounded-lg border-2 transition-all",
            selected === theme.id 
              ? "border-amber-500 shadow-lg shadow-amber-500/20" 
              : "border-white/10 hover:border-white/30"
          )}
        >
          <div 
            className="w-full h-8 rounded-md mb-1"
            style={{ 
              background: `linear-gradient(135deg, ${theme.color} 0%, ${theme.color}cc 100%)` 
            }}
          />
          <span className="text-[10px] text-white/70">{theme.name}</span>
          {selected === theme.id && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-black" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
});

// Card back selector
const CardBackSelector = memo(function CardBackSelector({ 
  selected, 
  onSelect 
}: { 
  selected: string; 
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CARD_BACKS.map((back) => (
        <button
          key={back.id}
          onClick={() => onSelect(back.id)}
          className={cn(
            "relative p-2 rounded-lg border-2 transition-all",
            selected === back.id 
              ? "border-amber-500 shadow-lg shadow-amber-500/20" 
              : "border-white/10 hover:border-white/30"
          )}
        >
          <div 
            className="w-full h-12 rounded-md mb-1 flex items-center justify-center relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* Grid pattern */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 3px, ${back.gridColor} 3px, ${back.gridColor} 4px),
                  repeating-linear-gradient(90deg, transparent, transparent 3px, ${back.gridColor} 3px, ${back.gridColor} 4px)
                `
              }}
            />
            {/* Center S logo */}
            <span className="font-display font-black text-lg" style={{ color: back.accentColor, opacity: 0.6 }}>S</span>
          </div>
          <span className="text-[10px] text-white/70">{back.name}</span>
          {selected === back.id && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-black" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
});

// Card style selector
const CardStyleSelector = memo(function CardStyleSelector({ 
  selected, 
  onSelect 
}: { 
  selected: string; 
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {CARD_STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => onSelect(style.id)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-lg border transition-all",
            selected === style.id 
              ? "border-amber-500 bg-amber-500/10" 
              : "border-white/10 hover:border-white/30 hover:bg-white/5"
          )}
        >
          <div className={cn(
            "w-8 h-10 rounded border-2 flex items-center justify-center text-xs font-bold",
            style.id === 'fourcolor' ? "border-blue-500 text-blue-500" : "border-red-500 text-red-500"
          )}>
            A
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs text-white font-medium">{style.name}</div>
            <div className="text-[10px] text-white/50">{style.description}</div>
          </div>
          {selected === style.id && (
            <Check className="h-4 w-4 text-amber-500" />
          )}
        </button>
      ))}
    </div>
  );
});

// Seat position selector
const SeatPositionSelector = memo(function SeatPositionSelector({ 
  selected, 
  onSelect,
  maxSeats = 6
}: { 
  selected: number; 
  onSelect: (rotation: number) => void;
  maxSeats?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] text-white/50 mb-3">
        Выберите предпочтительную позицию (вы всегда будете видеть себя внизу)
      </p>
      
      {/* Mini table visualization */}
      <div className="relative w-40 h-24 bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-[50%] border-4 border-amber-900/50 mb-3">
        {Array.from({ length: maxSeats }).map((_, i) => {
          const angle = (360 / maxSeats) * i - 90;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 45 * Math.cos(rad);
          const y = 50 + 40 * Math.sin(rad);
          
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={cn(
                "absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                "-translate-x-1/2 -translate-y-1/2",
                selected === i 
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/50" 
                  : "bg-white/20 text-white/70 hover:bg-white/30"
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {i + 1}
            </button>
          );
        })}
        
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-white/40">Стол</span>
        </div>
      </div>
      
      <p className="text-xs text-amber-400">
        Выбрано: Позиция {selected + 1}
      </p>
    </div>
  );
});

export const PersonalSettingsPanel = memo(function PersonalSettingsPanel({ 
  isOpen, 
  onClose,
  maxSeats = 6
}: PersonalSettingsPanelProps) {
  const { 
    preferences, 
    updatePreference, 
    resetPreferences 
  } = usePokerPreferences();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 w-full max-w-sm z-50",
              "bg-gradient-to-b from-gray-900 via-gray-900/98 to-gray-950",
              "border-l border-amber-500/20 shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Персонализация</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto h-[calc(100%-8rem)]">
              {/* Table Theme */}
              <SettingsSection title="Дизайн стола" icon={Palette}>
                <ThemeSelector 
                  selected={preferences.tableTheme}
                  onSelect={(id) => updatePreference('tableTheme', id as any)}
                />
              </SettingsSection>

              {/* Card Back */}
              <SettingsSection title="Рубашка карт" icon={CreditCard}>
                <CardBackSelector 
                  selected={preferences.cardBack}
                  onSelect={(id) => updatePreference('cardBack', id as any)}
                />
              </SettingsSection>

              {/* Card Style */}
              <SettingsSection title="Стиль карт" icon={CreditCard} defaultOpen={false}>
                <CardStyleSelector 
                  selected={preferences.cardStyle}
                  onSelect={(id) => updatePreference('cardStyle', id as any)}
                />
              </SettingsSection>

              {/* Seat Position */}
              <SettingsSection title="Позиция за столом" icon={RotateCcw}>
                <SeatPositionSelector 
                  selected={preferences.preferredSeatRotation}
                  onSelect={(rotation) => updatePreference('preferredSeatRotation', rotation)}
                  maxSeats={maxSeats}
                />
              </SettingsSection>

              {/* Visual Preferences */}
              <SettingsSection title="Отображение" icon={Eye} defaultOpen={false}>
                <SettingRow label="Показывать ставки" description="Размер ставок у игроков">
                  <Switch
                    checked={preferences.showBetAmounts}
                    onCheckedChange={(v) => updatePreference('showBetAmounts', v)}
                  />
                </SettingRow>
                <SettingRow label="Пот-оддсы" description="Показывать шансы банка">
                  <Switch
                    checked={preferences.showPotOdds}
                    onCheckedChange={(v) => updatePreference('showPotOdds', v)}
                  />
                </SettingRow>
                <SettingRow label="Стек в ББ" description="Показывать стек в больших блайндах">
                  <Switch
                    checked={preferences.showStackInBB}
                    onCheckedChange={(v) => updatePreference('showStackInBB', v)}
                  />
                </SettingRow>
                <SettingRow label="Сила руки" description="Показывать текущую комбинацию">
                  <Switch
                    checked={preferences.showHandStrength}
                    onCheckedChange={(v) => updatePreference('showHandStrength', v)}
                  />
                </SettingRow>
                <SettingRow label="Авто-сброс" description="Автоматически скрывать проигрышные карты">
                  <Switch
                    checked={preferences.autoMuckLosingHand}
                    onCheckedChange={(v) => updatePreference('autoMuckLosingHand', v)}
                  />
                </SettingRow>
              </SettingsSection>

              {/* Sound Settings */}
              <SettingsSection title="Звук" icon={Volume2} defaultOpen={false}>
                <SettingRow label="Звуки включены">
                  <Switch
                    checked={preferences.soundEnabled}
                    onCheckedChange={(v) => updatePreference('soundEnabled', v)}
                  />
                </SettingRow>
                <SettingRow label="Громкость" description={`${Math.round(preferences.soundVolume * 100)}%`}>
                  <Slider
                    value={[preferences.soundVolume]}
                    onValueChange={([v]) => updatePreference('soundVolume', v)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-24"
                    disabled={!preferences.soundEnabled}
                  />
                </SettingRow>
              </SettingsSection>

              {/* Animation Settings */}
              <SettingsSection title="Анимации" icon={Sparkles} defaultOpen={false}>
                <SettingRow label="Быстрые анимации" description="Ускорить анимации карт и фишек">
                  <Switch
                    checked={preferences.fastAnimations}
                    onCheckedChange={(v) => updatePreference('fastAnimations', v)}
                  />
                </SettingRow>
                <SettingRow label="Конфетти" description="Праздничный эффект при победе">
                  <Switch
                    checked={preferences.showConfetti}
                    onCheckedChange={(v) => updatePreference('showConfetti', v)}
                  />
                </SettingRow>
              </SettingsSection>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gray-900/95">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetPreferences}
                  className="flex-1 border-white/20 text-white/70 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Сбросить
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Готово
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default PersonalSettingsPanel;
