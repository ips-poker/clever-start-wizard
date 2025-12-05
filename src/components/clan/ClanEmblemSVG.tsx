import React from 'react';

interface EmblemProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  className?: string;
}

// Королевский Лев
export const RoyalLionEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#FFD700', 
  secondaryColor = '#8B0000',
  accentColor = '#FFFFFF',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="lionGrad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor={primaryColor} />
        <stop offset="100%" stopColor={secondaryColor} />
      </radialGradient>
      <filter id="lionGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#lionGrad)" stroke={primaryColor} strokeWidth="3"/>
    {/* Грива */}
    <path d="M50 15 Q30 25 25 45 Q20 55 25 65 Q35 80 50 85 Q65 80 75 65 Q80 55 75 45 Q70 25 50 15" 
          fill={primaryColor} filter="url(#lionGlow)"/>
    {/* Морда льва */}
    <ellipse cx="50" cy="55" rx="18" ry="20" fill={secondaryColor}/>
    {/* Глаза */}
    <circle cx="42" cy="48" r="4" fill={accentColor}/>
    <circle cx="58" cy="48" r="4" fill={accentColor}/>
    <circle cx="43" cy="49" r="2" fill="#000"/>
    <circle cx="59" cy="49" r="2" fill="#000"/>
    {/* Нос */}
    <path d="M50 55 L46 62 L54 62 Z" fill="#000"/>
    {/* Корона */}
    <path d="M35 20 L38 12 L42 18 L50 8 L58 18 L62 12 L65 20" 
          fill={primaryColor} stroke={accentColor} strokeWidth="1"/>
  </svg>
);

// Железный Волк
export const IronWolfEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#708090', 
  secondaryColor = '#1C1C1C',
  accentColor = '#C0C0C0',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <linearGradient id="wolfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={primaryColor} />
        <stop offset="100%" stopColor={secondaryColor} />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#wolfGrad)" stroke={accentColor} strokeWidth="2"/>
    {/* Морда волка */}
    <path d="M50 25 L30 50 L35 75 L50 85 L65 75 L70 50 Z" fill={secondaryColor}/>
    {/* Уши */}
    <path d="M30 50 L20 25 L40 40 Z" fill={primaryColor}/>
    <path d="M70 50 L80 25 L60 40 Z" fill={primaryColor}/>
    {/* Глаза */}
    <ellipse cx="40" cy="50" rx="5" ry="3" fill={accentColor}/>
    <ellipse cx="60" cy="50" rx="5" ry="3" fill={accentColor}/>
    <circle cx="41" cy="50" r="2" fill="#FF4500"/>
    <circle cx="61" cy="50" r="2" fill="#FF4500"/>
    {/* Нос */}
    <ellipse cx="50" cy="65" rx="6" ry="4" fill="#000"/>
    {/* Шрамы */}
    <line x1="25" y1="45" x2="35" y2="55" stroke={accentColor} strokeWidth="2"/>
    <line x1="75" y1="45" x2="65" y2="55" stroke={accentColor} strokeWidth="2"/>
  </svg>
);

// Золотой Орёл
export const GoldenEagleEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#DAA520', 
  secondaryColor = '#000080',
  accentColor = '#FFFFFF',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="eagleGrad" cx="50%" cy="50%">
        <stop offset="0%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor="#000033" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#eagleGrad)" stroke={primaryColor} strokeWidth="3"/>
    {/* Крылья */}
    <path d="M15 40 Q25 35 35 45 L35 60 Q25 55 15 60 Q10 50 15 40" fill={primaryColor}/>
    <path d="M85 40 Q75 35 65 45 L65 60 Q75 55 85 60 Q90 50 85 40" fill={primaryColor}/>
    {/* Тело */}
    <ellipse cx="50" cy="55" rx="15" ry="20" fill={primaryColor}/>
    {/* Голова */}
    <circle cx="50" cy="35" r="12" fill={primaryColor}/>
    {/* Клюв */}
    <path d="M50 40 L45 50 L50 55 L55 50 Z" fill="#FF8C00"/>
    {/* Глаза */}
    <circle cx="45" cy="33" r="3" fill={accentColor}/>
    <circle cx="55" cy="33" r="3" fill={accentColor}/>
    <circle cx="45" cy="33" r="1.5" fill="#000"/>
    <circle cx="55" cy="33" r="1.5" fill="#000"/>
    {/* Перья хвоста */}
    <path d="M42 70 L50 90 L58 70" fill={primaryColor} stroke={accentColor} strokeWidth="1"/>
  </svg>
);

// Тёмный Дракон
export const DarkDragonEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#8B008B', 
  secondaryColor = '#000000',
  accentColor = '#FF4500',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="dragonGrad" cx="50%" cy="50%">
        <stop offset="0%" stopColor={primaryColor} />
        <stop offset="100%" stopColor={secondaryColor} />
      </radialGradient>
      <filter id="dragonFire">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#dragonGrad)" stroke={accentColor} strokeWidth="2"/>
    {/* Рога */}
    <path d="M30 35 L20 15 L35 30" fill={primaryColor}/>
    <path d="M70 35 L80 15 L65 30" fill={primaryColor}/>
    {/* Голова */}
    <ellipse cx="50" cy="45" rx="20" ry="18" fill={secondaryColor}/>
    {/* Глаза */}
    <ellipse cx="42" cy="42" rx="5" ry="6" fill={accentColor} filter="url(#dragonFire)"/>
    <ellipse cx="58" cy="42" rx="5" ry="6" fill={accentColor} filter="url(#dragonFire)"/>
    <ellipse cx="42" cy="42" rx="2" ry="4" fill="#000"/>
    <ellipse cx="58" cy="42" rx="2" ry="4" fill="#000"/>
    {/* Пасть */}
    <path d="M40 55 Q50 65 60 55 L55 52 Q50 58 45 52 Z" fill={accentColor}/>
    {/* Пламя */}
    <path d="M45 65 Q40 75 45 85 Q50 75 50 85 Q55 75 55 85 Q60 75 55 65" 
          fill={accentColor} filter="url(#dragonFire)" opacity="0.8"/>
    {/* Чешуя */}
    <circle cx="35" cy="60" r="3" fill={primaryColor} opacity="0.6"/>
    <circle cx="65" cy="60" r="3" fill={primaryColor} opacity="0.6"/>
  </svg>
);

// Серебряный Феникс
export const SilverPhoenixEmblem: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#C0C0C0', 
  secondaryColor = '#FF6347',
  accentColor = '#FFD700',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="phoenixGrad" cx="50%" cy="70%">
        <stop offset="0%" stopColor={secondaryColor} />
        <stop offset="50%" stopColor="#FF8C00" />
        <stop offset="100%" stopColor={accentColor} />
      </radialGradient>
      <filter id="phoenixGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="#1a1a2e" stroke={accentColor} strokeWidth="2"/>
    {/* Пламя фон */}
    <path d="M30 90 Q35 70 40 80 Q45 60 50 75 Q55 60 60 80 Q65 70 70 90" 
          fill="url(#phoenixGrad)" filter="url(#phoenixGlow)"/>
    {/* Крылья */}
    <path d="M20 45 Q30 30 40 40 L35 55 Q25 50 20 55 Z" fill={primaryColor}/>
    <path d="M80 45 Q70 30 60 40 L65 55 Q75 50 80 55 Z" fill={primaryColor}/>
    {/* Тело */}
    <ellipse cx="50" cy="50" rx="12" ry="18" fill={primaryColor}/>
    {/* Голова */}
    <circle cx="50" cy="32" r="10" fill={primaryColor}/>
    {/* Хохолок */}
    <path d="M45 25 L42 15 M50 23 L50 12 M55 25 L58 15" 
          stroke={secondaryColor} strokeWidth="2" fill="none"/>
    {/* Глаза */}
    <circle cx="46" cy="30" r="2" fill={secondaryColor}/>
    <circle cx="54" cy="30" r="2" fill={secondaryColor}/>
    {/* Клюв */}
    <path d="M50 34 L47 38 L50 42 L53 38 Z" fill={accentColor}/>
    {/* Хвост пламени */}
    <path d="M42 65 Q45 80 42 90 M50 68 Q50 85 50 95 M58 65 Q55 80 58 90" 
          stroke={secondaryColor} strokeWidth="3" fill="none" filter="url(#phoenixGlow)"/>
  </svg>
);

// Печати кланов
export const CrownSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#FFD700', 
  secondaryColor = '#4B0082',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill={secondaryColor} stroke={primaryColor} strokeWidth="3"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke={primaryColor} strokeWidth="1" strokeDasharray="4,4"/>
    {/* Корона */}
    <path d="M25 55 L30 35 L38 50 L50 30 L62 50 L70 35 L75 55 L75 65 L25 65 Z" 
          fill={primaryColor} stroke={primaryColor} strokeWidth="1"/>
    {/* Драгоценности */}
    <circle cx="50" cy="40" r="4" fill="#FF0000"/>
    <circle cx="35" cy="48" r="3" fill="#00FF00"/>
    <circle cx="65" cy="48" r="3" fill="#0000FF"/>
    {/* Основание */}
    <rect x="25" y="65" width="50" height="8" fill={primaryColor}/>
  </svg>
);

