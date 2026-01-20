'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SpaceManagerModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'houses' | 'venues'>('houses');
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  // Table depends on which tab is active
  const tableName = activeTab === 'houses' ? 'locations' : 'venues';

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

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
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Space Manager</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
          <button 
            onClick={() => { setActiveTab('houses'); setNewName(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'houses' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
          >
            🏠 Staff Houses
          </button>
          <button 
            onClick={() => { setActiveTab('venues'); setNewName(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'venues' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
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
            className="flex-1 p-3 border border-slate-200 rounded-xl text-black outline-none focus:ring-2 focus:ring-amber-500"
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading} 
            className={`px-5 rounded-xl font-bold text-white transition-all ${activeTab === 'houses' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? '...' : 'Add'}
          </button>
        </form>

        {/* LIST VIEW */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Existing {activeTab === 'houses' ? 'Houses' : 'Venues'}
          </p>
          {items.length === 0 ? (
            <p className="text-slate-400 italic text-sm py-4">Nothing added yet.</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-100 flex justify-between items-center group">
                <span>{item.name}</span>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={onClose} 
          className="w-full mt-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-all"
        >
          Finished
        </button>
      </div>
    </div>
  );
}