'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SpaceManagerModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'houses' | 'venues'>('houses');
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Table depends on which tab is active
  const tableName = activeTab === 'houses' ? 'locations' : 'venues';

  useEffect(() => {
    checkTheme();
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    const handleThemeChange = (event: any) => {
      setIsDark(event.detail.isDark);
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  function checkTheme() {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  }

  async function fetchItems() {
    const { data } = await supabase.from(tableName).select('*').order('name');
    setItems(data || []);
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    
    const { error } = await supabase.from(tableName).insert([{ name: newName }]);
    
    if (error) {
      alert(error.message);
    } else {
      setNewName('');
      fetchItems();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const type = activeTab === 'houses' ? 'Staff House' : 'Training Venue';
    if (!confirm(`Delete this ${type}?`)) return;
    
    await supabase.from(tableName).delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-md shadow-2xl border transition-colors duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">Space Manager</h2>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors">&times;</button>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="flex p-1 rounded-xl mb-8">
          <button 
            onClick={() => { setActiveTab('houses'); setNewName(''); }}
            style={{ backgroundColor: activeTab === 'houses' ? '#f59e0b' : 'transparent', color: activeTab === 'houses' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b') }}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
          >
            🏠 Staff Houses
          </button>
          <button 
            onClick={() => { setActiveTab('venues'); setNewName(''); }}
            style={{ backgroundColor: activeTab === 'venues' ? '#2563eb' : 'transparent', color: activeTab === 'venues' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b') }}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
          >
            🏫 Training Venues
          </button>
        </div>

        {/* ADD FORM */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-8">
          <input 
            type="text" 
            required 
            placeholder={activeTab === 'houses' ? "House Name (e.g. Felix House)" : "Venue (e.g. Training Room A)"}
            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
            className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading} 
            style={{ backgroundColor: activeTab === 'houses' ? '#f59e0b' : '#2563eb' }}
            className="px-5 rounded-xl font-bold text-white transition-all hover:opacity-90"
          >
            {loading ? '...' : 'Add'}
          </button>
        </form>

        {/* LIST VIEW */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase tracking-widest mb-2">
            Existing {activeTab === 'houses' ? 'Houses' : 'Venues'}
          </p>
          {items.length === 0 ? (
            <p style={{ color: isDark ? '#64748b' : '#94a3b8' }} className="italic text-sm py-4">Nothing added yet.</p>
          ) : (
            items.map(item => (
              <div key={item.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#1e293b' }} className="p-4 rounded-xl text-sm font-bold border flex justify-between items-center group">
                <span>{item.name}</span>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 hover:scale-125 active:scale-95 duration-200"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={onClose} 
          className="w-full mt-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl duration-200"
        >
          ✕ Finished
        </button>
      </div>
    </div>
  );
}