import React from 'react';

interface EmblemProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  className?: string;
}

// Королевский Лев - Премиальный герб
export const RoyalLionEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#FFD700', 
  secondaryColor = '#8B0000',
  accentColor = '#FFFFFF',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="lionBg" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#2a1810" />
        <stop offset="100%" stopColor="#0d0705" />
      </radialGradient>
      <linearGradient id="lionGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF8DC" />
        <stop offset="30%" stopColor={primaryColor} />
        <stop offset="70%" stopColor="#B8860B" />
        <stop offset="100%" stopColor="#8B6914" />
      </linearGradient>
      <linearGradient id="lionMane" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#CD853F" />
        <stop offset="50%" stopColor="#8B4513" />
        <stop offset="100%" stopColor="#5C3317" />
      </linearGradient>
      <filter id="lionGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
      <filter id="innerShadow">
        <feOffset dx="0" dy="2"/>
        <feGaussianBlur stdDeviation="2" result="shadow"/>
        <feComposite in="SourceGraphic" in2="shadow" operator="over"/>
      </filter>
    </defs>
    
    {/* Основа - щит */}
    <path d="M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z" 
          fill="url(#lionBg)" stroke="url(#lionGold)" strokeWidth="3"/>
    
    {/* Декоративная рамка */}
    <path d="M50 12 L82 24 L82 54 Q82 74 50 87 Q18 74 18 54 L18 24 Z" 
          fill="none" stroke={primaryColor} strokeWidth="1" opacity="0.5"/>
    
    {/* Грива льва */}
    <ellipse cx="50" cy="48" rx="28" ry="30" fill="url(#lionMane)" filter="url(#innerShadow)"/>
    
    {/* Детали гривы - волны */}
    <path d="M25 35 Q30 25 40 30 Q35 40 30 45" fill="#CD853F" opacity="0.8"/>
    <path d="M75 35 Q70 25 60 30 Q65 40 70 45" fill="#CD853F" opacity="0.8"/>
    <path d="M22 50 Q27 45 32 52" fill="#A0522D" opacity="0.6"/>
    <path d="M78 50 Q73 45 68 52" fill="#A0522D" opacity="0.6"/>
    
    {/* Морда льва */}
    <ellipse cx="50" cy="52" rx="16" ry="18" fill="#DEB887"/>
    <ellipse cx="50" cy="55" rx="14" ry="14" fill="#D2B48C"/>
    
    {/* Глаза */}
    <ellipse cx="42" cy="46" rx="5" ry="4" fill={accentColor}/>
    <ellipse cx="58" cy="46" rx="5" ry="4" fill={accentColor}/>
    <ellipse cx="42" cy="46" rx="3" ry="3" fill="#8B4513"/>
    <ellipse cx="58" cy="46" rx="3" ry="3" fill="#8B4513"/>
    <circle cx="41" cy="45" r="1" fill={accentColor}/>
    <circle cx="57" cy="45" r="1" fill={accentColor}/>
    
    {/* Брови - свирепость */}
    <path d="M36 42 Q40 40 45 43" stroke="#5C3317" strokeWidth="2" fill="none"/>
    <path d="M64 42 Q60 40 55 43" stroke="#5C3317" strokeWidth="2" fill="none"/>
    
    {/* Нос */}
    <ellipse cx="50" cy="56" rx="5" ry="4" fill="#1a0f0a"/>
    <ellipse cx="50" cy="55" rx="3" ry="2" fill="#3d2817" opacity="0.5"/>
    
    {/* Усы */}
    <path d="M45 60 Q35 58 25 60" stroke="#D2B48C" strokeWidth="1" fill="none"/>
    <path d="M45 62 Q35 62 28 65" stroke="#D2B48C" strokeWidth="1" fill="none"/>
    <path d="M55 60 Q65 58 75 60" stroke="#D2B48C" strokeWidth="1" fill="none"/>
    <path d="M55 62 Q65 62 72 65" stroke="#D2B48C" strokeWidth="1" fill="none"/>
    
    {/* Рот */}
    <path d="M44 64 Q50 68 56 64" stroke="#1a0f0a" strokeWidth="1.5" fill="none"/>
    
    {/* Королевская корона */}
    <path d="M32 22 L35 12 L40 18 L45 10 L50 16 L55 10 L60 18 L65 12 L68 22 L68 28 L32 28 Z" 
          fill="url(#lionGold)" stroke="#B8860B" strokeWidth="1"/>
    
    {/* Драгоценности на короне */}
    <circle cx="50" cy="18" r="3" fill="#FF0000"/>
    <circle cx="40" cy="20" r="2" fill="#00FF7F"/>
    <circle cx="60" cy="20" r="2" fill="#4169E1"/>
    <circle cx="50" cy="18" r="1.5" fill="#FF6B6B" opacity="0.6"/>
    
    {/* Основание короны */}
    <rect x="32" y="26" width="36" height="4" fill="url(#lionGold)"/>
    <path d="M32 26 L68 26" stroke="#FFF8DC" strokeWidth="0.5"/>
  </svg>
);

