'use client';

import { useRouter } from 'next/navigation';

export default function HomeButton({ isDark }: { isDark: boolean }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/dashboard')}
      className={`fixed top-4 left-4 z-50 p-2 rounded-lg transition-colors duration-300 ${
        isDark 
          ? 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700' 
          : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200'
      } shadow-md`}
      title="Go to Dashboard"
      aria-label="Home"
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    </button>
  );
}
