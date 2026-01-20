'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LocationManagerModal({ onClose }: { onClose: () => void }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationOffice, setNewLocationOffice] = useState('Hull');
  const [newLocationAccessible, setNewLocationAccessible] = useState<string[]>(['Hull']);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueOffice, setNewVenueOffice] = useState('Hull');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<'locations' | 'venues'>('locations');

  useEffect(() => { 
    checkTheme();
    fetchData(); 
  }, []);

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

  async function fetchData() {
    const { data: locData } = await supabase.from('locations').select('*').order('name');
    setLocations(locData || []);
    
    const { data: venueData } = await supabase.from('venues').select('*').order('name');
    setVenues(venueData || []);
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('locations').insert([{ 
        name: newLocationName, 
        office_region: newLocationOffice,
        accessible_office_regions: newLocationAccessible
      }]);
      if (error) throw error;
      setNewLocationName('');
      setNewLocationOffice('Hull');
      setNewLocationAccessible(['Hull']);
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('venues').insert([{ name: newVenueName, office_region: newVenueOffice }]);
      if (error) throw error;
      setNewVenueName('');
      setNewVenueOffice('Hull');
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Delete this staff location? Staff assigned to this location will be affected.")) return;
    try {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm("Delete this training venue? Events at this venue will be affected.")) return;
    try {
      const { error } = await supabase.from('venues').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-2xl shadow-2xl border transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">Manage Locations & Venues</h2>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors">&times;</button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('locations')}
            style={{
              backgroundColor: activeTab === 'locations' ? '#2563eb' : (isDark ? '#0f172a' : '#f1f5f9'),
              color: activeTab === 'locations' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
            }}
            className="flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all"
          >
            📍 Staff Locations
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            style={{
              backgroundColor: activeTab === 'venues' ? '#a855f7' : (isDark ? '#0f172a' : '#f1f5f9'),
              color: activeTab === 'venues' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
            }}
            className="flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all"
          >
            🏢 Training Venues
          </button>
        </div>

        {/* STAFF LOCATIONS TAB */}
        {activeTab === 'locations' && (
          <div>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-4">Add New Staff Location</p>
            <form onSubmit={handleAddLocation} className="space-y-3 mb-6">
              <input 
                type="text" 
                required 
                placeholder="e.g. Felix House"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={newLocationName} 
                onChange={(e) => setNewLocationName(e.target.value)}
              />
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-black uppercase block mb-2">Primary Office</label>
                  <select
                    value={newLocationOffice}
                    onChange={(e) => setNewLocationOffice(e.target.value)}
                    style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Hull">Hull Office</option>
                    <option value="Norwich">Norwich Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-black uppercase block mb-2">Can Access</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={newLocationAccessible.includes('Hull')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewLocationAccessible([...newLocationAccessible, 'Hull']);
                        } else {
                          setNewLocationAccessible(newLocationAccessible.filter(o => o !== 'Hull'));
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: isDark ? '#cbd5e1' : '#1e293b' }} className="text-sm font-bold">Hull Courses</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={newLocationAccessible.includes('Norwich')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewLocationAccessible([...newLocationAccessible, 'Norwich']);
                        } else {
                          setNewLocationAccessible(newLocationAccessible.filter(o => o !== 'Norwich'));
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: isDark ? '#cbd5e1' : '#1e293b' }} className="text-sm font-bold">Norwich Courses</span>
                  </label>
                </div>
              </div>

              <button 
                disabled={loading || newLocationAccessible.length === 0} 
                style={{ backgroundColor: '#2563eb' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                className="w-full text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Location'}
              </button>
            </form>

            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-3">Staff Locations List</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {locations.length === 0 ? (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">No locations added yet</p>
              ) : (
                locations.map(loc => (
                  <div key={loc.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-4 border rounded-xl flex justify-between items-center group transition-all">
                    <div>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold">{loc.name}</p>
                      <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] uppercase font-black">📍 {loc.office_region || 'Hull'} Office</p>
                      <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-bold mt-1">Can Access: {loc.accessible_office_regions?.join(', ') || 'Hull'}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="p-2 rounded-lg hover:bg-red-600 hover:text-white text-red-400 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TRAINING VENUES TAB */}
        {activeTab === 'venues' && (
          <div>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-4">Add New Training Venue</p>
            <form onSubmit={handleAddVenue} className="flex gap-2 mb-6">
              <input 
                type="text" 
                required 
                placeholder="e.g. Conference Room A"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                value={newVenueName} 
                onChange={(e) => setNewVenueName(e.target.value)}
              />
              <select
                value={newVenueOffice}
                onChange={(e) => setNewVenueOffice(e.target.value)}
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Hull">Hull Office</option>
                <option value="Norwich">Norwich Office</option>
              </select>
              <button 
                disabled={loading} 
                style={{ backgroundColor: '#a855f7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9333ea'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
                className="text-white px-5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                +
              </button>
            </form>

            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-3">Training Venues List</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {venues.length === 0 ? (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">No venues added yet</p>
              ) : (
                venues.map(venue => (
                  <div key={venue.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-4 border rounded-xl flex justify-between items-center group transition-all">
                    <div>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold">{venue.name}</p>
                      <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] uppercase font-black">🏢 {venue.office_region || 'Hull'} Office</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteVenue(venue.id)}
                      className="p-2 rounded-lg hover:bg-red-600 hover:text-white text-red-400 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}