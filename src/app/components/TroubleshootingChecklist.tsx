'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  steps: string[];
}

const QUICK_WINS: ChecklistItem[] = [
  {
    id: "work-device",
    title: "Ensure Work Device",
    description: "Verify you are using an authorized work device",
    steps: [],
  },
  {
    id: "restart",
    title: "Restart Device",
    description: "Turn off and on your device completely",
    steps: [
      "Save all work and close applications",
      "Power off the device completely",
      "Wait 30 seconds",
      "Power on and wait for full startup",
    ],
  },
  {
    id: "restart-app",
    title: "Restart Application",
    description: "Fully close and reopen the problematic application",
    steps: [
      "Close all windows of the application",
      "Clear recent apps (if mobile)",
      "Wait 10 seconds",
      "Reopen the application",
    ],
  },
  {
    id: "cache",
    title: "Clear Cache",
    description: "Remove temporary files and cache",
    steps: [
      "Open application settings",
      "Find Storage or Cache settings",
      "Select 'Clear Cache'",
      "Restart the application",
    ],
  },
  {
    id: "updates",
    title: "Check for Updates",
    description: "Ensure OS and applications are up to date",
    steps: [
      "Check System Settings for OS updates",
      "Check application store for app updates",
      "Install available updates",
      "Restart device if required",
    ],
  },
];

interface TroubleshootingChecklistProps {
  onComplete: (checkedItems: string[]) => void;
  onProceedToForm: () => void;
}

export function TroubleshootingChecklist({
  onComplete,
  onProceedToForm,
}: TroubleshootingChecklistProps) {
  const [isDark, setIsDark] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [issueResolved, setIssueResolved] = useState<boolean | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    window.addEventListener('themeChange', checkTheme);
    return () => window.removeEventListener('themeChange', checkTheme);
  }, []);

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
    onComplete(Array.from(newChecked));
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const allChecked = checkedItems.size === QUICK_WINS.length;

  return (
    <div className={`w-full max-w-2xl mx-auto p-6 rounded-lg shadow-lg transition-colors duration-300 ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          IT Troubleshooting Guide
        </h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Before submitting a support request, please try these common solutions:
        </p>
      </div>

      {/* Checklist Section */}
      <div className="mb-8 space-y-4">
        <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Quick Wins to Try</h2>
        <div className="space-y-3">
          {QUICK_WINS.map((item) => (
            <div
              key={item.id}
              className={`border rounded-lg transition-colors duration-300 ${isDark ? 'border-gray-700 hover:border-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="flex-shrink-0 focus:outline-none"
                    >
                      {checkedItems.has(item.id) ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                      )}
                    </button>
                    <div className="flex-1">
                      <h3
                        className={`font-medium text-lg ${
                          checkedItems.has(item.id)
                            ? isDark ? 'text-gray-500 line-through' : 'text-gray-500 line-through'
                            : isDark ? 'text-gray-100' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className={`ml-4 flex-shrink-0 transition-colors duration-300 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {expandedItems.has(item.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Steps */}
                {expandedItems.has(item.id) && (
                  <div className={`mt-4 pl-9 border-l-2 py-2 ${isDark ? 'border-blue-700' : 'border-blue-200'}`}>
                    <div className="space-y-4">
                      {item.steps.map((step, index) => (
                        <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                              {index + 1}
                            </div>
                            <p className={`text-sm pt-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                              {step}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-6 p-4 rounded-lg border transition-colors duration-300 ${isDark ? 'border-blue-700 bg-blue-900 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
          <p className="text-sm">
            <strong>Tip:</strong> Check off each step as you complete it. Click on any item to
            see detailed instructions.
          </p>
        </div>
      </div>

      {/* Issue Resolution Section */}
      {allChecked && (
        <div className={`mb-8 p-6 rounded-lg border transition-colors duration-300 ${isDark ? 'border-green-700 bg-green-900' : 'border-green-200 bg-green-50'}`}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-green-200' : 'text-green-900'}`}>
            Have you completed all the troubleshooting steps?
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                setIssueResolved(true);
              }}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                issueResolved === true
                  ? 'bg-green-600 text-white'
                  : isDark ? 'border border-green-700 bg-gray-700 text-green-200 hover:bg-gray-600' : 'bg-white border border-green-300 text-green-900 hover:bg-green-50'
              }`}
            >
              ✓ Issue is Resolved
            </button>
            <button
              onClick={() => {
                setIssueResolved(false);
                onProceedToForm();
              }}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                issueResolved === false
                  ? 'bg-orange-600 text-white'
                  : isDark ? 'border border-orange-700 bg-gray-700 text-orange-200 hover:bg-gray-600' : 'bg-white border border-orange-300 text-orange-900 hover:bg-orange-50'
              }`}
            >
              ✗ Issue Still Exists - Need to Submit Form
            </button>
          </div>

          {issueResolved === true && (
            <div className={`mt-4 p-4 rounded text-center border transition-colors duration-300 ${isDark ? 'border-green-700 bg-green-800' : 'border-green-200 bg-white'}`}>
              <p className={`font-medium ${isDark ? 'text-green-200' : 'text-green-900'}`}>
                Great! Your issue has been resolved. Please close this window.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Proceed to Form Button */}
      {issueResolved === false && (
        <div className="flex gap-4">
          <button
            onClick={() => setIssueResolved(null)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${isDark ? 'border border-gray-600 text-gray-200 hover:bg-gray-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Back to Checklist
          </button>
          <button
            onClick={onProceedToForm}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue to Support Form
          </button>
        </div>
      )}
    </div>
  );
}
