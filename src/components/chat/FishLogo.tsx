'use client';

interface FishLogoProps {
  size?: number;
  className?: string;
}

export default function FishLogo({ size = 40, className = '' }: FishLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tail */}
      <path d="M72,50 L92,30 L88,50 L92,70 Z" fill="#EE7A30" />

      {/* Body */}
      <ellipse cx="48" cy="50" rx="30" ry="22" fill="white" stroke="#EE7A30" strokeWidth="3" />

      {/* Dorsal fin */}
      <path d="M40,28 L50,14 L58,28" fill="#EE7A30" opacity="0.8" />

      {/* Belly fin */}
      <path d="M42,72 L48,82 L54,72" fill="#EE7A30" opacity="0.6" />

      {/* Eye */}
      <circle cx="32" cy="45" r="7" fill="#EE7A30" opacity="0.15" />
      <circle cx="30" cy="44" r="4" fill="#222" />
      <circle cx="28.5" cy="42.5" r="1.5" fill="white" />

      {/* Mouth */}
      <path d="M19,54 Q22,58 26,56" fill="none" stroke="#EE7A30" strokeWidth="2" strokeLinecap="round" />

      {/* Gill */}
      <path d="M40,38 Q42,50 40,62" fill="none" stroke="#EE7A30" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}
