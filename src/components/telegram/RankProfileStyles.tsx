// Unique profile header styles for each mafia rank - Industrial Premium Design
import { MafiaRank } from "@/utils/mafiaRanks";

interface RankProfileStyle {
  bgPattern: string;
  bgOverlay: string;
  avatarGlow: string;
  avatarRing: string;
  avatarAnimation: string;
  decorations: React.ReactNode;
  nameClass: string;
  particleEffect?: 'none' | 'sparkle' | 'smoke' | 'fire' | 'lightning' | 'royal';
}

// Металлическая сетка SVG
const MetalGrid = ({ opacity = 0.1, color = "#fff" }: { opacity?: number; color?: string }) => (
  <svg className="absolute inset-0 w-full h-full" style={{ opacity }}>
    <defs>
      <pattern id="metal-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke={color} strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#metal-grid)" />
  </svg>
);

// Индустриальные линии
const IndustrialLines = ({ color = "#fff", variant = 1 }: { color?: string; variant?: number }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {variant === 1 && (
      <>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
      </>
    )}
    {variant === 2 && (
      <>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}60, ${color}20, ${color}60)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}60, ${color}20, ${color}60)` }} />
        <div className="absolute top-0 bottom-0 left-0 w-0.5" style={{ background: `linear-gradient(180deg, ${color}60, ${color}10, ${color}60)` }} />
        <div className="absolute top-0 bottom-0 right-0 w-0.5" style={{ background: `linear-gradient(180deg, ${color}60, ${color}10, ${color}60)` }} />
      </>
    )}
    {variant === 3 && (
      <>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}80, ${color}30, ${color}80)` }} />
        <div className="absolute top-1 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}80, ${color}30, ${color}80)` }} />
        <div className="absolute bottom-1 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      </>
    )}
  </div>
);

// Угловые акценты
const CornerAccents = ({ size = 12, thickness = 2, color = "#fff", opacity = 0.5 }: { size?: number; thickness?: number; color?: string; opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none" style={{ opacity }}>
    {/* Top Left */}
    <div className="absolute top-3 left-3" style={{ width: size, height: size }}>
      <div className="absolute top-0 left-0 w-full" style={{ height: thickness, background: color }} />
      <div className="absolute top-0 left-0 h-full" style={{ width: thickness, background: color }} />
    </div>
    {/* Top Right */}
    <div className="absolute top-3 right-3" style={{ width: size, height: size }}>
      <div className="absolute top-0 right-0 w-full" style={{ height: thickness, background: color }} />
      <div className="absolute top-0 right-0 h-full" style={{ width: thickness, background: color }} />
    </div>
    {/* Bottom Left */}
    <div className="absolute bottom-3 left-3" style={{ width: size, height: size }}>
      <div className="absolute bottom-0 left-0 w-full" style={{ height: thickness, background: color }} />
      <div className="absolute bottom-0 left-0 h-full" style={{ width: thickness, background: color }} />
    </div>
    {/* Bottom Right */}
    <div className="absolute bottom-3 right-3" style={{ width: size, height: size }}>
      <div className="absolute bottom-0 right-0 w-full" style={{ height: thickness, background: color }} />
      <div className="absolute bottom-0 right-0 h-full" style={{ width: thickness, background: color }} />
    </div>
  </div>
);

// Сканирующая линия
const ScanLine = ({ color = "#fff", speed = 4 }: { color?: string; speed?: number }) => (
  <div 
    className="absolute inset-0 pointer-events-none overflow-hidden"
    style={{
      background: `linear-gradient(180deg, transparent 0%, ${color}08 50%, transparent 100%)`,
      animation: `rank-scan ${speed}s linear infinite`
    }}
  />
);

// Голографический эффект
const HolographicOverlay = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div 
      className="absolute inset-0 opacity-20"
      style={{
        background: 'linear-gradient(135deg, rgba(34,211,238,0.3) 0%, rgba(147,51,234,0.3) 25%, rgba(236,72,153,0.3) 50%, rgba(251,191,36,0.3) 75%, rgba(34,211,238,0.3) 100%)',
        backgroundSize: '400% 400%',
        animation: 'holographic 8s ease infinite'
      }}
    />
  </div>
);

// Noise текстура
const NoiseTexture = ({ opacity = 0.05 }: { opacity?: number }) => (
  <div 
    className="absolute inset-0 pointer-events-none"
    style={{
      opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      mixBlendMode: 'overlay'
    }}
  />
);

