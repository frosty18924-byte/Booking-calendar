'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const CHECKLIST_ITEMS = [
  'Invoice Number',
  'Reminder Email Sent?',
  'Numbers sent to Provider?',
  'Attendance register printed?',
  'Feedback forms printed?',
  'Attendance register scanned?',
  'Feedback form scanned?',
  'Attendee Names to Provider',
  'Attendee Form to Homes NA',
  'Matrix Updated?',
  'Monday Updated?',
  'Invoice/splits sent to finance?',
  'Certificates in Drive?'
];

export default function BookingChecklistModal({ 
  bookingId, 
  onClose,
  userRole,
  userName,
  userId
}: { 
  bookingId: string;
  onClose: () => void;
  userRole: string;
  userName: string;
  userId: string;
}) {
  const [checklist, setChecklist] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    checkTheme();
    fetchChecklist();
  }, [bookingId]);

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

  async function fetchChecklist() {
    try {
      // Fetch or create checklist items
      const { data: existingItems } = await supabase
        .from('booking_checklists')
        .select('*')
        .eq('booking_id', bookingId)
        .order('item_order');

      if (!existingItems || existingItems.length === 0) {
        // Create checklist items for this booking
        const itemsToInsert = CHECKLIST_ITEMS.map((item, index) => ({
          booking_id: bookingId,
          item_name: item,
          item_order: index + 1
        }));

        const { data: newItems } = await supabase
          .from('booking_checklists')
          .insert(itemsToInsert)
          .select();

        setChecklist(newItems || []);
      } else {
        setChecklist(existingItems);
      }

      // Fetch completions
      const { data: completionData } = await supabase
        .from('checklist_completions')
        .select('*')
        .eq('booking_id', bookingId);

      const completionMap: any = {};
      completionData?.forEach(comp => {
        completionMap[comp.checklist_item_id] = comp;
      });
      setCompletions(completionMap);
    } catch (error: any) {
      console.error('Error fetching checklist:', error);
    }
  }

  const handleToggleItem = async (itemId: string, itemName: string, isCompleting: boolean) => {
    if (userRole !== 'scheduler' && userRole !== 'admin') {
      alert('Only Schedulers and Admins can update the checklist');
      return;
    }

    setLoading(true);
    try {
      if (isCompleting) {
        // Mark as complete
        const { error } = await supabase
          .from('checklist_completions')
          .insert([{
            booking_id: bookingId,
            checklist_item_id: itemId,
            completed_by: userId,
            completed_by_name: userName,
            completed_at: new Date().toISOString()
          }]);

        if (error) throw error;
      } else {
        // Mark as incomplete (delete the completion record)
        const { error } = await supabase
          .from('checklist_completions')
          .delete()
          .eq('booking_id', bookingId)
          .eq('checklist_item_id', itemId);

        if (error) throw error;
      }

      await fetchChecklist();
    } catch (error: any) {
      alert(error.message || 'Failed to update checklist');
    } finally {
      setLoading(false);
    }
  };

  const completedCount = Object.keys(completions).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-2xl shadow-2xl border transition-colors duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">Booking Checklist</h2>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mt-1">{completedCount} of {totalCount} completed</p>
          </div>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors">&times;</button>
        </div>

        {/* Progress Bar */}
        <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="rounded-full h-3 border mb-6 overflow-hidden">
          <div 
            style={{ backgroundColor: '#10b981', width: `${progressPercent}%` }}
            className="h-full transition-all duration-300"
          />
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {checklist.map((item) => {
            const isCompleted = !!completions[item.id];
            const completion = completions[item.id];

            return (
              <div
                key={item.id}
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                className="p-4 border rounded-xl flex items-start gap-3 transition-all"
              >
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => handleToggleItem(item.id, item.item_name, e.target.checked)}
                  disabled={loading || (userRole !== 'scheduler' && userRole !== 'admin')}
                  className="w-5 h-5 rounded mt-0.5 cursor-pointer disabled:opacity-50"
                />

                <div className="flex-1">
                  <p 
                    style={{ 
                      color: isDark ? '#f1f5f9' : '#1e293b',
                      textDecoration: isCompleted ? 'line-through' : 'none'
                    }} 
                    className="font-bold"
                  >
                    {item.item_name}
                  </p>

                  {completion && (
                    <div style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[9px] mt-2 space-y-1">
                      <p><span className="font-bold">Completed by:</span> {completion.completed_by_name}</p>
                      <p><span className="font-bold">Time:</span> {new Date(completion.completed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {isCompleted && (
                  <div className="text-green-500 text-xl mt-0.5">✓</div>
                )}
              </div>
            );
          })}
        </div>

        {userRole !== 'scheduler' && userRole !== 'admin' && (
          <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b' }} className="mt-6 p-4 border rounded-xl text-center text-sm">
            Only Schedulers and Admins can update this checklist
          </div>
        )}
      </div>
    </div>
  );
}
