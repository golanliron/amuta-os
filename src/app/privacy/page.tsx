import Link from 'next/link';

export const metadata = {
  title: 'מדיניות פרטיות | Goldfish',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-bold text-lg">Goldfish</span>
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">מדיניות פרטיות</h1>
        <p className="text-sm text-muted mb-6">עודכן לאחרונה: מאי 2026</p>

        <div className="space-y-8 text-sm text-text2 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text mb-3">1. כללי</h2>
            <p>Goldfish ("המערכת", "אנחנו") מחויבת להגנה על פרטיות המשתמשים. מדיניות זו מסבירה אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם ומהן זכויותיכם.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">2. מידע שאנו אוספים</h2>
            <ul className="list-disc pr-5 space-y-2">
              <li><strong>מידע ארגוני:</strong> שם הארגון, מספר עמותה, תחומי פעילות, ומסמכים שתעלו למערכת (תקנון, דוחות כספיים, תיאורי פרויקטים).</li>
              <li><strong>מידע אישי:</strong> שם, כתובת מייל, מספר טלפון — לצורך התחברות ותקשורת.</li>
              <li><strong>נתוני שימוש:</strong> פעולות במערכת, חיפושים, הגשות שנכתבו — לשיפור השירות.</li>
              <li><strong>קוקיז:</strong> עוגיות טכניות לניהול ההתחברות וחוויית המשתמש.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">3. שימוש במידע</h2>
            <p>אנו משתמשים במידע כדי:</p>
            <ul className="list-disc pr-5 space-y-2 mt-2">
              <li>להתאים קולות קוראים ומקורות מימון לארגון שלכם.</li>
              <li>לכתוב טיוטות הגשה מותאמות אישית.</li>
              <li>לשלוח התראות על דדליינים והזדמנויות חדשות.</li>
              <li>לשפר את המערכת ואת דיוק ההתאמות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">4. הפרדת מידע בין ארגונים</h2>
            <p>כל ארגון מנוהל בנפרד. המסמכים, הנתונים וההתאמות של ארגון אחד <strong>אינם נגישים</strong> לארגון אחר. אנו לא חולקים מידע בין לקוחות.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">5. אבטחת מידע</h2>
            <p>אנו משתמשים בהצפנה, אימות דו-שלבי, ותשתיות מאובטחות (Supabase, Vercel) להגנה על המידע שלכם. הגישה למידע מוגבלת לצוות המורשה בלבד.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">6. קוקיז (Cookies)</h2>
            <p>המערכת משתמשת בעוגיות טכניות הכרחיות בלבד:</p>
            <ul className="list-disc pr-5 space-y-2 mt-2">
              <li><strong>עוגיות הזדהות:</strong> לשמירה על ההתחברות שלכם.</li>
              <li><strong>עוגיות העדפות:</strong> לשמירת הגדרות ממשק.</li>
            </ul>
            <p className="mt-2">אנו <strong>לא</strong> משתמשים בעוגיות פרסומיות או עוקבות של צד שלישי.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">7. שיתוף מידע עם צדדים שלישיים</h2>
            <p>אנו לא מוכרים ולא משתפים מידע אישי או ארגוני. השירותים החיצוניים היחידים:</p>
            <ul className="list-disc pr-5 space-y-2 mt-2">
              <li><strong>Anthropic (Claude):</strong> לעיבוד שפה טבעית. המידע מועבר בצורה מאובטחת ולא נשמר אצלם.</li>
              <li><strong>Supabase:</strong> אחסון מאובטח של נתונים.</li>
              <li><strong>Vercel:</strong> אירוח המערכת.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">8. זכויותיכם</h2>
            <ul className="list-disc pr-5 space-y-2">
              <li>לבקש עותק מהמידע שאנו מחזיקים עליכם.</li>
              <li>לבקש מחיקת המידע שלכם מהמערכת.</li>
              <li>לבטל את המנוי בכל עת — ללא קנסות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">9. יצירת קשר</h2>
            <p>לשאלות בנושא פרטיות, פנו אלינו: <a href="mailto:support@goldfish.co.il" className="text-accent hover:underline">support@goldfish.co.il</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6 px-6 text-center">
        <p className="text-xs text-muted2">&copy; {new Date().getFullYear()} Goldfish. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
