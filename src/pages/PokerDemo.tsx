import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PokerEngineDemo } from '@/components/poker/PokerEngineDemo';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PokerDemo() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Покерный движок</h1>
            <p className="text-muted-foreground">
              Демонстрация работы игрового движка: раздача карт, оценка комбинаций
            </p>
          </div>
          
          <PokerEngineDemo />
          
          <div className="p-4 bg-muted/20 rounded-xl border border-border text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground mb-2">Как это работает:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Нажмите "Новая игра" для раздачи карт 4 игрокам</li>
              <li>Последовательно открывайте флоп, тёрн и ривер</li>
              <li>На вскрытии движок определит лучшую комбинацию каждого игрока</li>
              <li>Победитель определяется автоматически с учётом кикеров</li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
