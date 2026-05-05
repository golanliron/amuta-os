'use client';

const FEATURES = [
  {
    title: 'מצאו את העמותה שלכם',
    desc: 'חפשו לפי תחום, אזור, אוכלוסייה או גודל. Fishgold מתאים בין חברות לעמותות שעושות אימפקט אמיתי.',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    title: 'CSR חכם',
    desc: 'דוחות אימפקט, נתוני תוצאות, שקיפות מלאה. תדעו בדיוק לאן הכסף הולך ומה הוא עושה.',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  {
    title: 'שותפות, לא תרומה',
    desc: 'בנו קשר ישיר עם עמותות. ליווי לאורך זמן, לא צק חד פעמי. ככה נבנה אימפקט אמיתי.',
    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  },
];

export default function BusinessTab() {
  return (
    <div className="p-4 space-y-4">
      {/* Coming soon banner */}
      <div className="bg-accent/5 border border-accent/15 rounded-xl px-4 py-3 text-center">
        <div className="inline-flex items-center gap-2 text-accent text-xs font-bold mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          בקרוב
        </div>
        <h3 className="font-bold text-sm mb-1">לחברות ועסקים</h3>
        <p className="text-[11px] text-muted leading-relaxed">
          חברות שרוצות לעשות אימפקט חברתי יוכלו למצוא עמותות שמתאימות לחזון שלהן. הכל במקום אחד.
        </p>
      </div>

      {/* Features */}
      {FEATURES.map((f, i) => (
        <div key={i} className="bg-surf rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d={f.icon} />
              </svg>
            </div>
            <h4 className="text-xs font-semibold">{f.title}</h4>
          </div>
          <p className="text-[11px] text-muted leading-relaxed mr-10">{f.desc}</p>
        </div>
      ))}

      {/* CTA */}
      <div className="rounded-xl border border-dashed border-accent/30 bg-accent/5 p-4 text-center">
        <p className="text-xs font-medium mb-2">רוצים להיות הראשונים?</p>
        <p className="text-[10px] text-muted mb-3">השאירו מייל ונעדכן כשהפיצר יהיה מוכן</p>
        <div className="flex gap-1.5">
          <input
            type="email"
            placeholder="email@company.com"
            className="flex-1 px-3 py-2 text-[11px] border border-border rounded-lg bg-bg focus:border-accent focus:outline-none"
            dir="ltr"
          />
          <button className="px-3 py-2 text-[11px] font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
            עדכנו אותי
          </button>
        </div>
      </div>
    </div>
  );
}