export function getRankProfileStyle(rank: MafiaRank | null): RankProfileStyle {
  const rankId = rank?.id || 'outsider';
  
  const styles: Record<string, RankProfileStyle> = {
    // 1. Аутсайдер - суровый минимализм
    outsider: {
      bgPattern: 'bg-gradient-to-b from-zinc-900 via-zinc-850 to-zinc-900',
      bgOverlay: '',
      avatarGlow: 'shadow-lg shadow-black/50',
      avatarRing: 'ring-2 ring-zinc-700',
      avatarAnimation: '',
      nameClass: 'text-zinc-500 font-medium',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.03} color="#71717a" />
          <div className="absolute top-3 right-3 w-6 h-px bg-zinc-700" />
          <div className="absolute top-3 right-3 h-6 w-px bg-zinc-700" />
        </div>
      ),
      particleEffect: 'none'
    },
    
    // 2. Пиччотто - первые шаги, стальной
    picciotto: {
      bgPattern: 'bg-gradient-to-br from-zinc-800 via-neutral-800 to-zinc-900',
      bgOverlay: 'bg-[radial-gradient(circle_at_50%_0%,rgba(161,161,170,0.08),transparent_60%)]',
      avatarGlow: 'shadow-xl shadow-zinc-700/50',
      avatarRing: 'ring-2 ring-zinc-500/80',
      avatarAnimation: 'transition-transform duration-300 hover:scale-105',
      nameClass: 'text-zinc-400 font-medium',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.04} color="#a1a1aa" />
          <NoiseTexture opacity={0.03} />
          <CornerAccents size={10} thickness={1} color="#71717a" opacity={0.5} />
          <IndustrialLines color="#71717a" variant={1} />
        </div>
      ),
      particleEffect: 'none'
    },
    
    // 3. Солдато - боец, бронзовый металл
    soldato: {
      bgPattern: 'bg-gradient-to-br from-stone-800 via-neutral-800 to-stone-900',
      bgOverlay: 'bg-[radial-gradient(ellipse_at_30%_20%,rgba(168,162,158,0.12),transparent_50%)]',
      avatarGlow: 'shadow-xl shadow-stone-600/60',
      avatarRing: 'ring-2 ring-stone-500',
      avatarAnimation: 'transition-all duration-300 hover:scale-105',
      nameClass: 'text-stone-400 font-semibold',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.05} color="#a8a29e" />
          <NoiseTexture opacity={0.04} />
          <CornerAccents size={14} thickness={2} color="#78716c" opacity={0.6} />
          <IndustrialLines color="#78716c" variant={1} />
          {/* Вертикальные боковые линии */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 w-0.5 h-8 bg-gradient-to-b from-transparent via-stone-500/30 to-transparent" />
          <div className="absolute top-1/2 right-4 -translate-y-1/2 w-0.5 h-8 bg-gradient-to-b from-transparent via-stone-500/30 to-transparent" />
        </div>
      ),
      particleEffect: 'smoke'
    },
    
    // 4. Сгарриста - первое золото
    sgarrista: {
      bgPattern: 'bg-gradient-to-br from-amber-950 via-stone-900 to-zinc-900',
      bgOverlay: 'bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.15),transparent_50%)]',
      avatarGlow: 'shadow-[0_0_25px_rgba(251,191,36,0.4)]',
      avatarRing: 'ring-2 ring-amber-500/80',
      avatarAnimation: 'transition-all duration-300 hover:scale-105',
      nameClass: 'text-amber-400 font-semibold drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.04} color="#fbbf24" />
          <NoiseTexture opacity={0.04} />
          <CornerAccents size={16} thickness={2} color="#f59e0b" opacity={0.6} />
          <IndustrialLines color="#f59e0b" variant={1} />
          {/* Золотое свечение сверху */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-16 bg-amber-500/10 rounded-full blur-2xl" />
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // 5. Ассоциато - оранжевый неон Syndikate
    associato: {
      bgPattern: 'bg-gradient-to-br from-orange-950 via-zinc-900 to-zinc-950',
      bgOverlay: 'bg-[radial-gradient(circle_at_70%_30%,rgba(249,115,22,0.2),transparent_50%)]',
      avatarGlow: 'shadow-[0_0_30px_rgba(249,115,22,0.5)]',
      avatarRing: 'ring-2 ring-orange-500',
      avatarAnimation: 'transition-all duration-300 hover:scale-105',
      nameClass: 'text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.05} color="#f97316" />
          <NoiseTexture opacity={0.05} />
          <CornerAccents size={18} thickness={2} color="#ea580c" opacity={0.7} />
          <IndustrialLines color="#ea580c" variant={2} />
          <ScanLine color="#f97316" speed={5} />
          {/* Свечения */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-40 h-20 bg-orange-500/15 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-600/10 rounded-full blur-xl" />
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // 6. Капореджиме - элитный синий
    caporegime: {
      bgPattern: 'bg-gradient-to-br from-blue-950 via-slate-900 to-zinc-950',
      bgOverlay: 'bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_60%)]',
      avatarGlow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]',
      avatarRing: 'ring-[3px] ring-blue-500 animate-pulse',
      avatarAnimation: 'transition-all duration-500 hover:scale-110',
      nameClass: 'text-blue-400 font-bold drop-shadow-[0_0_10px_rgba(59,130,246,0.7)] tracking-wide',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.06} color="#3b82f6" />
          <NoiseTexture opacity={0.04} />
          <CornerAccents size={20} thickness={2} color="#2563eb" opacity={0.8} />
          <IndustrialLines color="#2563eb" variant={2} />
          <ScanLine color="#3b82f6" speed={4} />
          {/* Двойные угловые рамки */}
          <div className="absolute top-5 left-5 w-4 h-4 border-l border-t border-cyan-400/40" />
          <div className="absolute top-5 right-5 w-4 h-4 border-r border-t border-cyan-400/40" />
          <div className="absolute bottom-5 left-5 w-4 h-4 border-l border-b border-cyan-400/40" />
          <div className="absolute bottom-5 right-5 w-4 h-4 border-r border-b border-cyan-400/40" />
          {/* Свечения */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-24 bg-blue-500/15 rounded-full blur-3xl" />
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // 7. Шарк - хищный фиолетовый
    shark: {
      bgPattern: 'bg-gradient-to-br from-purple-950 via-violet-950 to-zinc-950',
      bgOverlay: 'bg-[radial-gradient(circle_at_30%_70%,rgba(147,51,234,0.25),transparent_50%),radial-gradient(circle_at_70%_30%,rgba(139,92,246,0.2),transparent_50%)]',
      avatarGlow: 'shadow-[0_0_40px_rgba(147,51,234,0.6)]',
      avatarRing: 'ring-[3px] ring-purple-500 ring-offset-2 ring-offset-purple-950',
      avatarAnimation: 'transition-all duration-500 hover:scale-110 hover:rotate-2',
      nameClass: 'text-purple-400 font-bold drop-shadow-[0_0_12px_rgba(147,51,234,0.8)] tracking-wide',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.05} color="#a855f7" />
          <NoiseTexture opacity={0.05} />
          <CornerAccents size={22} thickness={2} color="#9333ea" opacity={0.8} />
          <IndustrialLines color="#9333ea" variant={2} />
          <ScanLine color="#a855f7" speed={3} />
          {/* Динамические акценты */}
          <div className="absolute top-1/2 left-5 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-fuchsia-500/50 to-transparent" />
          <div className="absolute top-1/2 right-5 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-fuchsia-500/50 to-transparent" />
          {/* Свечения */}
          <div className="absolute -top-8 left-1/4 w-32 h-32 bg-purple-500/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-4 right-1/4 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
        </div>
      ),
      particleEffect: 'lightning'
    },
    
    // 8. Капо - властный красный
    kapo: {
      bgPattern: 'bg-gradient-to-br from-red-950 via-rose-950 to-zinc-950',
      bgOverlay: 'bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.3),transparent_60%)]',
      avatarGlow: 'shadow-[0_0_45px_rgba(239,68,68,0.6)] animate-[glow_2s_ease-in-out_infinite]',
      avatarRing: 'ring-[3px] ring-red-500 ring-offset-2 ring-offset-red-950',
      avatarAnimation: 'transition-all duration-500 hover:scale-110',
      nameClass: 'text-red-400 font-bold drop-shadow-[0_0_15px_rgba(239,68,68,0.9)] tracking-wider',
      decorations: (
        <div className="absolute inset-0">
          <MetalGrid opacity={0.05} color="#ef4444" />
          <NoiseTexture opacity={0.05} />
          <IndustrialLines color="#dc2626" variant={3} />
          <ScanLine color="#ef4444" speed={3} />
          {/* Внутренняя рамка */}
          <div className="absolute inset-4 border border-red-800/30 pointer-events-none" />
          {/* Угловые акценты с градиентом */}
          <div className="absolute top-2 left-2 w-8 h-8">
            <div className="w-full h-0.5 bg-gradient-to-r from-red-500 to-transparent" />
            <div className="h-full w-0.5 bg-gradient-to-b from-red-500 to-transparent" />
          </div>
          <div className="absolute top-2 right-2 w-8 h-8">
            <div className="w-full h-0.5 bg-gradient-to-l from-red-500 to-transparent" />
            <div className="absolute right-0 h-full w-0.5 bg-gradient-to-b from-red-500 to-transparent" />
          </div>
          <div className="absolute bottom-2 left-2 w-8 h-8">
            <div className="absolute bottom-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-transparent" />
            <div className="h-full w-0.5 bg-gradient-to-t from-red-500 to-transparent" />
          </div>
          <div className="absolute bottom-2 right-2 w-8 h-8">
            <div className="absolute bottom-0 w-full h-0.5 bg-gradient-to-l from-red-500 to-transparent" />
            <div className="absolute right-0 h-full w-0.5 bg-gradient-to-t from-red-500 to-transparent" />
          </div>
          {/* Центральное свечение */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-red-500/20 rounded-full blur-3xl" />
        </div>
      ),
      particleEffect: 'fire'
    },
    
    // 9. Консильери - престижное золото
    konsigliere: {
      bgPattern: 'bg-gradient-to-br from-yellow-950 via-amber-950 to-zinc-950',
      bgOverlay: 'bg-[conic-gradient(from_0deg_at_50%_50%,rgba(234,179,8,0.15),transparent,rgba(251,191,36,0.15),transparent,rgba(234,179,8,0.15))]',
      avatarGlow: 'shadow-[0_0_50px_rgba(234,179,8,0.6)]',
      avatarRing: 'ring-[3px] ring-yellow-500 ring-offset-2 ring-offset-yellow-950 animate-[pulse_2s_ease-in-out_infinite]',
      avatarAnimation: 'transition-all duration-500 hover:scale-110 hover:-rotate-2',
      nameClass: 'text-yellow-400 font-bold drop-shadow-[0_0_18px_rgba(234,179,8,1)] tracking-wider',
      decorations: (
        <div className="absolute inset-0">
          {/* Диагональный паттерн */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(234,179,8,0.03)_8px,rgba(234,179,8,0.03)_16px)]" />
          <MetalGrid opacity={0.04} color="#eab308" />
          <NoiseTexture opacity={0.04} />
          <IndustrialLines color="#ca8a04" variant={3} />
          <ScanLine color="#eab308" speed={4} />
          {/* Двойная рамка */}
          <div className="absolute inset-3 border border-yellow-700/30 pointer-events-none" />
          <div className="absolute inset-5 border border-yellow-800/20 pointer-events-none" />
          {/* Угловые элементы */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-yellow-500/70" />
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-yellow-500/70" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-yellow-500/70" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-yellow-500/70" />
          {/* Свечение */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-32 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
      ),
      particleEffect: 'sparkle'
    },
    
    // 10. Дон - королевский голографик
    don: {
      bgPattern: 'bg-gradient-to-br from-rose-950 via-fuchsia-950 to-violet-950',
      bgOverlay: 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.3),transparent_60%)]',
      avatarGlow: 'shadow-[0_0_60px_rgba(244,63,94,0.7),0_0_100px_rgba(147,51,234,0.4)] animate-[rainbow-glow_4s_ease-in-out_infinite]',
      avatarRing: 'ring-4 ring-rose-400 ring-offset-4 ring-offset-fuchsia-950',
      avatarAnimation: 'transition-all duration-700 hover:scale-115',
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-fuchsia-300 to-cyan-300 font-black drop-shadow-[0_0_25px_rgba(244,63,94,1)] tracking-widest text-xl animate-shimmer',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          {/* Голографический оверлей */}
          <HolographicOverlay />
          {/* Диагональный паттерн */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(244,63,94,0.03)_6px,rgba(244,63,94,0.03)_12px)]" />
          <MetalGrid opacity={0.04} color="#f43f5e" />
          <NoiseTexture opacity={0.05} />
          <ScanLine color="#f43f5e" speed={3} />
          {/* Премиум рамка */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-fuchsia-400 to-cyan-400 animate-border-flow" />
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-500 animate-border-flow" />
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-rose-500 via-fuchsia-400 to-cyan-400 animate-border-flow" />
          <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-gradient-to-b from-cyan-400 via-fuchsia-400 to-rose-500 animate-border-flow" />
          {/* Внутренняя рамка */}
          <div className="absolute inset-4 border border-rose-500/30 pointer-events-none" />
          {/* Угловые акценты */}
          <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-cyan-400/60" />
          <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-fuchsia-400/60" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-fuchsia-400/60" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-cyan-400/60" />
          {/* Множественные свечения */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-40 bg-rose-500/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-4 left-1/4 w-32 h-32 bg-fuchsia-500/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 right-1/4 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl" />
        </div>
      ),
      particleEffect: 'royal'
    }
  };
  
  return styles[rankId] || styles.outsider;
}

