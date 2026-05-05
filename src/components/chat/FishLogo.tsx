'use client';

interface FishLogoProps {
  size?: number;
  className?: string;
}

export default function FishLogo({ size = 40, className = '' }: FishLogoProps) {
  const id = `fg-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#F7B733" />
          <stop offset="100%" stopColor="#EE7A30" />
        </linearGradient>
      </defs>

      {/* Tail */}
      <path d="M72,50 L92,30 L88,50 L92,70 Z" fill="#D4691E" />

      {/* Body */}
      <ellipse cx="48" cy="50" rx="30" ry="22" fill={`url(#${id}-b)`} />

      {/* Dorsal fin */}
      <path d="M40,28 L50,14 L58,28" fill="#D4691E" opacity="0.8" />

      {/* Belly fin */}
      <path d="M42,72 L48,82 L54,72" fill="#D4691E" opacity="0.6" />

      {/* Eye */}
      <circle cx="32" cy="45" r="7" fill="white" />
      <circle cx="30" cy="44" r="4" fill="#222" />
      <circle cx="28.5" cy="42.5" r="1.5" fill="white" />

      {/* Mouth */}
      <path d="M19,54 Q22,58 26,56" fill="none" stroke="#C05A10" strokeWidth="2" strokeLinecap="round" />

      {/* Gill */}
      <path d="M40,38 Q42,50 40,62" fill="none" stroke="#D06A1A" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}
