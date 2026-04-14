'use client';

import { useNavDrawer } from '@/app/components/NavDrawerProvider';
import Icon from './Icon';
import UniformButton from './UniformButton';
import { usePathname } from 'next/navigation';

export default function FixedHeader() {
  const { toggle } = useNavDrawer();
  const pathname = usePathname();
  
  // Hide header on auth and dashboard pages
  const isAuthPage = pathname === '/login' || pathname?.startsWith('/auth/');
  const isDashboardPage = pathname === '/dashboard';
  
  if (isAuthPage || isDashboardPage) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Menu button - visible on all sizes */}
        <UniformButton
          variant="secondary"
          className="no-ui-motion p-2 shadow-sm border"
          onClick={toggle}
          title="Menu"
          aria-label="Menu"
        >
          <Icon name="menu" className="w-6 h-6" />
        </UniformButton>
        
        {/* Center title area for future use */}
        <div className="flex-1" />
        
        {/* Right side for future controls */}
        <div />
      </div>
    </header>
  );
}
