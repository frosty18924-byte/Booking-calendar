'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, subMonths, addMonths } from 'date-fns';
import ScheduleModal from '@/app/components/ScheduleModal';
import BookingModal from '@/app/components/BookingModal';
import ThemeToggle from '@/app/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const courseColors: { [key: string]: { bg: string; text: string } } = {
    'Team Teach L2': { bg: '#3b82f6', text: '#ffffff' },
    'Team Teach Refresher': { bg: '#a855f7', text: '#ffffff' },
    'Team Teach Adv': { bg: '#ec4899', text: '#ffffff' },
    'Fire': { bg: '#f97316', text: '#ffffff' },
    'EFAW': { bg: '#06b6d4', text: '#ffffff' },
    'Meds Management': { bg: '#ef4444', text: '#ffffff' },
    'Epilepsy': { bg: '#10b981', text: '#ffffff' },
    'Ess Aut': { bg: '#6366f1', text: '#ffffff' },
    'Comms': { bg: '#eab308', text: '#000000' },
    'RSHE': { bg: '#84cc16', text: '#000000' },
    'Oral Health': { bg: '#f43f5e', text: '#ffffff' },
    'SGA': { bg: '#f59e0b', text: '#000000' },
    'Adv Meds & Audits': { bg: '#14b8a6', text: '#ffffff' },
    'STAR': { bg: '#d946ef', text: '#ffffff' },
  };

  const getCourseColor = (courseName: string) => courseColors[courseName] || { bg: '#6b7280', text: '#ffffff' };

  useEffect(() => {
    checkTheme();
    fetchUser();
    fetchEvents(); 
  }, [currentMonth]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  function checkTheme() {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      setIsDark(theme !== 'light');
    }
  }

  async function fetchUser() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    if (currentUser) fetchUserRole(currentUser.id);
  }

  async function fetchUserRole(userId: string) {
    const { data: profile } = await supabase.from('profiles').select('role_tier').eq('id', userId).single();
    if (profile) setUserRole(profile.role_tier);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
  
  async function fetchEvents() {
    setLoading(true);
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data: eventsData } = await supabase.from('training_events').select('*, courses(*), bookings(*)').gte('event_date', startDate).lte('event_date', endDate);
    setEvents(eventsData || []);
    setLoading(false);
  }

  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(startOfMonth(currentMonth)), 
    end: endOfWeek(endOfMonth(currentMonth)) 
  });

  const uniqueCourses = Array.from(new Set(events.map(e => e.courses?.name).filter(Boolean)));
  const filteredEvents = filterCourse === 'all' ? events : events.filter(e => e.courses?.name === filterCourse);
  const canViewAdmin = hasPermission(userRole, 'ADMIN_DASHBOARD', 'canView');
  const canSchedule = hasPermission(userRole, 'COURSE_SCHEDULING', 'canCreate');

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-[40px] shadow-2xl border overflow-hidden">
          
          {/* HEADER SECTION */}
          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 border-b">
            
            {/* TOP ROW: 3-Column Grid ensures title is always centered */}
            <div className="grid grid-cols-3 items-center mb-8">
              
              {/* Left Column */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase tracking-widest">
                  {user ? <span className="flex flex-col"><span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Online</span><span className="opacity-50 lowercase">{user.email}</span></span> : "Offline"}
                </div>
              </div>

              {/* Center Column: Locked Center Title */}
              <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-3xl font-black uppercase tracking-tighter text-center whitespace-nowrap">
                Booking Calendar
              </h1>

              {/* Right Column */}
              <div className="flex items-center justify-end gap-3">
                {canViewAdmin && <a href="/admin" style={{ backgroundColor: '#16a34a' }} className="text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Admin</a>}
                {user ? <button onClick={handleSignOut} style={{ backgroundColor: '#dc2626' }} className="text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Sign Out</button> : <a href="/login" style={{ backgroundColor: '#2563eb' }} className="text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Login</a>}
                <ThemeToggle />
              </div>
            </div>

            {/* NAVIGATION ROW */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-xl border px-4 py-2 text-[11px] font-bold uppercase outline-none">
                <option value="all">All Courses</option>
                {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-2xl font-bold">←</button>
                <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tighter min-w-[200px] text-center">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-2xl font-bold">→</button>
              </div>

              <div className="min-w-[140px] flex justify-end">
                {canSchedule && <button onClick={() => setShowSchedule(true)} style={{ backgroundColor: '#2563eb' }} className="text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">+ Schedule</button>}
              </div>
            </div>
          </div>

          {/* CALENDAR GRID */}
          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#1a2332' : '#f8fafc' }} className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="p-4 text-center text-[10px] font-black uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0" style={{ minHeight: '700px' }}>
            {calendarDays.map((day, idx) => { 
              const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.event_date), day)); 
              return (
                <div key={idx} style={{ backgroundColor: isSameMonth(day, currentMonth) ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#1a2332' : '#f8fafc'), borderColor: isDark ? '#334155' : '#e2e8f0', opacity: isSameMonth(day, currentMonth) ? 1 : 0.5 }} className="border p-3 min-h-[140px] flex flex-col">
                  <span style={{ color: isSameDay(day, new Date()) ? '#60a5fa' : isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-black mb-2">{format(day, 'd')}</span>
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {dayEvents.map(event => { 
                      const colors = getCourseColor(event.courses?.name || 'Unknown');
                      return (
                        <button key={event.id} onClick={() => setSelectedEvent(event)} style={{ backgroundColor: colors.bg, color: colors.text }} className="w-full text-left p-2 rounded-lg text-xs transition-all border border-black/10">
                          <p className="font-black truncate uppercase text-[9px]">{event.courses?.name}</p>
                          <p className="opacity-70 font-bold text-[8px]">{event.bookings?.length || 0}/10</p>
                        </button>
                      ); 
                    })}
                  </div>
                </div>
              ); 
            })}
          </div>
        </div>
      </div>
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onRefresh={fetchEvents} />}
      {selectedEvent && <BookingModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onRefresh={fetchEvents} />}
    </main>
  );
}