import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Shield, Stamp, Pencil, Check } from 'lucide-react';
import { ClanEmblemSVG, ClanSealSVG } from './ClanEmblemSVG';
import { CLAN_EMBLEMS, CLAN_SEALS, getEmblemById } from '@/utils/clanEmblems';
import { Clan } from '@/hooks/useClanSystem';
import { cn } from '@/lib/utils';

interface ClanEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clan: Clan;
  onSave: (updates: { name?: string; emblem_id?: number; seal_id?: number; description?: string }) => Promise<boolean>;
}

export function ClanEditModal({ open, onOpenChange, clan, onSave }: ClanEditModalProps) {
  const [step, setStep] = useState<'main' | 'emblem' | 'seal'>('main');
  const [name, setName] = useState(clan.name);
  const [description, setDescription] = useState(clan.description || '');
  const [emblemId, setEmblemId] = useState(clan.emblem_id);
  const [sealId, setSealId] = useState(clan.seal_id);
  const [saving, setSaving] = useState(false);

  const emblem = getEmblemById(emblemId);
  const primaryColor = emblem?.colors.primary || '#FFD700';

  const hasChanges = 
    name !== clan.name || 
    description !== (clan.description || '') || 
    emblemId !== clan.emblem_id || 
    sealId !== clan.seal_id;

  const handleSave = async () => {
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      const updates: any = {};
      if (name !== clan.name) updates.name = name.trim();
      if (description !== (clan.description || '')) updates.description = description.trim() || null;
      if (emblemId !== clan.emblem_id) updates.emblem_id = emblemId;
      if (sealId !== clan.seal_id) updates.seal_id = sealId;

      const success = await onSave(updates);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderMainStep = () => (
    <div className="space-y-4">
      {/* Текущий герб и печать */}
      <div className="flex items-center justify-center gap-6 py-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setStep('emblem')}
          className="relative cursor-pointer group"
        >
          <ClanEmblemSVG emblemId={emblemId} size={80} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
            Герб
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setStep('seal')}
          className="relative cursor-pointer group"
        >
          <ClanSealSVG sealId={sealId} size={60} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
            Печать
          </div>
        </motion.div>
      </div>

      {/* Название */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Название клана</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите название"
          maxLength={30}
          className="bg-background/50 border-border/50"
        />
        <div className="text-[10px] text-muted-foreground text-right">{name.length}/30</div>
      </div>

      {/* Описание */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Описание (девиз)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Введите девиз или описание клана"
          maxLength={100}
          rows={2}
          className="bg-background/50 border-border/50 resize-none"
        />
        <div className="text-[10px] text-muted-foreground text-right">{description.length}/100</div>
      </div>

      {/* Кнопка сохранения */}
      <Button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-full brutal-border"
        style={{ 
          background: hasChanges 
            ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` 
            : undefined 
        }}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            {hasChanges ? 'Сохранить изменения' : 'Без изменений'}
          </>
        )}
      </Button>
    </div>
  );

  const renderEmblemStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep('main')}
          className="h-8 px-2"
        >
          ← Назад
        </Button>
        <span className="text-sm font-medium">Выбор герба</span>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-2 gap-3 p-1">
          {CLAN_EMBLEMS.map((emb) => (
            <motion.div
              key={emb.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEmblemId(emb.id);
                setStep('main');
              }}
              className={cn(
                'relative p-4 rounded-lg border cursor-pointer transition-all',
                emblemId === emb.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 bg-background/30 hover:border-primary/50'
              )}
            >
              {emblemId === emb.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <ClanEmblemSVG emblemId={emb.id} size={64} />
                <div className="text-center">
                  <div className="text-xs font-medium">{emb.nameRu}</div>
                  <div className="text-[10px] text-muted-foreground">{emb.description}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderSealStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep('main')}
          className="h-8 px-2"
        >
          ← Назад
        </Button>
        <span className="text-sm font-medium">Выбор печати</span>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-2 gap-3 p-1">
          {CLAN_SEALS.map((seal) => (
            <motion.div
              key={seal.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSealId(seal.id);
                setStep('main');
              }}
              className={cn(
                'relative p-4 rounded-lg border cursor-pointer transition-all',
                sealId === seal.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 bg-background/30 hover:border-primary/50'
              )}
            >
              {sealId === seal.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <ClanSealSVG sealId={seal.id} size={56} />
                <div className="text-center">
                  <div className="text-xs font-medium">{seal.nameRu}</div>
                  <div className="text-[10px] text-muted-foreground">{seal.description}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-card to-background border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" style={{ color: primaryColor }} />
            Редактирование клана
          </DialogTitle>
        </DialogHeader>

        {step === 'main' && renderMainStep()}
        {step === 'emblem' && renderEmblemStep()}
        {step === 'seal' && renderSealStep()}
      </DialogContent>
    </Dialog>
  );
}
