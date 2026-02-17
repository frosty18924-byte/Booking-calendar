'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Icon from '@/app/components/Icon';

interface ArchiveItem {
  id: string;
  entity_type: string;
  entity_id: string;
  location_id: string | null;
  location_name: string | null;
  snapshot: any;
  deleted_by: string | null;
  deleted_at: string;
}

export default function ArchivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role_tier')
        .eq('id', userData.user.id)
        .single();

      if (profile?.role_tier !== 'admin') {
        router.push('/');
        return;
      }

      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
      await loadItems();
      setLoading(false);
    };

    init();
  }, [router]);

  async function loadItems() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const response = await fetch('/api/archive', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (response.ok && Array.isArray(result?.items)) {
      setItems(result.items);
    }
  }

  async function restoreItem(id: string) {
    setRestoringId(id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('You are not authenticated');

      const response = await fetch('/api/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deletedItemId: id }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to restore item');
      }
      await loadItems();
    } catch (error: any) {
      alert(`Restore failed: ${error.message}`);
    } finally {
      setRestoringId(null);
    }
  }

  function itemTitle(item: ArchiveItem): string {
    if (item.entity_type === 'location_training_course') {
      return item?.snapshot?.course_name || 'Removed Matrix Course';
    }
    if (item.entity_type === 'booking') {
      return 'Deleted Booking';
    }
    if (item.entity_type === 'profile') {
      return item?.snapshot?.profile?.full_name || 'Deleted Profile';
    }
    return item.entity_type;
  }

  if (loading) {
    return <div className={`p-8 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>Loading archive...</div>;
  }

  return (
    <main className={`min-h-screen p-4 pt-20 sm:p-8 sm:pt-24 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push('/dashboard')}
            className={`px-3 py-2 rounded font-semibold ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
            title="Go to Dashboard"
            aria-label="Home"
          >
            <Icon name="home" className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Archive</h1>
          <button
            onClick={loadItems}
            className="px-3 py-2 rounded font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <div className={`rounded-lg border p-6 text-center ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
            No archived items to restore.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-bold">{itemTitle(item)}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Type: {item.entity_type} {item.location_name ? `• Location: ${item.location_name}` : ''} • Deleted: {new Date(item.deleted_at).toLocaleString('en-GB')}
                    </div>
                  </div>
                  <button
                    onClick={() => restoreItem(item.id)}
                    disabled={restoringId === item.id}
                    className="px-3 py-2 rounded font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white"
                  >
                    {restoringId === item.id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
