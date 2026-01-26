'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ScheduleModal({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  
  const [formData, setFormData] = useState({
    course_id: '',
    location: '', 
    event_date: '',
    start_time: '09:00',
    end_time: '17:00'
  });

  useEffect(() => {
    checkTheme();
    async function fetchData() {
      // Promise.all ensures both tables load before rendering
      const [coursesRes, venuesRes] = await Promise.all([
        supabase.from('courses').select('*').order('name'),
        supabase.from('venues').select('*').order('name')
      ]);
      setCourses(coursesRes.data || []);
      setVenues(venuesRes.data || []);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: conflicts } = await supabase
      .from('training_events')
      .select('*, courses(name)')
      .eq('event_date', formData.event_date)
      .eq('location', formData.location)
      .filter('start_time', 'lt', `${formData.end_time}:00`)
      .filter('end_time', 'gt', `${formData.start_time}:00`);

    if (conflicts && conflicts.length > 0) {
      alert(`⚠️ VENUE CONFLICT: This room is already booked for ${conflicts[0].courses?.name}`);
      setLoading(false);
      return;
    }

    const { data: insertedEvent, error } = await supabase.from('training_events').insert([{
      ...formData,
      start_time: `${formData.start_time}:00`,
      end_time: `${formData.end_time}:00`
    }]).select().single();

    if (!error && insertedEvent) {
      // Send course notification to all staff
      try {
        await fetch('/api/send-course-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            eventId: insertedEvent.id, 
            notifyAllStaff: true 
          })
        });
      } catch (err) {
        console.error('Failed to send course notification:', err);
        // Don't fail the event creation if email fails
      }
      
      onRefresh();
      onClose();
    } else {
      alert(error?.message || 'Failed to create event');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-[40px] w-full max-w-lg shadow-2xl border overflow-hidden flex flex-col transition-colors duration-300">
        
        <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 border-b flex justify-between items-center">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-black uppercase tracking-tight">Schedule Session</h2>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-3xl font-light transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">Select Course</label>
            <select 
              required
              style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              value={formData.course_id}
              onChange={(e) => setFormData({...formData, course_id: e.target.value})}
            >
              <option value="">Choose Course...</option>
              {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">Training Venue</label>
            <select 
              required
              style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            >
              <option value="">Select Room...</option>
              {venues?.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">Date</label>
              <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                  filter: ${isDark ? 'invert(1) brightness(1.2)' : 'none'};
                  cursor: pointer;
                }
                input[type="time"]::-webkit-calendar-picker-indicator {
                  filter: ${isDark ? 'invert(1) brightness(1.2)' : 'none'};
                  cursor: pointer;
                }
              `}</style>
              <input 
                type="date" required
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="w-full px-4 py-3 border rounded-xl outline-none font-bold text-sm"
                value={formData.event_date}
                onChange={(e) => setFormData({...formData, event_date: e.target.value})}
              />
            </div>

            <div>
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">Start Time</label>
              <input 
                type="time" required
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="w-full px-4 py-3 border rounded-xl outline-none font-bold text-sm"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              />
            </div>

            <div>
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">End Time</label>
              <input 
                type="time" required
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="w-full px-4 py-3 border rounded-xl outline-none font-bold text-sm"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {loading ? 'Processing...' : 'Confirm Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
}