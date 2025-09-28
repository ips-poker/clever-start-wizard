// Временная версия без AuthGuard для тестирования
import React from "react";

const TournamentDirector = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">Турнирный директор</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">Управление турнирами</h2>
            <p className="text-muted-foreground mb-4">
              Создавайте и управляйте покерными турнирами
            </p>
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded">📊 Просмотр статистики</div>
              <div className="p-3 bg-muted rounded">👥 Управление игроками</div>
              <div className="p-3 bg-muted rounded">⏱️ Контроль времени</div>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">Быстрые действия</h2>
            <div className="space-y-3">
              <button className="w-full p-3 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                Создать турнир
              </button>
              <button className="w-full p-3 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90">
                Управление игроками
              </button>
              <button className="w-full p-3 bg-accent text-accent-foreground rounded hover:bg-accent/90">
                Настройки рейтинга
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <strong>Внимание:</strong> Это тестовая версия страницы. 
            Для полного функционала необходима авторизация.
          </p>
        </div>
        
        <div className="mt-6 text-center">
          <a 
            href="/auth" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти в систему
          </a>
        </div>
      </div>
    </div>
  );
};

export default TournamentDirector;