// Железный Волк - Премиальный герб
export const IronWolfEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#708090', 
  secondaryColor = '#1C1C1C',
  accentColor = '#C0C0C0',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <linearGradient id="wolfSteel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E8E8E8" />
        <stop offset="30%" stopColor={primaryColor} />
        <stop offset="70%" stopColor="#4A5568" />
        <stop offset="100%" stopColor="#2D3748" />
      </linearGradient>
      <linearGradient id="wolfBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1a1a2e" />
        <stop offset="100%" stopColor="#0a0a12" />
      </linearGradient>
      <radialGradient id="wolfEye" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF6B00" />
        <stop offset="50%" stopColor="#FF4500" />
        <stop offset="100%" stopColor="#8B0000" />
      </radialGradient>
      <filter id="metalShine" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
        <feOffset in="blur" dx="1" dy="1" result="shadow"/>
        <feComposite in="SourceGraphic" in2="shadow" operator="over"/>
      </filter>
    </defs>
    
    {/* Щит */}
    <path d="M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z" 
          fill="url(#wolfBg)" stroke="url(#wolfSteel)" strokeWidth="3"/>
    
    {/* Металлические заклёпки */}
    <circle cx="20" cy="25" r="3" fill="url(#wolfSteel)"/>
    <circle cx="80" cy="25" r="3" fill="url(#wolfSteel)"/>
    <circle cx="15" cy="50" r="2" fill="url(#wolfSteel)"/>
    <circle cx="85" cy="50" r="2" fill="url(#wolfSteel)"/>
    
    {/* Морда волка */}
    <path d="M50 25 L28 55 L32 78 L50 88 L68 78 L72 55 Z" 
          fill="#2D3748" stroke={accentColor} strokeWidth="1"/>
    
    {/* Детали меха */}
    <path d="M35 55 L40 50 L38 58" fill="#4A5568"/>
    <path d="M65 55 L60 50 L62 58" fill="#4A5568"/>
    
    {/* Уши */}
    <path d="M28 55 L15 22 L25 28 L38 48 Z" fill="#4A5568" stroke={accentColor} strokeWidth="1"/>
    <path d="M72 55 L85 22 L75 28 L62 48 Z" fill="#4A5568" stroke={accentColor} strokeWidth="1"/>
    <path d="M22 30 L30 40 L28 50" fill="#5A6577" opacity="0.6"/>
    <path d="M78 30 L70 40 L72 50" fill="#5A6577" opacity="0.6"/>
    
    {/* Глаза - огненные */}
    <ellipse cx="38" cy="52" rx="7" ry="5" fill={secondaryColor} stroke={accentColor} strokeWidth="0.5"/>
    <ellipse cx="62" cy="52" rx="7" ry="5" fill={secondaryColor} stroke={accentColor} strokeWidth="0.5"/>
    <ellipse cx="38" cy="52" rx="4" ry="4" fill="url(#wolfEye)"/>
    <ellipse cx="62" cy="52" rx="4" ry="4" fill="url(#wolfEye)"/>
    <ellipse cx="38" cy="52" rx="2" ry="3" fill="#000"/>
    <ellipse cx="62" cy="52" rx="2" ry="3" fill="#000"/>
    <circle cx="36" cy="50" r="1" fill="#FFF" opacity="0.8"/>
    <circle cx="60" cy="50" r="1" fill="#FFF" opacity="0.8"/>
    
    {/* Нос */}
    <ellipse cx="50" cy="70" rx="6" ry="5" fill="#1a1a1a"/>
    <ellipse cx="50" cy="68" rx="3" ry="2" fill="#3d3d3d" opacity="0.5"/>
    
    {/* Шрамы боевые */}
    <path d="M25 45 L35 55 L33 57 L23 47 Z" fill={accentColor} opacity="0.6"/>
    <path d="M75 45 L65 55 L67 57 L77 47 Z" fill={accentColor} opacity="0.6"/>
    <path d="M42 62 L46 70" stroke={accentColor} strokeWidth="1" opacity="0.4"/>
    
    {/* Клыки */}
    <path d="M42 78 L44 85 L46 78" fill="#FFFFF0"/>
    <path d="M54 78 L56 85 L58 78" fill="#FFFFF0"/>
    
    {/* Руны викингов */}
    <path d="M50 15 L50 22 M47 18 L53 18" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M25 70 L28 78 L25 86" stroke={accentColor} strokeWidth="1" fill="none"/>
    <path d="M75 70 L72 78 L75 86" stroke={accentColor} strokeWidth="1" fill="none"/>
  </svg>
);

