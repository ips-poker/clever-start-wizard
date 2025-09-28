import React from 'react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-4">EPC Event Poker Club</h1>
      <p className="text-xl">Добро пожаловать в покерный клуб премиум-класса!</p>
      <div className="mt-8 space-y-4">
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="text-2xl font-semibold mb-2">Турниры</h2>
          <p>Участвуйте в наших профессиональных турнирах</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="text-2xl font-semibold mb-2">Рейтинг</h2>
          <p>Отслеживайте свой прогресс в рейтинговой системе</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
