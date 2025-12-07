import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Settings2, X, Volume2, MessageSquare, Clock, 
  Zap, Target, DollarSign, Users, Shield, Bomb
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableSettings {
  // Blinds & Ante
  smallBlind: number;
  bigBlind: number;
  ante: number;
  // Action timing
  actionTimeSeconds: number;
  timeBankSeconds: number;
  // Straddle settings
  straddleEnabled: boolean;
  mississippiStraddleEnabled: boolean;
  maxStraddleCount: number;
  // Advanced blinds
  buttonAnteEnabled: boolean;
  buttonAnteAmount: number;
  bigBlindAnteEnabled: boolean;
  bigBlindAnteAmount: number;
  // Bomb Pot
  bombPotEnabled: boolean;
  bombPotMultiplier: number;
  bombPotDoubleBoard: boolean;
  // Chat
  chatEnabled: boolean;
  chatSlowMode: boolean;
  chatSlowModeInterval: number;
  // Run it twice
  runItTwiceEnabled: boolean;
  // Rake
  rakePercent: number;
  rakeCap: number;
  // Auto-start
  autoStartEnabled: boolean;
  autoStartDelaySeconds: number;
}

interface TableSettingsPanelProps {
  settings: Partial<TableSettings>;
  onSave: (settings: Partial<TableSettings>) => void;
  onClose: () => void;
  isOpen: boolean;
  isHost?: boolean;
}

