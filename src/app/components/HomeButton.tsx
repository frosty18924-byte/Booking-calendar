'use client';


import { useRouter } from 'next/navigation';
import UniformButton from './UniformButton';
import Icon from './Icon';

export default function HomeButton() {
  const router = useRouter();
  return (
    <UniformButton
      variant="secondary"
      className="fixed top-16 left-4 z-50 p-2 shadow-md border"
      onClick={() => router.push('/dashboard')}
      title="Go to Dashboard"
      aria-label="Home"
    >
      <Icon name="home" className="w-6 h-6" />
    </UniformButton>
  );
}
