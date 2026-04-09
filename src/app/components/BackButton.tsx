'use client';

import { useRouter } from 'next/navigation';
import UniformButton from '@/app/components/UniformButton';
import Icon from '@/app/components/Icon';

type Props = {
  to?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  labelClassName?: string;
  title?: string;
};

export default function BackButton({
  to,
  onClick,
  label = 'Back',
  className = '',
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  labelClassName = '',
  title,
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) return onClick();
    if (to) return router.push(to);
    router.back();
  };

  return (
    <UniformButton
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`no-ui-motion border shadow-sm gap-2 ${className}`.trim()}
      aria-label={label}
      title={title ?? label}
    >
      {showIcon ? <Icon name="back" className="w-5 h-5" /> : null}
      <span className={labelClassName}>{label}</span>
    </UniformButton>
  );
}
