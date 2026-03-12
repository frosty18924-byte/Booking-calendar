'use client';

import { useRouter } from 'next/navigation';
import UniformButton from './UniformButton';
import Icon from './Icon';

export default function HomeButton() {
  const router = useRouter();

  const handleHome = () => {
    router.push('/dashboard');
  };

  return (
    <UniformButton
      variant="secondary"
      className="fixed top-16 left-4 z-50 p-2 shadow-md border"
      onClick={handleHome}
      title="Go to Dashboard"
      aria-label="Home"
    >
      <Icon name="home" className="w-6 h-6" />
    </UniformButton>
  );
}
