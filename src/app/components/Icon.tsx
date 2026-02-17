// Shared Icon component for consistent iconography
'use client';
import { FC } from 'react';

// Import Heroicons (MIT) for a modern, consistent look
import { ArrowLeftIcon, ChevronRightIcon, MenuIcon, XIcon, SunIcon, MoonIcon, LogoutIcon, HomeIcon } from './icons';

export type IconName =
  | 'back'
  | 'chevron-right'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'home';

const iconMap: Record<IconName, FC<{ className?: string }>> = {
  back: ArrowLeftIcon,
  'chevron-right': ChevronRightIcon,
  menu: MenuIcon,
  close: XIcon,
  sun: SunIcon,
  moon: MoonIcon,
  logout: LogoutIcon,
  home: HomeIcon,
};

export interface IconProps {
  name: IconName;
  className?: string;
}

const Icon: FC<IconProps> = ({ name, className = 'w-5 h-5' }) => {
  const Comp = iconMap[name];
  return <Comp className={className} />;
};

export default Icon;
