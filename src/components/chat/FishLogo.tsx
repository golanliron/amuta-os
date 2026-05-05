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
      viewBox="0 0 100 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sleek body - modern geometric fish */}
      <path
        d="M12,40 C12,40 30,14 58,14 C78,14 88,28 88,40 C88,52 78,66 58,66 C30,66 12,40 12,40 Z"
        fill="#EE7A30"
        opacity="0.9"
      />

      {/* Tail - clean angular */}
      <path d="M80,40 L96,24 L96,56 Z" fill="#EE7A30" opacity="0.7" />

      {/* Subtle gradient overlay on body */}
      <path
        d="M12,40 C12,40 30,14 58,14 C78,14 88,28 88,40"
        fill="none"
        stroke="#F5A623"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* Eye - minimal circle */}
      <circle cx="34" cy="37" r="5" fill="white" opacity="0.95" />
      <circle cx="33" cy="36" r="2.5" fill="#1A1A1A" />

      {/* Gill line - subtle */}
      <path d="M44,28 Q46,40 44,52" fill="none" stroke="#D96A20" strokeWidth="1" opacity="0.3" />

      {/* Fin - one clean line */}
      <path d="M50,14 L56,4 L62,14" fill="none" stroke="#EE7A30" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}
