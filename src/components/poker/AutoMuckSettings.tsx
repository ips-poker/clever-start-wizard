import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Eye, EyeOff, Settings, Info, Check,
  Sparkles, Shield, Zap
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface AutoShowMuckSettings {
  // Auto-muck losing hands
  autoMuckLosers: boolean;
  // Auto-show winning hands
  autoShowWinners: boolean;
  // Show hand if only winner (uncalled bet)
  showUncalledWinner: boolean;
  // Muck all hands (never show)
  muckAll: boolean;
  // Show bluffs (detected when you win with worst hand)
  showBluffs: boolean;
  // Auto-show strong hands (full house+)
  autoShowMonsters: boolean;
  // Delay show for dramatic effect (ms)
  showDelay: number;
  // Enable animations
  enableAnimations: boolean;
}

const DEFAULT_SETTINGS: AutoShowMuckSettings = {
  autoMuckLosers: true,
  autoShowWinners: true,
  showUncalledWinner: false,
  muckAll: false,
  showBluffs: false,
  autoShowMonsters: true,
  showDelay: 0,
  enableAnimations: true,
};

interface AutoMuckSettingsProps {
  settings: AutoShowMuckSettings;
  onSettingsChange: (settings: AutoShowMuckSettings) => void;
}

export function AutoMuckSettingsPanel({ 
  settings, 
  onSettingsChange 
}: AutoMuckSettingsProps) {
  const updateSetting = <K extends keyof AutoShowMuckSettings>(
    key: K, 
    value: AutoShowMuckSettings[K]
  ) => {
    // Handle muckAll toggle - disable other show settings
    if (key === 'muckAll' && value === true) {
      onSettingsChange({
        ...settings,
        muckAll: true,
        autoShowWinners: false,
        showUncalledWinner: false,
        showBluffs: false,
        autoShowMonsters: false,
      });
      return;
    }
    
    onSettingsChange({ ...settings, [key]: value });
  };

  const presets = [
    {
      name: 'Стандарт',
      icon: Shield,
      description: 'Оптимальные настройки для большинства игроков',
      settings: {
        autoMuckLosers: true,
        autoShowWinners: true,
        showUncalledWinner: false,
        muckAll: false,
        showBluffs: false,
        autoShowMonsters: true,
        showDelay: 0,
        enableAnimations: true,
      }
    },
    {
      name: 'Про',
      icon: Zap,
      description: 'Минимум информации для оппонентов',
      settings: {
        autoMuckLosers: true,
        autoShowWinners: false,
        showUncalledWinner: false,
        muckAll: false,
        showBluffs: false,
        autoShowMonsters: false,
        showDelay: 0,
        enableAnimations: false,
      }
    },
    {
      name: 'Шоумен',
      icon: Sparkles,
      description: 'Показывать всё с эффектами',
      settings: {
        autoMuckLosers: false,
        autoShowWinners: true,
        showUncalledWinner: true,
        muckAll: false,
        showBluffs: true,
        autoShowMonsters: true,
        showDelay: 500,
        enableAnimations: true,
      }
    },
  ];

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">
          Быстрые пресеты
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => onSettingsChange(preset.settings as AutoShowMuckSettings)}
              className="flex flex-col h-auto py-2 gap-1"
            >
              <preset.icon className="w-4 h-4" />
              <span className="text-xs">{preset.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Individual settings */}
      <div className="space-y-3">
        <SettingRow
          label="Авто-мак проигрышных"
          description="Автоматически скрывать проигравшие руки"
          checked={settings.autoMuckLosers}
          onCheckedChange={(v) => updateSetting('autoMuckLosers', v)}
          icon={<EyeOff className="w-4 h-4" />}
        />

        <SettingRow
          label="Авто-показ выигрышных"
          description="Показывать выигравшие руки на шоудауне"
          checked={settings.autoShowWinners}
          onCheckedChange={(v) => updateSetting('autoShowWinners', v)}
          disabled={settings.muckAll}
          icon={<Eye className="w-4 h-4" />}
        />

        <SettingRow
          label="Показ при uncalled"
          description="Показывать карты когда все сбросили"
          checked={settings.showUncalledWinner}
          onCheckedChange={(v) => updateSetting('showUncalledWinner', v)}
          disabled={settings.muckAll}
          icon={<Eye className="w-4 h-4" />}
        />

        <SettingRow
          label="Показывать блефы"
          description="Показать руку если выиграли с худшей рукой"
          checked={settings.showBluffs}
          onCheckedChange={(v) => updateSetting('showBluffs', v)}
          disabled={settings.muckAll}
          icon={<Sparkles className="w-4 h-4" />}
        />

        <SettingRow
          label="Авто-показ монстров"
          description="Всегда показывать фулл-хаус и выше"
          checked={settings.autoShowMonsters}
          onCheckedChange={(v) => updateSetting('autoShowMonsters', v)}
          disabled={settings.muckAll}
          icon={<Sparkles className="w-4 h-4" />}
        />

        <div className="h-px bg-border" />

        <SettingRow
          label="Скрывать ВСЁ"
          description="Никогда не показывать карты (максимум анонимности)"
          checked={settings.muckAll}
          onCheckedChange={(v) => updateSetting('muckAll', v)}
          icon={<Shield className="w-4 h-4" />}
          variant="warning"
        />

        <SettingRow
          label="Анимации"
          description="Эффекты при показе карт"
          checked={settings.enableAnimations}
          onCheckedChange={(v) => updateSetting('enableAnimations', v)}
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>

      {/* Delay slider */}
      {settings.enableAnimations && (
        <div className="pt-2">
          <Label className="text-sm">
            Задержка показа: {settings.showDelay}ms
          </Label>
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={settings.showDelay}
            onChange={(e) => updateSetting('showDelay', Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
      )}
    </div>
  );
}

