'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import UniformButton from '@/app/components/UniformButton';
import Icon from '@/app/components/Icon';
import { supabase } from '@/lib/supabase';

type TemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  updated_at: string | null;
  file_type: string | null;
};

function tagsToString(tags: string[] | null): string {
  return (tags || []).join(', ');
}

export default function TemplatesAdminClient({ selectedFromQuery }: { selectedFromQuery: string }) {
  const router = useRouter();

  const [isDark, setIsDark] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [templates, setTemplates] = useState<TemplateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo(() => templates.find(t => t.id === selectedId) || null, [templates, selectedId]);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
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
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('role_tier').eq('id', user.id).single();
        const r = (profile?.role_tier || null) as string | null;
        setRole(r);
        setAuthLoading(false);
        if (r !== 'admin') router.push('/templates');
      } catch {
        setAuthLoading(false);
        router.push('/templates');
      }
    };
    loadRole();
  }, [router]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/templates?limit=200');
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to load templates');
      setTemplates(body.templates || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== 'admin') return;
    loadTemplates();
  }, [role]);

  useEffect(() => {
    if (selectedFromQuery) setSelectedId(selectedFromQuery);
  }, [selectedFromQuery]);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name || '');
    setEditDescription(selected.description || '');
    setEditCategory(selected.category || '');
    setEditTags(tagsToString(selected.tags));
    setEditFile(null);
  }, [selected?.id]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('name', editName.trim());
      form.set('description', editDescription.trim());
      form.set('category', editCategory.trim());
      form.set('tags', editTags);
      if (editFile) form.set('file', editFile);

      const res = await fetch(`/api/templates/${encodeURIComponent(selected.id)}`, { method: 'PATCH', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to save template');

      await loadTemplates();
      setSelectedId(selected.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      if (!newFile) throw new Error('Choose a file to upload');
      if (!newName.trim()) throw new Error('Name is required');

      const form = new FormData();
      form.set('name', newName.trim());
      form.set('description', newDescription.trim());
      form.set('category', newCategory.trim());
      form.set('tags', newTags);
      form.set('file', newFile);

      const res = await fetch('/api/templates', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to create template');

      setNewName('');
      setNewDescription('');
      setNewCategory('');
      setNewTags('');
      setNewFile(null);

      await loadTemplates();
      if (body?.template?.id) setSelectedId(body.template.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="max-w-5xl mx-auto text-sm text-slate-600">Loading…</div>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 py-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }}
          className="rounded-[32px] border shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10 border-b" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
            <div className="flex items-center justify-between gap-4">
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
                <h1 className="text-2xl md:text-4xl font-black tracking-tight">Manage Templates</h1>
              </div>
              <UniformButton variant="secondary" className="no-ui-motion border shadow-sm" onClick={loadTemplates} disabled={loading}>
                Refresh
              </UniformButton>
            </div>
            <p className={`mt-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Rename templates or upload a new version of the document.
            </p>
          </div>

          <div className="p-6 md:p-10 grid gap-6 lg:grid-cols-2">
            <section className={`rounded-3xl border p-5 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'}`}>
              <h2 className="text-lg font-extrabold">Existing</h2>
              <div className="mt-4">
                {error && (
                  <div className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-red-900/50 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {error}
                  </div>
                )}
                {loading && <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Loading…</div>}
                {!loading && templates.length === 0 && (
                  <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No templates yet.</div>
                )}
                {!loading && templates.length > 0 && (
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none transition-colors ${
                      isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                    }`}
                  >
                    <option value="">Select a template…</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selected && (
                <div className="mt-5 grid gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Name</label>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                        isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Description</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={3}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                        isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                      }`}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Category</label>
                      <input
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                        placeholder="e.g. Training"
                        className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                          isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tags</label>
                      <input
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        placeholder="comma, separated, tags"
                        className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                          isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Replace document (optional)</label>
                    <input
                      type="file"
                      onChange={e => setEditFile(e.target.files?.[0] || null)}
                      className={`block w-full text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                    />
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      This replaces the stored file for this template.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <UniformButton variant="primary" className="no-ui-motion shadow-md" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </UniformButton>
                    <UniformButton variant="secondary" className="no-ui-motion border shadow-sm" onClick={() => router.push(`/templates/${selected.id}`)}>
                      Open
                    </UniformButton>
                  </div>
                </div>
              )}
            </section>

            <section className={`rounded-3xl border p-5 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'}`}>
              <h2 className="text-lg font-extrabold">New Template</h2>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Name</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                      isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Description</label>
                  <textarea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    rows={3}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                      isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                    }`}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Category</label>
                    <input
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      placeholder="e.g. Training"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                        isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tags</label>
                    <input
                      value={newTags}
                      onChange={e => setNewTags(e.target.value)}
                      placeholder="comma, separated, tags"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none ${
                        isDark ? 'bg-slate-950/40 border-slate-800 text-white focus:border-slate-600' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Document</label>
                  <input
                    type="file"
                    onChange={e => setNewFile(e.target.files?.[0] || null)}
                    className={`block w-full text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <UniformButton variant="primary" className="no-ui-motion shadow-md" onClick={handleCreate} disabled={creating}>
                    {creating ? 'Uploading…' : 'Create'}
                  </UniformButton>
                  <UniformButton variant="secondary" className="no-ui-motion border shadow-sm" onClick={() => router.push('/templates')}>
                    Gallery
                  </UniformButton>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