const SettingsSection = ({ 
  title, 
  icon: Icon, 
  children,
  collapsed = false
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  collapsed?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(!collapsed);
  
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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

export function TableSettingsPanel({ 
  settings: initialSettings, 
  onSave, 
  onClose, 
  isOpen,
  isHost = true 
}: TableSettingsPanelProps) {
  const [settings, setSettings] = useState<Partial<TableSettings>>({
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    actionTimeSeconds: 15,
    timeBankSeconds: 30,
    straddleEnabled: false,
    mississippiStraddleEnabled: false,
    maxStraddleCount: 1,
    buttonAnteEnabled: false,
    buttonAnteAmount: 0,
    bigBlindAnteEnabled: false,
    bigBlindAnteAmount: 0,
    bombPotEnabled: false,
    bombPotMultiplier: 2,
    bombPotDoubleBoard: false,
    chatEnabled: true,
    chatSlowMode: false,
    chatSlowModeInterval: 5,
    runItTwiceEnabled: false,
    rakePercent: 0,
    rakeCap: 0,
    autoStartEnabled: true,
    autoStartDelaySeconds: 3,
    ...initialSettings
  });

  const updateSetting = useCallback(<K extends keyof TableSettings>(
    key: K, 
    value: TableSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(settings);
    onClose();
  }, [settings, onSave, onClose]);

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
              "border-l border-orange-500/20 shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Настройки стола</h2>
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
              {/* Blinds & Ante */}
              <SettingsSection title="Блайнды и анте" icon={DollarSign}>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-white/50">SB</Label>
                    <Input
                      type="number"
                      value={settings.smallBlind}
                      onChange={(e) => updateSetting('smallBlind', Number(e.target.value))}
                      className="h-8 text-xs bg-white/5 border-white/10"
                      disabled={!isHost}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">BB</Label>
                    <Input
                      type="number"
                      value={settings.bigBlind}
                      onChange={(e) => updateSetting('bigBlind', Number(e.target.value))}
                      className="h-8 text-xs bg-white/5 border-white/10"
                      disabled={!isHost}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">Ante</Label>
                    <Input
                      type="number"
                      value={settings.ante}
                      onChange={(e) => updateSetting('ante', Number(e.target.value))}
                      className="h-8 text-xs bg-white/5 border-white/10"
                      disabled={!isHost}
                    />
                  </div>
                </div>
              </SettingsSection>

              {/* Timing */}
              <SettingsSection title="Тайминг" icon={Clock}>
                <SettingRow label="Время на ход" description={`${settings.actionTimeSeconds}сек`}>
                  <Slider
                    value={[settings.actionTimeSeconds || 15]}
                    onValueChange={([v]) => updateSetting('actionTimeSeconds', v)}
                    min={5}
                    max={60}
                    step={5}
                    className="w-24"
                    disabled={!isHost}
                  />
                </SettingRow>
                <SettingRow label="Тайм-банк" description={`${settings.timeBankSeconds}сек`}>
                  <Slider
                    value={[settings.timeBankSeconds || 30]}
                    onValueChange={([v]) => updateSetting('timeBankSeconds', v)}
                    min={0}
                    max={120}
                    step={10}
                    className="w-24"
                    disabled={!isHost}
                  />
                </SettingRow>
                <SettingRow label="Авто-старт" description="Автоматический старт раздачи">
                  <Switch
                    checked={settings.autoStartEnabled}
                    onCheckedChange={(v) => updateSetting('autoStartEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
                {settings.autoStartEnabled && (
                  <SettingRow label="Задержка авто-старта" description={`${settings.autoStartDelaySeconds}сек`}>
                    <Slider
                      value={[settings.autoStartDelaySeconds || 3]}
                      onValueChange={([v]) => updateSetting('autoStartDelaySeconds', v)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-24"
                      disabled={!isHost}
                    />
                  </SettingRow>
                )}
              </SettingsSection>

              {/* Straddle */}
              <SettingsSection title="Стрэддл" icon={Zap} collapsed>
                <SettingRow label="Straddle" description="Добровольный 3-й блайнд">
                  <Switch
                    checked={settings.straddleEnabled}
                    onCheckedChange={(v) => updateSetting('straddleEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
                <SettingRow label="Mississippi Straddle" description="Стрэддл с любой позиции">
                  <Switch
                    checked={settings.mississippiStraddleEnabled}
                    onCheckedChange={(v) => updateSetting('mississippiStraddleEnabled', v)}
                    disabled={!isHost || !settings.straddleEnabled}
                  />
                </SettingRow>
                {settings.straddleEnabled && (
                  <SettingRow label="Макс. стрэддлов" description={`${settings.maxStraddleCount}`}>
                    <Slider
                      value={[settings.maxStraddleCount || 1]}
                      onValueChange={([v]) => updateSetting('maxStraddleCount', v)}
                      min={1}
                      max={5}
                      step={1}
                      className="w-24"
                      disabled={!isHost}
                    />
                  </SettingRow>
                )}
              </SettingsSection>

              {/* Advanced Ante */}
              <SettingsSection title="Расширенный анте" icon={Target} collapsed>
                <SettingRow label="Button Ante" description="Анте ставит дилер">
                  <Switch
                    checked={settings.buttonAnteEnabled}
                    onCheckedChange={(v) => updateSetting('buttonAnteEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
                {settings.buttonAnteEnabled && (
                  <SettingRow label="Размер Button Ante">
                    <Input
                      type="number"
                      value={settings.buttonAnteAmount}
                      onChange={(e) => updateSetting('buttonAnteAmount', Number(e.target.value))}
                      className="h-7 w-20 text-xs bg-white/5 border-white/10"
                      disabled={!isHost}
                    />
                  </SettingRow>
                )}
                <SettingRow label="Big Blind Ante" description="BB платит анте за всех">
                  <Switch
                    checked={settings.bigBlindAnteEnabled}
                    onCheckedChange={(v) => updateSetting('bigBlindAnteEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
                {settings.bigBlindAnteEnabled && (
                  <SettingRow label="Размер BB Ante">
                    <Input
                      type="number"
                      value={settings.bigBlindAnteAmount}
                      onChange={(e) => updateSetting('bigBlindAnteAmount', Number(e.target.value))}
                      className="h-7 w-20 text-xs bg-white/5 border-white/10"
                      disabled={!isHost}
                    />
                  </SettingRow>
                )}
              </SettingsSection>

              {/* Bomb Pot */}
              <SettingsSection title="Bomb Pot" icon={Bomb} collapsed>
                <SettingRow label="Bomb Pot" description="Все ставят перед флопом">
                  <Switch
                    checked={settings.bombPotEnabled}
                    onCheckedChange={(v) => updateSetting('bombPotEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
                {settings.bombPotEnabled && (
                  <>
                    <SettingRow label="Множитель" description={`${settings.bombPotMultiplier}x BB`}>
                      <Slider
                        value={[settings.bombPotMultiplier || 2]}
                        onValueChange={([v]) => updateSetting('bombPotMultiplier', v)}
                        min={2}
                        max={10}
                        step={1}
                        className="w-24"
                        disabled={!isHost}
                      />
                    </SettingRow>
                    <SettingRow label="Double Board" description="Два борда">
                      <Switch
                        checked={settings.bombPotDoubleBoard}
                        onCheckedChange={(v) => updateSetting('bombPotDoubleBoard', v)}
                        disabled={!isHost}
                      />
                    </SettingRow>
                  </>
                )}
              </SettingsSection>

              {/* Chat */}
              <SettingsSection title="Чат" icon={MessageSquare}>
                <SettingRow label="Чат включен">
                  <Switch
                    checked={settings.chatEnabled}
                    onCheckedChange={(v) => updateSetting('chatEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
                <SettingRow label="Slow Mode" description="Ограничение частоты сообщений">
                  <Switch
                    checked={settings.chatSlowMode}
                    onCheckedChange={(v) => updateSetting('chatSlowMode', v)}
                    disabled={!isHost || !settings.chatEnabled}
                  />
                </SettingRow>
                {settings.chatSlowMode && (
                  <SettingRow label="Интервал" description={`${settings.chatSlowModeInterval}сек`}>
                    <Slider
                      value={[settings.chatSlowModeInterval || 5]}
                      onValueChange={([v]) => updateSetting('chatSlowModeInterval', v)}
                      min={3}
                      max={30}
                      step={1}
                      className="w-24"
                      disabled={!isHost}
                    />
                  </SettingRow>
                )}
              </SettingsSection>

              {/* Run It Twice */}
              <SettingsSection title="Особые правила" icon={Shield} collapsed>
                <SettingRow label="Run It Twice" description="Раздать борд дважды при олл-ине">
                  <Switch
                    checked={settings.runItTwiceEnabled}
                    onCheckedChange={(v) => updateSetting('runItTwiceEnabled', v)}
                    disabled={!isHost}
                  />
                </SettingRow>
              </SettingsSection>

              {/* Rake (for hosts only) */}
              {isHost && (
                <SettingsSection title="Рейк" icon={DollarSign} collapsed>
                  <SettingRow label="Процент рейка" description={`${settings.rakePercent}%`}>
                    <Slider
                      value={[settings.rakePercent || 0]}
                      onValueChange={([v]) => updateSetting('rakePercent', v)}
                      min={0}
                      max={10}
                      step={0.5}
                      className="w-24"
                    />
                  </SettingRow>
                  <SettingRow label="Кап рейка">
                    <Input
                      type="number"
                      value={settings.rakeCap}
                      onChange={(e) => updateSetting('rakeCap', Number(e.target.value))}
                      className="h-7 w-20 text-xs bg-white/5 border-white/10"
                    />
                  </SettingRow>
                </SettingsSection>
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-white/20 text-white/70 hover:text-white"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-medium"
                  disabled={!isHost}
                >
                  Сохранить
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TableSettingsPanel;