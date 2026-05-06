'use client';

import { useState, useEffect } from 'react';
import FishLogo from './chat/FishLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

const statusTexts = [
  'מתחבר למקורות...',
  'סורק קולות קוראים...',
  'מכין את המערכת...',
  'מוכן.',
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setFading(true), 200);
          setTimeout(() => onComplete(), 800);
          return 100;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const idx = Math.min(Math.floor(progress / 28), statusTexts.length - 1);
    setStatusIdx(idx);
  }, [progress]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#EE7A30 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Fish - gentle floating animation */}
      <div className="relative mb-10">
        <div
          className="absolute -inset-8 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #EE7A30 0%, transparent 70%)',
          }}
        />
        <FishLogo size={80} className="swim" />
      </div>

      {/* Title - clean typography */}
      <h1
        className="text-4xl font-bold mb-1 tracking-tight"
        style={{ color: 'var(--color-text)' }}
      >
        Goldfish
      </h1>
      <p className="text-sm text-muted mb-10 font-light">
מילה של דג זהב
      </p>

      {/* Progress bar - thin and elegant */}
      <div className="w-48 mb-4">
        <div className="h-[2px] bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, background: '#EE7A30' }}
          />
        </div>
      </div>

      {/* Status text */}
      <p className="text-[11px] text-muted2 font-light">{statusTexts[statusIdx]}</p>
    </div>
  );
}