// Золотой Орёл - Премиальный герб
export const GoldenEagleEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#DAA520', 
  secondaryColor = '#000080',
  accentColor = '#FFFFFF',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <linearGradient id="eagleGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF8DC" />
        <stop offset="25%" stopColor="#FFD700" />
        <stop offset="50%" stopColor={primaryColor} />
        <stop offset="75%" stopColor="#B8860B" />
        <stop offset="100%" stopColor="#8B6914" />
      </linearGradient>
      <radialGradient id="eagleBg" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#1a1a4e" />
        <stop offset="100%" stopColor="#0a0a1e" />
      </radialGradient>
      <filter id="eagleGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Щит */}
    <path d="M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z" 
          fill="url(#eagleBg)" stroke="url(#eagleGold)" strokeWidth="3"/>
    
    {/* Звёзды на фоне */}
    <circle cx="20" cy="35" r="1" fill={accentColor} opacity="0.6"/>
    <circle cx="80" cy="35" r="1" fill={accentColor} opacity="0.6"/>
    <circle cx="25" cy="65" r="1" fill={accentColor} opacity="0.4"/>
    <circle cx="75" cy="65" r="1" fill={accentColor} opacity="0.4"/>
    
    {/* Левое крыло */}
    <path d="M12 45 Q15 25 25 30 Q30 35 35 42 L35 60 Q25 55 18 60 Q12 55 12 45" 
          fill="url(#eagleGold)" filter="url(#eagleGlow)"/>
    <path d="M14 42 Q20 35 28 40" stroke="#FFF8DC" strokeWidth="0.5" fill="none"/>
    <path d="M16 48 Q22 42 30 48" stroke="#B8860B" strokeWidth="0.5" fill="none"/>
    <path d="M18 54 Q24 50 32 56" stroke="#B8860B" strokeWidth="0.5" fill="none"/>
    
    {/* Правое крыло */}
    <path d="M88 45 Q85 25 75 30 Q70 35 65 42 L65 60 Q75 55 82 60 Q88 55 88 45" 
          fill="url(#eagleGold)" filter="url(#eagleGlow)"/>
    <path d="M86 42 Q80 35 72 40" stroke="#FFF8DC" strokeWidth="0.5" fill="none"/>
    <path d="M84 48 Q78 42 70 48" stroke="#B8860B" strokeWidth="0.5" fill="none"/>
    <path d="M82 54 Q76 50 68 56" stroke="#B8860B" strokeWidth="0.5" fill="none"/>
    
    {/* Тело орла */}
    <ellipse cx="50" cy="55" rx="14" ry="20" fill="url(#eagleGold)"/>
    <path d="M40 50 Q50 45 60 50" stroke="#B8860B" strokeWidth="0.5" fill="none"/>
    <path d="M42 58 Q50 54 58 58" stroke="#B8860B" strokeWidth="0.5" fill="none"/>
    
    {/* Голова орла */}
    <ellipse cx="50" cy="32" rx="11" ry="12" fill="url(#eagleGold)"/>
    
    {/* Глаза - пронзительные */}
    <ellipse cx="44" cy="30" rx="4" ry="3.5" fill={accentColor}/>
    <ellipse cx="56" cy="30" rx="4" ry="3.5" fill={accentColor}/>
    <ellipse cx="44" cy="30" rx="2" ry="2.5" fill="#000"/>
    <ellipse cx="56" cy="30" rx="2" ry="2.5" fill="#000"/>
    <circle cx="43" cy="29" r="0.8" fill={accentColor}/>
    <circle cx="55" cy="29" r="0.8" fill={accentColor}/>
    
    {/* Брови */}
    <path d="M38 27 L46 28" stroke="#8B6914" strokeWidth="1.5"/>
    <path d="M62 27 L54 28" stroke="#8B6914" strokeWidth="1.5"/>
    
    {/* Клюв */}
    <path d="M50 35 L45 42 L48 45 L50 50 L52 45 L55 42 Z" fill="#FF8C00"/>
    <path d="M50 35 L48 40 L50 44 L52 40 Z" fill="#FFB347"/>
    <path d="M46 42 L50 42" stroke="#CC7000" strokeWidth="0.5"/>
    
    {/* Хвостовые перья */}
    <path d="M38 72 L35 88 L40 85 L42 72" fill="url(#eagleGold)"/>
    <path d="M50 74 L50 92 L53 88 L53 74" fill="url(#eagleGold)"/>
    <path d="M62 72 L65 88 L60 85 L58 72" fill="url(#eagleGold)"/>
    
    {/* Когти */}
    <path d="M42 70 L38 78 L40 80 L44 72" fill="#8B6914"/>
    <path d="M58 70 L62 78 L60 80 L56 72" fill="#8B6914"/>
    
    {/* Императорская лента */}
    <path d="M30 80 Q40 75 50 78 Q60 75 70 80" stroke="#DC143C" strokeWidth="2" fill="none"/>
  </svg>
);

