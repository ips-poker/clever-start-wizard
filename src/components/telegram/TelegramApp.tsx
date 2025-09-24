import React, { useState } from 'react';
import { Users, Trophy, Settings, Home, User, Clock, ChevronDown } from 'lucide-react';

const TelegramApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const tournaments = [
    {
      id: 1,
      name: "PHOENIX TOURNAMENT",
      participants: 150,
      maxParticipants: 200,
      time: "14:00 / 19:00",
      date: "24.09",
      prize: "50,000₽",
      status: "active",
      description: "О турнире"
    },
    {
      id: 2,
      name: "DEEP CLASSIC TOURNAMENT", 
      participants: 89,
      maxParticipants: 120,
      time: "22:00 / 19:00",
      date: "25.09",
      prize: "35,000₽",
      status: "registration"
    },
    {
      id: 3,
      name: "BOUNTY TOURNAMENT",
      participants: 76,
      maxParticipants: 150,
      time: "18:00 / 19:00", 
      date: "26.09",
      prize: "40,000₽",
      status: "soon"
    },
    {
      id: 4,
      name: "MAIN EVENT",
      participants: 200,
      maxParticipants: 300,
      time: "27.09 / 17:00",
      date: "27.09", 
      prize: "100,000₽",
      status: "active"
    },
    {
      id: 5,
      name: "FREE EDUCATION",
      participants: 65,
      maxParticipants: 80,
      time: "28.09 / 15:30",
      date: "28.09",
      prize: "Обучение",
      status: "open"
    },
    {
      id: 6,
      name: "MYSTERY KNOCK-OUT",
      participants: 0,
      maxParticipants: 100,
      time: "TBA",
      date: "TBA",
      prize: "Турниры",
      status: "mystery"
    }
  ];

  const legends = [
    { name: "Linkin_Azrex", rating: 0, points: 4600 },
    { name: "Oneida", rating: 0, points: 3900 },
    { name: "Abdrakhmanov", rating: 0, points: 2200 },
    { name: "Алекса Михайловна", rating: 0, points: 1700 },
    { name: "Securkin", rating: 0, points: 1500 },
    { name: "ЭД", rating: 0, points: 1300 },
    { name: "МДД", rating: 0, points: 1100 },
    { name: "Иванов", rating: 0, points: 1000 },
    { name: "AK 48", rating: 0, points: 800 }
  ];

  const faqData = [
    {
      id: 1,
      question: "1. Это законно?",
      answer: "Да, совершенно законно. Мы предоставляем развлекательные игры в покер без денежных призов, соответствуя всем требованиям российского законодательства. В России действует ФЗ 244 «О государственном регулировании деятельности по организации и проведению азартных игр», где покерные игры без денежных призов не классифицируются как азартные. Наши турниры проводятся исключительно в развлекательных и спортивных целях."
    },
    {
      id: 2, 
      question: "2. Если нет призов, зачем играть?",
      answer: "Мы предлагаем альтернативную систему мотивации: рейтинги, достижения, обучение и сообщество. Игроки соревнуются за рейтинговые очки, статусы в клубе, доступ к эксклюзивным событиям. Основная цель - развитие навыков, изучение стратегий покера в дружественной атмосфере без финансовых рисков. Многие участники ценят интеллектуальный вызов и социальный аспект игры."
    },
    {
      id: 3,
      question: "3. Что такое рейтинг?",
      answer: "Рейтинговая система EPC основана на результатах участия в турнирах и отражает игровое мастерство. Рейтинг рассчитывается с учетом: занятых мест в турнирах, количества участников, сложности турнира. Чем стабильнее результаты и выше места - тем быстрее растет рейтинг. Система учитывает долгосрочную игру, а не разовые успехи."
    }
  ];

  const renderHome = () => (
    <div className="space-y-4 px-4">
      {/* Main Club Card */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{backgroundColor: '#DC2626'}}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white text-2xl font-black mb-1">О КЛУБЕ</h2>
            <p className="text-white/80 font-medium">Info</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white"></div>
          </div>
        </div>
      </div>

      {/* Legends Card */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6 cursor-pointer" 
        style={{backgroundColor: '#1F2937'}}
        onClick={() => setActiveTab('legends')}
      >
        <div>
          <h2 className="text-white text-2xl font-black mb-1">CHECK CHECK</h2>
          <h3 className="text-white text-xl font-bold mb-2">LEGENDS</h3>
          <p className="text-gray-400 font-medium">Общий рейтинг</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          className="rounded-2xl p-4 cursor-pointer" 
          style={{backgroundColor: '#1F2937'}}
          onClick={() => setActiveTab('faq')}
        >
          <h3 className="text-white font-bold text-xl">Q&A</h3>
        </div>
        <div 
          className="rounded-2xl p-4 cursor-pointer" 
          style={{backgroundColor: '#1F2937'}}
        >
          <h3 className="text-white font-bold text-xl">SUPPORT</h3>
        </div>
      </div>

      {/* Next Tournament */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-lg px-2">Ближайший турнир</h3>
        <div 
          onClick={() => setActiveTab('tournaments')}
          className="relative overflow-hidden rounded-2xl p-6 cursor-pointer"
          style={{backgroundColor: '#DC2626'}}
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white text-xl font-black">{tournaments[0].name}</h3>
            <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-white"></div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{tournaments[0].participants}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{tournaments[0].time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-4 px-4">
      {tournaments.map((tournament) => (
        <div key={tournament.id} className="rounded-2xl p-4" style={{backgroundColor: '#1F2937'}}>
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-white text-lg font-black flex-1">{tournament.name}</h3>
            <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center ml-4">
              <div className="w-6 h-6 rounded-full bg-red-600"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{tournament.description || "О турнире"}</span>
              <div className="flex items-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{tournament.participants}/{tournament.maxParticipants}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{tournament.time}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-yellow-400 font-bold">{tournament.prize}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLegends = () => (
    <div className="space-y-4 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-2xl">ЛЕГЕНДЫ</h2>
        <h3 className="text-gray-400 font-bold text-lg">CHECK CHECK</h3>
      </div>
      
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-lg text-white font-bold text-sm" style={{backgroundColor: '#DC2626'}}>
          Наводки
        </button>
        <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 font-semibold text-sm">
          Покупки
        </button>
        <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 font-semibold text-sm">
          Рейтинг
        </button>
      </div>

      <div className="space-y-2">
        {legends.map((legend, index) => (
          <div key={index} className="flex items-center justify-between p-4 rounded-xl" style={{backgroundColor: '#1F2937'}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                {legend.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-medium">{legend.name}</p>
                <p className="text-gray-400 text-sm">{legend.rating}</p>
              </div>
            </div>
            <div className="text-yellow-400 font-black font-mono">
              {legend.points}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFaq = () => (
    <div className="space-y-4 px-4">
      <h2 className="text-white font-black text-2xl">Q&A</h2>
      {faqData.map((faq) => (
        <div key={faq.id} className="rounded-xl overflow-hidden" style={{backgroundColor: '#1F2937'}}>
          <button
            onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-600/20 transition-colors"
          >
            <h3 className="text-white font-bold">{faq.question}</h3>
            <ChevronDown 
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                expandedFaq === faq.id ? 'rotate-180' : ''
              }`} 
            />
          </button>
          {expandedFaq === faq.id && (
            <div className="px-4 pb-4">
              <p className="text-gray-300 leading-relaxed text-sm">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-black text-2xl">Б</span>
        </div>
        <h2 className="text-white font-black text-xl">Белуга 56748</h2>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl p-4" style={{backgroundColor: '#1F2937'}}>
          <h3 className="text-white font-bold mb-4">Мой рейтинг</h3>
          <div className="flex gap-2 mb-4">
            <button className="flex-1 py-2 px-3 rounded-lg text-white font-bold text-sm" style={{backgroundColor: '#DC2626'}}>
              Наводки
            </button>
            <button className="flex-1 py-2 px-3 rounded-lg bg-gray-700 text-gray-300 font-semibold text-sm">
              Покупки
            </button>
            <button className="flex-1 py-2 px-3 rounded-lg bg-gray-700 text-gray-300 font-semibold text-sm">
              Рейтинг
            </button>
          </div>
          <p className="text-gray-400 text-center">Нет данных</p>
        </div>

        <div className="rounded-xl p-4" style={{backgroundColor: '#1F2937'}}>
          <h3 className="text-white font-bold mb-2">История игр</h3>
          <p className="text-gray-400 text-center">Нет данных</p>
        </div>
      </div>
    </div>
  );

  const getContent = () => {
    switch (activeTab) {
      case 'home': return renderHome();
      case 'tournaments': return renderTournaments();
      case 'legends': return renderLegends();
      case 'faq': return renderFaq();
      case 'profile': return renderProfile();
      default: return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-black font-inter">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-white font-black text-lg tracking-tight">
            EPC Event Poker Club
          </h1>
          <button className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <Settings className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="py-4 pb-24">
        {getContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
        <div className="flex items-center justify-around py-4">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tournaments', icon: Trophy, label: 'Турниры' },
            { id: 'legends', icon: Users, label: 'Легенды' },
            { id: 'profile', icon: User, label: 'Профиль' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
                activeTab === id ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TelegramApp;