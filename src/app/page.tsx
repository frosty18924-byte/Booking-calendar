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
    console.log('Testing Supabase connection...');
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
      console.log('Theme change detected on calendar:', event.detail.isDark);
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
    console.log('🔍 Fetching role for user ID:', userId);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role_tier')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching role:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      return;
    }
    
    console.log('✅ Profile data received:', profile);
    console.log('👤 Raw role from DB:', profile?.role_tier);
    console.log('👤 Role type:', typeof profile?.role_tier);
    
    if (profile?.role_tier) {
      console.log('👤 Permissions check - can view admin:', hasPermission(profile.role_tier, 'ADMIN_DASHBOARD', 'canView'));
    }
    
    setUserRole(profile?.role_tier || null);
  } catch (err) {
    console.error('❌ Catch error fetching user role:', err);
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
      console.log('Fetching events for month:', format(currentMonth, 'yyyy-MM'));
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      console.log('Date range:', startDate, 'to', endDate);
      
      const { data, error } = await supabase
        .from('training_events')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate);
      
      if (error) {
        console.error('Training Events Query Error:', error);
        throw error;
      }
      console.log('Events loaded successfully:', data);
      console.log('Total events:', data?.length || 0);
      
      if (data && data.length > 0) {
        const courseIds = [...new Set(data.map(e => e.course_id).filter(Boolean))];
        console.log('Course IDs to fetch:', courseIds);
        
        let coursesData: any[] = [];
        if (courseIds.length > 0) {
          const { data: cData, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .in('id', courseIds);
          
          if (courseError) {
            console.error('Courses Query Error:', courseError);
          } else {
            coursesData = cData || [];
            console.log('Courses loaded:', coursesData);
          }
        }
        
        const eventIds = data.map(e => e.id);
        console.log('Event IDs to fetch bookings for:', eventIds);
        
        let bookingsData: any[] = [];
        if (eventIds.length > 0) {
          const { data: bData, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .in('event_id', eventIds);
          
          if (bookingError) {
            console.error('Bookings Query Error:', bookingError);
          } else {
            bookingsData = bData || [];
            console.log('Bookings loaded:', bookingsData);
          }
        }
        
        const enrichedEvents = data.map(event => ({
          ...event,
          courses: coursesData.find(c => c.id === event.course_id),
          bookings: bookingsData.filter(b => b.event_id === event.id) || []
        }));
        
        console.log('Enriched events:', enrichedEvents);
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
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const uniqueCourses = Array.from(new Set(events.map(e => e.courses?.name).filter(Boolean)));

  const filteredEvents = filterCourse === 'all' ? events : events.filter(e => e.courses?.name === filterCourse);

  const canViewAdmin = hasPermission(userRole, 'ADMIN_DASHBOARD', 'canView');
  const canSchedule = hasPermission(userRole, 'COURSE_SCHEDULING', 'canCreate');

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="transition-colors duration-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* User info bar */}
        <div className="flex justify-between items-center mb-4 px-4">
          <div style={{ color: isDark ? '#cbd5e1' : '#475569' }} className="text-sm font-semibold">
            {user ? `Logged in as: ${user.email} (Role: ${userRole})` : 'Not logged in'}
          </div>
          {user && (
            <button 
              onClick={handleSignOut} 
              style={{ backgroundColor: '#dc2626' }} 
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'} 
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'} 
              className="text-white px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>

        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-[40px] shadow-2xl border overflow-hidden">
          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-8 border-b">
            {/* Top row with title and buttons */}
            <div className="flex justify-between items-center mb-6">
              <div style={{ width: '140px' }}></div>
              <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-3xl font-black uppercase tracking-tighter">Booking Calendar</h1>
              <div className="flex items-center gap-4">
                {canViewAdmin && (
                  <a 
                    href="/admin" 
                    style={{ backgroundColor: '#16a34a' }} 
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'} 
                    className="text-white px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all cursor-pointer"
                  >
                    Admin
                  </a>
                )}
                <ThemeToggle />
              </div>
            </div>
            
            {/* Dropdown row */}
            <div className="flex justify-center mb-4">
              <div style={{ width: '120px' }}>
                <select 
                  value={filterCourse} 
                  onChange={(e) => setFilterCourse(e.target.value)}
                  style={{ 
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    borderColor: isDark ? '#475569' : '#cbd5e1',
                    fontSize: '10px',
                    padding: '4px 8px'
                  }}
                  className="w-full rounded-lg border font-black uppercase tracking-widest"
                >
                  <option value="all">All</option>
                  {uniqueCourses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month row */}
            <div className="flex justify-between items-center">
              <div style={{ width: '220px' }}></div>
              <div className="flex justify-center items-center gap-8 flex-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ color: isDark ? '#94a3b8' : '#475569' }} className="p-2 hover:opacity-80 rounded-lg font-bold text-2xl">←</button>
                <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b', minWidth: '200px' }} className="text-3xl font-black uppercase tracking-tighter text-center">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ color: isDark ? '#94a3b8' : '#475569' }} className="p-2 hover:opacity-80 rounded-lg font-bold text-2xl">→</button>
              </div>
              {canSchedule && (
                <button 
                  onClick={() => setShowSchedule(true)} 
                  style={{ backgroundColor: '#2563eb' }} 
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'} 
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} 
                  className="text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
                >
                  + Schedule Course
                </button>
              )}
            </div>
          </div>

          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ color: isDark ? '#94a3b8' : '#64748b', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-4 text-center text-xs font-black uppercase tracking-widest border-r last:border-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0" style={{ minHeight: '700px' }}>
            {calendarDays.map((day, idx) => { 
              const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.event_date), day)); 
              const isCurrentMonth = isSameMonth(day, monthStart);
              
              return (
                <div key={idx} style={{ backgroundColor: isCurrentMonth ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#1a2332' : '#f8fafc'), borderColor: isDark ? '#334155' : '#e2e8f0', opacity: isCurrentMonth ? 1 : 0.5 }} className="border p-3 min-h-[140px] flex flex-col">
                  <span style={{ color: isSameDay(day, new Date()) ? '#60a5fa' : isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-black mb-2">{format(day, 'd')}</span>
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {dayEvents && dayEvents.length > 0 && dayEvents.map(event => { 
                      const bookingCount = event.bookings?.length || 0; 
                      const maxCapacity = 10;
                      const courseName = event.courses?.name || 'Unknown';
                      const colors = getCourseColor(courseName);
                      return (
                        <button 
                          key={event.id} 
                          onClick={() => setSelectedEvent(event)} 
                          style={{ 
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: 'rgba(0,0,0,0.2)',
                            borderWidth: '1px',
                            borderRadius: '0.5rem',
                            padding: '0.5rem'
                          }}
                          className="w-full text-left text-xs transition-all hover:opacity-80"
                        >
                          <p className="font-black truncate uppercase text-xs">{courseName}</p>
                          <p style={{ opacity: 0.9 }} className="text-[11px] font-bold">{bookingCount}/{maxCapacity}</p>
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