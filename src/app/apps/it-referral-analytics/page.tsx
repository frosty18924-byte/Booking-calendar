'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BackButton from '@/app/components/BackButton';
import { getITReferralCategoryLabel, IT_REFERRAL_CATEGORIES } from '@/lib/itReferralCategories';

interface ITReferral {
  id: string;
  ticket_number?: number | null;
  name: string;
  email: string;
  location: string;
  issue_title: string;
  issue_description: string;
  error_messages: string;
  status: string;
  assigned_to: string | null;
  category: string | null;
  sub_category?: string | null;
  priority: string | null;
  created_at: string;
  troubleshooting_steps_completed: string[];
}

interface TicketUpdate {
  id: string;
  referral_id: string;
  update_text: string;
  updated_by: string;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role_tier?: string | null;
}

const STATUSES = ['submitted', 'assigned', 'in-progress', 'resolved', 'completed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function ITReferralAnalytics() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ITReferral[]>([]);
  const [updates, setUpdates] = useState<Record<string, TicketUpdate[]>>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    return () => window.removeEventListener('themeChange', checkTheme);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Authentication error:', authError);
        router.push('/login');
        return;
      }

      // Fetch referrals with error handling
      const { data: referralsData, error: referralsError } = await supabase
        .from('it_referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
        throw new Error(`Failed to fetch referrals: ${referralsError.message}`);
      }
      setReferrals(referralsData || []);

      // Fetch updates with error handling
      const { data: updatesData, error: updatesError } = await supabase
        .from('ticket_updates')
        .select('*')
        .order('created_at', { ascending: true });

      if (updatesError) {
        console.error('Error fetching updates:', updatesError);
        // Don't throw error for updates, continue without them
        console.warn('Continuing without updates data');
      } else {
        // Organize updates by referral_id
        const updatesMap: Record<string, TicketUpdate[]> = {};
        (updatesData || []).forEach((update) => {
          if (!updatesMap[update.referral_id]) {
            updatesMap[update.referral_id] = [];
          }
          updatesMap[update.referral_id].push(update);
        });
        setUpdates(updatesMap);
      }

      // Fetch staff members with error handling
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, full_name, email, role_tier')
        .order('full_name');

      if (staffError) {
        console.error('Error fetching staff:', staffError);
        // Don't throw error for staff, continue without them
        console.warn('Continuing without staff data');
      } else {
        setStaffMembers(staffData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setFetchError(errorMessage);
      // Set empty data to prevent crashes
      setReferrals([]);
      setUpdates({});
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on selected period
  const filteredReferrals = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(selectedPeriod));
    
    return referrals.filter(referral => 
      new Date(referral.created_at) >= cutoffDate
    );
  }, [referrals, selectedPeriod]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = filteredReferrals.length;
    const completed = filteredReferrals.filter(r => r.status === 'completed').length;
    const inProgress = filteredReferrals.filter(r => r.status === 'in-progress').length;
    const assigned = filteredReferrals.filter(r => r.status === 'assigned').length;
    const submitted = filteredReferrals.filter(r => r.status === 'submitted').length;
    const resolved = filteredReferrals.filter(r => r.status === 'resolved').length;

    // Category analytics
    const categoryCounts = new Map<string, number>();
    const categoryResolutionTime = new Map<string, number[]>();
    
    // Staff performance analytics
    const staffPerformance = new Map<string, {
      assigned: number;
      completed: number;
      avgResolutionTime: number;
      totalUpdates: number;
    }>();

    // Priority analytics
    const priorityCounts = new Map<string, number>();

    // Location analytics
    const locationCounts = new Map<string, number>();

    filteredReferrals.forEach(referral => {
      // Category counts
      const category = referral.category || 'Uncategorized';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

      // Priority counts
      const priority = referral.priority || 'Unset';
      priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);

      // Location counts
      const location = referral.location || 'Unknown';
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);

      // Staff performance
      const assignedTo = referral.assigned_to || 'Unassigned';
      if (!staffPerformance.has(assignedTo)) {
        staffPerformance.set(assignedTo, {
          assigned: 0,
          completed: 0,
          avgResolutionTime: 0,
          totalUpdates: 0,
        });
      }
      
      const perf = staffPerformance.get(assignedTo)!;
      perf.assigned += 1;
      
      if (referral.status === 'completed') {
        perf.completed += 1;
        
        // Calculate resolution time
        const created = new Date(referral.created_at);
        const now = new Date();
        const resolutionTime = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)); // days
        categoryResolutionTime.set(category, [...(categoryResolutionTime.get(category) || []), resolutionTime]);
        perf.avgResolutionTime = resolutionTime;
      }

      // Count updates for this referral
      const referralUpdates = updates[referral.id] || [];
      perf.totalUpdates += referralUpdates.length;
    });

    // Calculate average resolution times by category
    const avgResolutionByCategory = new Map<string, number>();
    categoryResolutionTime.forEach((times, category) => {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      avgResolutionByCategory.set(category, Math.round(avg * 10) / 10);
    });

    // Calculate completion rates by staff
    staffPerformance.forEach((perf, staff) => {
      perf.avgResolutionTime = perf.completed > 0 
        ? Math.round((perf.avgResolutionTime / perf.completed) * 10) / 10
        : 0;
    });

    return {
      total,
      completed,
      inProgress,
      assigned,
      submitted,
      resolved,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      categoryCounts: Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]),
      priorityCounts: Array.from(priorityCounts.entries()).sort((a, b) => b[1] - a[1]),
      locationCounts: Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1]),
      staffPerformance: Array.from(staffPerformance.entries())
        .filter(([_, perf]) => perf.assigned > 0)
        .sort((a, b) => b[1].completed - a[1].completed),
      avgResolutionByCategory: Array.from(avgResolutionByCategory.entries())
        .sort((a, b) => a[1] - b[1]),
    };
  }, [filteredReferrals, updates]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <BackButton />
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>Loading analytics...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <BackButton />
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-bold mb-2">
                Data Loading Error
              </h2>
              <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }} className="text-sm mb-4">
                Unable to load IT referral analytics data. This might be due to:
              </p>
              <ul style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-left mb-4 space-y-1">
                <li>• Missing database tables (it_referrals, ticket_updates, staff)</li>
                <li>• Insufficient permissions to access analytics data</li>
                <li>• Network connectivity issues</li>
              </ul>
              <p style={{ color: isDark ? '#ef4444' : '#dc2626' }} className="text-xs mb-4">
                Error: {fetchError}
              </p>
              <button
                onClick={() => {
                  setFetchError(null);
                  fetchData();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        
        <div className="mt-8 mb-8">
          <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-3xl font-bold mb-2">
            IT Referrals Analytics
          </h1>
          <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
            Performance metrics and insights for IT support tickets
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div>
            <label style={{ color: isDark ? '#cbd5e1' : '#64748b' }} className="block text-sm font-medium mb-2">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              }}
              className="px-3 py-2 rounded-lg border text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-medium">Total Tickets</p>
                <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold">{analytics.total}</p>
              </div>
              <div className="text-blue-500 text-2xl">📊</div>
            </div>
          </div>

          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-medium">Completion Rate</p>
                <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold">{analytics.completionRate}%</p>
              </div>
              <div className="text-green-500 text-2xl">✅</div>
            </div>
          </div>

          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-medium">In Progress</p>
                <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold">{analytics.inProgress}</p>
              </div>
              <div className="text-yellow-500 text-2xl">⏳</div>
            </div>
          </div>

          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-medium">Completed</p>
                <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold">{analytics.completed}</p>
              </div>
              <div className="text-emerald-500 text-2xl">🎉</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Analytics */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-bold mb-4">
              Ticket Categories
            </h2>
            <div className="space-y-3">
              {analytics.categoryCounts.map(([category, count]) => {
                const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                const avgResolution = analytics.avgResolutionByCategory.find(([cat]) => cat === category)?.[1];
                
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm font-medium">
                          {getITReferralCategoryLabel(category)}
                        </span>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      {avgResolution && (
                        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mt-1">
                          Avg resolution: {avgResolution} days
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staff Performance */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-bold mb-4">
              Staff Performance
            </h2>
            <div className="space-y-3">
              {analytics.staffPerformance.map(([staffId, performance]) => {
                const staffMember = staffMembers.find(s => s.id === staffId);
                const completionRate = performance.assigned > 0 
                  ? Math.round((performance.completed / performance.assigned) * 100) 
                  : 0;
                
                return (
                  <div key={staffId} className="border rounded-lg p-3" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm font-medium">
                        {staffMember?.full_name || staffId}
                      </span>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm">
                        {performance.completed}/{performance.assigned}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Completion: </span>
                        <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{completionRate}%</span>
                      </div>
                      <div>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Avg Time: </span>
                        <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{performance.avgResolutionTime}d</span>
                      </div>
                      <div>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Updates: </span>
                        <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{performance.totalUpdates}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Distribution */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-bold mb-4">
              Priority Distribution
            </h2>
            <div className="space-y-3">
              {analytics.priorityCounts.map(([priority, count]) => {
                const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(priority)}`}>
                        {priority}
                      </span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {count}
                      </span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location Analytics */}
          <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-xl font-bold mb-4">
              Tickets by Location
            </h2>
            <div className="space-y-3">
              {analytics.locationCounts.map(([location, count]) => {
                const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                
                return (
                  <div key={location} className="flex items-center justify-between">
                    <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                      {location}
                    </span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm">
                        {count}
                      </span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