// Тёмный Дракон - Премиальный герб
export const DarkDragonEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#8B008B', 
  secondaryColor = '#000000',
  accentColor = '#FF4500',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="dragonBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#2d1f3d" />
        <stop offset="100%" stopColor="#0d0a12" />
      </radialGradient>
      <linearGradient id="dragonScale" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9932CC" />
        <stop offset="50%" stopColor={primaryColor} />
        <stop offset="100%" stopColor="#4B0082" />
      </linearGradient>
      <radialGradient id="dragonFire" cx="50%" cy="0%" r="100%">
        <stop offset="0%" stopColor="#FFFF00" />
        <stop offset="30%" stopColor="#FF8C00" />
        <stop offset="60%" stopColor={accentColor} />
        <stop offset="100%" stopColor="#8B0000" />
      </radialGradient>
      <filter id="fireGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Щит */}
    <path d="M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z" 
          fill="url(#dragonBg)" stroke={primaryColor} strokeWidth="3"/>
    
    {/* Магические руны */}
    <circle cx="50" cy="50" r="35" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity="0.3" strokeDasharray="3,3"/>
    
    {/* Рога */}
    <path d="M30 38 L18 12 L22 15 L32 35" fill="url(#dragonScale)" stroke="#4B0082" strokeWidth="1"/>
    <path d="M70 38 L82 12 L78 15 L68 35" fill="url(#dragonScale)" stroke="#4B0082" strokeWidth="1"/>
    <path d="M25 30 L20 20" stroke="#9932CC" strokeWidth="0.5"/>
    <path d="M75 30 L80 20" stroke="#9932CC" strokeWidth="0.5"/>
    
    {/* Голова дракона */}
    <ellipse cx="50" cy="45" rx="22" ry="20" fill="url(#dragonScale)"/>
    
    {/* Чешуя на голове */}
    <path d="M35 35 Q40 32 45 36" fill="#9932CC" opacity="0.6"/>
    <path d="M55 36 Q60 32 65 35" fill="#9932CC" opacity="0.6"/>
    <path d="M40 42 Q45 40 50 43" fill="#6B238E" opacity="0.4"/>
    <path d="M50 43 Q55 40 60 42" fill="#6B238E" opacity="0.4"/>
    
    {/* Гребень */}
    <path d="M40 25 L42 18 L45 24 L48 16 L50 23 L52 16 L55 24 L58 18 L60 25" 
          fill="url(#dragonScale)" stroke="#9932CC" strokeWidth="0.5"/>
    
    {/* Глаза - магические */}
    <ellipse cx="40" cy="42" rx="6" ry="7" fill="#000"/>
    <ellipse cx="60" cy="42" rx="6" ry="7" fill="#000"/>
    <ellipse cx="40" cy="42" rx="4" ry="5" fill="url(#dragonFire)" filter="url(#fireGlow)"/>
    <ellipse cx="60" cy="42" rx="4" ry="5" fill="url(#dragonFire)" filter="url(#fireGlow)"/>
    <ellipse cx="40" cy="42" rx="1.5" ry="4" fill="#000"/>
    <ellipse cx="60" cy="42" rx="1.5" ry="4" fill="#000"/>
    
    {/* Ноздри */}
    <ellipse cx="45" cy="52" rx="2" ry="1.5" fill="#2d1f3d"/>
    <ellipse cx="55" cy="52" rx="2" ry="1.5" fill="#2d1f3d"/>
    
    {/* Пасть */}
    <path d="M38 56 Q50 62 62 56 L60 54 Q50 58 40 54 Z" fill="#2d1f3d"/>
    <path d="M40 56 L42 60 L44 56" fill="#FFFFF0"/>
    <path d="M48 57 L50 62 L52 57" fill="#FFFFF0"/>
    <path d="M56 56 L58 60 L60 56" fill="#FFFFF0"/>
    
    {/* Пламя из пасти */}
    <path d="M42 62 Q38 72 42 82 Q46 75 48 85 Q50 72 52 85 Q54 75 58 82 Q62 72 58 62" 
          fill="url(#dragonFire)" filter="url(#fireGlow)" opacity="0.9"/>
    <path d="M45 65 Q48 75 50 80 Q52 75 55 65" 
          fill="#FFFF00" opacity="0.6"/>
    
    {/* Чешуя на щеках */}
    <ellipse cx="28" cy="50" rx="4" ry="3" fill="url(#dragonScale)" opacity="0.7"/>
    <ellipse cx="72" cy="50" rx="4" ry="3" fill="url(#dragonScale)" opacity="0.7"/>
    <ellipse cx="25" cy="58" rx="3" ry="2" fill="url(#dragonScale)" opacity="0.5"/>
    <ellipse cx="75" cy="58" rx="3" ry="2" fill="url(#dragonScale)" opacity="0.5"/>
    
    {/* Магические искры */}
    <circle cx="30" cy="25" r="1" fill={accentColor} opacity="0.8"/>
    <circle cx="70" cy="25" r="1" fill={accentColor} opacity="0.8"/>
    <circle cx="20" cy="45" r="0.8" fill="#FF00FF" opacity="0.6"/>
    <circle cx="80" cy="45" r="0.8" fill="#FF00FF" opacity="0.6"/>
  </svg>
);

