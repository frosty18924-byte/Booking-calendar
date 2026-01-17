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

  const getCourseColor = (courseName: string) => {
    return courseColors[courseName] || { bg: '#6b7280', text: '#ffffff' };
  };

  useEffect(() => {
    checkTheme();
    fetchUser();
    fetchEvents(); 
  }, [currentMonth]);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

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
      setIsDark(theme !== 'light');
    }
  }

  async function fetchUser() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await fetchUserRole(currentUser.id);
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  }

  async function fetchUserRole(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role_tier')
        .eq('id', userId)
        .single();
      
      if (error) return;
      setUserRole(profile?.role_tier || null);
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserRole(null);
      window.location.href = '/login';
    } catch (err) {
      console.error("Error signing out:", err);
    }
  }
  
  async function fetchEvents() {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('training_events')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const courseIds = [...new Set(data.map(e => e.course_id).filter(Boolean))];
        const { data: cData } = await supabase.from('courses').select('*').in('id', courseIds);
        const eventIds = data.map(e => e.id);
        const { data: bData } = await supabase.from('bookings').select('*').in('event_id', eventIds);
        
        const enrichedEvents = data.map(event => ({
          ...event,
          courses: cData?.find(c => c.id === event.course_id),
          bookings: bData?.filter(b => b.event_id === event.id) || []
        }));
        setEvents(enrichedEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(monthStart), 
    end: endOfWeek(endOfMonth(monthStart)) 
  });

  const uniqueCourses = Array.from(new Set(events.map(e => e.courses?.name).filter(Boolean)));
  const filteredEvents = filterCourse === 'all' ? events : events.filter(e => e.courses?.name === filterCourse);

  const canViewAdmin = hasPermission(userRole, 'ADMIN_DASHBOARD', 'canView');
  const canSchedule = hasPermission(userRole, 'COURSE_SCHEDULING', 'canCreate');

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="transition-colors duration-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* MAIN CALENDAR CONTAINER */}
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-[40px] shadow-2xl border overflow-hidden">
          
          {/* HEADER SECTION */}
          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 border-b">
            
            {/* Top Row: 3-Column Aligned Grid */}
            <div className="grid grid-cols-3 items-center mb-8">
              
              {/* Left Column: User Status */}
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase tracking-widest leading-tight">
                  {user ? (
                    <div className="flex flex-col">
                      <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Online</span>
                      <span className="opacity-70 lowercase font-bold truncate max-w-[120px]">{user.email}</span>
                    </div>
                  ) : (
                    "Offline Mode"
                  )}
                </div>
              </div>

              {/* Center Column: Centered Title */}
              <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-3xl font-black uppercase tracking-tighter text-center whitespace-nowrap">
                Booking Calendar
              </h1>

              {/* Right Column: Actions */}
              <div className="flex items-center justify-end gap-3">
                {canViewAdmin && (
                  <a href="/admin" style={{ backgroundColor: '#16a34a' }} className="text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                    Admin
                  </a>
                )}
                {user ? (
                  <button onClick={handleSignOut} style={{ backgroundColor: '#dc2626' }} className="text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                    Sign Out
                  </button>
                ) : (
                  <a href="/login" style={{ backgroundColor: '#2563eb' }} className="text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                    Login
                  </a>
                )}
                <ThemeToggle />
              </div>
            </div>

            {/* Bottom Row: Nav and Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Filter */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-black uppercase ml-1">Filter</label>
                <select 
                  value={filterCourse} 
                  onChange={(e) => setFilterCourse(e.target.value)}
                  style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                  className="rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map(course => <option key={course} value={course}>{course}</option>)}
                </select>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ color: isDark ? '#94a3b8' : '#475569', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:scale-110 transition-all font-bold text-xl border shadow-sm">←</button>
                <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tighter min-w-[180px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ color: isDark ? '#94a3b8' : '#475569', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:scale-110 transition-all font-bold text-xl border shadow-sm">→</button>
              </div>

              {/* Schedule CTA */}
              <div className="min-w-[140px] flex justify-end">
                {canSchedule && (
                  <button onClick={() => setShowSchedule(true)} style={{ backgroundColor: '#2563eb' }} className="text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                    + Schedule
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* DAYS OF WEEK HEADER */}
          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#1a2332' : '#f8fafc' }} className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="p-4 text-center text-[10px] font-black uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {/* CALENDAR DAYS GRID */}
          <div className="grid grid-cols-7 gap-0" style={{ minHeight: '700px' }}>
            {calendarDays.map((day, idx) => { 
              const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.event_date), day)); 
              const isCurrentMonth = isSameMonth(day, monthStart);
              return (
                <div key={idx} style={{ backgroundColor: isCurrentMonth ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#1a2332' : '#f8fafc'), borderColor: isDark ? '#334155' : '#e2e8f0', opacity: isCurrentMonth ? 1 : 0.5 }} className="border p-3 min-h-[140px] flex flex-col">
                  <span style={{ color: isSameDay(day, new Date()) ? '#60a5fa' : isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-black mb-2">{format(day, 'd')}</span>
                  <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                    {dayEvents.map(event => { 
                      const colors = getCourseColor(event.courses?.name || 'Unknown');
                      return (
                        <button key={event.id} onClick={() => setSelectedEvent(event)} style={{ backgroundColor: colors.bg, color: colors.text }} className="w-full text-left p-2 rounded-lg text-xs transition-all hover:opacity-80 border border-black/10">
                          <p className="font-black truncate uppercase text-[10px]">{event.courses?.name}</p>
                          <p className="opacity-80 font-bold text-[9px]">{event.bookings?.length || 0}/10</p>
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