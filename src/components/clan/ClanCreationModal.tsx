import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLAN_EMBLEM_IMAGES, CLAN_SEAL_IMAGES } from '@/utils/clanEmblemsImages';
import { ClanEmblemDisplay } from './ClanEmblemDisplay';
import { Crown, Shield, Stamp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClanCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateClan: (name: string, emblemId: number, sealId: number, description?: string) => Promise<any>;
}

export function ClanCreationModal({
  open,
  onOpenChange,
  onCreateClan
}: ClanCreationModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState(1);
  const [selectedSeal, setSelectedSeal] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    const result = await onCreateClan(name, selectedEmblem, selectedSeal, description || undefined);
    setIsCreating(false);
    
    if (result) {
      onOpenChange(false);
      setStep(1);
      setName('');
      setDescription('');
      setSelectedEmblem(1);
      setSelectedSeal(1);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <Crown className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Дайте имя своей семье</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clan-name">Название клана</Label>
        <Input
          id="clan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите название..."
          maxLength={30}
        />
        <p className="text-xs text-muted-foreground">{name.length}/30 символов</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clan-desc">Описание (необязательно)</Label>
        <Textarea
          id="clan-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Девиз или описание клана..."
          maxLength={200}
          rows={3}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => setStep(2)}
        disabled={!name.trim()}
      >
        Далее: Выбрать герб
      </Button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <div className="text-center mb-4">
        <Shield className="w-12 h-12 mx-auto text-primary mb-2" />
        <p className="text-muted-foreground">Выберите герб семьи</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {CLAN_EMBLEM_IMAGES.map((emblem) => (
          <motion.button
            key={emblem.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedEmblem(emblem.id)}
            className={cn(
              'relative p-1 rounded-lg border-2 transition-all',
              selectedEmblem === emblem.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            <img 
              src={emblem.image} 
              alt={emblem.nameRu}
              className="w-12 h-12 mx-auto rounded object-cover"
            />
            <p className="text-[10px] mt-1 text-center truncate">{emblem.nameRu}</p>
            {selectedEmblem === emblem.id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          Назад
        </Button>
        <Button onClick={() => setStep(3)} className="flex-1">
          Далее: Выбрать печать
        </Button>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <div className="text-center mb-4">
        <Stamp className="w-12 h-12 mx-auto text-primary mb-2" />
        <p className="text-muted-foreground">Выберите печать семьи</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {CLAN_SEAL_IMAGES.map((seal) => (
          <motion.button
            key={seal.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedSeal(seal.id)}
            className={cn(
              'relative p-1 rounded-lg border-2 transition-all',
              selectedSeal === seal.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            <img 
              src={seal.image} 
              alt={seal.nameRu}
              className="w-12 h-12 mx-auto rounded-full object-cover"
            />
            <p className="text-[10px] mt-1 text-center truncate">{seal.nameRu}</p>
            {selectedSeal === seal.id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
          Назад
        </Button>
        <Button onClick={() => setStep(4)} className="flex-1">
          Предпросмотр
        </Button>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Ваш клан готов!</p>
        
        <ClanEmblemDisplay
          emblemId={selectedEmblem}
          sealId={selectedSeal}
          clanName={name}
          size="lg"
        />

        {description && (
          <p className="mt-4 text-sm text-muted-foreground italic">
            "{description}"
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
          Назад
        </Button>
        <Button 
          onClick={handleCreate} 
          className="flex-1"
          disabled={isCreating}
        >
          {isCreating ? 'Создание...' : 'Создать клан'}
        </Button>
      </div>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Создание клана
          </DialogTitle>
          <DialogDescription>
            Шаг {step} из 4
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                'flex-1 h-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </DialogContent>
    </Dialog>
  );
}
