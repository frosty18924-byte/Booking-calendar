'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';
import UniformButton from './UniformButton';
import { supabase } from '@/lib/supabase';

interface DuplicateStaff {
  id: string;
  email: string;
  full_name: string;
  location: string;
  is_deleted: boolean;
  created_at: string;
}

interface Divider {
  id: string;
  name: string;
  location_id: string;
  is_duplicate: boolean;
}

export default function DuplicateRemovalModal({ onClose }: { onClose: () => void }) {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'dividers'>('staff');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [duplicateStaff, setDuplicateStaff] = useState<DuplicateStaff[]>([]);
  const [duplicateDividers, setDuplicateDividers] = useState<Divider[]>([]);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());
  const [removalInProgress, setRemovalInProgress] = useState(false);

  useEffect(() => {
    checkTheme();
    analyzeDuplicates();
  }, []);

  function checkTheme() {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }

  async function analyzeDuplicates() {
    setAnalyzing(true);
    try {
      // Analyze staff for duplicates
      const { data: allStaff } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_deleted', false)
        .order('email');

      if (allStaff) {
        const emailGroups = new Map<string, DuplicateStaff[]>();
        
        allStaff.forEach((staff: any) => {
          const email = staff.email.toLowerCase();
          if (!emailGroups.has(email)) {
            emailGroups.set(email, []);
          }
          emailGroups.get(email)!.push({
            id: staff.id,
            email: staff.email,
            full_name: staff.full_name,
            location: staff.location,
            is_deleted: staff.is_deleted,
            created_at: staff.created_at,
          });
        });

        // Extract duplicates (emails with multiple entries)
        const duplicates: DuplicateStaff[] = [];
        emailGroups.forEach((entries, email) => {
          if (entries.length > 1) {
            // Add all but the first (oldest) one
            duplicates.push(...entries.slice(1));
          }
        });

        setDuplicateStaff(duplicates);
      }

      // Analyze dividers for duplicates
      const { data: allStaffData } = await supabase
        .from('staff_locations')
        .select('staff_id, location_id, profiles(full_name)')
        .order('location_id');

      if (allStaffData) {
        const dividerKeywords = ['management', 'team leader', 'lead support', 'staff team', 'staff on probation', 'inactive staff', 'notes', 'date valid'];
        const dividers: Divider[] = [];
        const dividerMap = new Map<string, string[]>(); // location_id -> divider names

        allStaffData.forEach((item: any) => {
          const name = (item.profiles?.full_name || '').toLowerCase();
          if (dividerKeywords.some(keyword => name.includes(keyword))) {
            const key = `${item.location_id}|${name}`;
            const locationKey = item.location_id;
            
            if (!dividerMap.has(locationKey)) {
              dividerMap.set(locationKey, []);
            }

            dividers.push({
              id: item.staff_id,
              name: item.profiles?.full_name || 'Unknown',
              location_id: item.location_id,
              is_duplicate: false,
            });
          }
        });

        // Mark duplicates
        const nameLocationGroups = new Map<string, Divider[]>();
        dividers.forEach(div => {
          const key = `${div.location_id}|${div.name.toLowerCase()}`;
          if (!nameLocationGroups.has(key)) {
            nameLocationGroups.set(key, []);
          }
          nameLocationGroups.get(key)!.push(div);
        });

        const finalDuplicates: Divider[] = [];
        nameLocationGroups.forEach((entries) => {
          if (entries.length > 1) {
            // Mark all as duplicates
            entries.forEach((div, idx) => {
              if (idx > 0) { // Keep the first one
                div.is_duplicate = true;
                finalDuplicates.push(div);
              }
            });
          }
        });

        setDuplicateDividers(finalDuplicates);
      }
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
      alert('❌ Error analyzing duplicates');
    } finally {
      setAnalyzing(false);
    }
  }

  async function removeSelectedStaff() {
    if (selectedForRemoval.size === 0) {
      alert('⚠️  Please select staff to remove');
      return;
    }

    if (!confirm(`Delete ${selectedForRemoval.size} staff member(s)? This cannot be undone.`)) return;

    setRemovalInProgress(true);
    let removed = 0;
    let errors = 0;

    for (const staffId of selectedForRemoval) {
      try {
        const staff = duplicateStaff.find(s => s.id === staffId);
        if (!staff) continue;

        const response = await fetch('/api/delete-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId, email: staff.email })
        });

        const result = await response.json();
        if (result.success) {
          removed++;
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
        console.error('Error removing staff:', error);
      }
    }

    setRemovalInProgress(false);
    alert(`✅ Removed ${removed} staff member(s)${errors > 0 ? ` (${errors} errors)` : ''}`);
    setSelectedForRemoval(new Set());
    analyzeDuplicates();
  }

  async function removeSelectedDividers() {
    if (selectedForRemoval.size === 0) {
      alert('⚠️  Please select dividers to remove');
      return;
    }

    if (!confirm(`Delete ${selectedForRemoval.size} divider(s)? This cannot be undone.`)) return;

    setRemovalInProgress(true);
    let removed = 0;
    let errors = 0;

    for (const dividerId of selectedForRemoval) {
      try {
        const divider = duplicateDividers.find(d => d.id === dividerId);
        if (!divider) continue;

        const response = await fetch('/api/delete-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: dividerId, email: `divider-${dividerId}@system.local` })
        });

        const result = await response.json();
        if (result.success) {
          removed++;
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
        console.error('Error removing divider:', error);
      }
    }

    setRemovalInProgress(false);
    alert(`✅ Removed ${removed} divider(s)${errors > 0 ? ` (${errors} errors)` : ''}`);
    setSelectedForRemoval(new Set());
    analyzeDuplicates();
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedForRemoval);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedForRemoval(newSelection);
  };

  const selectAll = () => {
    if (activeTab === 'staff') {
      if (selectedForRemoval.size === duplicateStaff.length) {
        setSelectedForRemoval(new Set());
      } else {
        setSelectedForRemoval(new Set(duplicateStaff.map(s => s.id)));
      }
    } else {
      if (selectedForRemoval.size === duplicateDividers.length) {
        setSelectedForRemoval(new Set());
      } else {
        setSelectedForRemoval(new Set(duplicateDividers.map(d => d.id)));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#cbd5e1',
        }}
        className="rounded-2xl border shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div
          style={{
            borderColor: isDark ? '#334155' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }}
          className="border-b p-6 flex justify-between items-center"
        >
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">
            🧹 Remove Duplicates
          </h2>
          <button
            onClick={onClose}
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            className="hover:text-red-500 text-2xl transition-colors"
            aria-label="Close"
          >
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            borderColor: isDark ? '#334155' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }}
          className="border-b flex gap-4 px-6 pt-4"
        >
          <button
            onClick={() => {
              setActiveTab('staff');
              setSelectedForRemoval(new Set());
            }}
            style={{
              backgroundColor: activeTab === 'staff' ? '#3b82f6' : 'transparent',
              color: activeTab === 'staff' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
              borderColor: activeTab === 'staff' ? '#3b82f6' : isDark ? '#334155' : '#e2e8f0',
            }}
            className="px-4 py-2 rounded-t-xl border-b-2 font-bold text-sm"
          >
            👥 Duplicate Staff
          </button>
          <button
            onClick={() => {
              setActiveTab('dividers');
              setSelectedForRemoval(new Set());
            }}
            style={{
              backgroundColor: activeTab === 'dividers' ? '#3b82f6' : 'transparent',
              color: activeTab === 'dividers' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
              borderColor: activeTab === 'dividers' ? '#3b82f6' : isDark ? '#334155' : '#e2e8f0',
            }}
            className="px-4 py-2 rounded-t-xl border-b-2 font-bold text-sm"
          >
            ➖ Duplicate Dividers
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {analyzing ? (
            <div className="flex items-center justify-center h-40">
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-lg">
                🔍 Analyzing duplicates...
              </p>
            </div>
          ) : activeTab === 'staff' ? (
            <div className="space-y-4">
              {duplicateStaff.length === 0 ? (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-center py-8">
                  ✅ No duplicate staff found!
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedForRemoval.size === duplicateStaff.length}
                      onChange={selectAll}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label
                      style={{ color: isDark ? '#cbd5e1' : '#475569' }}
                      className="text-sm font-bold cursor-pointer"
                    >
                      Select All ({duplicateStaff.length})
                    </label>
                  </div>

                  <div className="space-y-2">
                    {duplicateStaff.map(staff => (
                      <div
                        key={staff.id}
                        style={{
                          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                          borderColor: selectedForRemoval.has(staff.id) ? '#ef4444' : isDark ? '#334155' : '#e2e8f0',
                        }}
                        className="border rounded-lg p-4 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedForRemoval.has(staff.id)}
                            onChange={() => toggleSelection(staff.id)}
                            className="w-5 h-5 mt-1 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold">
                              {staff.full_name}
                            </p>
                            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm">
                              📧 {staff.email}
                            </p>
                            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm">
                              📍 {staff.location}
                            </p>
                            <p style={{ color: isDark ? '#64748b' : '#cbd5e1' }} className="text-xs mt-1">
                              Created: {new Date(staff.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateDividers.length === 0 ? (
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-center py-8">
                  ✅ No duplicate dividers found!
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedForRemoval.size === duplicateDividers.length}
                      onChange={selectAll}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label
                      style={{ color: isDark ? '#cbd5e1' : '#475569' }}
                      className="text-sm font-bold cursor-pointer"
                    >
                      Select All ({duplicateDividers.length})
                    </label>
                  </div>

                  <div className="space-y-2">
                    {duplicateDividers.map(divider => (
                      <div
                        key={divider.id}
                        style={{
                          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                          borderColor: selectedForRemoval.has(divider.id) ? '#ef4444' : isDark ? '#334155' : '#e2e8f0',
                        }}
                        className="border rounded-lg p-4 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedForRemoval.has(divider.id)}
                            onChange={() => toggleSelection(divider.id)}
                            className="w-5 h-5 mt-1 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold">
                              {divider.name}
                            </p>
                            <p style={{ color: '#f59e0b' }} className="text-sm">
                              ⚠️  Section Divider
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderColor: isDark ? '#334155' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }}
          className="border-t p-6 flex gap-3 justify-end"
        >
          <UniformButton
            variant="secondary"
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
          >
            Cancel
          </UniformButton>
          <UniformButton
            variant="danger"
            onClick={() =>
              activeTab === 'staff' ? removeSelectedStaff() : removeSelectedDividers()
            }
            disabled={selectedForRemoval.size === 0 || removalInProgress}
            className="px-6 py-2 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
            style={{ backgroundColor: selectedForRemoval.size === 0 ? '#9ca3af' : '#ef4444' }}
          >
            {removalInProgress ? '🔄 Removing...' : `🗑️  Remove ${selectedForRemoval.size}`}
          </UniformButton>
        </div>
      </div>
    </div>
  );
}
