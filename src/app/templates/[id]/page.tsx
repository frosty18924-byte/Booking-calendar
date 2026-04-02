'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UniformButton from '@/app/components/UniformButton';
import Icon from '@/app/components/Icon';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  updated_at: string | null;
  file_type: string | null;
  file_name: string | null;
  file_size: number | null;
};

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const templateId = params?.id;

  const [isDark, setIsDark] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

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

  const fileSummary = useMemo(() => {
    const parts: string[] = [];
    if (template?.file_type) parts.push(template.file_type);
    if (typeof template?.file_size === 'number') {
      const kb = template.file_size / 1024;
      const mb = kb / 1024;
      parts.push(mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(kb)} KB`);
    }
    return parts.join(' • ');
  }, [template?.file_size, template?.file_type]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!templateId) return;
      setLoading(true);
      setError(null);
      setViewUrl(null);

      try {
        const res = await fetch(`/api/templates/${encodeURIComponent(templateId)}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'Failed to load template');
        if (!cancelled) {
          setTemplate(body.template || null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          setTemplate(null);
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const loadSignedUrl = async (disposition: 'inline' | 'attachment') => {
    if (!templateId) return null;
    const params = new URLSearchParams();
    params.set('disposition', disposition);
    const res = await fetch(`/api/templates/${encodeURIComponent(templateId)}/signed-url?${params.toString()}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || 'Failed to sign URL');
    return body?.url as string;
  };

  const handleView = async () => {
    try {
      setViewLoading(true);
      const url = await loadSignedUrl('inline');
      setViewUrl(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setViewLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      const url = await loadSignedUrl('attachment');
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  const handlePrint = async () => {
    try {
      const url = await loadSignedUrl('inline');
      if (!url) return;
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) return;
      const tryPrint = () => {
        try {
          w.focus();
          w.print();
        } catch {
          // ignore
        }
      };
      window.setTimeout(tryPrint, 700);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 py-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }}
          className="rounded-[32px] border shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10 border-b" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <UniformButton
                    variant="secondary"
                    className="no-ui-motion border shadow-sm"
                    onClick={() => router.push('/templates')}
                    title="Back to gallery"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon name="back" className="w-5 h-5" />
                      <span className="hidden sm:inline">Back</span>
                    </span>
                  </UniformButton>
                  <h1 className="text-xl md:text-3xl font-black tracking-tight truncate">
                    {loading ? 'Loading…' : template?.name || 'Template'}
                  </h1>
                </div>

                {!loading && template?.description && (
                  <p className={`mt-3 text-sm md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{template.description}</p>
                )}

                {!loading && template && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {template.category && (
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 border ${isDark ? 'border-slate-700 text-slate-200 bg-slate-900/40' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                        {template.category}
                      </span>
                    )}
                    {(template.tags || []).map(tag => (
                      <span key={tag} className={`text-xs rounded-full px-2 py-1 border ${isDark ? 'border-slate-800 text-slate-300 bg-slate-950/30' : 'border-slate-200 text-slate-600 bg-white'}`}>
                        {tag}
                      </span>
                    ))}
                    {fileSummary && (
                      <span className={`text-xs rounded-full px-2 py-1 border ${isDark ? 'border-slate-800 text-slate-300 bg-slate-950/30' : 'border-slate-200 text-slate-600 bg-white'}`}>
                        {fileSummary}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <UniformButton
                  variant="primary"
                  className="no-ui-motion shadow-md"
                  onClick={handleView}
                  disabled={viewLoading || loading || !!error}
                >
                  {viewLoading ? 'Opening…' : 'View'}
                </UniformButton>
                <UniformButton variant="secondary" className="no-ui-motion border shadow-sm" onClick={handlePrint} disabled={loading || !!error}>
                  Print
                </UniformButton>
                <UniformButton variant="secondary" className="no-ui-motion border shadow-sm" onClick={handleCopy} disabled={loading || !!error}>
                  Copy
                </UniformButton>
                {canManage && (
                  <UniformButton variant="secondary" className="no-ui-motion border shadow-sm" onClick={() => router.push(`/templates/admin?selected=${templateId}`)}>
                    Manage
                  </UniformButton>
                )}
              </div>
            </div>

            {error && (
              <div className={`mt-5 rounded-2xl border p-4 text-sm ${isDark ? 'border-red-900/50 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}
          </div>

          <div className="p-6 md:p-10">
            {loading && <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Loading…</div>}
            {!loading && !error && !viewUrl && (
              <div className={`rounded-3xl border p-6 text-sm ${isDark ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                Select <span className="font-semibold">View</span> to open the document.
              </div>
            )}

            {!loading && !error && viewUrl && (
              <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-slate-800 bg-black/20' : 'border-slate-200 bg-white'}`}>
                <iframe title="Template preview" src={viewUrl} className="w-full h-[75vh]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

