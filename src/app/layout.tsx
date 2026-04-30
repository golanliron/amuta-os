import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnyDay - שכבת ניהול חכמה מעל Monday.com",
  description:
    "דשבורד חכם עם ניתוח AI לבורדים שלך ב-Monday.com. גרפים, תובנות, והצעות אוטומציה.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-bg text-text font-dm antialiased">
        {children}
      </body>
    </html>
  );
}
