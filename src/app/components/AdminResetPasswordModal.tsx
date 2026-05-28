'use client';

import { useState } from 'react';

interface AdminResetPasswordModalProps {
  userId: string;
  userName: string;
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminResetPasswordModal({
  userId,
  userName,
  isDark,
  onClose,
  onSuccess,
}: AdminResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to reset the password for ${userName}? They will need to use this new password to log in.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50`} onClick={onClose}>
      <div
        className={`rounded-lg p-6 max-w-md w-full mx-4 ${
          isDark ? 'bg-slate-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Reset Password
        </h2>
        <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          For: <strong>{userName}</strong>
        </p>

        {success ? (
          <div className="text-center">
            <div className="text-green-600 dark:text-green-400 mb-2">
              ✓ Password reset successfully!
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              User will need to log in with the new password
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
                required
                minLength={8}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                At least 8 characters
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-2 border rounded ${
                  isDark
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                } disabled:opacity-50`}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
