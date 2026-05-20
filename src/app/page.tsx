'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TileButton from '@/app/components/TileButton';
import { PORTAL_FEATURES } from '@/lib/portalFeatures';
import { hasPermission } from '@/lib/permissions';
import { useCurrentUserProfile } from '@/lib/useCurrentUserProfile';

export default function LandingPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const { profile } = useCurrentUserProfile();
  const userRole = profile?.role_tier ?? null;
  const canAdmin = hasPermission(userRole, 'STAFF_MANAGEMENT', 'canView');

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
      className="min-h-screen px-4 pb-10 pt-28 sm:pt-10 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <div
          style={{
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: isDark ? '#1f2937' : '#e2e8f0',
          }}
          className="rounded-[32px] border shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">Cascade Portal</h1>
              <p className={`mt-2 text-sm md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Choose where you want to go.
              </p>
            </div>

            <div className={`mt-8 grid gap-4 md:gap-6 ${canAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              <TileButton
                title="Training"
                description="Open the training dashboard."
                emoji="🎓"
                showChevron
                onClick={() => router.push('/dashboard')}
              />

              {PORTAL_FEATURES.templates && (
                <TileButton
                  title="Template Gallery"
                  description="Search, view, print, or download templates."
                  emoji="📄"
                  showChevron
                  onClick={() => router.push('/templates')}
                />
              )}

              {canAdmin && (
                <TileButton
                  title="Admin"
                  description="Manage training staff and system tools."
                  emoji="🛠️"
                  showChevron
                  onClick={() => router.push('/admin-tools')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
