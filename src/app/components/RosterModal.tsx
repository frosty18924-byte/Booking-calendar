'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RosterModalProps {
  event: { id: string; course_name: string; event_date: string; venue_id: string } | null;
  onClose: () => void;
  onRefresh: () => void;
  isDark?: boolean;
}

export default function RosterModal({ event, onClose, onRefresh, isDark = true }: RosterModalProps) {
  const [loading, setLoading] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [bookedStaff, setBookedStaff] = useState<any[]>([]);

  useEffect(() => {
    if (event) {
      fetchData();
    }
  }, [event]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch all staff
      const { data: staffData } = await supabase.from('profiles').select('*').order('full_name');

      // Fetch bookings for this event with full profile details
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          attended_at,
          is_late,
          profiles(id, full_name, home_house)
        `)
        .eq('event_id', event?.id);

      // Extract booked staff IDs
      const bookedIds = bookings?.map(b => b.user_id) || [];
      
      // Set booked staff with booking IDs for removal
      const booked = bookings?.map(b => ({
        booking_id: b.id,
        id: b.user_id,
        full_name: b.profiles?.full_name,
        home_house: b.profiles?.home_house,
        attended_at: b.attended_at,
        is_late: b.is_late
      })) || [];
      setBookedStaff(booked);

      // Filter available staff (not already booked)
      const available = (staffData || []).filter(staff => !bookedIds.includes(staff.id));
      setAvailableStaff(available);
    } catch (err) {
      console.error("Error fetching roster data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookStaff(staffId: string) {
    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').insert([{
        user_id: staffId,
        event_id: event?.id,
        attended_at: null
      }]);

      if (error) throw error;
      
      await fetchData();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveStaff(bookingId: string) {
    if (!confirm('Remove this staff member from the event?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      
      await fetchData();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAttendance(bookingId: string, attended: boolean) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ attended_at: attended ? new Date().toISOString() : null })
        .eq('id', bookingId);

      if (error) throw error;
      
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-3xl shadow-2xl border transition-colors duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">{event.course_name}</h2>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mt-1">{new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors">&times;</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden flex-1">
          {/* BOOKED STAFF */}
          <div className="flex flex-col overflow-hidden">
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-3 tracking-widest">Roster ({bookedStaff.length})</p>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {bookedStaff.length === 0 ? (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">No staff booked yet</p>
              ) : (
                bookedStaff.map((staff: any) => (
                  <div key={staff.booking_id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 border rounded-xl flex justify-between items-center group transition-all hover:border-emerald-500">
                    <div>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold text-sm">{staff.full_name}</p>
                      <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] uppercase font-black">📍 {staff.home_house}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleMarkAttendance(staff.booking_id, !staff.attended_at)}
                        disabled={loading}
                        style={{ backgroundColor: staff.attended_at ? '#10b981' : '#2563eb' }}
                        className="p-2 text-white rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                      >
                        {staff.attended_at ? '✓ Present' : '○ Absent'}
                      </button>
                      <button 
                        onClick={() => handleRemoveStaff(staff.booking_id)}
                        disabled={loading}
                        style={{ backgroundColor: '#dc2626' }}
                        className="p-2 text-white rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AVAILABLE STAFF */}
          <div className="flex flex-col overflow-hidden">
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-3 tracking-widest">Available Staff ({availableStaff.length})</p>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {availableStaff.length === 0 ? (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">All staff are booked or unavailable</p>
              ) : (
                availableStaff.map((staff: any) => (
                  <div key={staff.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 border rounded-xl flex justify-between items-center group transition-all hover:border-blue-500">
                    <div>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold text-sm">{staff.full_name}</p>
                      <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] uppercase font-black">📍 {staff.home_house}</p>
                    </div>
                    <button 
                      onClick={() => handleBookStaff(staff.id)}
                      disabled={loading}
                      style={{ backgroundColor: '#2563eb' }}
                      className="p-2 text-white rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1', color: isDark ? '#f1f5f9' : '#1e293b' }}
          className="mt-6 w-full py-3 rounded-xl font-bold transition-all hover:opacity-80"
        >
          Close
        </button>
      </div>
    </div>
  );
}