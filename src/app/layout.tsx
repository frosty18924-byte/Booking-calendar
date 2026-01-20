import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cascade Training Portal",
  description: "Management and Analytics Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          } catch (_) {}
        `}} />
      </head>
      <body className="antialiased bg-white text-slate-900 dark:bg-[#0f172a] dark:text-white min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}