// Серебряный Феникс - Премиальный герб
export const SilverPhoenixEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#C0C0C0', 
  secondaryColor = '#FF6347',
  accentColor = '#FFD700',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="phoenixBg" cx="50%" cy="80%" r="80%">
        <stop offset="0%" stopColor="#3d1f1f" />
        <stop offset="50%" stopColor="#1a0f0f" />
        <stop offset="100%" stopColor="#0a0505" />
      </radialGradient>
      <linearGradient id="phoenixSilver" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#E8E8E8" />
        <stop offset="60%" stopColor={primaryColor} />
        <stop offset="100%" stopColor="#808080" />
      </linearGradient>
      <radialGradient id="phoenixFlame" cx="50%" cy="100%" r="100%">
        <stop offset="0%" stopColor="#FFFF00" />
        <stop offset="20%" stopColor="#FFD700" />
        <stop offset="40%" stopColor="#FF8C00" />
        <stop offset="60%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor="#8B0000" />
      </radialGradient>
      <filter id="phoenixGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Щит */}
    <path d="M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z" 
          fill="url(#phoenixBg)" stroke={accentColor} strokeWidth="3"/>
    
    {/* Пламя фон */}
    <path d="M25 92 Q30 75 28 85 Q35 65 32 78 Q40 55 38 70 Q45 50 44 65 Q50 45 50 60 Q55 50 56 65 Q60 55 62 70 Q65 65 68 78 Q70 75 72 85 Q75 75 75 92" 
          fill="url(#phoenixFlame)" filter="url(#phoenixGlow)" opacity="0.9"/>
    
    {/* Левое крыло */}
    <path d="M15 42 Q22 28 32 35 Q38 42 40 52 L38 62 Q28 55 20 58 Q12 52 15 42" 
          fill="url(#phoenixSilver)"/>
    <path d="M18 40 Q25 35 32 42" stroke="#FFFFFF" strokeWidth="0.5" fill="none"/>
    <path d="M20 48 Q26 44 34 50" stroke="#A0A0A0" strokeWidth="0.5" fill="none"/>
    <path d="M22 55 Q28 52 36 58" stroke="#A0A0A0" strokeWidth="0.5" fill="none"/>
    
    {/* Правое крыло */}
    <path d="M85 42 Q78 28 68 35 Q62 42 60 52 L62 62 Q72 55 80 58 Q88 52 85 42" 
          fill="url(#phoenixSilver)"/>
    <path d="M82 40 Q75 35 68 42" stroke="#FFFFFF" strokeWidth="0.5" fill="none"/>
    <path d="M80 48 Q74 44 66 50" stroke="#A0A0A0" strokeWidth="0.5" fill="none"/>
    <path d="M78 55 Q72 52 64 58" stroke="#A0A0A0" strokeWidth="0.5" fill="none"/>
    
    {/* Тело */}
    <ellipse cx="50" cy="50" rx="12" ry="18" fill="url(#phoenixSilver)"/>
    <path d="M42 45 Q50 42 58 45" stroke="#808080" strokeWidth="0.5" fill="none"/>
    <path d="M44 52 Q50 50 56 52" stroke="#808080" strokeWidth="0.5" fill="none"/>
    
    {/* Голова */}
    <ellipse cx="50" cy="30" rx="10" ry="11" fill="url(#phoenixSilver)"/>
    
    {/* Хохолок - пламенный */}
    <path d="M42 22 L40 10 L44 18" fill={secondaryColor} filter="url(#phoenixGlow)"/>
    <path d="M47 20 L46 8 L50 16" fill="#FF8C00" filter="url(#phoenixGlow)"/>
    <path d="M53 20 L54 8 L50 16" fill="#FF8C00" filter="url(#phoenixGlow)"/>
    <path d="M58 22 L60 10 L56 18" fill={secondaryColor} filter="url(#phoenixGlow)"/>
    
    {/* Глаза - сияющие */}
    <ellipse cx="45" cy="28" rx="3" ry="3.5" fill="#000"/>
    <ellipse cx="55" cy="28" rx="3" ry="3.5" fill="#000"/>
    <ellipse cx="45" cy="28" rx="2" ry="2.5" fill={secondaryColor}/>
    <ellipse cx="55" cy="28" rx="2" ry="2.5" fill={secondaryColor}/>
    <circle cx="44" cy="27" r="0.8" fill="#FFFFFF"/>
    <circle cx="54" cy="27" r="0.8" fill="#FFFFFF"/>
    
    {/* Клюв */}
    <path d="M50 33 L47 38 L50 44 L53 38 Z" fill={accentColor}/>
    <path d="M50 33 L48 37 L50 42 L52 37 Z" fill="#FFE4B5"/>
    
    {/* Хвост пламени */}
    <path d="M40 65 Q38 78 42 92" stroke={secondaryColor} strokeWidth="3" fill="none" filter="url(#phoenixGlow)"/>
    <path d="M50 68 Q50 82 50 95" stroke="#FF8C00" strokeWidth="4" fill="none" filter="url(#phoenixGlow)"/>
    <path d="M60 65 Q62 78 58 92" stroke={secondaryColor} strokeWidth="3" fill="none" filter="url(#phoenixGlow)"/>
    
    {/* Искры */}
    <circle cx="30" cy="70" r="1.5" fill={accentColor} opacity="0.8"/>
    <circle cx="70" cy="70" r="1.5" fill={accentColor} opacity="0.8"/>
    <circle cx="35" cy="82" r="1" fill="#FF8C00" opacity="0.7"/>
    <circle cx="65" cy="82" r="1" fill="#FF8C00" opacity="0.7"/>
    <circle cx="50" cy="20" r="1" fill={accentColor} opacity="0.9"/>
  </svg>
);

// ========== ПЕЧАТИ ==========

// Печать Короны - Премиальная
export const CrownSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#FFD700', 
  secondaryColor = '#4B0082',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="crownSealBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#2d1f4e" />
        <stop offset="100%" stopColor="#1a0f2e" />
      </radialGradient>
      <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF8DC" />
        <stop offset="30%" stopColor={primaryColor} />
        <stop offset="70%" stopColor="#B8860B" />
        <stop offset="100%" stopColor="#8B6914" />
      </linearGradient>
      <filter id="crownGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Основа печати */}
    <circle cx="50" cy="50" r="45" fill="url(#crownSealBg)" stroke="url(#crownGold)" strokeWidth="3"/>
    
    {/* Декоративные кольца */}
    <circle cx="50" cy="50" r="40" fill="none" stroke={primaryColor} strokeWidth="1" opacity="0.4"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke={primaryColor} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3"/>
    
    {/* Корона */}
    <path d="M22 52 L28 28 L36 45 L44 25 L50 42 L56 25 L64 45 L72 28 L78 52 L78 62 L22 62 Z" 
          fill="url(#crownGold)" filter="url(#crownGlow)"/>
    
    {/* Детали короны */}
    <path d="M28 30 L30 35" stroke="#FFF8DC" strokeWidth="0.5"/>
    <path d="M72 30 L70 35" stroke="#FFF8DC" strokeWidth="0.5"/>
    
    {/* Драгоценные камни */}
    <circle cx="50" cy="35" r="5" fill="#DC143C"/>
    <circle cx="50" cy="35" r="3" fill="#FF6B6B" opacity="0.6"/>
    <circle cx="50" cy="34" r="1.5" fill="#FFF" opacity="0.4"/>
    
    <circle cx="36" cy="42" r="3.5" fill="#00FF7F"/>
    <circle cx="36" cy="42" r="2" fill="#7FFF7F" opacity="0.5"/>
    
    <circle cx="64" cy="42" r="3.5" fill="#4169E1"/>
    <circle cx="64" cy="42" r="2" fill="#87CEEB" opacity="0.5"/>
    
    {/* Жемчужины */}
    <circle cx="28" cy="48" r="2" fill="#FFFFF0"/>
    <circle cx="72" cy="48" r="2" fill="#FFFFF0"/>
    
    {/* Основание короны */}
    <rect x="22" y="60" width="56" height="10" rx="2" fill="url(#crownGold)"/>
    <path d="M22 62 L78 62" stroke="#FFF8DC" strokeWidth="1"/>
    <path d="M22 67 L78 67" stroke="#8B6914" strokeWidth="0.5"/>
    
    {/* Орнамент */}
    <circle cx="30" cy="65" r="1.5" fill="#DC143C"/>
    <circle cx="50" cy="65" r="1.5" fill="#DC143C"/>
    <circle cx="70" cy="65" r="1.5" fill="#DC143C"/>
    
    {/* Текст "CROWN" */}
    <path d="M25 78 L30 75 L35 78" stroke={primaryColor} strokeWidth="1" fill="none"/>
    <path d="M65 78 L70 75 L75 78" stroke={primaryColor} strokeWidth="1" fill="none"/>
  </svg>
);