// Individual setting row component
interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  variant?: 'default' | 'warning';
}

function SettingRow({ 
  label, 
  description, 
  checked, 
  onCheckedChange, 
  disabled,
  icon,
  variant = 'default'
}: SettingRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg",
      variant === 'warning' && checked && "bg-amber-500/10",
      disabled && "opacity-50"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-1.5 rounded-lg",
          variant === 'warning' ? "bg-amber-500/20 text-amber-500" : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

// Compact button to open settings
interface AutoMuckButtonProps {
  settings: AutoShowMuckSettings;
  onSettingsChange: (settings: AutoShowMuckSettings) => void;
}

export function AutoMuckButton({ settings, onSettingsChange }: AutoMuckButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {settings.muckAll ? (
            <EyeOff className="w-4 h-4" />
          ) : settings.autoShowWinners ? (
            <Eye className="w-4 h-4" />
          ) : (
            <Settings className="w-4 h-4" />
          )}
          <span className="text-xs">Показ карт</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium">Настройки показа карт</h4>
          <p className="text-xs text-muted-foreground">
            Управление автоматическим показом/скрытием карт на шоудауне
          </p>
        </div>
        <div className="mt-4">
          <AutoMuckSettingsPanel
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing auto-muck state
export function useAutoMuckSettings() {
  const [settings, setSettings] = useState<AutoShowMuckSettings>(() => {
    const saved = localStorage.getItem('poker-auto-muck-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: AutoShowMuckSettings) => {
    setSettings(newSettings);
    localStorage.setItem('poker-auto-muck-settings', JSON.stringify(newSettings));
  };

  // Determine if we should show cards
  const shouldShowCards = (context: {
    isWinner: boolean;
    isUncalledBet: boolean;
    isBluff: boolean;
    isMonster: boolean;
  }): boolean => {
    if (settings.muckAll) return false;
    if (context.isWinner && settings.autoShowWinners) return true;
    if (context.isUncalledBet && settings.showUncalledWinner) return true;
    if (context.isBluff && settings.showBluffs) return true;
    if (context.isMonster && settings.autoShowMonsters) return true;
    return false;
  };

  // Determine if we should muck cards
  const shouldMuckCards = (isWinner: boolean): boolean => {
    if (settings.muckAll) return true;
    if (!isWinner && settings.autoMuckLosers) return true;
    return false;
  };

  return {
    settings,
    updateSettings,
    shouldShowCards,
    shouldMuckCards,
  };
}
