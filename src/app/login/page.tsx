'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from './actions';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = searchParams?.get('error');
    if (error === 'account_deleted') {
      setMessage('Your account has been deactivated. Please contact an administrator.');
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    try {
      const result = await login(formData); // Call the server action

      if (result?.error) {
        setMessage(result.error);
      } else {
        // On success, server action redirects to dashboard.
        setMessage('Signing you in...');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Staff Login</h1>
        <p className="text-gray-500 text-center mb-8 italic">Training Booking Portal</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:bg-blue-300"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-center text-sm font-semibold ${message.includes('Success') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
