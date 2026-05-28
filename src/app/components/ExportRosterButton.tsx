'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ExportRosterButtonProps {
  locationId: string;
  locationName?: string;
  isDark?: boolean;
}

export default function ExportRosterButton({
  locationId,
  locationName = 'Roster',
  isDark = true,
}: ExportRosterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    setError(null);
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError('Authentication failed');
        return;
      }

      const response = await fetch(`/api/roster/export?locationId=${locationId}&format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Export failed');
        return;
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster-${locationName}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={() => handleExport('csv')}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors ${
          isDark
            ? 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
            : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
        }`}
        title="Export roster as CSV"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {loading ? 'Exporting...' : 'Export'}
      </button>

      {error && (
        <div
          className={`absolute top-full mt-2 left-0 p-2 rounded text-xs ${
            isDark
              ? 'bg-red-900 text-red-200'
              : 'bg-red-100 text-red-700'
          } whitespace-nowrap`}
        >
          {error}
        </div>
      )}

      <div
        className={`absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${
          isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
        } rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg`}
      >
        Export roster as CSV
      </div>
    </div>
  );
}
