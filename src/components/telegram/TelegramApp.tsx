import React, { useState } from 'react';
import { Users, Calendar, Trophy, Settings, Home, User, HelpCircle, ChevronRight, Clock, MapPin, Star, ChevronDown } from 'lucide-react';

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
      status: "Активный"
    },
    {
      id: 2,
      name: "DEEP CLASSIC TOURNAMENT", 
      participants: 89,
      maxParticipants: 120,
      time: "16:00 / 20:00",
      date: "25.09",
      prize: "35,000₽",
      status: "Регистрация"
    },
    {
      id: 3,
      name: "BOUNTY TOURNAMENT",
      participants: 76,
      maxParticipants: 150,
      time: "18:00 / 23:00", 
      date: "26.09",
      prize: "40,000₽",
      status: "Скоро"
    },
    {
      id: 4,
      name: "MAIN EVENT",
      participants: 200,
      maxParticipants: 300,
      time: "12:00 / 22:00",
      date: "27.09", 
      prize: "100,000₽",
      status: "Активный"
    },
    {
      id: 5,
      name: "FREE EDUCATION",
      participants: 65,
      maxParticipants: 80,
      time: "10:00 / 13:30",
      date: "28.09",
      prize: "Обучение",
      status: "Открыт"
    },
    {
      id: 6,
      name: "MYSTERY KNOCK-OUT",
      participants: 0,
      maxParticipants: 100,
      time: "TBA",
      date: "TBA",
      prize: "???",
      status: "Скоро"
    }
  ];

  const legends = [
    { name: "Linkin_Azrex", rating: 0, points: 4600, avatar: "LA" },
    { name: "Oneida", rating: 0, points: 3900, avatar: "ON" },
    { name: "Abdrakhmanov", rating: 0, points: 2200, avatar: "AB" },
    { name: "Алекса Михайловна", rating: 0, points: 1700, avatar: "АМ" },
    { name: "Securkin", rating: 0, points: 1500, avatar: "SE" },
    { name: "ЭД", rating: 0, points: 1300, avatar: "ЭД" },
    { name: "МДД", rating: 0, points: 1100, avatar: "МД" },
    { name: "Иванов", rating: 0, points: 1000, avatar: "ИВ" },
    { name: "AK 48", rating: 0, points: 800, avatar: "AK" }
  ];

  const faqData = [
    {
      id: 1,
      question: "1. Это законно?",
      answer: "Да, совершенно законно. Мы предоставляем развлекательные игры в покер без денежных призов, соответствуя всем требованиям российского законодательства. Все наши игры направлены на развитие навыков и получение удовольствия от процесса."
    },
    {
      id: 2, 
      question: "2. Если нет призов, зачем играть?",
      answer: "Мы предлагаем уникальную систему рейтинга и достижений. Игроки получают очки опыта за участие в турнирах, повышают свой рейтинг, получают статусы и участвуют в специальных событиях. Главная цель - совершенствование навыков и общение с единомышленниками."
    },
    {
      id: 3,
      question: "3. Что такое рейтинг?",
      answer: "Рейтинговая система основана на результатах игр и отражает мастерство игрока. Чем больше турниров вы выигрываете и чем выше занимаете места, тем выше ваш рейтинг. Высокий рейтинг дает доступ к эксклюзивным турнирам и привилегиям в клубе."
    }
  ];

  const renderHome = () => (
    <div className="space-y-4">
      {/* Main Club Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-crimson p-6 text-white shadow-crimson">
        <div className="absolute inset-0 bg-gradient-shimmer opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black font-inter tracking-tight">О КЛУБЕ</h2>
              <p className="text-white/80 mt-1 font-medium text-sm">Info</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-aesthetic-crimson" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legends Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6 text-white shadow-strong">
        <div className="relative z-10">
          <h2 className="text-2xl font-black font-inter tracking-tight mb-1">ЛЕГЕНДЫ</h2>
          <h3 className="text-xl font-bold text-aesthetic-platinum mb-3">CHECK CHECK</h3>
          <p className="text-aesthetic-platinum/70 font-medium text-sm">Общий рейтинг</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => setActiveTab('faq')}
          className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-left hover:bg-gray-700/80 transition-all duration-300"
        >
          <h3 className="text-white font-bold font-inter text-lg">Q&A</h3>
        </button>
        <button className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-left hover:bg-gray-700/80 transition-all duration-300">
          <h3 className="text-white font-bold font-inter text-lg">SUPPORT</h3>
        </button>
      </div>

      {/* Upcoming Tournament */}
      <div className="space-y-3">
        <h3 className="text-white font-bold font-inter text-lg">Ближайший турнир</h3>
        <div 
          onClick={() => setActiveTab('tournaments')}
          className="relative overflow-hidden rounded-2xl bg-gradient-crimson p-6 text-white shadow-crimson cursor-pointer hover:shadow-crimson/80 transition-all duration-300"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black font-inter tracking-tight">{tournaments[0].name}</h3>
              <div className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-aesthetic-crimson" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-white/90">
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
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-4">
      {tournaments.map((tournament) => (
        <div key={tournament.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4 text-white shadow-strong">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-black font-inter tracking-tight">{tournament.name}</h3>
            <div className="h-12 w-12 rounded-full bg-aesthetic-crimson/20 backdrop-blur-sm flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-aesthetic-crimson flex items-center justify-center">
                <Trophy className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>О турнире</span>
              <div className="flex items-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{tournament.participants}/{tournament.maxParticipants}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-white/80">
                <span>🗓 {tournament.date}</span>
                <span>🕐 {tournament.time}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-aesthetic-gold font-bold">{tournament.prize}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                tournament.status === 'Активный' 
                  ? 'bg-green-500/20 text-green-400'
                  : tournament.status === 'Регистрация'
                  ? 'bg-blue-500/20 text-blue-400'
                  : tournament.status === 'Открыт'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {tournament.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLegends = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-black text-2xl font-inter">ЛЕГЕНДЫ</h2>
        <h3 className="text-aesthetic-platinum font-bold text-lg">CHECK CHECK</h3>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button className="px-4 py-2 rounded-lg bg-aesthetic-crimson text-white font-bold text-sm">Наводки</button>
        <button className="px-4 py-2 rounded-lg bg-gray-800/50 text-aesthetic-platinum font-semibold text-sm">Покупки</button>
        <button className="px-4 py-2 rounded-lg bg-gray-800/50 text-aesthetic-platinum font-semibold text-sm">Рейтинг</button>
      </div>

      <div className="space-y-2">
        {legends.map((legend, index) => (
          <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-aesthetic-gold to-aesthetic-rose-gold flex items-center justify-center text-white font-bold text-sm">
                {legend.avatar}
              </div>
              <div>
                <p className="text-white font-medium font-inter">{legend.name}</p>
                <p className="text-aesthetic-platinum/60 text-sm">{legend.rating}</p>
              </div>
            </div>
            <div className="text-aesthetic-gold font-black font-mono">
              {legend.points}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFaq = () => (
    <div className="space-y-4">
      <h2 className="text-white font-black text-2xl font-inter mb-4">Q&A</h2>
      {faqData.map((faq) => (
        <div key={faq.id} className="rounded-xl bg-gray-800/30 backdrop-blur-sm overflow-hidden">
          <button
            onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
          >
            <h3 className="text-white font-bold font-inter">{faq.question}</h3>
            <ChevronDown 
              className={`h-5 w-5 text-aesthetic-platinum transition-transform duration-200 ${
                expandedFaq === faq.id ? 'rotate-180' : ''
              }`} 
            />
          </button>
          {expandedFaq === faq.id && (
            <div className="px-4 pb-4">
              <p className="text-aesthetic-platinum/80 leading-relaxed font-inter text-sm">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-aesthetic-gold to-aesthetic-rose-gold mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-black text-2xl">Б</span>
        </div>
        <h2 className="text-white font-black text-xl font-inter">Белуга 56748</h2>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl bg-gray-800/30 backdrop-blur-sm p-4">
          <h3 className="text-white font-bold font-inter mb-4">Мой рейтинг</h3>
          <div className="flex gap-2 mb-4">
            <button className="flex-1 py-2 px-3 rounded-lg bg-aesthetic-crimson text-white font-bold text-sm">Наводки</button>
            <button className="flex-1 py-2 px-3 rounded-lg bg-gray-700/50 text-aesthetic-platinum font-semibold text-sm">Покупки</button>
            <button className="flex-1 py-2 px-3 rounded-lg bg-gray-700/50 text-aesthetic-platinum font-semibold text-sm">Рейтинг</button>
          </div>
          <p className="text-aesthetic-platinum/60 text-center mt-4 font-inter">Нет данных</p>
        </div>

        <div className="rounded-xl bg-gray-800/30 backdrop-blur-sm p-4">
          <h3 className="text-white font-bold font-inter mb-2">История игр</h3>
          <p className="text-aesthetic-platinum/60 text-center font-inter">Нет данных</p>
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
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-white font-black text-lg font-inter tracking-tight">
            EPC Event Poker Club
          </h1>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Settings className="h-4 w-4 text-aesthetic-platinum" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {getContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-gray-800">
        <div className="flex items-center justify-around p-4">
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
                activeTab === id ? 'text-aesthetic-crimson' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium font-inter">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TelegramApp;