// Печать Меча - Премиальная
export const SwordSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#C0C0C0', 
  secondaryColor = '#8B0000',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="swordSealBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#2d1a1a" />
        <stop offset="100%" stopColor="#1a0a0a" />
      </radialGradient>
      <linearGradient id="swordSteel" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#E8E8E8" />
        <stop offset="50%" stopColor={primaryColor} />
        <stop offset="100%" stopColor="#808080" />
      </linearGradient>
      <filter id="swordGlow">
        <feGaussianBlur stdDeviation="1" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Основа печати */}
    <circle cx="50" cy="50" r="45" fill="url(#swordSealBg)" stroke={secondaryColor} strokeWidth="3"/>
    
    {/* Декоративное кольцо */}
    <circle cx="50" cy="50" r="40" fill="none" stroke={primaryColor} strokeWidth="1" opacity="0.3"/>
    
    {/* Щит */}
    <path d="M50 40 L35 48 L35 68 L50 80 L65 68 L65 48 Z" 
          fill={secondaryColor} stroke={primaryColor} strokeWidth="2"/>
    <path d="M50 45 L40 51 L40 65 L50 74 L60 65 L60 51 Z" 
          fill="#6B0000" stroke={primaryColor} strokeWidth="0.5"/>
    
    {/* Левый меч */}
    <path d="M22 78 L48 28 L52 32 L28 82 Z" fill="url(#swordSteel)" filter="url(#swordGlow)"/>
    <path d="M26 80 L48 32" stroke="#FFF" strokeWidth="0.5" opacity="0.5"/>
    
    {/* Правый меч */}
    <path d="M78 78 L52 28 L48 32 L72 82 Z" fill="url(#swordSteel)" filter="url(#swordGlow)"/>
    <path d="M74 80 L52 32" stroke="#FFF" strokeWidth="0.5" opacity="0.5"/>
    
    {/* Рукояти */}
    <rect x="18" y="78" width="12" height="5" rx="1" fill="#8B4513" transform="rotate(-45 24 80)"/>
    <rect x="70" y="78" width="12" height="5" rx="1" fill="#8B4513" transform="rotate(45 76 80)"/>
    
    {/* Навершия */}
    <circle cx="18" cy="84" r="3" fill="#FFD700"/>
    <circle cx="82" cy="84" r="3" fill="#FFD700"/>
    
    {/* Гарды */}
    <ellipse cx="32" cy="68" rx="8" ry="2.5" fill="#FFD700" transform="rotate(-45 32 68)"/>
    <ellipse cx="68" cy="68" rx="8" ry="2.5" fill="#FFD700" transform="rotate(45 68 68)"/>
    
    {/* Символ на щите */}
    <path d="M50 52 L46 58 L50 64 L54 58 Z" fill="#FFD700"/>
    <circle cx="50" cy="58" r="3" fill={secondaryColor}/>
    
    {/* Кровь на мечах */}
    <path d="M35 55 Q37 58 35 62" stroke={secondaryColor} strokeWidth="1.5" fill="none" opacity="0.7"/>
    <path d="M65 55 Q63 58 65 62" stroke={secondaryColor} strokeWidth="1.5" fill="none" opacity="0.7"/>
  </svg>
);

// Печать Звезды - Премиальная
export const StarSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#4169E1', 
  secondaryColor = '#FFD700',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="starSealBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#1a2a4a" />
        <stop offset="100%" stopColor="#0a1020" />
      </radialGradient>
      <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor="#B8860B" />
      </radialGradient>
      <filter id="starLight" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Основа печати */}
    <circle cx="50" cy="50" r="45" fill="url(#starSealBg)" stroke={primaryColor} strokeWidth="3"/>
    
    {/* Звёздное небо */}
    <circle cx="20" cy="25" r="1" fill="#FFF" opacity="0.6"/>
    <circle cx="80" cy="30" r="1" fill="#FFF" opacity="0.5"/>
    <circle cx="25" cy="75" r="0.8" fill="#FFF" opacity="0.4"/>
    <circle cx="75" cy="72" r="0.8" fill="#FFF" opacity="0.5"/>
    <circle cx="15" cy="50" r="0.6" fill="#FFF" opacity="0.3"/>
    <circle cx="85" cy="55" r="0.6" fill="#FFF" opacity="0.3"/>
    
    {/* Декоративные кольца */}
    <circle cx="50" cy="50" r="38" fill="none" stroke={secondaryColor} strokeWidth="1" opacity="0.3"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity="0.2"/>
    
    {/* Главная звезда */}
    <path d="M50 12 L56 35 L80 35 L61 50 L68 75 L50 60 L32 75 L39 50 L20 35 L44 35 Z" 
          fill="url(#starGlow)" filter="url(#starLight)"/>
    
    {/* Внутренняя звезда */}
    <path d="M50 25 L54 40 L68 40 L57 50 L62 65 L50 55 L38 65 L43 50 L32 40 L46 40 Z" 
          fill={primaryColor} opacity="0.6"/>
    
    {/* Центр */}
    <circle cx="50" cy="47" r="10" fill={primaryColor}/>
    <circle cx="50" cy="47" r="6" fill="url(#starGlow)"/>
    <circle cx="50" cy="47" r="3" fill="#FFFFFF" opacity="0.8"/>
    
    {/* Лучи света */}
    <path d="M50 5 L50 12" stroke={secondaryColor} strokeWidth="2" opacity="0.6"/>
    <path d="M50 88 L50 80" stroke={secondaryColor} strokeWidth="1" opacity="0.4"/>
    <path d="M12 50 L20 50" stroke={secondaryColor} strokeWidth="1" opacity="0.4"/>
    <path d="M88 50 L80 50" stroke={secondaryColor} strokeWidth="1" opacity="0.4"/>
    
    {/* Маленькие звёзды вокруг */}
    <path d="M22 22 L24 26 L28 26 L25 29 L26 33 L22 30 L18 33 L19 29 L16 26 L20 26 Z" 
          fill={secondaryColor} opacity="0.7"/>
    <path d="M78 22 L80 26 L84 26 L81 29 L82 33 L78 30 L74 33 L75 29 L72 26 L76 26 Z" 
          fill={secondaryColor} opacity="0.7"/>
  </svg>
);

