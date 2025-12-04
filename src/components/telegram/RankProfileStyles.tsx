// Unique profile header styles for each mafia rank
import { MafiaRank } from "@/utils/mafiaRanks";

interface RankProfileStyle {
  // Background styling
  bgPattern: string;
  bgOverlay: string;
  // Avatar effects
  avatarGlow: string;
  avatarRing: string;
  avatarAnimation: string;
  // Decorative elements
  decorations: React.ReactNode;
  // Name styling
  nameClass: string;
  // Special effects
  particleEffect?: 'none' | 'sparkle' | 'smoke' | 'fire' | 'lightning' | 'royal';
}

export function getRankProfileStyle(rank: MafiaRank | null): RankProfileStyle {
  const rankId = rank?.id || 'outsider';
  
  const styles: Record<string, RankProfileStyle> = {
    // Аутсайдер - минимальный стиль
    outsider: {
      bgPattern: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900',
      bgOverlay: 'bg-[radial-gradient(circle_at_50%_50%,rgba(63,63,70,0.3),transparent_70%)]',
      avatarGlow: '',
      avatarRing: 'ring-zinc-600',
      avatarAnimation: '',
      nameClass: 'text-zinc-400',
      decorations: (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-2 right-2 text-xl text-zinc-500">?</div>
        </div>
      ),
      particleEffect: 'none'
    },
    
    // Пиччотто - базовый стиль новичка
    picciotto: {
      bgPattern: 'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800',
      bgOverlay: 'bg-[radial-gradient(circle_at_30%_70%,rgba(113,113,122,0.2),transparent_50%)]',
      avatarGlow: 'shadow-lg shadow-zinc-500/30',
      avatarRing: 'ring-2 ring-zinc-500',
      avatarAnimation: '',
      nameClass: 'text-zinc-300',
      decorations: (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-3 left-3 text-lg">♠</div>
          <div className="absolute top-3 right-3 text-lg opacity-50">♣</div>
        </div>
      ),
      particleEffect: 'none'
    },
    
    // Солдато - стиль проверенного бойца
    soldato: {
      bgPattern: 'bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900',
      bgOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(168,162,158,0.15),transparent_60%)]',
      avatarGlow: 'shadow-lg shadow-stone-500/40',
      avatarRing: 'ring-2 ring-stone-400',
      avatarAnimation: '',
      nameClass: 'text-stone-300',
      decorations: (
        <div className="absolute inset-0 opacity-15">
          <div className="absolute bottom-3 left-3 text-xl">♠</div>
          <div className="absolute top-3 right-3 text-xl">♣</div>
          <div className="absolute bottom-3 right-12 text-sm opacity-50">⚔</div>
        </div>
      ),
      particleEffect: 'smoke'
    },
    
    // Сгарриста - первая победа, появляется золото
    sgarrista: {
      bgPattern: 'bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-stone-900',
      bgOverlay: 'bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.2),transparent_50%)]',
      avatarGlow: 'shadow-xl shadow-amber-500/50',
      avatarRing: 'ring-2 ring-amber-400 animate-pulse',
      avatarAnimation: 'hover:scale-105 transition-transform duration-300',
      nameClass: 'text-amber-300',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute top-2 left-2 text-amber-500/30 text-2xl">★</div>
          <div className="absolute bottom-3 right-3 text-xl text-amber-400/20">♠</div>
          <div className="absolute top-1/2 right-2 w-px h-12 bg-gradient-to-b from-transparent via-amber-500/30 to-transparent"></div>
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // Ассоциато - уважаемый член, оранжевый акцент
    associato: {
      bgPattern: 'bg-gradient-to-br from-orange-900/70 via-orange-800/50 to-zinc-900',
      bgOverlay: 'bg-[conic-gradient(from_180deg_at_50%_50%,rgba(249,115,22,0.1),transparent,rgba(249,115,22,0.1))]',
      avatarGlow: 'shadow-xl shadow-orange-500/50 animate-pulse',
      avatarRing: 'ring-2 ring-orange-400',
      avatarAnimation: 'hover:scale-105 transition-transform duration-300',
      nameClass: 'text-orange-300 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
          <div className="absolute bottom-2 left-3 text-2xl text-orange-400/30">♠</div>
          <div className="absolute top-3 right-3 text-xl text-orange-500/20">♦</div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-radial from-orange-500/10 to-transparent rounded-full blur-xl"></div>
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // Капореджиме - командир, синий элитный стиль
    caporegime: {
      bgPattern: 'bg-gradient-to-br from-blue-900/80 via-blue-800/60 to-slate-900',
      bgOverlay: 'bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_50%)]',
      avatarGlow: 'shadow-2xl shadow-blue-500/60',
      avatarRing: 'ring-3 ring-blue-400 animate-[pulse_3s_ease-in-out_infinite]',
      avatarAnimation: 'hover:scale-110 transition-all duration-500',
      nameClass: 'text-blue-300 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 via-cyan-400/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/30 to-blue-500/50"></div>
          <div className="absolute bottom-3 left-3 text-3xl text-blue-400/25">♠</div>
          <div className="absolute top-3 right-3 text-2xl text-cyan-400/20">♛</div>
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // Шарк - акула покера, фиолетовый хищный стиль
    shark: {
      bgPattern: 'bg-gradient-to-br from-purple-900/80 via-violet-800/60 to-slate-900',
      bgOverlay: 'bg-[radial-gradient(circle_at_70%_30%,rgba(147,51,234,0.3),transparent_50%)]',
      avatarGlow: 'shadow-2xl shadow-purple-500/70',
      avatarRing: 'ring-3 ring-purple-400 ring-offset-2 ring-offset-purple-950',
      avatarAnimation: 'hover:scale-110 hover:rotate-3 transition-all duration-500',
      nameClass: 'text-purple-300 drop-shadow-[0_0_15px_rgba(147,51,234,0.7)]',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500/60 via-fuchsia-400/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-violet-400/40 to-purple-500/60"></div>
          <div className="absolute bottom-3 left-3 text-3xl text-purple-400/30">🦈</div>
          <div className="absolute top-3 right-3 text-2xl text-violet-400/25">♠</div>
          {/* Scanning line effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-400/5 to-transparent animate-[scan_3s_linear_infinite]"></div>
        </div>
      ),
      particleEffect: 'lightning'
    },
    
    // Капо - глава группировки, красный властный стиль
    kapo: {
      bgPattern: 'bg-gradient-to-br from-red-900/80 via-rose-800/60 to-zinc-900',
      bgOverlay: 'bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.25),transparent_60%)]',
      avatarGlow: 'shadow-2xl shadow-red-500/70 animate-[glow_2s_ease-in-out_infinite]',
      avatarRing: 'ring-4 ring-red-500 ring-offset-2 ring-offset-red-950',
      avatarAnimation: 'hover:scale-110 transition-all duration-500',
      nameClass: 'text-red-300 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] font-bold',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600/70 via-rose-500/50 to-red-600/70"></div>
          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-red-600/70 via-rose-500/50 to-red-600/70"></div>
          <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-red-600/70 via-rose-500/50 to-red-600/70"></div>
          <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-red-600/70 via-rose-500/50 to-red-600/70"></div>
          <div className="absolute bottom-4 left-4 text-4xl text-red-500/30">♠</div>
          <div className="absolute top-4 right-4 text-3xl text-rose-500/25">👑</div>
        </div>
      ),
      particleEffect: 'fire'
    },
    
    // Консильери - правая рука Дона, золотой престижный стиль
    konsigliere: {
      bgPattern: 'bg-gradient-to-br from-yellow-800/70 via-amber-700/50 to-zinc-900',
      bgOverlay: 'bg-[conic-gradient(from_0deg_at_50%_50%,rgba(234,179,8,0.15),transparent,rgba(251,191,36,0.15),transparent,rgba(234,179,8,0.15))]',
      avatarGlow: 'shadow-[0_0_40px_rgba(234,179,8,0.6)]',
      avatarRing: 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-amber-950 animate-[pulse_2s_ease-in-out_infinite]',
      avatarAnimation: 'hover:scale-110 hover:-rotate-3 transition-all duration-500',
      nameClass: 'text-yellow-300 drop-shadow-[0_0_25px_rgba(234,179,8,0.9)] font-bold tracking-wider',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(234,179,8,0.03)_10px,rgba(234,179,8,0.03)_20px)]"></div>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500/80 via-amber-400/60 to-yellow-500/80"></div>
          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500/80 via-amber-400/60 to-yellow-500/80"></div>
          <div className="absolute bottom-4 left-4 text-4xl text-yellow-400/35">⚜</div>
          <div className="absolute top-4 right-4 text-3xl text-amber-400/30">👁</div>
          <div className="absolute top-1/2 left-2 -translate-y-1/2 text-2xl text-yellow-500/20">★</div>
          <div className="absolute top-1/2 right-2 -translate-y-1/2 text-2xl text-yellow-500/20">★</div>
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // Дон - глава семьи, розово-красный королевский стиль
    don: {
      bgPattern: 'bg-gradient-to-br from-rose-900/90 via-red-800/70 to-zinc-900',
      bgOverlay: 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.3),transparent_70%)]',
      avatarGlow: 'shadow-[0_0_60px_rgba(244,63,94,0.7)] animate-[glow_3s_ease-in-out_infinite]',
      avatarRing: 'ring-4 ring-rose-400 ring-offset-4 ring-offset-rose-950',
      avatarAnimation: 'hover:scale-115 transition-all duration-700',
      nameClass: 'text-rose-200 drop-shadow-[0_0_30px_rgba(244,63,94,1)] font-bold tracking-widest text-2xl',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_15px,rgba(244,63,94,0.05)_15px,rgba(244,63,94,0.05)_30px)]"></div>
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/25 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]"></div>
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-rose-600 via-red-400 to-rose-600"></div>
          <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-rose-600 via-red-400 to-rose-600"></div>
          <div className="absolute left-0 top-0 w-3 h-full bg-gradient-to-b from-rose-600 via-red-400 to-rose-600"></div>
          <div className="absolute right-0 top-0 w-3 h-full bg-gradient-to-b from-rose-600 via-red-400 to-rose-600"></div>
          <div className="absolute bottom-5 left-5 text-5xl text-rose-400/40">♛</div>
          <div className="absolute top-5 right-5 text-4xl text-red-400/35">🏛</div>
          <div className="absolute top-1/2 left-4 -translate-y-1/2 text-3xl text-rose-500/25">⚔</div>
          <div className="absolute top-1/2 right-4 -translate-y-1/2 text-3xl text-rose-500/25">⚔</div>
        </div>
      ),
      particleEffect: 'fire'
    },
    
    // Патриарх - крёстный отец, божественный радужный стиль
    patriarch: {
      bgPattern: 'bg-gradient-to-br from-cyan-900/90 via-blue-800/70 via-purple-800/70 to-zinc-900',
      bgOverlay: 'bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,211,238,0.2),rgba(147,51,234,0.2),rgba(236,72,153,0.2),rgba(34,211,238,0.2))]',
      avatarGlow: 'shadow-[0_0_80px_rgba(34,211,238,0.8),0_0_40px_rgba(147,51,234,0.6)] animate-[rainbow-glow_4s_ease-in-out_infinite]',
      avatarRing: 'ring-4 ring-cyan-300 ring-offset-4 ring-offset-purple-950 animate-[spin_10s_linear_infinite]',
      avatarAnimation: 'hover:scale-120 transition-all duration-700',
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_0_40px_rgba(34,211,238,1)] font-black tracking-[0.2em] text-2xl animate-[shimmer_3s_linear_infinite]',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          {/* Diamond pattern */}
          <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,transparent_0deg_90deg,rgba(34,211,238,0.03)_90deg_180deg)]"></div>
          {/* Massive central glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-radial from-cyan-400/30 via-purple-500/20 to-transparent rounded-full blur-3xl animate-[pulse_5s_ease-in-out_infinite]"></div>
          {/* Prismatic borders */}
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-[shimmer_2s_linear_infinite]"></div>
          <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-[shimmer_2s_linear_infinite_reverse]"></div>
          <div className="absolute left-0 top-0 w-4 h-full bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500"></div>
          <div className="absolute right-0 top-0 w-4 h-full bg-gradient-to-b from-pink-500 via-purple-500 to-cyan-500"></div>
          {/* Corner decorations */}
          <div className="absolute top-6 left-6 text-4xl text-cyan-300/50 animate-pulse">💎</div>
          <div className="absolute top-6 right-6 text-4xl text-purple-300/50 animate-pulse" style={{ animationDelay: '0.5s' }}>👁</div>
          <div className="absolute bottom-6 left-6 text-5xl text-cyan-400/40">⚜</div>
          <div className="absolute bottom-6 right-6 text-5xl text-purple-400/40">♛</div>
          {/* Floating particles */}
          <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-cyan-400/60 animate-[float_3s_ease-in-out_infinite]"></div>
          <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-purple-400/60 animate-[float_3s_ease-in-out_infinite_0.5s]"></div>
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-pink-400/60 animate-[float_3s_ease-in-out_infinite_1s]"></div>
        </div>
      ),
      particleEffect: 'royal'
    }
  };
  
  return styles[rankId] || styles.outsider;
}

// CSS animations to add to index.css
export const rankAnimations = `
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px currentColor; }
  50% { box-shadow: 0 0 40px currentColor, 0 0 60px currentColor; }
}

@keyframes rainbow-glow {
  0% { box-shadow: 0 0 60px rgba(34,211,238,0.8), 0 0 30px rgba(147,51,234,0.6); }
  33% { box-shadow: 0 0 60px rgba(147,51,234,0.8), 0 0 30px rgba(236,72,153,0.6); }
  66% { box-shadow: 0 0 60px rgba(236,72,153,0.8), 0 0 30px rgba(34,211,238,0.6); }
  100% { box-shadow: 0 0 60px rgba(34,211,238,0.8), 0 0 30px rgba(147,51,234,0.6); }
}

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
`;
