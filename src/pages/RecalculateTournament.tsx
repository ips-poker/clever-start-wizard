import React, { useEffect } from 'react';
import { TournamentRecalculator } from '@/components/TournamentRecalculator';
import { SEOHead } from '@/components/SEOHead';

const RecalculateTournament = () => {
  useEffect(() => {
    // Автоматически запустить пересчет при загрузке страницы
    const autoRecalculate = async () => {
      const button = document.querySelector('button[disabled="false"]') as HTMLButtonElement;
      if (button && !button.disabled) {
        setTimeout(() => {
          button.click();
        }, 1000);
      }
    };
    
    autoRecalculate();
  }, []);

  return (
    <>
      <SEOHead 
        pageSlug="recalculate-tournament"
        defaultTitle="Пересчет рейтингов турнира | EPC Poker"
        defaultDescription="Пересчет рейтингов последнего турнира с новой пул-базированной системой"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Пересчет рейтингов турнира
            </h1>
            <p className="text-muted-foreground">
              Применяю новые настройки пул-базированной системы рейтингов к последнему турниру
            </p>
          </div>

          <TournamentRecalculator />
          
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Что изменилось в системе рейтингов:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Призовой коэффициент: 0.1 (вместо старого значения)</li>
              <li>• Убраны бонусы за участие</li>
              <li>• Убраны множители за ребаи и адоны</li>
              <li>• Пул-базированная система: 1000₽ входа = 100 очков для распределения между призерами</li>
              <li>• Очки распределяются только среди игроков, попавших в призы согласно призовой структуре</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecalculateTournament;