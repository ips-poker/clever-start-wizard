import React from 'react';

interface RoundedLogoProps {
  src: string;
  alt: string;
  className?: string;
  radius?: number;
}

export function RoundedLogo({ src, alt, className, radius = 16 }: RoundedLogoProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        borderRadius: `${radius}px`,
        background: 'transparent'
      }}
    />
  );
}