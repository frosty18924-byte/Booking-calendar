'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/app/components/BackButton';
import TileButton from '@/app/components/TileButton';

export default function SupportPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    window.addEventListener('storage', checkTheme);
    return () => {
      window.removeEventListener('themeChange', checkTheme);
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  return (
    <main
      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}
      className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <BackButton />

        <div className="mt-8 mb-8">
          <h1
            style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            className="text-3xl font-bold mb-2"
          >
            Support
          </h1>
          <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
            Access support resources and tools
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex">
            <TileButton
              title="IT Support"
              description="Submit IT issues with troubleshooting guide."
              emoji="🖥️"
              showChevron
              onClick={() => router.push('/apps/it-referral')}
              className="w-full"
            />
          </div>

          <div className="flex">
            <TileButton
              title="IT Referrals"
              description="View and manage submitted IT support tickets."
              emoji="📋"
              showChevron
              onClick={() => router.push('/apps/it-referral-dashboard')}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
