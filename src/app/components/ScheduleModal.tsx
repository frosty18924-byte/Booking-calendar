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
      <div className="bg-white dark:bg-[#1e293b] rounded-[40px] w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
        
        <div className="bg-slate-50 dark:bg-[#0f172a] p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Schedule Session</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-600 hover:text-red-500 text-3xl font-light transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">Select Course</label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              value={formData.course_id}
              onChange={(e) => setFormData({...formData, course_id: e.target.value})}
            >
              <option value="">Choose Course...</option>
              {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">Training Venue</label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            >
              <option value="">Select Room...</option>
              {venues?.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">Date</label>
              <input 
                type="date" required
                className="w-full px-4 py-3 bg-white border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 outline-none font-bold text-sm"
                value={formData.event_date}
                onChange={(e) => setFormData({...formData, event_date: e.target.value})}
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