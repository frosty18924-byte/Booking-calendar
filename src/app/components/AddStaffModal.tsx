'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

export default function AddStaffModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => void }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    home_house: '', 
    role_tier: 'staff' as 'staff' | 'manager' | 'scheduler' | 'admin',
    managed_houses: [] as string[],
    password: ''
  });

  useEffect(() => { 
    checkTheme();
    fetchUserRole();
    fetchInitialData(); 
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

  async function fetchUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role_tier')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching role:', error);
          setRoleLoading(false);
          return;
        }
        
        console.log('👤 User role loaded:', profile?.role_tier);
        setUserRole(profile?.role_tier || null);
      }
      setRoleLoading(false);
    } catch (err) {
      console.error('Error fetching user role:', err);
      setRoleLoading(false);
    }
  }

  async function fetchInitialData() {
    const { data: locData } = await supabase.from('locations').select('*').order('name');
    setLocations(locData || []);
    const { data: staffData } = await supabase.from('profiles').select('*').eq('is_deleted', false).order('full_name');
    setAllStaff(staffData || []);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSave called, editingId:', editingId, 'formData:', formData);
    
    if (!hasPermission(userRole, 'STAFF_MANAGEMENT', 'canEdit')) {
      alert('You do not have permission to manage staff');
      return;
    }

    setLoading(true);
    
    // All roles must have an assigned location
    if (!formData.home_house) {
      alert('All users must be assigned a location');
      setLoading(false);
      return;
    }

    try {
      if (editingId) {
        // Map home_house to location for database update
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          location: formData.home_house,
          role_tier: formData.role_tier,
          managed_houses: formData.managed_houses
        };
        console.log('Updating staff with ID:', editingId, 'data:', updateData);
        const { error, data } = await supabase.from('profiles').update(updateData).eq('id', editingId).select();
        console.log('Update result:', { error, data });
        if (error) throw error;
        alert('✅ Staff member updated successfully');
        setEditingId(null);
      } else {
        // For new users, use the API endpoint to create auth user and profile
        const payload = {
          full_name: formData.full_name,
          email: formData.email,
          location: formData.home_house,
          role_tier: formData.role_tier,
          ...(formData.password && { password: formData.password })
        };

        const response = await fetch('/api/add-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!result.success || !result.results[0].success) {
          throw new Error(result.results[0].error || 'Failed to create user');
        }

        if (formData.role_tier === 'staff') {
          alert(`✅ Staff member created and added to roster!\n\nThey do not have login access.`);
        } else if (formData.password) {
          alert(`✅ ${formData.role_tier.charAt(0).toUpperCase() + formData.role_tier.slice(1)} created!\n\nPassword set: ${formData.password}\n\nThey will be prompted to change it on first login.`);
        } else {
          alert(`✅ ${formData.role_tier.charAt(0).toUpperCase() + formData.role_tier.slice(1)} created!\n\nPassword reset email has been sent to ${formData.email}`);
        }
      }
      
      setFormData({ full_name: '', email: '', home_house: '', role_tier: 'staff', managed_houses: [], password: '' });
      fetchInitialData();
      onRefresh();
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasPermission(userRole, 'STAFF_MANAGEMENT', 'canEdit')) {
      alert('You do not have permission to manage staff');
      return;
    }

    setBulkLoading(true);
    setBulkMessage('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setBulkMessage('❌ CSV must have a header row and at least one data row');
        setBulkLoading(false);
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const expectedHeaders = ['full_name', 'email', 'home_house', 'role_tier'];
      
      console.log('CSV Headers:', headers);
      console.log('Expected Headers:', expectedHeaders);
      
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setBulkMessage(`❌ Missing required columns: ${missingHeaders.join(', ')}`);
        setBulkLoading(false);
        return;
      }

      const staffData = [];
      let errorCount = 0;
      let skippedDuplicates = 0;
      let skippedInternalDuplicates = 0;
      let errors: string[] = [];
      const emailsInThisUpload = new Set<string>(); // Track emails within this CSV

      // First, fetch all existing emails to check for duplicates
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('email');

      const existingEmails = new Set(existingProfiles?.map((p: any) => p.email.toLowerCase()) || []);

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        console.log(`Row ${i} raw values:`, values);
        console.log(`Row ${i} parsed:`, row);

        // Validation
        if (!row.full_name || !row.email) {
          errorCount++;
          errors.push(`Row ${i + 1}: Missing full_name or email`);
          continue;
        }

        // All roles require a location
        if (!row.home_house) {
          errorCount++;
          errors.push(`Row ${i + 1}: ${row.full_name} - Missing home_house location`);
          continue;
        }

        const emailLower = row.email.toLowerCase();

        // Check if email is a duplicate within this upload (internal duplicate)
        if (emailsInThisUpload.has(emailLower)) {
          skippedInternalDuplicates++;
          console.log(`⏭️  Row ${i + 1}: Skipped duplicate email within this upload: ${row.email}`);
          continue;
        }

        // Check if email already exists in database
        if (existingEmails.has(emailLower)) {
          skippedDuplicates++;
          console.log(`⏭️  Row ${i + 1}: Skipped duplicate email in database: ${row.email}`);
          continue;
        }

        console.log(`Row ${i + 1}: ${row.full_name}, email: ${row.email}, location: ${row.home_house}, role: ${row.role_tier}`);

        const staffRecord: any = {
          full_name: row.full_name,
          email: emailLower,
          location: row.home_house,
          role_tier: row.role_tier || 'staff',
          managed_houses: []
        };

        // For schedulers and managers, set their primary location as a managed location by default
        if (row.role_tier === 'scheduler' || row.role_tier === 'manager') {
          staffRecord.managed_houses = [row.home_house];
        }

        staffData.push(staffRecord);
        emailsInThisUpload.add(emailLower); // Add to internal tracking
      }

      if (staffData.length === 0) {
        let message = '❌ No valid staff records to upload';
        if (skippedInternalDuplicates > 0) {
          message += `\n(${skippedInternalDuplicates} duplicate emails in this file)`;
        }
        if (skippedDuplicates > 0) {
          message += `\n(${skippedDuplicates} duplicate emails in database)`;
        }
        if (errors.length > 0) {
          message += '\n\n' + errors.slice(0, 3).join('\n');
        }
        setBulkMessage(message);
        setBulkLoading(false);
        return;
      }

      console.log('Bulk upload data:', staffData);
      const { data, error } = await supabase.from('profiles').insert(staffData).select();
      
      if (error) {
        console.error('Supabase error details:', error);
        let message = `❌ Upload failed: ${error.message}`;
        if (skippedInternalDuplicates > 0) {
          message += `\n(${skippedInternalDuplicates} duplicates within file skipped)`;
        }
        if (skippedDuplicates > 0) {
          message += `\n(${skippedDuplicates} duplicates in database skipped)`;
        }
        if (errorCount > 0) {
          message += `\n(${errorCount} invalid rows skipped)`;
        }
        setBulkMessage(message);
      } else {
        console.log('Upload success:', data);
        // Check if locations were actually inserted
        if (data && data.length > 0) {
          console.log('📍 Checking inserted records:');
          data.forEach((record, idx) => {
            console.log(`  Record ${idx + 1}: ${record.full_name} - location: ${record.location}`);
          });
          const locationsPresent = data.some(record => record.location);
          if (!locationsPresent) {
            console.warn('⚠️ WARNING: All location values are NULL in inserted records. This is likely an RLS policy issue.');
          }
        }
        
        let message = `✅ Successfully uploaded ${staffData.length} staff members`;
        if (skippedInternalDuplicates > 0) {
          message += ` (${skippedInternalDuplicates} duplicates in file skipped)`;
        }
        if (skippedDuplicates > 0) {
          message += ` (${skippedDuplicates} duplicates in database skipped)`;
        }
        if (errorCount > 0) {
          message += ` (${errorCount} invalid rows skipped)`;
        }
        setBulkMessage(message);
        
        await fetchInitialData();
        onRefresh();
        
        setTimeout(() => {
          setShowBulkUpload(false);
          setBulkMessage('');
        }, 2000);
      }
    } catch (error: any) {
      setBulkMessage(`❌ Error: ${error.message}`);
    } finally {
      setBulkLoading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = `full_name,email,home_house,role_tier
John Smith,john@example.com,Felix House,staff
Jane Doe,jane@example.com,Banks House,staff
Bob Manager,bob@example.com,Armfield House,admin
Alice Scheduler,alice@example.com,Felix House,scheduler
Charlie Scheduler,charlie@example.com,Banks House,manager`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_template.csv';
    a.click();
  };

  const handleDeleteStaff = async (id: string) => {
    if (!hasPermission(userRole, 'STAFF_MANAGEMENT', 'canDelete')) {
      alert('You do not have permission to delete staff');
      return;
    }

    if (!confirm('Delete this staff member? This will remove them from everywhere including login.')) return;
    try {
      // Find the staff member's email for the API call
      const staff = allStaff.find(s => s.id === id);
      if (!staff) {
        alert('Staff member not found');
        return;
      }

      const response = await fetch('/api/delete-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: id, email: staff.email })
      });

      const result = await response.json();

      if (!result.success) {
        alert('❌ Error: ' + result.error);
        return;
      }

      alert('✅ Staff member removed completely');
      fetchInitialData();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  const handleSendPasswordReset = async (email: string, staffName: string) => {
    if (!hasPermission(userRole, 'STAFF_MANAGEMENT', 'canCreate')) {
      alert('You do not have permission to send password reset links');
      return;
    }

    try {
      const response = await fetch('/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, staffName })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error || 'Failed to send password reset link'}`);
        return;
      }

      alert(`✓ Password reset link sent to ${email}`);
    } catch (error: any) {
      alert(`Error sending password reset link: ${error.message}`);
    }
  };

  const handleEdit = (staff: any) => {
    setEditingId(staff.id);
    setFormData({
      full_name: staff.full_name,
      email: staff.email,
      home_house: staff.location || '',
      role_tier: staff.role_tier || 'staff',
      managed_houses: staff.managed_houses || []
    });
  };

  const toggleManagedHouse = (houseName: string) => {
    setFormData(prev => ({
      ...prev,
      managed_houses: prev.managed_houses.includes(houseName)
        ? prev.managed_houses.filter(h => h !== houseName)
        : [...prev.managed_houses, houseName]
    }));
  };

  const toggleLocationExpanded = (locationName: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationName)) {
      newExpanded.delete(locationName);
    } else {
      newExpanded.add(locationName);
    }
    setExpandedLocations(newExpanded);
  };

  const getStaffByLocation = () => {
    const grouped: { [key: string]: any[] } = {};
    
    allStaff.forEach(staff => {
      const location = staff.location || 'Unassigned';
      if (!grouped[location]) {
        grouped[location] = [];
      }
      grouped[location].push(staff);
    });

    // Remove Unassigned if empty
    if (grouped['Unassigned'] && grouped['Unassigned'].length === 0) {
      delete grouped['Unassigned'];
    }

    // Sort locations alphabetically
    const sorted: { [key: string]: any[] } = {};
    Object.keys(grouped).sort().forEach(key => {
      sorted[key] = grouped[key];
    });

    return sorted;
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return { bg: '#dc2626', text: '#ffffff' };
      case 'manager': return { bg: '#9333ea', text: '#ffffff' };
      case 'scheduler': return { bg: '#2563eb', text: '#ffffff' };
      case 'staff': return { bg: '#10b981', text: '#ffffff' };
      default: return { bg: '#6b7280', text: '#ffffff' };
    }
  };

  const canManageStaff = hasPermission(userRole, 'STAFF_MANAGEMENT', 'canView');

  if (roleLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canManageStaff) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }} className="rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight mb-4">Access Denied</h2>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="mb-2">Your Role: <span style={{ color: '#2563eb' }} className="font-bold">{userRole || 'Unknown'}</span></p>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="mb-6">You do not have permission to manage staff members.</p>
          <button 
            onClick={onClose} 
            style={{ backgroundColor: '#dc2626' }}
            className="w-full py-3 text-white font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (showBulkUpload) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-md shadow-2xl border transition-colors duration-300">
          
          <div className="flex justify-between items-center mb-6">
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">
              Bulk Upload Staff
            </h2>
            <button onClick={() => setShowBulkUpload(false)} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors">&times;</button>
          </div>

          <div className="space-y-4">
            <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="border-2 border-dashed rounded-xl p-6 text-center">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleBulkUpload}
                disabled={bulkLoading}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-black text-sm mb-2">📁 Click to upload CSV</p>
                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-xs">or drag and drop</p>
              </label>
            </div>

            {bulkMessage && (
              <div style={{ backgroundColor: bulkMessage.includes('✅') ? '#10b98122' : '#dc262622', borderColor: bulkMessage.includes('✅') ? '#10b981' : '#dc2626' }} className="border rounded-lg p-3">
                <p style={{ color: bulkMessage.includes('✅') ? '#10b981' : '#dc2626' }} className="text-sm font-bold">
                  {bulkMessage}
                </p>
              </div>
            )}

            <div>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-2">Required columns:</p>
              <ul style={{ color: isDark ? '#cbd5e1' : '#1e293b' }} className="text-xs space-y-1 mb-4">
                <li>• <span className="font-bold">full_name</span> - Staff member name</li>
                <li>• <span className="font-bold">email</span> - Email address</li>
                <li>• <span className="font-bold">home_house</span> - Location (required for staff)</li>
                <li>• <span className="font-bold">role_tier</span> - staff, manager, scheduler, or admin</li>
              </ul>
            </div>

            <button 
              onClick={downloadTemplate}
              style={{ backgroundColor: '#6366f1' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              className="w-full py-3 text-white font-bold rounded-xl transition-all"
            >
              📥 Download Template
            </button>

            <button 
              onClick={() => setShowBulkUpload(false)}
              style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1', color: isDark ? '#f1f5f9' : '#1e293b' }}
              className="w-full py-3 font-bold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border transition-colors duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">
            {editingId ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowBulkUpload(true)}
              style={{ backgroundColor: '#f59e0b' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              className="text-white px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
            >
              📤 Bulk Upload
            </button>
            <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors hover:scale-125 active:scale-100 duration-200">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden">
          {/* FORM SECTION */}
          <div className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. John Smith"
                  style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                  value={formData.full_name} 
                  onChange={e => setFormData({...formData, full_name: e.target.value})} 
                />
              </div>

              <div>
                <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-1 block">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="e.g. john@example.com"
                  style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>

              <div>
                <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-1 block">Role</label>
                <select 
                  required 
                  style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                  value={formData.role_tier} 
                  onChange={e => {
                    setFormData({...formData, role_tier: e.target.value as any, managed_houses: [], home_house: ''});
                  }}
                >
                  <option value="staff">Staff Member</option>
                  <option value="scheduler">Scheduler</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {!editingId && formData.role_tier !== 'staff' && (
                <div>
                  <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-1 block">Password (Optional)</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank to send them a reset email"
                    style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <p style={{ color: isDark ? '#64748b' : '#94a3b8' }} className="text-xs mt-1">
                    {formData.password 
                      ? '✓ They must change this password on first login' 
                      : '✓ They will receive a password reset email'}
                  </p>
                </div>
              )}
              
              {!editingId && formData.role_tier === 'staff' && (
                <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#1e293b' }} className="p-4 border rounded-xl text-xs font-bold">
                  ℹ️ Staff members are roster-only and do not have login access
                </div>
              )}

              {(formData.role_tier === 'staff' || formData.role_tier === 'admin' || formData.role_tier === 'scheduler' || formData.role_tier === 'manager') && (
                <div>
                  <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-1 block">Assigned Location *</label>
                  <select 
                    required 
                    style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                    value={formData.home_house} 
                    onChange={e => setFormData({...formData, home_house: e.target.value})}
                  >
                    <option value="">Select Location...</option>
                    {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                  </select>
                </div>
              )}

              {(formData.role_tier === 'manager' || formData.role_tier === 'scheduler') && (
                <div>
                  <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-2 block">Managed Locations *</label>
                  <div className="space-y-2">
                    {locations.map(loc => (
                      <label key={loc.id} className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.managed_houses.includes(loc.name)}
                          onChange={() => toggleManagedHouse(loc.name)}
                          className="w-4 h-4 rounded"
                        />
                        <span style={{ color: isDark ? '#cbd5e1' : '#1e293b' }} className="text-sm font-bold">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  backgroundColor: loading ? '#999999' : editingId ? '#2563eb' : '#10b981',
                  opacity: loading ? 0.7 : 1
                }} 
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.filter = 'brightness(0.9)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }} 
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.filter = 'brightness(1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }} 
                className="w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : editingId ? '💾 Save Changes' : '✅ Create Staff Member'}
              </button>
            </form>
          </div>

          {/* STAFF LIST SECTION */}
          <div style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} className="border-l pl-6 flex flex-col h-full overflow-hidden">
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-4 tracking-widest">Staff Directory by Location</p>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(getStaffByLocation()).map(([locationName, staffList]) => (
                <div key={locationName}>
                  <button
                    onClick={() => toggleLocationExpanded(locationName)}
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    }}
                    className="w-full p-3 border rounded-lg font-bold text-sm flex items-center justify-between hover:opacity-80 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span>{expandedLocations.has(locationName) ? '▼' : '▶'}</span>
                      <span>{locationName}</span>
                      <span style={{ backgroundColor: '#60a5fa' }} className="text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {staffList.length}
                      </span>
                    </div>
                  </button>

                  {expandedLocations.has(locationName) && (
                    <div className="mt-2 ml-3 space-y-2 border-l-2 border-blue-500 pl-3">
                      {staffList.map(staff => {
                        const roleColor = getRoleColor(staff.role_tier);
                        return (
                          <div key={staff.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-3 border rounded-xl group transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div className="overflow-hidden flex-1">
                                <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-sm font-bold truncate">{staff.full_name}</p>
                                <p style={{ color: '#60a5fa' }} className="text-[9px] font-bold uppercase">{staff.email}</p>
                              </div>
                              <div style={{ backgroundColor: roleColor.bg, color: roleColor.text }} className="px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap ml-2">
                                {staff.role_tier}
                              </div>
                            </div>
                            
                            <div className="mb-2">
                              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-bold">📍 Primary: {staff.location || 'No location'}</p>
                              {staff.role_tier === 'admin' && (
                                <p style={{ color: '#10b981' }} className="text-[9px] font-bold">✓ Manages all locations</p>
                              )}
                              {(staff.role_tier === 'scheduler' || staff.role_tier === 'manager') && staff.managed_houses && staff.managed_houses.length > 0 && (
                                <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] font-bold">📋 Manages: {staff.managed_houses.join(', ')}</p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEdit(staff)} 
                                className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
                              >
                                ✏️ Edit
                              </button>
                              {(staff.role_tier === 'manager' || staff.role_tier === 'scheduler' || staff.role_tier === 'admin') && (
                                <button 
                                  onClick={() => handleSendPasswordReset(staff.email, staff.full_name)} 
                                  className="flex-1 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9px] font-bold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
                                >
                                  🔗 Send Link
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteStaff(staff.id)} 
                                className="flex-1 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-bold transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg duration-200"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}