'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import UniformButton from '@/app/components/UniformButton';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

type TemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  updated_at: string | null;
  file_type: string | null;
};

export default function TemplatesGalleryPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateListRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    window.addEventListener('storage', checkTheme);
    return () => {
      window.removeEventListener('themeChange', checkTheme);
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role_tier').eq('id', user.id).single();
      setUserRole(profile?.role_tier ?? null);
    };
    loadRole();
  }, []);

  const canManage = hasPermission(userRole, 'TEMPLATES', 'canEdit');

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => {
      if (t.category && t.category.trim()) set.add(t.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const handle = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (category.trim()) params.set('category', category.trim());
        params.set('limit', '200');

        const res = await fetch(`/api/templates?${params.toString()}`, { method: 'GET' });
        const body = await res.json();

        if (!res.ok) {
          throw new Error(body?.error || 'Failed to load templates');
        }

        if (!cancelled) {
          setTemplates(body.templates || []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          setTemplates([]);
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, category]);

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 py-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }}
          className="rounded-[32px] border shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10 border-b" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight">Template Gallery</h1>
                </div>
                <p className={`mt-3 text-sm md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Search and open documents. You can view, print, or download a copy.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canManage && (
                  <UniformButton
                    variant="primary"
                    className="no-ui-motion shadow-md"
                    onClick={() => router.push('/templates/admin')}
                    title="Manage Templates"
                  >
                    Manage
                  </UniformButton>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Search</label>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or description…"
                  className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none transition-colors ${
                    isDark
                      ? 'bg-slate-950/40 border-slate-800 text-white placeholder:text-slate-500 focus:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none transition-colors ${
                    isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                  }`}
                >
                  <option value="">All</option>
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {error && (
              <div className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-red-900/50 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            {!error && loading && (
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Loading templates…</div>
            )}

            {!error && !loading && templates.length === 0 && (
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                No templates found.
              </div>
            )}

            {!error && !loading && templates.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/templates/${t.id}`)}
                    className={`text-left rounded-3xl border p-5 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      isDark
                        ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-950/60 hover:border-blue-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-lg font-extrabold truncate">{t.name}</h2>
                        {t.description && (
                          <p className={`mt-1 text-sm line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {t.category && (
                            <span className={`text-xs font-semibold rounded-full px-2 py-1 border ${isDark ? 'border-slate-700 text-slate-200 bg-slate-900/40' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                              {t.category}
                            </span>
                          )}
                          {(t.tags || []).slice(0, 4).map(tag => (
                            <span key={tag} className={`text-xs rounded-full px-2 py-1 border ${isDark ? 'border-slate-800 text-slate-300 bg-slate-950/30' : 'border-slate-200 text-slate-600 bg-white'}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center justify-center rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                        <Icon name="chevron-right" className="w-6 h-6" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
