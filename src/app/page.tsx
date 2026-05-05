'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FishLogo from '@/components/chat/FishLogo';

// ===== Scroll reveal hook =====
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function RevealSection({
  children,
  className = '',
  type = 'reveal',
  delay = '',
}: {
  children: React.ReactNode;
  className?: string;
  type?: 'reveal' | 'reveal-scale' | 'reveal-right' | 'reveal-left';
  delay?: string;
}) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className={`${type} ${delay} ${className}`}>
      {children}
    </div>
  );
}

// ===== Counter animation =====
function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  const animate = useCallback(() => {
    if (animated.current || !ref.current) return;
    animated.current = true;
    const num = parseInt(target.replace(/[^0-9]/g, ''));
    if (isNaN(num)) {
      ref.current.textContent = target;
      return;
    }
    const duration = 1500;
    const start = performance.now();
    const prefix = target.startsWith('<') ? '< ' : '';
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(num * eased);
      if (ref.current) ref.current.textContent = `${prefix}${current}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, suffix]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) animate(); },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return <span ref={ref}>0</span>;
}

// ===== Data =====
const STATS = [
  { number: '428', suffix: '+', label: 'קולות קוראים במאגר' },
  { number: '75', suffix: '', label: 'מקורות מימון' },
  { number: '3', suffix: ' דק׳', label: 'לטיוטת הגשה ראשונה', prefix: '< ' },
];

const ADVANTAGES = [
  {
    title: 'חוסך 90% מהזמן',
    desc: 'מה שלוקח 3 שעות חיפוש + 2 ימי כתיבה, Fishgold עושה בדקות.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'מכיר 75 מקורות מימון',
    desc: 'ממשלתי, פרטי, בינלאומי, עסקי. Fishgold מכסה את כולם.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
  {
    title: 'לא שוכח כלום',
    desc: 'מעלים מסמך פעם אחת. Fishgold זוכר כל מספר, כל פרויקט, כל הישג.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: 'התאמה אישית 100%',
    desc: 'כל קול קורא מקבל ציון התאמה לפי הנתונים של הארגון שלך. לא סתם רשימה.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: 'כותב בלי בולשיט',
    desc: 'מספרים, עובדות, מבנה ברור. לא "אנו שמחים להגיש", אלא תכלס.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: 'שומר על דדליינים',
    desc: 'לוח שנה חי. התראות. אף הזדמנות לא נופלת בין הכיסאות.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: 'מאתר קולות קוראים',
    desc: 'סורק מאות מקורות ומוצא בדיוק מה מתאים לארגון שלך. לא סתם רשימה, התאמה אישית.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'כותב כמו מקצוען',
    desc: 'קורא את הקול הקורא, מבין מה מבקשים, וכותב טיוטה מלאה. בלי בלאבלא, מספרים ותכלס.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'מכיר את הארגון שלך',
    desc: 'מעלים מסמכים פעם אחת. Fishgold זוכר הכל ויודע לשלוף כל נתון ברגע.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: 'מעיר אותך',
    desc: 'דדליינים, דחיפות, הזדמנויות שעומדות לפוג. Fishgold לא מחכה שתשאלי.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-bg overflow-hidden" dir="rtl">
      {/* Floating bubbles background - very subtle, small */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[50%] left-[15%] w-10 h-10 rounded-full bg-accent/5 float-bubble-2" />
        <div className="absolute bottom-[30%] right-[70%] w-8 h-8 rounded-full bg-accent/5 float-bubble-3" />
      </div>

      {/* Subtle dot pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#EE7A30 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-40 px-6 py-4 max-w-6xl mx-auto fade-up bg-bg/80 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <FishLogo size={32} />
            <span className="font-bold text-lg tracking-tight">Fishgold</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#why" className="text-sm text-text2 hover:text-accent transition-colors">למה Fishgold</a>
            <a href="#how" className="text-sm text-text2 hover:text-accent transition-colors">איך זה עובד</a>
            <a href="#whatsapp" className="text-sm text-text2 hover:text-accent transition-colors">גם בוואטסאפ שלך</a>
            <a href="#business" className="text-sm text-text2 hover:text-accent transition-colors">לעסקים</a>
            <a href="#pricing" className="text-sm text-text2 hover:text-accent transition-colors">מחירים</a>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition-all hover:scale-105 active:scale-95"
            >
              כניסה למערכת
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 rounded-xl hover:bg-surf2 transition-colors"
            aria-label="תפריט"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenu ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden mt-3 bg-surf border border-border rounded-2xl p-4 space-y-3 shadow-lg">
            <a href="#why" onClick={() => setMobileMenu(false)} className="block text-sm font-medium py-2 px-3 rounded-xl hover:bg-surf2 transition-colors">למה Fishgold</a>
            <a href="#how" onClick={() => setMobileMenu(false)} className="block text-sm font-medium py-2 px-3 rounded-xl hover:bg-surf2 transition-colors">איך זה עובד</a>
            <a href="#whatsapp" onClick={() => setMobileMenu(false)} className="block text-sm font-medium py-2 px-3 rounded-xl hover:bg-surf2 transition-colors">גם בוואטסאפ שלך</a>
            <a href="#business" onClick={() => setMobileMenu(false)} className="block text-sm font-medium py-2 px-3 rounded-xl hover:bg-surf2 transition-colors">לעסקים</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-sm font-medium py-2 px-3 rounded-xl hover:bg-surf2 transition-colors">מחירים</a>
            <button
              onClick={() => { setMobileMenu(false); router.push('/dashboard'); }}
              className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition-all"
            >
              כניסה למערכת
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        {/* Glow behind fish */}
        <div className="relative w-fit mx-auto mb-8 fade-up">
          <div
            className="absolute -inset-16 rounded-full glow-pulse"
            style={{ background: 'radial-gradient(circle, #EE7A30 0%, transparent 70%)' }}
          />
          <FishLogo size={110} className="swim relative" />
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight mb-3 tracking-tight fade-up" style={{ animationDelay: '0.15s' }}>
          Fishgold
        </h1>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-2 shimmer-text fade-up" style={{ animationDelay: '0.3s' }}>
          דג זהב עתיק שדג מענקים מהמים
        </h2>
        <p className="text-sm text-muted mb-8 fade-up" style={{ animationDelay: '0.35s' }}>מילה של דג זהב.</p>

        <p className="text-lg sm:text-xl text-text2 max-w-2xl mx-auto mb-12 leading-relaxed fade-up" style={{ animationDelay: '0.45s' }}>
          נשמה עתיקה. חשיבה חדה. סורק 428 מקורות מימון כל יום, מוצא מה מתאים לך, וכותב הגשות שקרנות אוהבות.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 fade-up" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => router.push('/dashboard')}
            className="group w-full sm:w-auto px-8 py-4 bg-accent text-white font-semibold rounded-2xl text-base hover:bg-accent-hover transition-all hover:shadow-xl hover:shadow-accent/25 hover:scale-105 active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              התחילו עכשיו
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:-translate-x-1">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </span>
          </button>
          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-4 border border-border text-text2 font-medium rounded-2xl text-base hover:bg-surf2 transition-all hover:border-accent/30"
          >
            תוכניות ומחירים
          </a>
        </div>
      </section>

      {/* About Fishgold - Chat simulation */}
      <RevealSection className="relative z-10 max-w-3xl mx-auto px-6 pb-20" type="reveal-scale">
        <div className="bg-surf border border-border rounded-3xl overflow-hidden border-glow relative">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surf2/50">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <FishLogo size={28} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green rounded-full border-2 border-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm">Fishgold</h3>
              <p className="text-[10px] text-green font-medium">אונליין עכשיו</p>
            </div>
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-border2" />
              <div className="w-2.5 h-2.5 rounded-full bg-border2" />
              <div className="w-2.5 h-2.5 rounded-full bg-border2" />
            </div>
          </div>

          {/* Chat messages */}
          <div className="p-6 space-y-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)' }}>
            {/* User message */}
            <div className="flex justify-start">
              <div className="bg-accent text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm">
                מי אתה בעצם?
              </div>
            </div>

            {/* Fishgold reply 1 */}
            <div className="flex justify-end gap-2">
              <div className="bg-surf2 border border-border rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] text-sm leading-relaxed">
                לא בינה מלאכותית. דג זהב עתיק. חי מאות שנים בין קרנות, ממשלות ותורמים. תשלחי חומרים. תקנון, דוחות, הגשות, מה שיש. שמעתי את זה כבר אלף פעם, אבל בואי נראה מה יש לך.
              </div>
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-auto">
                <FishLogo size={18} />
              </div>
            </div>

            {/* User message 2 */}
            <div className="flex justify-start">
              <div className="bg-accent text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm">
                ומה אתה יודע לעשות?
              </div>
            </div>

            {/* Fishgold reply 2 - capabilities */}
            <div className="flex justify-end gap-2">
              <div className="bg-surf2 border border-border rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] text-sm leading-relaxed space-y-3">
                <p>אני לא נחמד וגם לא מפרגן סתם. ככה זה:</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(238,122,48,0.1)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE7A30" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-[13px]">מאתר</span>
                      <span className="text-muted text-[13px]"> קולות קוראים שמותאמים בדיוק לארגון שלך</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(238,122,48,0.1)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE7A30" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-[13px]">כותב</span>
                      <span className="text-muted text-[13px]"> הגשות כמו מקצוען. מספרים, לא בלאבלא</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(238,122,48,0.1)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE7A30" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-[13px]">מכיר</span>
                      <span className="text-muted text-[13px]"> את הארגון שלך יותר טוב ממך</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(238,122,48,0.1)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE7A30" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-[13px]">מעיר</span>
                      <span className="text-muted text-[13px]"> דדליינים ודחיפות. לא מחכה שתשאלי</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-auto">
                <FishLogo size={18} />
              </div>
            </div>

            {/* Typing indicator */}
            <div className="flex justify-end gap-2">
              <div className="bg-surf2 border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="text-[11px] text-muted ml-2">מקליד</span>
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-auto">
                <FishLogo size={18} />
              </div>
            </div>
          </div>

          {/* Fake input bar */}
          <div className="px-6 py-3 border-t border-border bg-surf flex items-center gap-2">
            <div className="flex-1 bg-surf2 rounded-xl px-4 py-2.5 text-[13px] text-muted2">
              כתבו לFishgold...
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 bg-accent text-white text-[13px] font-medium rounded-xl hover:bg-accent-hover transition-all hover:scale-105 active:scale-95"
            >
              נסו עכשיו
            </button>
          </div>
        </div>
      </RevealSection>

      {/* Demo - matched opportunities */}
      <RevealSection className="relative z-10 max-w-3xl mx-auto px-6 pb-20" type="reveal-scale">
        <div className="bg-surf border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surf2/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-[13px] font-semibold">נמצאו 12 קולות קוראים שמתאימים לפעילות שלכם</span>
            </div>
            <span className="text-[11px] text-muted">עודכן היום</span>
          </div>

          {/* Fake results list */}
          <div className="divide-y divide-border">
            {[
              { name: 'אתר התמיכות הממשלתי, תמיכה בפעילות רוחנית-תרבותית 2026', score: 94, deadline: '15.06.26', amount: '₪300,000', tag: 'חם' },
              { name: 'משרד החינוך, האצת טכנולוגיות למידה מותאמת אישית', score: 91, deadline: '30.06.26', amount: '₪500,000', tag: 'חדש' },
              { name: 'ג׳וינט תבת, פיילוט תעסוקה בחינוך צפון', score: 87, deadline: '08.07.26', amount: '₪200,000', tag: '' },
              { name: 'קק"ל, פרויקטים קהילתיים-סביבתיים 2026-2027', score: 83, deadline: '20.07.26', amount: '₪150,000', tag: '' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-surf2/30 transition-colors">
                {/* Score */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                  style={{ background: item.score >= 90 ? '#22C55E' : item.score >= 85 ? '#EE7A30' : '#3B82F6' }}
                >
                  {item.score}%
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold truncate">{item.name}</p>
                    {item.tag && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.tag === 'חם' ? 'bg-red-light text-red' : 'bg-blue-light text-blue'}`}>
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted">דדליין: {item.deadline}</span>
                    <span className="text-[11px] text-muted">עד {item.amount}</span>
                  </div>
                </div>
                {/* Action */}
                <button className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent-light transition-colors">
                  כתוב הגשה
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-surf2/30 flex items-center justify-between">
            <span className="text-[11px] text-muted">+ 8 קולות קוראים נוספים</span>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-[12px] font-medium text-accent hover:underline"
            >
              צפו בכולם →
            </button>
          </div>
        </div>
      </RevealSection>

      {/* Stats with animated counters + swimming fish */}
      <RevealSection className="relative z-10 max-w-3xl mx-auto px-6 pb-20">
        <p className="text-center text-sm text-accent font-medium mb-4 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          סורק קולות קוראים כל יום
        </p>
        <div className="relative">
          {/* Swimming fish that appears when stats come into view */}
          <div className="absolute -top-6 left-0 right-0 pointer-events-none overflow-hidden h-12 z-10">
            <div className="swim-across inline-block">
              <FishLogo size={32} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className={`text-center py-6 px-2 rounded-2xl bg-surf border border-border hover:border-accent/30 transition-all hover:shadow-md stagger-${i + 1}`}>
                <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: '#EE7A30' }}>
                  {s.prefix || ''}<AnimatedCounter target={s.number} suffix={s.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* Advantages */}
      <section id="why" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <RevealSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">למה Fishgold?</h2>
          <p className="text-center text-muted mb-12 max-w-lg mx-auto">
            6 סיבות לתת לדג עתיק לעשות את העבודה
          </p>
        </RevealSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADVANTAGES.map((a, i) => (
            <RevealSection key={i} type="reveal-scale" delay={`stagger-${i + 1}`}>
              <div className="bg-surf border border-border rounded-2xl p-5 hover:border-accent/30 transition-all hover:shadow-md hover:-translate-y-1 h-full">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(238,122,48,0.08)', color: '#EE7A30' }}
                >
                  {a.icon}
                </div>
                <h3 className="font-bold text-sm mb-1.5">{a.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{a.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <RevealSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">איך זה עובד?</h2>
          <p className="text-center text-muted mb-12 max-w-xl mx-auto">
            שלושה צעדים. מהרשמה להגשה מלאה.
          </p>
        </RevealSection>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'מעלים מסמכים',
              desc: 'תקנון, דוח כספי, תיאורי פרויקטים. Fishgold קורא, מנתח, וזוכר הכל.',
            },
            {
              step: '2',
              title: 'מקבלים התאמות',
              desc: 'ציון התאמה אישי לכל קול קורא. רואים מה שווה ומה לא.',
            },
            {
              step: '3',
              title: 'לוחצים "כתוב הגשה"',
              desc: 'Fishgold קורא את הקול הקורא, ומוציא טיוטה מלאה. תוך דקות.',
            },
          ].map((item, i) => (
            <RevealSection key={item.step} type="reveal-scale" delay={`stagger-${i + 1}`}>
              <div className="bg-surf border border-border rounded-2xl p-6 text-center hover:border-accent/30 transition-all hover:shadow-md hover:-translate-y-1 h-full">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg text-white transition-transform hover:scale-110"
                  style={{ background: '#EE7A30' }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <RevealSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">מה Fishgold עושה</h2>
        </RevealSection>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <RevealSection key={i} type={i % 2 === 0 ? 'reveal-right' : 'reveal-left'} delay={`stagger-${i + 1}`}>
              <div className="flex gap-4 bg-surf border border-border rounded-2xl p-5 hover:border-accent/30 transition-all hover:shadow-md hover:-translate-y-0.5 h-full">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(238,122,48,0.08)', color: '#EE7A30' }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* WhatsApp Bot section */}
      <section id="whatsapp" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <RevealSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">גם בוואטסאפ</h2>
          <p className="text-center text-muted mb-12 max-w-lg mx-auto">
            לא צריך לפתוח דפדפן. Fishgold עובד ישר מהוואטסאפ.
          </p>
        </RevealSection>

        <div className="grid sm:grid-cols-2 gap-6 items-center">
          {/* WhatsApp chat simulation */}
          <RevealSection type="reveal-right">
            <div className="bg-[#ECE5DD] rounded-2xl overflow-hidden border border-border shadow-lg max-w-sm mx-auto">
              {/* WhatsApp header */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#075E54' }}>
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <FishLogo size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Fishgold</p>
                  <p className="text-white/70 text-[10px]">online</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-3 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23d4cfc4\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'400\' height=\'400\'/%3E%3C/svg%3E")' }}>
                {/* User message */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-br-sm px-3 py-2 max-w-[80%] shadow-sm">
                    <p className="text-[12px]">יש משהו חדש בשבילנו?</p>
                    <p className="text-[9px] text-gray-400 text-left mt-0.5">10:32</p>
                  </div>
                </div>

                {/* Fishgold reply */}
                <div className="flex justify-end">
                  <div className="rounded-lg rounded-bl-sm px-3 py-2 max-w-[85%] shadow-sm" style={{ background: '#DCF8C6' }}>
                    <p className="text-[12px] leading-relaxed">
                      כן. 3 קולות קוראים חדשים השבוע שמתאימים לכם:<br /><br />
                      1. *משרד החינוך* טכנולוגיות למידה. ציון 91%. דדליין 30.06<br />
                      2. *ג׳וינט תבת* תעסוקה בחינוך. ציון 87%. דדליין 08.07<br />
                      3. *קק״ל* פרויקטים קהילתיים. ציון 83%<br /><br />
                      רוצה שאכתוב טיוטה למשרד החינוך? זה הכי דחוף.
                    </p>
                    <p className="text-[9px] text-gray-500 text-left mt-0.5">10:32</p>
                  </div>
                </div>

                {/* User reply */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-br-sm px-3 py-2 max-w-[80%] shadow-sm">
                    <p className="text-[12px]">כן תתחיל עם משרד החינוך</p>
                    <p className="text-[9px] text-gray-400 text-left mt-0.5">10:33</p>
                  </div>
                </div>

                {/* Fishgold writing */}
                <div className="flex justify-end">
                  <div className="rounded-lg rounded-bl-sm px-3 py-2 shadow-sm" style={{ background: '#DCF8C6' }}>
                    <p className="text-[12px]">כותב. 3 דקות.</p>
                    <p className="text-[9px] text-gray-500 text-left mt-0.5">10:33</p>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Benefits list */}
          <RevealSection type="reveal-left">
            <div className="space-y-5">
              {[
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
                  title: 'מתכתב איתך על הארגון',
                  desc: 'שואל שאלות, לומד, בונה פרופיל. ככל שהוא יודע יותר, ההתאמות יותר מדויקות.',
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
                  title: 'מתריע על הגשות דחופות',
                  desc: 'דדליין עוד 5 ימים? Fishgold שולח הודעה. לא מחכה שתפתחי את המחשב.',
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
                  title: 'כותב טיוטות ישר בצ׳אט',
                  desc: 'שולח "תכתוב הגשה לקק״ל" ומקבל טיוטה מלאה. ישר לוואטסאפ.',
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
                  title: 'שולף מידע מהמערכת',
                  desc: 'כל המסמכים, הפרופיל, ההיסטוריה, זמינים לו גם בוואטסאפ. לא צריך דפדפן.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-0.5">{item.title}</h4>
                    <p className="text-[13px] text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* For Businesses */}
      <section id="business" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <RevealSection>
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-bold px-3 py-1 rounded-full mb-4 mx-auto block w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            בקרוב
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">לחברות ועסקים</h2>
          <p className="text-center text-muted mb-12 max-w-lg mx-auto">
            לא רק עמותות מחפשות מימון. גם מימון מחפש עמותות.
          </p>
        </RevealSection>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
              title: 'מצאו את העמותה שלכם',
              desc: 'חפשו לפי תחום, אזור, אוכלוסייה או גודל. Fishgold מתאים בין חברות לעמותות שעושות אימפקט אמיתי.',
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              ),
              title: 'CSR חכם',
              desc: 'דוחות אימפקט, נתוני תוצאות, שקיפות מלאה. תדעו בדיוק לאן הכסף הולך ומה הוא עושה.',
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              ),
              title: 'שותפות, לא תרומה',
              desc: 'בנו קשר ישיר עם עמותות. ליווי לאורך זמן, לא צ׳ק חד פעמי. ככה נבנה אימפקט אמיתי.',
            },
          ].map((item, i) => (
            <RevealSection key={i} type="reveal-scale" delay={`stagger-${i + 1}`}>
              <div className="bg-surf border border-dashed border-accent/30 rounded-2xl p-6 hover:border-accent/50 transition-all hover:shadow-md h-full text-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(238,122,48,0.08)', color: '#EE7A30' }}
                >
                  {item.icon}
                </div>
                <h3 className="font-bold text-sm mb-2">{item.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{item.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection className="mt-8 text-center">
          <p className="text-sm text-muted mb-3">רוצים להיות מהראשונים?</p>
          <a
            href="mailto:info@fishgold.co.il?subject=עניין בפלטפורמה לעסקים"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-accent text-accent font-semibold rounded-xl hover:bg-accent hover:text-white transition-all"
          >
            השאירו פרטים
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
        </RevealSection>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <RevealSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">מחיר</h2>
          <p className="text-center text-muted mb-12 max-w-lg mx-auto">
            מחיר אחד. הכל כלול.
          </p>
        </RevealSection>

        <div className="max-w-md mx-auto">
          <RevealSection type="reveal-scale" delay="stagger-1">
            <div className="bg-surf border-2 border-accent rounded-2xl p-8 hover:shadow-lg transition-all relative flex flex-col">
              <div className="mb-5 text-center">
                <h3 className="font-bold text-xl mb-1">Goldfish</h3>
                <p className="text-sm text-muted">מילה של דג זהב.</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-4xl font-extrabold" style={{ color: '#EE7A30' }}>750</span>
                <span className="text-sm text-muted mr-1">₪ / חודש</span>
                <p className="text-[11px] text-muted mt-1">או 6,000₪ לשנה</p>
              </div>
              <ul className="space-y-2.5 text-[13px] text-text2 mb-8 flex-1">
                {[
                  'כל קולות הקוראים, מתעדכנים ונסרקים כל יום',
                  'העלאת מסמכים ללא הגבלה',
                  'ציון התאמה מתקדם + נימוקים',
                  'כתיבת הגשות מלאות',
                  'לוח דדליינים + התראות מייל',
                  'סנכרון Google Calendar',
                  'צ׳אט ללא הגבלה',
                  'וואטסאפ ישיר להתכתבות עם Fishgold',
                  'עד 5 משתמשים',
                  'חיבור Google Drive',
                  'דוחות גיוס חודשיים',
                  'אונבורדינג אישי',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EE7A30" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/dashboard')}
                className="group w-full py-3 bg-accent text-white font-semibold rounded-xl text-base hover:bg-accent-hover transition-all hover:shadow-md hover:scale-[1.02] active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  התחילו עכשיו
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:-translate-x-1">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Fishgold', text: 'דג זהב עתיק שדג מענקים מהמים. מערכת גיוס משאבים חכמה לעמותות.', url: 'https://amuta-os.vercel.app' });
                  } else {
                    navigator.clipboard.writeText('https://amuta-os.vercel.app');
                    alert('הלינק הועתק!');
                  }
                }}
                className="w-full py-3 border border-border text-text2 font-medium rounded-xl text-sm hover:bg-surf2 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                תהיה חבר. תעביר את Goldfish לחבר
              </button>
            </div>
          </RevealSection>
        </div>

      </section>

      {/* CTA */}
      <RevealSection className="relative z-10 max-w-3xl mx-auto px-6 pb-24 text-center" type="reveal-scale">
        <div className="bg-surf border border-border rounded-3xl p-10 sm:p-14 border-glow relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'radial-gradient(circle at center, #EE7A30, transparent 70%)' }} />
          <FishLogo size={56} className="swim mx-auto mb-6 relative" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 relative">750₪ בחודש. הדג שדג לך מענקים.</h2>
          <p className="text-sm text-muted2 mb-1 relative">סורק, מתאים, כותב הגשות. כל יום, בלי לבזבז לך זמן.</p>
          <p className="text-muted mb-8 max-w-md mx-auto relative">
            בלי התחייבות. אפשר לבטל בכל רגע.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="group relative px-10 py-4 bg-accent text-white font-semibold rounded-2xl text-base hover:bg-accent-hover transition-all hover:shadow-xl hover:shadow-accent/25 hover:scale-105 active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              התחילו עכשיו
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:-translate-x-1">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </span>
          </button>
        </div>
      </RevealSection>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <FishLogo size={20} />
            <span className="text-sm font-medium">Fishgold</span>
            <span className="text-xs text-muted">| מילה של דג זהב</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="#how" className="text-xs text-muted2 hover:text-accent transition-colors">איך זה עובד</a>
            <a href="#pricing" className="text-xs text-muted2 hover:text-accent transition-colors">מחירים</a>
            <Link href="/privacy" className="text-xs text-muted2 hover:text-accent transition-colors">מדיניות פרטיות</Link>
            <p className="text-xs text-muted2">&copy; {new Date().getFullYear()} Fishgold. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>

      {/* Floating fish - back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 left-6 z-50 w-20 h-20 bg-[#FFF3E0] border-2 border-accent/20 rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
        aria-label="חזרה למעלה"
      >
        <FishLogo size={44} />
      </button>
    </div>
  );
}
