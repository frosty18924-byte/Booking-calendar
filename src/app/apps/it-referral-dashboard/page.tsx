'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BackButton from '@/app/components/BackButton';
import { ChevronDown, Loader2 } from 'lucide-react';
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
  quick_wins_tried?: string[] | null;
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

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['submitted', 'assigned', 'in-progress', 'resolved', 'completed'];
const KNOWN_CATEGORY_IDS = new Set(IT_REFERRAL_CATEGORIES.map((category) => category.id));

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default function ITReferralDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [referrals, setReferrals] = useState<ITReferral[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [locations, setLocations] = useState<string[]>([]);
  const [updates, setUpdates] = useState<Record<string, TicketUpdate[]>>({});
  const [newUpdate, setNewUpdate] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    return () => window.removeEventListener('themeChange', checkTheme);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setAccessDenied(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAccessDenied('You must be signed in to view this dashboard.');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role_tier')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        const roleTier = profile?.role_tier as string | null | undefined;
        if (roleTier !== 'admin') {
          setAccessDenied('Access denied. This dashboard is for IT admins only.');
          return;
        }

        setCurrentUser(profile?.full_name || user.email || 'Unknown');

        // Fetch referrals
        const { data: referralsData, error: referralsError } = await supabase
          .from('it_referrals')
          .select('*')
          .order('created_at', { ascending: false });

        if (referralsError) throw referralsError;
        setReferrals(referralsData || []);

        // Extract unique locations
        const uniqueLocations = Array.from(
          new Set((referralsData || []).map((r) => r.location).filter(Boolean))
        ) as string[];
        setLocations(uniqueLocations);

        // Fetch staff members for assignment dropdown
        const { data: staffData, error: staffError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role_tier, is_deleted')
          .eq('role_tier', 'admin')
          .eq('is_deleted', false)
          .order('full_name');

        if (staffError) {
          // Backwards-compatible: if the soft-delete column isn't present yet, fall back to all admins.
          const message = String((staffError as any)?.message || '').toLowerCase();
          const details = String((staffError as any)?.details || '').toLowerCase();
          const mentionsSoftDelete = message.includes('is_deleted') || details.includes('is_deleted');

          if (!mentionsSoftDelete) throw staffError;

          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role_tier')
            .eq('role_tier', 'admin')
            .order('full_name');

          if (fallbackError) throw fallbackError;
          setStaffMembers(fallbackData || []);
        } else {
          setStaffMembers(staffData || []);
        }

        // Fetch updates for all referrals
        const { data: updatesData, error: updatesError } = await supabase
          .from('ticket_updates')
          .select('*')
          .order('created_at', { ascending: true });

        if (updatesError) throw updatesError;
        
        // Organize updates by referral_id
        const updatesMap: Record<string, TicketUpdate[]> = {};
        (updatesData || []).forEach((update) => {
          if (!updatesMap[update.referral_id]) {
            updatesMap[update.referral_id] = [];
          }
          updatesMap[update.referral_id].push(update);
        });
        setUpdates(updatesMap);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateReferral = async (
    referralId: string,
    updates: Partial<ITReferral>
  ) => {
    try {
      const { error } = await supabase
        .from('it_referrals')
        .update(updates)
        .eq('id', referralId);

      if (error) throw error;

      setReferrals((prev) =>
        prev.map((r) => (r.id === referralId ? { ...r, ...updates } : r))
      );
      setEditingId(null);
    } catch (error) {
      console.error('Error updating referral:', error);
    }
  };

  const handleAddUpdate = async (referralId: string) => {
    const updateText = newUpdate[referralId]?.trim();
    if (!updateText || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('ticket_updates')
        .insert([
          {
            referral_id: referralId,
            update_text: updateText,
            updated_by: currentUser,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Add the new update to local state
      setUpdates((prev) => ({
        ...prev,
        [referralId]: [...(prev[referralId] || []), data[0]],
      }));

      // Clear the input
      setNewUpdate((prev) => ({
        ...prev,
        [referralId]: '',
      }));
    } catch (error) {
      console.error('Error adding update:', error);
    }
  };

  const handleDeleteReferral = async (referralId: string) => {
    const referral = referrals.find((r) => r.id === referralId);
    const label = referral?.ticket_number ? `#${referral.ticket_number}` : referralId;

    const ok = window.confirm(`Remove ticket ${label}? This will permanently delete the ticket and its updates/attachments.`);
    if (!ok) return;

    try {
      setDeletingId(referralId);
      const res = await fetch('/api/it-referrals/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ referralId }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to remove ticket');
      }

      setReferrals((prev) => prev.filter((r) => r.id !== referralId));
      setUpdates((prev) => {
        const next = { ...prev };
        delete next[referralId];
        return next;
      });
      setExpandedId((prev) => (prev === referralId ? null : prev));
      setEditingId((prev) => (prev === referralId ? null : prev));
    } catch (error) {
      console.error('Error deleting referral:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove ticket');
    } finally {
      setDeletingId(null);
    }
  };

  const visibleReferrals = useMemo(() => {
    const byStatus = showCompleted
      ? referrals.filter((r) => r.status === 'completed')
      : referrals.filter((r) => r.status !== 'completed');

    return filterLocation === 'all'
      ? byStatus
      : byStatus.filter((r) => r.location === filterLocation);
  }, [filterLocation, referrals, showCompleted]);

  const overview = useMemo(() => {
    const total = referrals.length;
    const completed = referrals.filter((referral) => referral.status === 'completed').length;
    const open = total - completed;

    const locationCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const subCategoryCounts = new Map<string, number>();

    for (const referral of referrals) {
      const location = referral.location || 'Unknown';
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);

      const categoryLabel = referral.category ? getITReferralCategoryLabel(referral.category) : 'Uncategorised';
      categoryCounts.set(categoryLabel, (categoryCounts.get(categoryLabel) || 0) + 1);

      const subCategoryLabel = (referral.sub_category || '').trim();
      if (subCategoryLabel) {
        subCategoryCounts.set(subCategoryLabel, (subCategoryCounts.get(subCategoryLabel) || 0) + 1);
      }
    }

    const sortedLocations = Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    const sortedCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const sortedSubCategories = Array.from(subCategoryCounts.entries())
      .map(([subCategory, count]) => ({ subCategory, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      open,
      completed,
      locations: sortedLocations,
      categories: sortedCategories,
      subCategories: sortedSubCategories,
    };
  }, [referrals]);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'Urgent':
        return isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700';
      case 'High':
        return isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700';
      case 'Medium':
        return isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700';
      default:
        return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 'assigned':
        return isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700';
      case 'in-progress':
        return isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700';
      case 'resolved':
        return isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700';
      case 'completed':
        return isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
      default:
        return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700';
    }
  };

  if (loading) {
    return (
      <main
        style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}
        className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto">
          <BackButton />
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main
        style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}
        className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto">
          <BackButton />
          <div
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              color: isDark ? '#f1f5f9' : '#1e293b',
            }}
            className="mt-8 rounded-lg border p-6"
          >
            <h1 className="text-xl font-semibold mb-2">IT Referrals Dashboard</h1>
            <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>{accessDenied}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}
      className="min-h-screen px-4 pb-10 pt-6 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">
        <BackButton />

        <div className="mt-6 mb-8">
          <h1
            style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            className="text-3xl font-bold mb-2"
          >
            IT Referrals Dashboard
          </h1>
          <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
            Manage and track IT support tickets
          </p>
        </div>

        {/* Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total', value: overview.total, onClick: () => setShowCompleted(false) },
            { label: 'Open', value: overview.open, onClick: () => setShowCompleted(false) },
            { label: 'Completed', value: overview.completed, onClick: () => setShowCompleted(true) },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              }}
              className={`rounded-lg border p-4 ${card.onClick ? 'cursor-pointer' : ''}`}
              onClick={card.onClick}
            >
              <p style={{ color: isDark ? '#cbd5e1' : '#64748b' }} className="text-sm font-medium">
                {card.label}
              </p>
              <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-bold mt-1">
                {card.value}
              </p>
              {card.label === 'Completed' && (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs mt-2">
                  {showCompleted ? 'Showing completed tickets' : 'Click to view completed'}
                </p>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
          }}
          className="mb-8 rounded-lg border p-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h2 style={{ color: isDark ? '#cbd5e1' : '#64748b' }} className="text-sm font-semibold mb-3">
                By Location
              </h2>
              <div className="space-y-2">
                {overview.locations.slice(0, 10).map(({ location, count }) => (
                  <div key={location} className="flex items-center justify-between">
                    <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                      {location}
                    </span>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
                {overview.locations.length === 0 && (
                  <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm italic">
                    No referrals yet
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 style={{ color: isDark ? '#cbd5e1' : '#64748b' }} className="text-sm font-semibold mb-3">
                By Category
              </h2>
              <div className="space-y-2">
                {overview.categories.slice(0, 10).map(({ category, count }) => (
                  <div key={category} className="flex items-center justify-between">
                    <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                      {category}
                    </span>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
                {overview.categories.length === 0 && (
                  <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm italic">
                    No referrals yet
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 style={{ color: isDark ? '#cbd5e1' : '#64748b' }} className="text-sm font-semibold mb-3">
                Top Sub Categories
              </h2>
              <div className="space-y-2">
                {overview.subCategories.slice(0, 10).map(({ subCategory, count }) => (
                  <div key={subCategory} className="flex items-center justify-between">
                    <span style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                      {subCategory}
                    </span>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
                {overview.subCategories.length === 0 && (
                  <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm italic">
                    No sub categories yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-end">
          <div>
            <label
              style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
              className="block text-sm font-medium mb-2"
            >
              Filter by Location
            </label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              }}
              className="px-4 py-2 rounded-lg border"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
              className="block text-sm font-medium mb-2"
            >
              View
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCompleted(false)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  !showCompleted
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : isDark
                      ? 'bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800'
                      : 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setShowCompleted(true)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  showCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isDark
                      ? 'bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800'
                      : 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
          <div
            style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
            className="flex items-end text-sm"
          >
            Showing {visibleReferrals.length} ticket{visibleReferrals.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Referrals Table */}
        <div
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
          }}
          className="rounded-lg border overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderBottomColor: isDark ? '#334155' : '#e2e8f0',
                }}
                className="border-b"
              >
                <tr>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Ticket
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Location
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Assigned To
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Category
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Sub Category
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Priority
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Status
                  </th>
                  <th
                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                    className="px-6 py-4 text-left text-sm font-semibold"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleReferrals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ color: isDark ? '#94a3b8' : '#94a3b8' }}
                      className="px-6 py-8 text-center"
                    >
                      No referrals found
                    </td>
                  </tr>
                ) : (
                  visibleReferrals.map((referral) => (
                    <tr
                      key={referral.id}
                      style={{
                        backgroundColor: expandedId === referral.id ? (isDark ? '#0f172a' : '#f8fafc') : 'transparent',
                        borderBottomColor: isDark ? '#334155' : '#e2e8f0',
                      }}
                      className="border-b transition-colors"
                    >
                      <td
                        style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                        className="px-6 py-4 text-sm font-medium"
                      >
                        <button
                          onClick={() => setExpandedId(expandedId === referral.id ? null : referral.id)}
                          className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                        >
                          <span>
                            {referral.ticket_number ? `#${referral.ticket_number} ` : ''}{referral.issue_title.substring(0, 30)}
                          </span>
                          <ChevronDown
                            className="w-4 h-4"
                            style={{
                              transform: expandedId === referral.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          />
                        </button>
                      </td>
                      <td
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="px-6 py-4 text-sm"
                      >
                        {referral.location}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {editingId === referral.id ? (
                          <select
                            value={referral.assigned_to || ''}
                            onChange={(e) =>
                              handleUpdateReferral(referral.id, {
                                assigned_to: e.target.value || null,
                              })
                            }
                            style={{
                              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                              color: isDark ? '#f1f5f9' : '#1e293b',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                            }}
                            className="px-3 py-1 rounded border text-sm w-full"
                          >
                            <option value="">Unassigned</option>
                            {staffMembers.map((staff) => (
                              <option key={staff.id} value={staff.full_name || staff.email || ''}>
                                {staff.full_name || staff.email || 'Unknown'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingId(referral.id)}
                            style={{ color: referral.assigned_to ? '#3b82f6' : isDark ? '#94a3b8' : '#94a3b8' }}
                            className="hover:underline"
                          >
                            {referral.assigned_to || 'Unassigned'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={referral.category || ''}
                          onChange={(e) =>
                            handleUpdateReferral(referral.id, {
                              category: e.target.value || null,
                            })
                          }
                          style={{
                            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                            color: isDark ? '#f1f5f9' : '#1e293b',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                          }}
                          className="px-3 py-1 rounded border"
                        >
                          <option value="">Select...</option>
                          {referral.category && !KNOWN_CATEGORY_IDS.has(referral.category) && (
                            <option value={referral.category}>{getITReferralCategoryLabel(referral.category)}</option>
                          )}
                          {IT_REFERRAL_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="px-6 py-4 text-sm"
                      >
                        {referral.sub_category || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={referral.priority || ''}
                          onChange={(e) =>
                            handleUpdateReferral(referral.id, {
                              priority: e.target.value || null,
                            })
                          }
                          style={{
                            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                            color: isDark ? '#f1f5f9' : '#1e293b',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                          }}
                          className="px-3 py-1 rounded border"
                        >
                          <option value="">Select...</option>
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={referral.status || 'submitted'}
                          onChange={(e) =>
                            handleUpdateReferral(referral.id, {
                              status: e.target.value,
                            })
                          }
                          style={{
                            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                            color: isDark ? '#f1f5f9' : '#1e293b',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                          }}
                          className={`px-3 py-1 rounded border text-xs font-medium ${getStatusColor(referral.status)}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDeleteReferral(referral.id)}
                          disabled={deletingId === referral.id}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            deletingId === referral.id
                              ? 'bg-slate-400 text-white cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {deletingId === referral.id ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Expanded Details */}
          {expandedId && (
            <div
              style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderTopColor: isDark ? '#334155' : '#e2e8f0',
              }}
              className="border-t p-6"
            >
              {(() => {
                const referral = visibleReferrals.find((r) => r.id === expandedId) || referrals.find((r) => r.id === expandedId);
                if (!referral) return null;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Ticket Number
                      </h3>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {referral.ticket_number ? `#${referral.ticket_number}` : '—'}
                      </p>
                    </div>
                    <div>
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Submitted By
                      </h3>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {referral.name} ({referral.email})
                      </p>
                    </div>
                    <div>
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Submitted Date
                      </h3>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {new Date(referral.created_at).toLocaleDateString()} {new Date(referral.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Status
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                          {referral.status}
                        </span>
                        {referral.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateReferral(referral.id, { status: 'completed' })}
                            className="px-3 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            Mark completed
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReferral(referral.id)}
                          disabled={deletingId === referral.id}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            deletingId === referral.id
                              ? 'bg-slate-400 text-white cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {deletingId === referral.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Category
                      </h3>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {referral.category ? getITReferralCategoryLabel(referral.category) : 'Uncategorised'}
                      </p>
                    </div>
                    <div>
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Sub Category
                      </h3>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {referral.sub_category || '-'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-2"
                      >
                        Issue Description
                      </h3>
                      <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm">
                        {referral.issue_description}
                      </p>
                    </div>
                    {referral.error_messages && (
                      <div className="md:col-span-2">
                        <h3
                          style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                          className="text-sm font-semibold mb-2"
                        >
                          Error Messages
                        </h3>
                        <p
                          style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                          className="text-sm whitespace-pre-wrap"
                        >
                          {referral.error_messages}
                        </p>
                      </div>
                    )}
                    {referral.quick_wins_tried && referral.quick_wins_tried.length > 0 && (
                      <div className="md:col-span-2">
                        <h3
                          style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                          className="text-sm font-semibold mb-2"
                        >
                          Quick Wins Tried
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {referral.quick_wins_tried.map((item) => (
                            <span
                              key={item}
                              style={{
                                backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                                color: isDark ? '#cbd5e1' : '#475569',
                              }}
                              className="px-3 py-1 rounded-full text-xs"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {referral.troubleshooting_steps_completed && referral.troubleshooting_steps_completed.length > 0 && (
                      <div className="md:col-span-2">
                        <h3
                          style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                          className="text-sm font-semibold mb-2"
                        >
                          Troubleshooting Steps Completed
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {referral.troubleshooting_steps_completed.map((step) => (
                            <span
                              key={step}
                              style={{
                                backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                                color: isDark ? '#cbd5e1' : '#475569',
                              }}
                              className="px-3 py-1 rounded-full text-xs"
                            >
                              {step}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <h3
                        style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        className="text-sm font-semibold mb-4"
                      >
                        Updates
                      </h3>
                      <div className="space-y-4">
                        {updates[referral.id] && updates[referral.id].length > 0 ? (
                          <div
                            style={{
                              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                            }}
                            className="border rounded p-4 space-y-3 mb-4"
                          >
                            {updates[referral.id].map((update) => (
                              <div
                                key={update.id}
                                style={{
                                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                                  borderColor: isDark ? '#334155' : '#e2e8f0',
                                }}
                                className="border rounded p-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <p
                                    style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                                    className="text-xs font-medium"
                                  >
                                    {update.updated_by}
                                  </p>
                                  <p
                                    style={{ color: isDark ? '#94a3b8' : '#94a3b8' }}
                                    className="text-xs"
                                  >
                                    {new Date(update.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <p
                                  style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                                  className="text-sm whitespace-pre-wrap"
                                >
                                  {update.update_text}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: isDark ? '#94a3b8' : '#94a3b8' }} className="text-sm italic">
                            No updates yet
                          </p>
                        )}
                        <div
                          className="mt-4 pt-4 border-t"
                          style={{ borderTopColor: isDark ? '#334155' : '#e2e8f0' }}
                        >
                          <textarea
                            value={newUpdate[referral.id] || ''}
                            onChange={(e) =>
                              setNewUpdate((prev) => ({
                                ...prev,
                                [referral.id]: e.target.value,
                              }))
                            }
                            placeholder="Add an update..."
                            style={{
                              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                              color: isDark ? '#f1f5f9' : '#1e293b',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                            }}
                            className="w-full px-3 py-2 rounded border text-sm resize-none"
                            rows={3}
                          />
                          <button
                            onClick={() => handleAddUpdate(referral.id)}
                            disabled={!newUpdate[referral.id]?.trim()}
                            style={{
                              backgroundColor: newUpdate[referral.id]?.trim()
                                ? '#3b82f6'
                                : isDark ? '#334155' : '#e2e8f0',
                              color: newUpdate[referral.id]?.trim()
                                ? '#ffffff'
                                : isDark ? '#94a3b8' : '#94a3b8',
                            }}
                            className="mt-3 px-4 py-2 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed"
                          >
                            Add Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
