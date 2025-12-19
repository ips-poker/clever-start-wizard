// Sound Demo Component - Preview all poker sounds
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { usePokerSounds } from '@/hooks/usePokerSounds';

interface SoundDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SoundDemo({ isOpen, onClose }: SoundDemoProps) {
  const sounds = usePokerSounds();
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);

  const playSound = (name: string, fn: () => void) => {
    setLastPlayed(name);
    fn();
    setTimeout(() => setLastPlayed(null), 500);
  };

  const soundButtons = [
    { name: 'Чек', description: 'Двойной стук по столу', fn: sounds.playCheck, color: 'from-blue-600 to-blue-700' },
    { name: 'Колл', description: 'Бросок фишки', fn: sounds.playCall, color: 'from-green-600 to-green-700' },
    { name: 'Фолд', description: 'Сброс карт', fn: sounds.playFold, color: 'from-gray-600 to-gray-700' },
    { name: 'Бет', description: 'Ставка фишки', fn: sounds.playBet, color: 'from-amber-600 to-amber-700' },
    { name: 'Рейз', description: 'Стопка фишек', fn: sounds.playRaise, color: 'from-orange-600 to-orange-700' },
    { name: 'Олл-ин', description: 'Все фишки', fn: sounds.playAllIn, color: 'from-red-600 to-red-700' },
    { name: '─────', description: 'Звуки фишек', fn: () => {}, color: 'from-transparent to-transparent', disabled: true },
    { name: 'Фишка', description: 'Одна фишка', fn: sounds.playChipSingle, color: 'from-yellow-600 to-yellow-700' },
    { name: 'Стопка', description: 'Стопка фишек', fn: sounds.playChipStack, color: 'from-yellow-500 to-amber-600' },
    { name: 'Скольжение', description: 'Фишки скользят', fn: sounds.playChipSlide, color: 'from-amber-500 to-yellow-600' },
    { name: 'Выигрыш банка', description: 'Сбор выигрыша', fn: sounds.playPotWin, color: 'from-emerald-500 to-green-600' },
    { name: '─────', description: 'Звуки карт', fn: () => {}, color: 'from-transparent to-transparent', disabled: true },
    { name: 'Раздача', description: 'Карта летит', fn: sounds.playDeal, color: 'from-indigo-600 to-indigo-700' },
    { name: 'Переворот', description: 'Карта открывается', fn: sounds.playCardFlip, color: 'from-purple-600 to-purple-700' },
    { name: 'Тасовка', description: 'Перемешивание', fn: sounds.playShuffle, color: 'from-violet-600 to-violet-700' },
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Демо звуков</h2>
              <p className="text-white/60 text-sm">Нажмите для прослушивания</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {soundButtons.map((btn, idx) => (
            btn.disabled ? (
              <div key={idx} className="col-span-2 text-center text-white/40 text-xs py-2">
                {btn.description}
              </div>
            ) : (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.95 }}
                onClick={() => playSound(btn.name, btn.fn)}
                className={`relative p-4 rounded-xl bg-gradient-to-br ${btn.color} text-white font-medium shadow-lg overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02]`}
              >
                {lastPlayed === btn.name && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white rounded-full"
                    style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                  />
                )}
                <div className="relative z-10">
                  <div className="text-base font-bold">{btn.name}</div>
                  <div className="text-xs opacity-80">{btn.description}</div>
                </div>
              </motion.button>
            )
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-white font-semibold mb-2">💡 Описание звуков:</h3>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• <strong>Чек</strong> — глухой двойной стук по столу</li>
            <li>• <strong>Колл</strong> — бросок керамической фишки</li>
            <li>• <strong>Рейз</strong> — каскад нескольких фишек</li>
            <li>• <strong>Скольжение</strong> — фишки едут по столу</li>
            <li>• <strong>Выигрыш</strong> — сбор банка победителем</li>
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}
