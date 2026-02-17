'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import UniformButton from './UniformButton';
import Icon from './Icon';

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
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      console.log('Fetching checklist for booking:', bookingId);
      
      // Fetch or create checklist items
      const { data: existingItems, error: fetchError } = await supabase
        .from('booking_checklists')
        .select('*')
        .eq('booking_id', bookingId)
        .order('item_order');

      if (fetchError) {
        console.error('Error fetching existing items:', fetchError);
        setError(`Failed to fetch checklist items: ${fetchError.message}`);
        return;
      }
      console.log('Existing items:', existingItems);

      if (!existingItems || existingItems.length === 0) {
        console.log('Creating new checklist items...');
        // Create checklist items for this booking
        const itemsToInsert = CHECKLIST_ITEMS.map((item, index) => ({
          booking_id: bookingId,
          item_name: item,
          item_order: index + 1
        }));

        const { data: newItems, error: insertError } = await supabase
          .from('booking_checklists')
          .insert(itemsToInsert)
          .select();

        if (insertError) {
          console.error('Error inserting items:', insertError);
          setError(`Failed to create checklist items: ${insertError.message}`);
          return;
        }
        console.log('New items created:', newItems);
        setChecklist(newItems || []);
      } else {
        console.log('Using existing items:', existingItems);
        setChecklist(existingItems);
      }

      // Fetch completions
      const { data: completionData, error: completionError } = await supabase
        .from('checklist_completions')
        .select('*')
        .eq('booking_id', bookingId);

      if (completionError) {
        console.error('Error fetching completions:', completionError);
        setError(`Failed to fetch completions: ${completionError.message}`);
        return;
      }
      console.log('Completions data:', completionData);

      const completionMap: any = {};
      completionData?.forEach(comp => {
        completionMap[comp.checklist_item_id] = comp;
      });
      setCompletions(completionMap);

      // Set invoice number if it exists
      const invoiceItem = completionData?.find(comp => {
        const item = existingItems?.find((i: any) => i.id === comp.checklist_item_id);
        return item?.item_name === 'Invoice Number';
      });
      if (invoiceItem?.value) {
        setInvoiceNumber(invoiceItem.value);
      }
    } catch (error: any) {
      console.error('Error in fetchChecklist:', error);
      setError(error.message || 'An unexpected error occurred');
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
            completed_at: new Date().toISOString(),
            value: itemName === 'Invoice Number' ? invoiceNumber : null
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

  const handleInvoiceNumberChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setInvoiceNumber(newValue);

    if (!newValue) return;

    try {
      // Find the invoice number item
      const invoiceItem = checklist.find(item => item.item_name === 'Invoice Number');
      if (!invoiceItem) return;

      const isCompleted = !!completions[invoiceItem.id];

      if (isCompleted) {
        // Update existing completion with new invoice number
        const { error } = await supabase
          .from('checklist_completions')
          .update({ value: newValue })
          .eq('booking_id', bookingId)
          .eq('checklist_item_id', invoiceItem.id);

        if (error) throw error;
      } else {
        // Create completion with invoice number
        const { error } = await supabase
          .from('checklist_completions')
          .insert([{
            booking_id: bookingId,
            checklist_item_id: invoiceItem.id,
            completed_by: userId,
            completed_by_name: userName,
            completed_at: new Date().toISOString(),
            value: newValue
          }]);

        if (error) throw error;
      }

      await fetchChecklist();
    } catch (error: any) {
      alert(error.message || 'Failed to save invoice number');
    }
  };

  const completedCount = Object.keys(completions).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-2xl shadow-2xl border transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 style={{ color: '#ef4444' }} className="text-2xl font-black uppercase tracking-tight">Error Loading Checklist</h2>
            <UniformButton
              variant="icon"
              className="hover:text-red-500 text-2xl transition-colors"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="close" className="w-6 h-6" />
            </UniformButton>
          </div>
          <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: '#ef4444' }} className="p-4 border-l-4 rounded">
            <p style={{ color: isDark ? '#fca5a5' : '#dc2626' }} className="font-semibold">{error}</p>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mt-2">Please check your browser console for more details and contact support if the problem persists.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-2xl shadow-2xl border transition-colors duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">Booking Checklist</h2>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm mt-1">
              {checklist.length === 0 ? 'Loading...' : `${completedCount} of ${totalCount} completed`}
            </p>
          </div>
          <UniformButton
            variant="icon"
            className="hover:text-red-500 text-2xl transition-colors"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" className="w-6 h-6" />
          </UniformButton>
        </div>

        {checklist.length === 0 ? (
          <div style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }} className="p-8 rounded-xl text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm">Loading checklist...</p>
          </div>
        ) : (
          <>
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
            const isInvoiceNumber = item.item_name === 'Invoice Number';

            return (
              <div
                key={item.id}
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                className="p-4 border rounded-xl flex items-start gap-3 transition-all"
              >
                {isInvoiceNumber ? (
                  <input
                    type="text"
                    placeholder="Enter invoice number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    onBlur={handleInvoiceNumberChange}
                    disabled={loading || (userRole !== 'scheduler' && userRole !== 'admin')}
                    style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                    className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                ) : (
                  <>
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
                  </>
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
          </>
        )}
      </div>
    </div>
  );
}
