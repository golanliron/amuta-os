'use client';

interface FishLogoProps {
  size?: number;
  className?: string;
}

export default function FishLogo({ size = 40, className = '' }: FishLogoProps) {
  const id = `fish-grad-${size}`;
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 120 90"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="50%" stopColor="#EE7A30" />
          <stop offset="100%" stopColor="#D4691E" />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EE7A30" />
          <stop offset="100%" stopColor="#C75B10" />
        </linearGradient>
      </defs>

      {/* Tail fin - flowing forked shape */}
      <path
        d="M88,45 C95,30 108,18 115,16 C108,28 104,38 102,45 C104,52 108,62 115,74 C108,72 95,60 88,45 Z"
        fill={`url(#${id}-tail)`}
        opacity="0.85"
      />

      {/* Main body - elongated elegant fish */}
      <path
        d="M8,45 C8,45 22,16 50,16 C68,16 80,24 86,32 C92,40 92,50 86,58 C80,66 68,74 50,74 C22,74 8,45 8,45 Z"
        fill={`url(#${id}-body)`}
      />

      {/* Belly highlight */}
      <path
        d="M20,48 C26,58 38,64 50,64 C62,64 72,60 78,54"
        fill="none"
        stroke="#F7C873"
        strokeWidth="2"
        opacity="0.35"
        strokeLinecap="round"
      />

      {/* Top (dorsal) fin */}
      <path
        d="M42,16 C44,8 52,4 58,6 C56,10 54,14 52,16"
        fill="#D4691E"
        opacity="0.7"
      />

      {/* Bottom (pelvic) fin */}
      <path
        d="M48,74 C50,80 54,84 58,83 C56,79 54,76 52,74"
        fill="#D4691E"
        opacity="0.5"
      />

      {/* Pectoral fin */}
      <path
        d="M44,46 C40,54 36,60 32,62 C34,56 36,50 40,46"
        fill="#C75B10"
        opacity="0.4"
      />

      {/* Gill line */}
      <path
        d="M38,28 C40,36 40,54 38,62"
        fill="none"
        stroke="#C75B10"
        strokeWidth="1.5"
        opacity="0.3"
        strokeLinecap="round"
      />

      {/* Scale texture hints */}
      <path d="M50,32 Q56,38 50,44" fill="none" stroke="#D4691E" strokeWidth="0.8" opacity="0.2" />
      <path d="M58,30 Q64,38 58,46" fill="none" stroke="#D4691E" strokeWidth="0.8" opacity="0.15" />
      <path d="M66,34 Q72,40 66,48" fill="none" stroke="#D4691E" strokeWidth="0.8" opacity="0.1" />

      {/* Eye - expressive with glint */}
      <circle cx="26" cy="40" r="6" fill="white" />
      <circle cx="25" cy="39" r="3.5" fill="#1A1A1A" />
      <circle cx="23.5" cy="37.5" r="1.2" fill="white" opacity="0.9" />

      {/* Mouth line */}
      <path
        d="M10,45 Q12,47 14,46"
        fill="none"
        stroke="#C75B10"
        strokeWidth="1"
        opacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