export const SwordSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#C0C0C0', 
  secondaryColor = '#8B0000',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill={secondaryColor} stroke={primaryColor} strokeWidth="3"/>
    {/* Скрещенные мечи */}
    <path d="M25 75 L50 30 L55 35 L30 80 Z" fill={primaryColor}/>
    <path d="M75 75 L50 30 L45 35 L70 80 Z" fill={primaryColor}/>
    {/* Рукояти */}
    <rect x="22" y="72" width="15" height="6" fill="#8B4513" transform="rotate(-45 29 75)"/>
    <rect x="63" y="72" width="15" height="6" fill="#8B4513" transform="rotate(45 71 75)"/>
    {/* Гарды */}
    <ellipse cx="35" cy="65" rx="8" ry="3" fill="#FFD700" transform="rotate(-45 35 65)"/>
    <ellipse cx="65" cy="65" rx="8" ry="3" fill="#FFD700" transform="rotate(45 65 65)"/>
    {/* Щит */}
    <path d="M50 45 L40 50 L40 65 L50 75 L60 65 L60 50 Z" fill={secondaryColor} stroke={primaryColor} strokeWidth="2"/>
  </svg>
);

export const StarSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#4169E1', 
  secondaryColor = '#FFD700',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill={primaryColor} stroke={secondaryColor} strokeWidth="3"/>
    {/* Звезда */}
    <path d="M50 15 L58 38 L82 38 L63 53 L70 78 L50 63 L30 78 L37 53 L18 38 L42 38 Z" 
          fill={secondaryColor}/>
    {/* Внутренний круг */}
    <circle cx="50" cy="48" r="12" fill={primaryColor}/>
    {/* Лучи */}
    <circle cx="50" cy="48" r="6" fill={secondaryColor}/>
  </svg>
);

export const SkullSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#1C1C1C', 
  secondaryColor = '#8B0000',
  accentColor = '#FFFFFF',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill={primaryColor} stroke={secondaryColor} strokeWidth="3"/>
    {/* Череп */}
    <ellipse cx="50" cy="45" rx="25" ry="28" fill={accentColor}/>
    {/* Глазницы */}
    <ellipse cx="40" cy="42" rx="8" ry="10" fill={primaryColor}/>
    <ellipse cx="60" cy="42" rx="8" ry="10" fill={primaryColor}/>
    {/* Глаза (красное свечение) */}
    <circle cx="40" cy="44" r="3" fill={secondaryColor}/>
    <circle cx="60" cy="44" r="3" fill={secondaryColor}/>
    {/* Нос */}
    <path d="M50 50 L46 58 L54 58 Z" fill={primaryColor}/>
    {/* Челюсть */}
    <path d="M32 62 Q50 75 68 62 L68 68 Q50 80 32 68 Z" fill={accentColor}/>
    {/* Зубы */}
    <rect x="38" y="62" width="4" height="6" fill={primaryColor}/>
    <rect x="48" y="62" width="4" height="6" fill={primaryColor}/>
    <rect x="58" y="62" width="4" height="6" fill={primaryColor}/>
  </svg>
);

export const RoseSeal: React.FC<EmblemProps> = ({ 
  size = 64, 
  primaryColor = '#DC143C', 
  secondaryColor = '#228B22',
  accentColor = '#FFD700',
  className 
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <defs>
      <radialGradient id="roseGrad" cx="50%" cy="50%">
        <stop offset="0%" stopColor={primaryColor} />
        <stop offset="100%" stopColor="#8B0000" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="#2d2d2d" stroke={accentColor} strokeWidth="3"/>
    {/* Стебель */}
    <path d="M50 90 Q48 70 50 55" stroke={secondaryColor} strokeWidth="4" fill="none"/>
    {/* Листья */}
    <path d="M48 75 Q35 70 40 60 Q45 65 48 70" fill={secondaryColor}/>
    <path d="M52 75 Q65 70 60 60 Q55 65 52 70" fill={secondaryColor}/>
    {/* Лепестки розы */}
    <ellipse cx="50" cy="40" rx="20" ry="18" fill="url(#roseGrad)"/>
    <ellipse cx="42" cy="35" rx="10" ry="12" fill={primaryColor} opacity="0.8"/>
    <ellipse cx="58" cy="35" rx="10" ry="12" fill={primaryColor} opacity="0.8"/>
    <ellipse cx="50" cy="32" rx="8" ry="10" fill={primaryColor}/>
    {/* Центр */}
    <circle cx="50" cy="38" r="5" fill="#8B0000"/>
    {/* Шипы */}
    <path d="M46 82 L42 78 L46 80" fill={secondaryColor}/>
    <path d="M54 82 L58 78 L54 80" fill={secondaryColor}/>
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
