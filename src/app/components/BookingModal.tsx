'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

interface BookingModalProps {
  event: any;
  onClose: () => void;
  onRefresh: () => void;
}

export default function BookingModal({ event, onClose, onRefresh }: BookingModalProps) {
  const [activeTab, setActiveTab] = useState<'booking' | 'roster'>('booking');
  const [staff, setStaff] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const ABSENCE_REASONS = ["Appointment", "Needed in home", "Rostering", "Transport issues", "Not started yet", "Childcare", "Sickness", "Holiday"];
  const LATE_REASONS = ["Traffic", "Handover delayed", "Public Transport", "Personal", "Other"];

  useEffect(() => {
    checkTheme();
    fetchUserRole();
    fetchInitialData();
  }, [event.id]);

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

  async function fetchUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role_tier')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching role:', error);
          return;
        }
        
        console.log('👤 User role:', profile?.role_tier);
        setUserRole(profile?.role_tier || null);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  }

  async function fetchInitialData() {
    try {
      console.log('🔍 Fetching initial data for event:', event.id);
      
      const { data: staffData, error: staffError } = await supabase.from('profiles').select('*').order('full_name');
      if (staffError) console.error('Staff fetch error:', staffError);
      console.log('👥 All staff count:', staffData?.length);
      
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('profile_id')
        .eq('event_id', event.id);
      if (bookingError) console.error('Booking fetch error:', bookingError);
      
      const bookedIds = bookings?.map(b => b.profile_id) || [];
      console.log('📋 Already booked IDs:', bookedIds);
      
      const availableStaff = staffData?.filter(s => !bookedIds.includes(s.id)) || [];
      console.log('✅ Available staff count:', availableStaff.length);
      setStaff(availableStaff);
      
      await fetchRoster();
    } catch (err) {
      console.error("❌ Error fetching initial data:", err);
    }
  }

  async function fetchRoster() {
    try {
      console.log('📊 Fetching roster for event:', event.id);
      const { data, error } = await supabase
        .from('bookings')
        .select('id, profile_id, event_id, attended_at, is_late, absence_reason, late_reason')
        .eq('event_id', event.id);
      
      if (error) {
        console.error('Roster fetch error:', error);
        setRoster([]);
        return;
      }

      if (data && data.length > 0) {
        const profileIds = data.map((b: any) => b.profile_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, home_house')
          .in('id', profileIds);
        
        const rosterWithProfiles = data.map((booking: any) => ({
          ...booking,
          profiles: profilesData?.find(p => p.id === booking.profile_id)
        }));
        
        console.log('📝 Roster entries:', rosterWithProfiles.length);
        setRoster(rosterWithProfiles);
      } else {
        setRoster([]);
      }
    } catch (err) {
      console.error("❌ Error fetching roster:", err);
    }
  }

  const updateBooking = async (id: string, updates: any) => {
    if (!hasPermission(userRole, 'ATTENDANCE', 'canMark')) {
      alert('You do not have permission to mark attendance');
      return;
    }

    try {
      console.log('✏️ Updating booking:', id, updates);
      const { error } = await supabase.from('bookings').update(updates).eq('id', id);
      if (!error) {
        console.log('✅ Update successful');
        await fetchRoster();
        onRefresh();
      } else {
        console.error('Update error:', error);
        alert('Error updating booking: ' + error.message);
      }
    } catch (err: any) {
      console.error('❌ Catch error:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleBooking = async () => {
    if (!hasPermission(userRole, 'BOOKINGS', 'canCreate')) {
      alert('You do not have permission to create bookings');
      return;
    }

    if (selectedIds.length === 0) {
      alert('Please select at least one staff member');
      return;
    }
    
    setLoading(true);
    try {
      console.log('➕ Adding bookings for profile IDs:', selectedIds);
      console.log('Event ID:', event.id);
      
      const bookingData = selectedIds.map(id => ({ 
        event_id: event.id, 
        profile_id: id,
        attended_at: null
      }));
      
      console.log('📤 Sending data:', bookingData);
      
      const { error } = await supabase.from('bookings').insert(bookingData);
      
      if (error) {
        console.error('❌ Booking insert error:', error);
        alert('Error booking staff: ' + error.message);
      } else {
        console.log('✅ Booking successful');
        setSelectedIds([]);
        await fetchInitialData();
        setActiveTab('roster');
        onRefresh();
      }
    } catch (err: any) {
      console.error('❌ Catch error:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (bookingId: string) => {
    if (!hasPermission(userRole, 'BOOKINGS', 'canDelete')) {
      alert('You do not have permission to delete bookings');
      return;
    }

    if (!confirm('Remove this staff member from the event?')) return;
    
    try {
      console.log('🗑️ Removing booking:', bookingId);
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      
      if (error) {
        console.error('❌ Delete error:', error);
        alert('Error removing staff: ' + error.message);
      } else {
        console.log('✅ Removal successful');
        await fetchRoster();
        await fetchInitialData();
        onRefresh();
      }
    } catch (err: any) {
      console.error('❌ Catch error:', err);
      alert('Error: ' + err.message);
    }
  };

  const canViewRoster = hasPermission(userRole, 'ROSTER', 'canView');
  const canEditRoster = hasPermission(userRole, 'ROSTER', 'canEdit');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-[40px] w-full max-w-2xl max-h-[85vh] shadow-2xl border overflow-hidden flex flex-col transition-colors duration-300">
        
        {/* Modal Header */}
        <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-6 border-b text-center relative">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-black uppercase tracking-tight">{event.courses?.name || 'Event'}</h2>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-bold mt-1 uppercase tracking-widest">{event.event_date}</p>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="absolute right-8 top-6 hover:text-red-500 text-3xl font-light transition-colors">&times;</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="flex p-1.5 m-6 rounded-2xl gap-1.5">
          <button 
            onClick={() => setActiveTab('booking')} 
            style={{ 
              backgroundColor: activeTab === 'booking' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color: activeTab === 'booking' ? '#2563eb' : (isDark ? '#94a3b8' : '#64748b')
            }}
            className="flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all"
          >
            Add Staff ({staff.length})
          </button>
          {canViewRoster && (
            <button 
              onClick={() => setActiveTab('roster')} 
              style={{ 
                backgroundColor: activeTab === 'roster' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                color: activeTab === 'roster' ? '#2563eb' : (isDark ? '#94a3b8' : '#64748b')
              }}
              className="flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all"
            >
              Roster ({roster.length})
            </button>
          )}
        </div>

        <div className="px-8 pb-8 flex-1 overflow-hidden flex flex-col">
          {activeTab === 'booking' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <input 
                type="text" 
                placeholder="Search staff..." 
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                className="w-full p-3 mb-4 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {staff.length === 0 ? (
                  <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">All staff are already booked</p>
                ) : (
                  staff.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(person => (
                    <label key={person.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:border-blue-500 transition-all border">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(person.id)}
                        className="w-4 h-4 rounded text-blue-600" 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, person.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== person.id));
                          }
                        }} 
                      />
                      <div className="flex-1">
                        <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xs font-bold block">{person.full_name}</span>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] uppercase font-black">📍 {person.home_house}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <button 
                onClick={handleBooking} 
                disabled={loading || selectedIds.length === 0} 
                style={{ backgroundColor: selectedIds.length === 0 ? '#94a3b8' : '#2563eb' }}
                className="w-full mt-6 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all"
              >
                {loading ? 'Processing...' : `Confirm Booking (${selectedIds.length})`}
              </button>
            </div>
          ) : canViewRoster ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {roster.length === 0 ? (
                  <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">No staff booked yet</p>
                ) : (
                  roster.map((row) => (
                    <div key={row.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-4 border rounded-[24px] transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p style={{ color: row.attended_at ? '#10b981' : (isDark ? '#f1f5f9' : '#1e293b') }} className="text-sm font-black">{row.profiles?.full_name} {row.attended_at && '✓'}</p>
                          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-bold uppercase tracking-widest">📍 {row.profiles?.home_house}</p>
                        </div>
                        <div className="flex gap-2">
                          {canEditRoster && (
                            <>
                              <button 
                                onClick={() => updateBooking(row.id, { attended_at: row.attended_at ? null : new Date().toISOString(), absence_reason: null })} 
                                style={{ backgroundColor: row.attended_at ? '#10b981' : (isDark ? '#334155' : '#cbd5e1'), color: row.attended_at ? '#ffffff' : (isDark ? '#f1f5f9' : '#1e293b') }}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
                              >
                                {row.attended_at ? '✓ Present' : 'Mark Present'}
                              </button>
                              <button 
                                onClick={() => handleRemoveStaff(row.id)}
                                style={{ backgroundColor: '#dc2626' }}
                                className="p-2 text-white rounded-lg text-[10px] font-bold transition-all"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {canEditRoster && (
                        <div className="grid grid-cols-1 gap-2 mt-3 pt-3" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                          {!row.attended_at && (
                            <select 
                              style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9', color: '#ef4444', borderColor: '#dc2626' }}
                              className="w-full text-[10px] font-bold rounded-lg p-2 outline-none border" 
                              value={row.absence_reason || ''} 
                              onChange={(e) => updateBooking(row.id, { absence_reason: e.target.value })}
                            >
                              <option value="">Select Absence Reason...</option>
                              {ABSENCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={onClose} 
                style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1', color: isDark ? '#f1f5f9' : '#1e293b' }}
                className="w-full mt-6 py-4 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
              >
                Close
              </button>
            </div> 
          ) : null}
        </div>
      </div>
    </div>
  );
}