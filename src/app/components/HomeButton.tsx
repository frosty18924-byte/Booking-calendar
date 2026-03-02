'use client';


import { useRouter } from 'next/navigation';
import UniformButton from './UniformButton';
import Icon from './Icon';

interface HomeButtonProps {
  fallbackPath?: string;
}

export default function HomeButton({ fallbackPath = '/dashboard' }: HomeButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackPath);
  };

  return (
    <UniformButton
      variant="secondary"
      className="fixed top-16 left-4 z-50 p-2 shadow-md border"
      onClick={handleBack}
      title="Go Back"
      aria-label="Back"
    >
      <Icon name="home" className="w-6 h-6" />
    </UniformButton>
  );
}