// Card styles for small rating cards
interface RankCardStyle {
  cardBg: string;
  border: string;
  decorations: React.ReactNode;
  hoverOverlay: string;
  rankBadgeBg: string;
  rankText: string;
  avatarGlow: string;
  avatarRing: string;
  avatarFallback: string;
  nameClass: string;
  currentUserBadge: string;
  ratingText: string;
  statsBorder: string;
  statsBg: string;
  iconColor: string;
}

export function getRankCardStyle(rank: MafiaRank | null): RankCardStyle {
  const rankId = rank?.id || 'outsider';
  
  const styles: Record<string, RankCardStyle> = {
    outsider: {
      cardBg: 'bg-gradient-to-br from-zinc-900 to-zinc-950',
      border: 'border border-zinc-700/50',
      decorations: <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(113,113,122,0.1),transparent_50%)]" />,
      hoverOverlay: 'bg-gradient-to-r from-zinc-500/10 to-transparent',
      rankBadgeBg: 'bg-zinc-800/50 border border-zinc-700/50',
      rankText: 'text-zinc-500',
      avatarGlow: '',
      avatarRing: 'ring-2 ring-zinc-700',
      avatarFallback: 'bg-zinc-800 text-zinc-400',
      nameClass: 'text-zinc-400 group-hover:text-zinc-300',
      currentUserBadge: 'bg-zinc-700/50 text-zinc-300',
      ratingText: 'text-zinc-400',
      statsBorder: 'border-zinc-800/50',
      statsBg: 'bg-zinc-800/30 group-hover:bg-zinc-700/30',
      iconColor: 'text-zinc-500'
    },
    picciotto: {
      cardBg: 'bg-gradient-to-br from-zinc-800 to-neutral-900',
      border: 'border border-zinc-600/50',
      decorations: <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(161,161,170,0.15),transparent_50%)]" />,
      hoverOverlay: 'bg-gradient-to-r from-zinc-400/10 to-transparent',
      rankBadgeBg: 'bg-zinc-700/50 border border-zinc-600/50',
      rankText: 'text-zinc-400',
      avatarGlow: '',
      avatarRing: 'ring-2 ring-zinc-500',
      avatarFallback: 'bg-zinc-700 text-zinc-300',
      nameClass: 'text-zinc-300 group-hover:text-zinc-200',
      currentUserBadge: 'bg-zinc-600/50 text-zinc-200',
      ratingText: 'text-zinc-300',
      statsBorder: 'border-zinc-700/50',
      statsBg: 'bg-zinc-700/30 group-hover:bg-zinc-600/30',
      iconColor: 'text-zinc-400'
    },
    soldato: {
      cardBg: 'bg-gradient-to-br from-stone-800 to-neutral-900',
      border: 'border border-stone-600/50',
      decorations: <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(168,162,158,0.15),transparent_50%)]" />,
      hoverOverlay: 'bg-gradient-to-r from-stone-400/10 to-transparent',
      rankBadgeBg: 'bg-stone-700/50 border border-stone-600/50',
      rankText: 'text-stone-400',
      avatarGlow: 'drop-shadow-[0_0_6px_rgba(168,162,158,0.3)]',
      avatarRing: 'ring-2 ring-stone-500',
      avatarFallback: 'bg-stone-700 text-stone-300',
      nameClass: 'text-stone-300 group-hover:text-stone-200',
      currentUserBadge: 'bg-stone-600/50 text-stone-200',
      ratingText: 'text-stone-300',
      statsBorder: 'border-stone-700/50',
      statsBg: 'bg-stone-700/30 group-hover:bg-stone-600/30',
      iconColor: 'text-stone-400'
    },
    sgarrista: {
      cardBg: 'bg-gradient-to-br from-amber-950 to-zinc-900',
      border: 'border border-amber-600/40',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.2),transparent_50%)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-amber-500/15 to-transparent',
      rankBadgeBg: 'bg-amber-900/50 border border-amber-600/50',
      rankText: 'text-amber-400',
      avatarGlow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]',
      avatarRing: 'ring-2 ring-amber-500/80',
      avatarFallback: 'bg-amber-900/50 text-amber-400',
      nameClass: 'text-amber-300 group-hover:text-amber-200',
      currentUserBadge: 'bg-amber-600/40 text-amber-200',
      ratingText: 'text-amber-400',
      statsBorder: 'border-amber-800/40',
      statsBg: 'bg-amber-900/30 group-hover:bg-amber-800/30',
      iconColor: 'text-amber-400'
    },
    associato: {
      cardBg: 'bg-gradient-to-br from-orange-950 to-zinc-900',
      border: 'border border-orange-500/50',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_70%_30%,rgba(249,115,22,0.25),transparent_50%)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-orange-500/15 to-transparent',
      rankBadgeBg: 'bg-orange-900/50 border border-orange-500/50',
      rankText: 'text-orange-400',
      avatarGlow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]',
      avatarRing: 'ring-2 ring-orange-500',
      avatarFallback: 'bg-orange-900/50 text-orange-400',
      nameClass: 'text-orange-300 group-hover:text-orange-200',
      currentUserBadge: 'bg-orange-600/40 text-orange-200',
      ratingText: 'text-orange-400',
      statsBorder: 'border-orange-800/40',
      statsBg: 'bg-orange-900/30 group-hover:bg-orange-800/30',
      iconColor: 'text-orange-400'
    },
    caporegime: {
      cardBg: 'bg-gradient-to-br from-blue-950 to-slate-900',
      border: 'border border-blue-500/50',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.3),transparent_60%)]" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-blue-500/15 to-transparent',
      rankBadgeBg: 'bg-blue-900/50 border border-blue-500/50',
      rankText: 'text-blue-400',
      avatarGlow: 'drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]',
      avatarRing: 'ring-2 ring-blue-500',
      avatarFallback: 'bg-blue-900/50 text-blue-400',
      nameClass: 'text-blue-300 group-hover:text-blue-200',
      currentUserBadge: 'bg-blue-600/40 text-blue-200',
      ratingText: 'text-blue-400',
      statsBorder: 'border-blue-800/40',
      statsBg: 'bg-blue-900/30 group-hover:bg-blue-800/30',
      iconColor: 'text-blue-400'
    },
    shark: {
      cardBg: 'bg-gradient-to-br from-purple-950 to-violet-950',
      border: 'border border-purple-500/50',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_70%,rgba(147,51,234,0.3),transparent_50%)]" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/60 via-fuchsia-500/60 to-purple-500/60" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/40 via-fuchsia-500/40 to-purple-500/40" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-purple-500/15 to-fuchsia-500/10',
      rankBadgeBg: 'bg-purple-900/50 border border-purple-500/50',
      rankText: 'text-purple-400',
      avatarGlow: 'drop-shadow-[0_0_14px_rgba(147,51,234,0.6)]',
      avatarRing: 'ring-2 ring-purple-500',
      avatarFallback: 'bg-purple-900/50 text-purple-400',
      nameClass: 'text-purple-300 group-hover:text-purple-200',
      currentUserBadge: 'bg-purple-600/40 text-purple-200',
      ratingText: 'text-purple-400',
      statsBorder: 'border-purple-800/40',
      statsBg: 'bg-purple-900/30 group-hover:bg-purple-800/30',
      iconColor: 'text-purple-400'
    },
    kapo: {
      cardBg: 'bg-gradient-to-br from-red-950 to-rose-950',
      border: 'border border-red-500/50',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.35),transparent_60%)]" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-red-500/15 to-transparent',
      rankBadgeBg: 'bg-red-900/50 border border-red-500/50',
      rankText: 'text-red-400',
      avatarGlow: 'drop-shadow-[0_0_16px_rgba(239,68,68,0.6)]',
      avatarRing: 'ring-2 ring-red-500',
      avatarFallback: 'bg-red-900/50 text-red-400',
      nameClass: 'text-red-300 group-hover:text-red-200',
      currentUserBadge: 'bg-red-600/40 text-red-200',
      ratingText: 'text-red-400',
      statsBorder: 'border-red-800/40',
      statsBg: 'bg-red-900/30 group-hover:bg-red-800/30',
      iconColor: 'text-red-400'
    },
    konsigliere: {
      cardBg: 'bg-gradient-to-br from-yellow-950 to-amber-950',
      border: 'border border-yellow-500/50',
      decorations: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(234,179,8,0.2),transparent,rgba(251,191,36,0.2),transparent,rgba(234,179,8,0.2))]" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500/70 via-amber-400/70 to-yellow-500/70" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500/50 via-amber-400/50 to-yellow-500/50" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-yellow-500/15 to-amber-500/10',
      rankBadgeBg: 'bg-yellow-900/50 border border-yellow-500/50',
      rankText: 'text-yellow-400',
      avatarGlow: 'drop-shadow-[0_0_18px_rgba(234,179,8,0.6)]',
      avatarRing: 'ring-2 ring-yellow-500',
      avatarFallback: 'bg-yellow-900/50 text-yellow-400',
      nameClass: 'text-yellow-300 group-hover:text-yellow-200',
      currentUserBadge: 'bg-yellow-600/40 text-yellow-200',
      ratingText: 'text-yellow-400',
      statsBorder: 'border-yellow-800/40',
      statsBg: 'bg-yellow-900/30 group-hover:bg-yellow-800/30',
      iconColor: 'text-yellow-400'
    },
    don: {
      cardBg: 'bg-gradient-to-br from-rose-950 via-fuchsia-950 to-violet-950',
      border: 'border border-rose-400/50',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.3),transparent_60%)]" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/80 via-fuchsia-400/80 to-cyan-400/80" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400/60 via-fuchsia-400/60 to-rose-500/60" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-rose-500/15 via-fuchsia-500/10 to-cyan-500/10',
      rankBadgeBg: 'bg-rose-900/50 border border-rose-400/50',
      rankText: 'text-rose-400',
      avatarGlow: 'drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]',
      avatarRing: 'ring-2 ring-rose-400',
      avatarFallback: 'bg-rose-900/50 text-rose-400',
      nameClass: 'text-rose-300 group-hover:text-rose-200',
      currentUserBadge: 'bg-rose-600/40 text-rose-200',
      ratingText: 'text-rose-400',
      statsBorder: 'border-rose-800/40',
      statsBg: 'bg-rose-900/30 group-hover:bg-rose-800/30',
      iconColor: 'text-rose-400'
    },
    patriarch: {
      cardBg: 'bg-gradient-to-br from-cyan-950 via-blue-950 to-purple-950',
      border: 'border border-cyan-400/60',
      decorations: (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(135deg,rgba(34,211,238,0.2)_0%,rgba(147,51,234,0.2)_50%,rgba(236,72,153,0.2)_100%)]" />
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse" />
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 animate-pulse" />
        </div>
      ),
      hoverOverlay: 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/20',
      rankBadgeBg: 'bg-cyan-900/50 border border-cyan-400/60',
      rankText: 'text-cyan-300',
      avatarGlow: 'drop-shadow-[0_0_25px_rgba(34,211,238,0.7)]',
      avatarRing: 'ring-2 ring-cyan-400',
      avatarFallback: 'bg-gradient-to-br from-cyan-900/50 to-purple-900/50 text-cyan-300',
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 group-hover:from-cyan-200 group-hover:to-purple-200',
      currentUserBadge: 'bg-gradient-to-r from-cyan-600/50 to-purple-600/50 text-cyan-200',
      ratingText: 'text-cyan-300',
      statsBorder: 'border-cyan-800/40',
      statsBg: 'bg-cyan-900/30 group-hover:bg-cyan-800/30',
      iconColor: 'text-cyan-400'
    }
  };
  
  return styles[rankId] || styles.outsider;
}
