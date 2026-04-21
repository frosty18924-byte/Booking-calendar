'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ITReferralForm } from '@/app/components/ITReferralForm';
import BackButton from '@/app/components/BackButton';

export default function ITReferralPage() {
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
        <div className="mt-8">
          <ITReferralForm
            checkedItems={[]}
            onSuccess={() => {
              setTimeout(() => {
                router.push('/');
              }, 2000);
            }}
          />
        </div>
      </div>
    </main>
  );
}
