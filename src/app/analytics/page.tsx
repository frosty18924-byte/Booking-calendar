'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [filterYear, setFilterYear] = useState('2026');
  const [filterPeriod, setFilterPeriod] = useState('Full Year');
  const [groupBy, setGroupBy] = useState<'location' | 'course' | 'person'>('location');
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    checkTheme();
  }, []);

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
      const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  }

  async function checkAuth() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    } catch (err) {
      console.error("Error checking auth:", err);
      router.push('/login');
    }
  }

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [filterYear, filterPeriod, user]);

  async function fetchAnalytics() {
    setLoading(true);
    
    // Calculate start and end dates based on period
    let startDate = `${filterYear}-01-01`;
    let endDate = `${filterYear}-12-31`;

    if (filterPeriod === 'Q1') {
      endDate = `${filterYear}-03-31`;
    } else if (filterPeriod === 'Q2') {
      startDate = `${filterYear}-04-01`;
      endDate = `${filterYear}-06-30`;
    } else if (filterPeriod === 'Q3') {
      startDate = `${filterYear}-07-01`;
      endDate = `${filterYear}-09-30`;
    } else if (filterPeriod === 'Q4') {
      startDate = `${filterYear}-10-01`;
      endDate = `${filterYear}-12-31`;
    }

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          event_id,
          attended_at,
          is_late,
          created_at,
          training_events!inner(
            id,
            event_date,
            venue_id,
            course_id,
            courses(id, name),
            venues(id, name),
            training_event_staff(staff_id)
          ),
          profiles(id, full_name, home_house)
        `)
        .gte('training_events.event_date', startDate)
        .lte('training_events.event_date', endDate);
      
      if (error) throw error;
      
      setData(bookings || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  }

  const processStats = () => {
    const stats: any = {};
    
    data.forEach(item => {
      let key = '';
      
      if (groupBy === 'location') {
        key = item.profiles?.home_house || 'Unassigned Location';
      } else if (groupBy === 'course') {
        key = item.training_events?.courses?.name || 'Unknown Course';
      } else if (groupBy === 'person') {
        key = item.profiles?.full_name || 'Unknown Staff';
      }

      if (!stats[key]) {
        stats[key] = { key, booked: 0, attended: 0, late: 0, absences: 0 };
      }
      
      stats[key].booked++;
      if (item.attended_at) {
        stats[key].attended++;
      } else {
        stats[key].absences++;
      }
      if (item.is_late) {
        stats[key].late++;
      }
    });
    
    return Object.values(stats).sort((a: any, b: any) => b.booked - a.booked);
  };

  const dashboardStats = processStats();
  const totalBooked = data.length;
  const totalAttended = data.filter(d => d.attended_at).length;
  const totalAbsences = totalBooked - totalAttended;
  const totalLate = data.filter(d => d.is_late).length;
  const attendanceRate = totalBooked > 0 ? Math.round((totalAttended / totalBooked) * 100) : 0;

  if (loading) {
    return (
      <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }} className="p-8 transition-colors duration-300 flex items-center justify-center">
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen transition-colors duration-300 p-4 md:p-8" style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
      <div className="max-w-7xl mx-auto">
        {/* User info and sign out */}
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="text-sm font-semibold" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
            {user ? `Logged in as: ${user.email}` : 'Not logged in'}
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

        {/* Header row with back button, title, and theme toggle */}
        <div className="flex justify-between items-center mb-8 px-4">
          <button 
            onClick={() => router.push('/')}
            style={{ color: isDark ? '#94a3b8' : '#475569' }}
            className="p-2 hover:opacity-80 rounded-lg font-bold text-2xl"
          >
            ←
          </button>
          <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-3xl font-black uppercase tracking-tighter">Intelligence Hub</h1>
          <ThemeToggle />
        </div>

        {/* TOP FILTER BAR */}
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="flex flex-wrap items-end gap-4 mb-10 p-6 rounded-3xl border shadow-sm">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-bold uppercase mb-1">Year</label>
              <select 
                value={filterYear} 
                onChange={e => setFilterYear(e.target.value)} 
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="bg-slate-50 border rounded-md p-2 text-sm outline-none"
              >
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-bold uppercase mb-1">Period</label>
              <select 
                value={filterPeriod} 
                onChange={e => setFilterPeriod(e.target.value)} 
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="bg-slate-50 border rounded-md p-2 text-sm outline-none"
              >
                <option>Full Year</option>
                <option>Q1</option>
                <option>Q2</option>
                <option>Q3</option>
                <option>Q4</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-bold uppercase mb-1">Group By</label>
              <select 
                value={groupBy} 
                onChange={e => setGroupBy(e.target.value as any)} 
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="bg-slate-50 border rounded-md p-2 text-sm outline-none"
              >
                <option value="location">Location</option>
                <option value="course">Course</option>
                <option value="person">Staff Member</option>
              </select>
            </div>
          </div>
          <button 
            onClick={fetchAnalytics} 
            style={{ backgroundColor: '#9333ea' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} 
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} 
            className="bg-purple-600 px-8 py-2.5 rounded-lg font-bold text-sm text-white h-[42px] hover:opacity-90 transition-all shadow-lg"
          >
            Refresh
          </button>
        </div>

        {/* KPI BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="border-t-4 border-t-blue-600 p-6 rounded-xl text-center shadow-md">
            <p style={{ color: '#60a5fa' }} className="text-[10px] font-black uppercase tracking-widest">Total Bookings</p>
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-4xl font-black mt-2">{totalBooked}</h2>
          </div>
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="border-t-4 border-t-emerald-500 p-6 rounded-xl text-center shadow-md">
            <p style={{ color: '#10b981' }} className="text-[10px] font-black uppercase tracking-widest">Attendance Rate</p>
            <h2 style={{ color: '#10b981' }} className="text-4xl font-black mt-2">{attendanceRate}%</h2>
          </div>
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="border-t-4 border-t-amber-500 p-6 rounded-xl text-center shadow-md">
            <p style={{ color: '#f59e0b' }} className="text-[10px] font-black uppercase tracking-widest">Late Arrivals</p>
            <h2 style={{ color: '#f59e0b' }} className="text-4xl font-black mt-2">{totalLate}</h2>
          </div>
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="border-t-4 border-t-red-600 p-6 rounded-xl text-center shadow-md">
            <p style={{ color: '#ef4444' }} className="text-[10px] font-black uppercase tracking-widest">Absences</p>
            <h2 style={{ color: '#ef4444' }} className="text-4xl font-black mt-2">{totalAbsences}</h2>
          </div>
        </div>

        {/* DATA TABLE */}
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="rounded-2xl border overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b' }} className="text-[11px] font-bold uppercase border-b">
              <tr>
                <th className="p-4">Grouping</th>
                <th className="p-4 text-center">Booked</th>
                <th className="p-4 text-center">Attended</th>
                <th className="p-4 text-center">Late</th>
                <th className="p-4 text-center">Absences</th>
                <th className="p-4 text-right">Rate %</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="divide-y">
              {dashboardStats.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="p-8 text-center">
                    No data available for the selected period
                  </td>
                </tr>
              ) : (
                dashboardStats.map((row: any) => (
                  <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td style={{ color: isDark ? '#cbd5e1' : '#1e293b' }} className="p-4 font-bold">{row.key}</td>
                    <td style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="p-4 text-center">{row.booked}</td>
                    <td style={{ color: '#10b981' }} className="p-4 text-center font-bold">{row.attended}</td>
                    <td style={{ color: '#f59e0b' }} className="p-4 text-center font-bold">{row.late}</td>
                    <td style={{ color: '#ef4444' }} className="p-4 text-center font-bold">{row.absences}</td>
                    <td style={{ color: isDark ? '#cbd5e1' : '#1e293b' }} className="p-4 text-right font-bold">{row.booked > 0 ? Math.round((row.attended / row.booked) * 100) : 0}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}