// Печать Черепа - Премиальная
export const SkullSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#1C1C1C', 
  secondaryColor = '#8B0000',
  accentColor = '#FFFFFF',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="skullSealBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#1a1a1a" />
        <stop offset="100%" stopColor="#050505" />
      </radialGradient>
      <linearGradient id="skullBone" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFF0" />
        <stop offset="50%" stopColor="#E8E8DC" />
        <stop offset="100%" stopColor="#C8C8B8" />
      </linearGradient>
      <radialGradient id="skullEyeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF0000" />
        <stop offset="50%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor="#4B0000" />
      </radialGradient>
      <filter id="skullGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Основа печати */}
    <circle cx="50" cy="50" r="45" fill="url(#skullSealBg)" stroke={secondaryColor} strokeWidth="3"/>
    
    {/* Цепи */}
    <path d="M15 35 Q18 32 21 35 Q24 38 27 35 Q30 32 33 35" stroke="#808080" strokeWidth="2" fill="none"/>
    <path d="M67 35 Q70 32 73 35 Q76 38 79 35 Q82 32 85 35" stroke="#808080" strokeWidth="2" fill="none"/>
    
    {/* Череп */}
    <ellipse cx="50" cy="42" rx="26" ry="28" fill="url(#skullBone)"/>
    
    {/* Тени на черепе */}
    <ellipse cx="50" cy="45" rx="22" ry="24" fill="none" stroke="#A0A090" strokeWidth="1" opacity="0.3"/>
    <path d="M30 35 Q35 30 50 28 Q65 30 70 35" stroke="#C8C8B8" strokeWidth="1" fill="none"/>
    
    {/* Глазницы */}
    <ellipse cx="38" cy="40" rx="9" ry="11" fill={primaryColor}/>
    <ellipse cx="62" cy="40" rx="9" ry="11" fill={primaryColor}/>
    
    {/* Глаза - адское свечение */}
    <ellipse cx="38" cy="42" rx="5" ry="6" fill="url(#skullEyeGlow)" filter="url(#skullGlow)"/>
    <ellipse cx="62" cy="42" rx="5" ry="6" fill="url(#skullEyeGlow)" filter="url(#skullGlow)"/>
    <ellipse cx="38" cy="42" rx="2" ry="3" fill="#FF0000" opacity="0.8"/>
    <ellipse cx="62" cy="42" r="2" ry="3" fill="#FF0000" opacity="0.8"/>
    
    {/* Носовая полость */}
    <path d="M50 50 L44 60 L50 62 L56 60 Z" fill={primaryColor}/>
    <path d="M47 55 L50 58 L53 55" stroke="#C8C8B8" strokeWidth="0.5" fill="none"/>
    
    {/* Челюсть */}
    <path d="M28 62 Q50 75 72 62 L72 70 Q50 82 28 70 Z" fill="url(#skullBone)"/>
    
    {/* Зубы */}
    <rect x="32" y="62" width="5" height="8" rx="1" fill={primaryColor}/>
    <rect x="39" y="62" width="5" height="8" rx="1" fill={primaryColor}/>
    <rect x="46" y="62" width="8" height="8" rx="1" fill={primaryColor}/>
    <rect x="56" y="62" width="5" height="8" rx="1" fill={primaryColor}/>
    <rect x="63" y="62" width="5" height="8" rx="1" fill={primaryColor}/>
    
    {/* Трещина на черепе */}
    <path d="M45 20 Q48 28 44 35 Q46 40 48 38" stroke="#808080" strokeWidth="1" fill="none"/>
    
    {/* Скрещенные кости */}
    <path d="M18 78 L35 88 L37 85 L20 75 Z" fill="url(#skullBone)"/>
    <circle cx="18" cy="76" r="4" fill="url(#skullBone)"/>
    <circle cx="37" cy="87" r="4" fill="url(#skullBone)"/>
    
    <path d="M82 78 L65 88 L63 85 L80 75 Z" fill="url(#skullBone)"/>
    <circle cx="82" cy="76" r="4" fill="url(#skullBone)"/>
    <circle cx="63" cy="87" r="4" fill="url(#skullBone)"/>
    
    {/* Тёмная аура */}
    <circle cx="50" cy="50" r="42" fill="none" stroke={secondaryColor} strokeWidth="0.5" opacity="0.4" strokeDasharray="5,5"/>
  </svg>
);

