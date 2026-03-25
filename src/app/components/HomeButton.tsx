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
      style={{ position: 'fixed', top: '4rem', left: '1rem', zIndex: 1000 }}
      className="no-ui-motion p-2 shadow-md border"
      onClick={handleHome}
      title="Go to Dashboard"
      aria-label="Home"
    >
      <Icon name="home" className="w-6 h-6" />
    </UniformButton>
  );
}
