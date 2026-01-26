'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, subMonths, addMonths } from 'date-fns';
import ScheduleModal from '@/app/components/ScheduleModal';
import BookingModal from '@/app/components/BookingModal';
import BookingChecklistModal from '@/app/components/BookingChecklistModal';
import ThemeToggle from '@/app/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedChecklistEventId, setSelectedChecklistEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Helper for colors - All distinct vibrant colors with fallback to dynamic generation
  const courseColors: { [key: string]: { bg: string; text: string } } = {
    'Team Teach L2': { bg: '#3b82f6', text: '#ffffff' },
    'Team Teach Refresher': { bg: '#f59e0b', text: '#000000' },
    'Team Teach Adv': { bg: '#dc2626', text: '#ffffff' },
    'Fire': { bg: '#f97316', text: '#ffffff' },
    'EFAW': { bg: '#06b6d4', text: '#ffffff' },
    'Meds Management': { bg: '#7c3aed', text: '#ffffff' },
    'Epilepsy': { bg: '#10b981', text: '#ffffff' },
    'Ess Aut': { bg: '#ec4899', text: '#ffffff' },
    'Comms': { bg: '#eab308', text: '#000000' },
    'RSHE': { bg: '#84cc16', text: '#000000' },
    'Oral Health': { bg: '#f43f5e', text: '#ffffff' },
    'SGA': { bg: '#14b8a6', text: '#ffffff' },
    'Adv Meds & Audits': { bg: '#a855f7', text: '#ffffff' },
    'STAR': { bg: '#d946ef', text: '#ffffff' },
  };

  // Vibrant color palette for dynamic course assignment
  const vibrantColors = [
    { bg: '#3b82f6', text: '#ffffff' },
    { bg: '#f59e0b', text: '#000000' },
    { bg: '#dc2626', text: '#ffffff' },
    { bg: '#f97316', text: '#ffffff' },
    { bg: '#06b6d4', text: '#ffffff' },
    { bg: '#7c3aed', text: '#ffffff' },
    { bg: '#10b981', text: '#ffffff' },
    { bg: '#ec4899', text: '#ffffff' },
    { bg: '#eab308', text: '#000000' },
    { bg: '#84cc16', text: '#000000' },
    { bg: '#f43f5e', text: '#ffffff' },
    { bg: '#14b8a6', text: '#ffffff' },
    { bg: '#a855f7', text: '#ffffff' },
    { bg: '#d946ef', text: '#ffffff' },
    { bg: '#6366f1', text: '#ffffff' },
    { bg: '#8b5cf6', text: '#ffffff' },
    { bg: '#059669', text: '#ffffff' },
    { bg: '#0891b2', text: '#ffffff' },
    { bg: '#7f1d1d', text: '#ffffff' },
    { bg: '#92400e', text: '#ffffff' },
  ];

  const getCourseColor = (courseName: string) => {
    if (!courseName) return vibrantColors[0];
    
    // Check if we have a predefined color for this course
    if (courseColors[courseName]) {
      return courseColors[courseName];
    }
    
    // Generate consistent color based on course name hash
    let hash = 0;
    for (let i = 0; i < courseName.length; i++) {
      hash = ((hash << 5) - hash) + courseName.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const colorIndex = Math.abs(hash) % vibrantColors.length;
    return vibrantColors[colorIndex];
  };

  useEffect(() => {
    const checkTheme = () => {
      // Check for .dark class on document, which is the source of truth
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    // Initial check
    checkTheme();

    // Listen for custom event from ThemeToggle
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.isDark === 'boolean') {
        setIsDark(customEvent.detail.isDark);
      } else {
        checkTheme();
      }
    };

    window.addEventListener('themeChange', handleThemeChange);

    // Also listen to storage for multi-tab sync
    window.addEventListener('storage', checkTheme);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  // Removed the useEffect that toggles the class on document, 
  // because ThemeToggle.tsx manages that now. We just react to it.

  useEffect(() => {
    fetchUser();
    fetchEvents();
  }, [currentMonth]);

  async function fetchUser() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    if (currentUser) {
      const { data: profile } = await supabase.from('profiles').select('role_tier').eq('id', currentUser.id).single();
      if (profile) setUserRole(profile.role_tier);
    }
  }

  async function fetchEvents() {
    setLoading(true);
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data } = await supabase.from('training_events').select('*, courses(*), bookings(*)').gte('event_date', startDate).lte('event_date', endDate);
    
    // Fetch overrides separately for each event
    if (data) {
      const eventsWithOverrides = await Promise.all(data.map(async (event) => {
        const { data: overrides } = await supabase
          .from('course_event_overrides')
          .select('max_attendees')
          .eq('course_id', event.course_id)
          .eq('event_date', event.event_date);
        return { ...event, course_event_overrides: overrides };
      }));
      setEvents(eventsWithOverrides);
    } else {
      setEvents([]);
    }
    setLoading(false);
  }

  // Helper function to get max capacity for an event
  const getMaxCapacity = (event: any) => {
    const baseCapacity = event.courses?.max_attendees || 10;
    
    // Check if there's an override for this event date
    if (event.course_event_overrides && event.course_event_overrides.length > 0) {
      return event.course_event_overrides[0].max_attendees;
    }
    
    return baseCapacity;
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const uniqueCourses = Array.from(new Set(events.map(e => e.courses?.name).filter(Boolean)));
  const filteredEvents = filterCourse === 'all' ? events : events.filter(e => e.courses?.name === filterCourse);
  const canViewAdmin = hasPermission(userRole, 'ADMIN_DASHBOARD', 'canView');
  const canSchedule = hasPermission(userRole, 'COURSE_SCHEDULING', 'canCreate');

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-[40px] shadow-2xl border overflow-hidden">

          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-4 md:p-8 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-6 md:mb-8">
              <div className="flex items-center gap-2 text-center md:text-left justify-center md:justify-start">
                <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[8px] md:text-[10px] font-black uppercase truncate">
                  {user ? `${user.email}` : 'Offline'}
                </div>
              </div>

              <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl md:text-3xl font-black uppercase tracking-tighter text-center">
                Booking Calendar
              </h1>

              <div className="flex items-center justify-center md:justify-end gap-2">
                {canViewAdmin && (
                  <a href="/admin" className="cursor-pointer bg-emerald-600 text-white px-2 md:px-4 py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase hover:bg-emerald-700 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200">
                    ⚙️
                  </a>
                )}
                {user && (
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="cursor-pointer bg-red-600 text-white px-2 md:px-4 py-2 rounded-xl font-black text-[8px] md:text-[10px] uppercase hover:bg-red-700 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200">
                    🚪
                  </button>
                )}
                <div className="cursor-pointer"><ThemeToggle /></div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                  className="cursor-pointer rounded-xl border px-4 py-2 text-[10px] font-bold uppercase outline-none w-full md:w-48"
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="flex items-center gap-2 md:gap-6 w-full md:w-auto justify-center">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="cursor-pointer text-xl md:text-2xl font-bold hover:scale-150 active:scale-100 transition-transform duration-200">⬅️</button>
                  <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-lg md:text-2xl font-black uppercase text-center whitespace-nowrap">{format(currentMonth, 'MMM yyyy')}</h2>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="cursor-pointer text-xl md:text-2xl font-bold hover:scale-150 active:scale-100 transition-transform duration-200">➡️</button>
                  <button onClick={() => setCurrentMonth(new Date())} className="cursor-pointer bg-slate-500 hover:bg-slate-600 text-white px-2 md:px-3 py-2 rounded-lg font-bold text-[9px] md:text-[10px] uppercase transition-all hover:shadow-md active:scale-95 duration-200" title="Go back to today">
                    📅 Today
                  </button>
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                {canSchedule && (
                  <button onClick={() => setShowSchedule(true)} className="cursor-pointer bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl hover:bg-blue-700 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 w-full md:w-auto">
                    ➕ Schedule
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#1a2332' : '#f8fafc' }} className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="p-4 text-center text-[10px] font-black uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0" style={{ minHeight: '700px' }}>
            {calendarDays.map((day, idx) => {
              const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.event_date), day));
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <div key={idx}
                  style={{
                    backgroundColor: isCurrentMonth ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#1a2332' : '#f8fafc'),
                    borderColor: isDark ? '#334155' : '#e2e8f0'
                  }}
                  className={`border p-3 min-h-[140px] flex flex-col ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <span style={{ color: isSameDay(day, new Date()) ? '#3b82f6' : (isDark ? '#94a3b8' : '#64748b') }} className="text-sm font-black mb-2">
                    {format(day, 'd')}
                  </span>
                  <div className="flex-1 space-y-1">
                    {dayEvents.map(event => {
                      const colors = getCourseColor(event.courses?.name || 'Unknown');
                      const participantCount = event.bookings?.length || 0;
                      const maxCapacity = getMaxCapacity(event);
                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                          className="cursor-pointer w-full text-left p-3 rounded-lg transition-all border border-black/10 shadow-sm hover:brightness-110"
                        >
                          <p className="font-black truncate uppercase text-xs">
                            {event.courses?.name}
                          </p>
                          <div className="flex justify-between items-center mt-1 opacity-80 font-bold text-[10px]">
                            <span>
                              {event.start_time?.slice(0, 5) || '09:00'} - {event.end_time?.slice(0, 5) || '17:00'}
                            </span>
                            <span>{participantCount}/{maxCapacity}</span>
                          </div>
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
      {selectedEvent && (
        <BookingModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          onRefresh={fetchEvents}
          onOpenChecklist={() => {
            setShowChecklist(true);
            setSelectedChecklistEventId(selectedEvent.id);
          }}
        />
      )}
      {showChecklist && selectedChecklistEventId && (
        <BookingChecklistModal 
          bookingId={selectedChecklistEventId}
          onClose={() => {
            setShowChecklist(false);
            setSelectedChecklistEventId(null);
          }}
          userRole={userRole || ''}
          userName={user?.email || ''}
          userId={user?.id || ''}
        />
      )}
    </main>
  );
}