// Печать Розы - Премиальная
export const RoseSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#DC143C', 
  secondaryColor = '#228B22',
  accentColor = '#FFD700',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="roseSealBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#2d2020" />
        <stop offset="100%" stopColor="#0d0808" />
      </radialGradient>
      <radialGradient id="rosePetal" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF6B6B" />
        <stop offset="50%" stopColor={primaryColor} />
        <stop offset="100%" stopColor="#8B0000" />
      </radialGradient>
      <linearGradient id="roseLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#32CD32" />
        <stop offset="50%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor="#006400" />
      </linearGradient>
      <filter id="roseGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    {/* Основа печати */}
    <circle cx="50" cy="50" r="45" fill="url(#roseSealBg)" stroke={accentColor} strokeWidth="3"/>
    
    {/* Декоративные кольца */}
    <circle cx="50" cy="50" r="40" fill="none" stroke={primaryColor} strokeWidth="0.5" opacity="0.3"/>
    
    {/* Стебель */}
    <path d="M50 92 Q48 75 50 60" stroke="url(#roseLeaf)" strokeWidth="5" fill="none"/>
    <path d="M50 92 Q52 80 50 65" stroke="#32CD32" strokeWidth="2" fill="none" opacity="0.5"/>
    
    {/* Шипы */}
    <path d="M48 82 L42 78 L47 80" fill="url(#roseLeaf)"/>
    <path d="M52 75 L58 72 L53 74" fill="url(#roseLeaf)"/>
    <path d="M48 68 L44 65 L48 67" fill="url(#roseLeaf)"/>
    
    {/* Листья */}
    <path d="M46 78 Q32 72 28 60 Q32 55 38 58 Q42 65 46 72" fill="url(#roseLeaf)"/>
    <path d="M30 62 Q35 60 40 65" stroke="#006400" strokeWidth="0.5" fill="none"/>
    
    <path d="M54 78 Q68 72 72 60 Q68 55 62 58 Q58 65 54 72" fill="url(#roseLeaf)"/>
    <path d="M70 62 Q65 60 60 65" stroke="#006400" strokeWidth="0.5" fill="none"/>
    
    {/* Лепестки розы - внешний слой */}
    <ellipse cx="50" cy="38" rx="24" ry="22" fill="url(#rosePetal)" filter="url(#roseGlow)"/>
    
    {/* Лепестки - средний слой */}
    <ellipse cx="38" cy="35" rx="12" ry="15" fill={primaryColor} opacity="0.9"/>
    <ellipse cx="62" cy="35" rx="12" ry="15" fill={primaryColor} opacity="0.9"/>
    <ellipse cx="50" cy="48" rx="14" ry="10" fill={primaryColor} opacity="0.8"/>
    
    {/* Лепестки - внутренний слой */}
    <ellipse cx="44" cy="38" rx="8" ry="10" fill="#FF6B6B" opacity="0.8"/>
    <ellipse cx="56" cy="38" rx="8" ry="10" fill="#FF6B6B" opacity="0.8"/>
    <ellipse cx="50" cy="32" rx="10" ry="8" fill="#FF6B6B" opacity="0.9"/>
    
    {/* Центр розы - бутон */}
    <ellipse cx="50" cy="36" rx="6" ry="8" fill={primaryColor}/>
    <path d="M47 32 Q50 28 53 32 Q50 35 47 32" fill="#8B0000"/>
    <circle cx="50" cy="35" r="3" fill="#6B0000"/>
    
    {/* Капля росы */}
    <ellipse cx="60" cy="28" rx="3" ry="4" fill="#FFFFFF" opacity="0.6"/>
    <ellipse cx="59" cy="27" rx="1.5" ry="2" fill="#FFFFFF" opacity="0.9"/>
    
    {/* Блики на лепестках */}
    <path d="M35 30 Q40 25 45 30" stroke="#FF9999" strokeWidth="0.5" fill="none" opacity="0.6"/>
    <path d="M55 30 Q60 25 65 30" stroke="#FF9999" strokeWidth="0.5" fill="none" opacity="0.6"/>
    
    {/* Золотые акценты */}
    <circle cx="25" cy="45" r="2" fill={accentColor} opacity="0.7"/>
    <circle cx="75" cy="45" r="2" fill={accentColor} opacity="0.7"/>
  </svg>
);

// Компонент для отображения герба по ID
export const ClanEmblemSVG: React.FC<{ emblemId: number } & EmblemProps> = ({ emblemId, ...props }) => {
  switch (emblemId) {
    case 1: return <RoyalLionEmblem {...props} />;
    case 2: return <IronWolfEmblem {...props} />;
    case 3: return <GoldenEagleEmblem {...props} />;
    case 4: return <DarkDragonEmblem {...props} />;
    case 5: return <SilverPhoenixEmblem {...props} />;
    default: return <RoyalLionEmblem {...props} />;
  }
};

// Компонент для отображения печати по ID
export const ClanSealSVG: React.FC<{ sealId: number } & EmblemProps> = ({ sealId, ...props }) => {
  switch (sealId) {
    case 1: return <CrownSeal {...props} />;
    case 2: return <SwordSeal {...props} />;
    case 3: return <StarSeal {...props} />;
    case 4: return <SkullSeal {...props} />;
    case 5: return <RoseSeal {...props} />;
    default: return <CrownSeal {...props} />;
  }
};
