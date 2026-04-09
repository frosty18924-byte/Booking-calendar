'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { loadEmailTestSettings, saveEmailTestSettings } from '@/lib/emailTestMode';
import AddStaffModal from '@/app/components/AddStaffModal';
import DuplicateRemovalModal from '@/app/components/DuplicateRemovalModal';

type Props = {
  isDark: boolean;
  userRole: string | null;
};

type EmailLogItem = {
  id: string;
  created_at: string;
  subject: string;
  status: 'sent' | 'failed';
  test_mode: boolean;
  provider: string | null;
  message_id: string | null;
  error_text: string | null;
  original_recipients: string[];
  delivered_recipients: string[];
};

export default function AdminToolsPanel({ isDark, userRole }: Props) {
  const router = useRouter();

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showDuplicateRemoval, setShowDuplicateRemoval] = useState(false);
  const [showDataToolsModal, setShowDataToolsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const [emailTestMode, setEmailTestMode] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  useEffect(() => {
    const saved = loadEmailTestSettings();
    setEmailTestMode(saved.enabled);
    setTestEmailAddress(saved.address);
  }, []);

  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true);
    try {
      const response = await fetch('/api/email-logs?limit=30', { method: 'GET' });
      const data = await response.json();
      if (response.ok && data?.success) {
        setEmailLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  useEffect(() => {
    if (showNotificationsModal) {
      fetchEmailLogs();
    }
  }, [showNotificationsModal]);

  const handleSaveEmailSettings = () => {
    saveEmailTestSettings({ enabled: emailTestMode, address: testEmailAddress });
    alert(`Email test mode ${emailTestMode ? 'enabled' : 'disabled'}`);
  };

  const handleSendTestEmail = async () => {
    const target = testEmailAddress.trim();
    if (!target) {
      alert('Enter a test email address first.');
      return;
    }

    setSendingTestEmail(true);
    setTestEmailMessage(null);
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-email-test-mode': emailTestMode ? 'true' : 'false',
          'x-test-email-address': target,
        },
        body: JSON.stringify({ email: target }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = data?.details ? ` (${String(data.details)})` : '';
        setTestEmailMessage({
          type: 'error',
          text: `Failed to send test email${data?.provider ? ` via ${data.provider}` : ''}${details}`,
        });
        return;
      }

      setTestEmailMessage({
        type: 'success',
        text: `Test email sent${data?.provider ? ` via ${data.provider}` : ''}${data?.test_mode ? ' (TEST MODE)' : ''}`,
      });
      fetchEmailLogs();
    } catch (error) {
      setTestEmailMessage({ type: 'error', text: `Failed to send test email (${String(error)})` });
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (!hasPermission(userRole, 'STAFF_MANAGEMENT', 'canView')) return null;

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Admin</h2>
        <p className={`mt-2 transition-colors duration-300 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Manage staff and system settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          onClick={() => setShowAddStaffModal(true)}
          className={`group cursor-pointer p-6 rounded-3xl border transition-all duration-300 hover:shadow-lg ${
            isDark ? 'bg-slate-950/40 border-slate-800 hover:border-blue-400 hover:bg-slate-950/60' : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-slate-50'
          }`}
        >
          <div className="text-4xl mb-3">👥</div>
          <h3 className={`text-lg font-extrabold mb-1 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>Manage Staff</h3>
          <p className={`text-sm transition-colors duration-300 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Create and manage staff accounts, assign them to locations</p>
        </div>

        <div
          onClick={() => setShowNotificationsModal(true)}
          className={`group cursor-pointer p-6 rounded-3xl border transition-all duration-300 hover:shadow-lg ${
            isDark ? 'bg-slate-950/40 border-slate-800 hover:border-sky-400 hover:bg-slate-950/60' : 'bg-white border-slate-200 hover:border-sky-500 hover:bg-slate-50'
          }`}
        >
          <div className="text-4xl mb-3">🔔</div>
          <h3 className={`text-lg font-extrabold mb-1 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>Notifications</h3>
          <p className={`text-sm transition-colors duration-300 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Email test mode controls and recent sent-email activity.</p>
        </div>

        <div
          onClick={() => setShowDataToolsModal(true)}
          className={`group cursor-pointer p-6 rounded-3xl border transition-all duration-300 hover:shadow-lg ${
            isDark ? 'bg-slate-950/40 border-slate-800 hover:border-orange-400 hover:bg-slate-950/60' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-slate-50'
          }`}
        >
          <div className="text-4xl mb-3">🧰</div>
          <h3 className={`text-lg font-extrabold mb-1 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>Data Housekeeping</h3>
          <p className={`text-sm transition-colors duration-300 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Open tools for duplicate cleanup and archive recovery.</p>
        </div>
      </div>

      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <AddStaffModal
              onClose={() => setShowAddStaffModal(false)}
              onRefresh={() => {
                // Keep modal open after save/update so users can continue editing.
              }}
            />
          </div>
        </div>
      )}

      {showDuplicateRemoval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <DuplicateRemovalModal onClose={() => setShowDuplicateRemoval(false)} />
          </div>
        </div>
      )}

      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
              <button onClick={() => setShowNotificationsModal(false)} className={`px-3 py-1 rounded ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}>
                Close
              </button>
            </div>

            <div className={`rounded-lg border p-4 mb-4 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <h4 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Test Mode</h4>
              <label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={emailTestMode} onChange={(e) => setEmailTestMode(e.target.checked)} />
                <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Enable Test Mode</span>
              </label>
              <input
                type="email"
                placeholder="test@yourdomain.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className={`w-full px-3 py-2 rounded border text-sm mb-3 ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
              />
              <button onClick={handleSaveEmailSettings} className="px-4 py-2 rounded font-semibold text-white bg-sky-600 hover:bg-sky-700">
                Save Email Settings
              </button>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  className="px-4 py-2 rounded font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {sendingTestEmail ? 'Sending…' : 'Send Test Email'}
                </button>
                {testEmailMessage && (
                  <p className={`text-sm font-semibold ${testEmailMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{testEmailMessage.text}</p>
                )}
              </div>
            </div>

            <div className={`rounded-lg border p-4 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Email Activity</h4>
                <button onClick={fetchEmailLogs} className="px-3 py-1 rounded text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700">
                  Refresh
                </button>
              </div>

              {emailLogsLoading ? (
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading email logs...</p>
              ) : emailLogs.length === 0 ? (
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No email logs found yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {emailLogs.map((log) => (
                    <div key={log.id} className={`rounded border p-2 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{log.subject}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            log.status === 'sent' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(log.created_at).toLocaleString()} | Provider: {log.provider || 'unknown'} {log.test_mode ? '| TEST MODE' : ''}
                      </p>
                      <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Delivered to: {(log.delivered_recipients || []).join(', ')}
                      </p>
                      {!!log.error_text && <p className="text-xs mt-1 text-red-400 truncate">Error: {log.error_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDataToolsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-xl w-full rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Data Housekeeping</h3>
              <button onClick={() => setShowDataToolsModal(false)} className={`px-3 py-1 rounded ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}>
                Close
              </button>
            </div>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Choose a tool:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowDataToolsModal(false);
                  setShowDuplicateRemoval(true);
                }}
                className="py-3 rounded font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Clean Duplicates
              </button>
              <button
                onClick={() => {
                  setShowDataToolsModal(false);
                  router.push('/admin/archive');
                }}
                className="py-3 rounded font-semibold text-white bg-orange-600 hover:bg-orange-700"
              >
                Archive & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
