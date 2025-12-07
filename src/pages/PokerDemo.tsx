import React, { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PokerEngineDemo } from '@/components/poker/PokerEngineDemo';
import { PPPokerTableComplete } from '@/components/poker/PPPokerTableComplete';
import { ArrowLeft, Globe, Users, Sparkles, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PokerDemo() {
  const [showPPPokerDemo, setShowPPPokerDemo] = useState(false);

  const handleLeavePPPoker = useCallback(() => {
    setShowPPPokerDemo(false);
  }, []);

  // Show fullscreen PPPoker table when active
  if (showPPPokerDemo) {
    return (
      <PPPokerTableComplete
        playerId="demo-player-1"
        playerName="You"
        playerStack={10000}
        onLeave={handleLeavePPPoker}
      />
    );
  }

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

          {/* PPPoker Style Demo CTA */}
          <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-500/20">
                    <Sparkles className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      PPPoker-стиль стол
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white">NEW</span>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Полный стол с анимациями как в PPPoker/GGPoker
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowPPPokerDemo(true)}
                  className="gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500"
                >
                  <Play className="h-4 w-4" />
                  Попробовать
                </Button>
              </div>
            </CardContent>
          </Card>

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

          <Tabs defaultValue="engine" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="engine">Движок</TabsTrigger>
              <TabsTrigger value="info">Информация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="engine" className="mt-4">
              <PokerEngineDemo />
            </TabsContent>
            
            <TabsContent value="info" className="mt-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-border text-sm text-muted-foreground space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Как это работает:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Нажмите "Новая игра" для раздачи карт 4 игрокам</li>
                    <li>Последовательно открывайте флоп, тёрн и ривер</li>
                    <li>На вскрытии движок определит лучшую комбинацию каждого игрока</li>
                    <li>Победитель определяется автоматически с учётом кикеров</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Улучшения PPPoker-стиля:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Плавные анимации карт с 3D-переворотом</li>
                    <li>Реалистичные фишки с разными номиналами</li>
                    <li>Таймер хода с визуальным индикатором</li>
                    <li>Эффектные экраны победы с конфетти</li>
                    <li>Оптимизированный рендеринг без мерцаний</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
