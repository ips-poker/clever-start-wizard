import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PokerEngineDemo } from '@/components/poker/PokerEngineDemo';
import { ArrowLeft, Globe, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PokerDemo() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6 flex items-center justify-between">
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

          {/* Online Poker CTA */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Онлайн покер</h3>
                    <p className="text-sm text-muted-foreground">
                      Играйте с другими игроками в реальном времени
                    </p>
                  </div>
                </div>
                <Link to="/online-poker">
                  <Button className="gap-2">
                    <Users className="h-4 w-4" />
                    Играть онлайн
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
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
