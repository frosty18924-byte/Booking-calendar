export type ITReferralQuickWin = {
  title: string;
  description?: string;
  steps: string[];
};

export const IT_REFERRAL_QUICK_WINS_BY_CATEGORY: Record<string, ITReferralQuickWin[]> = {
  hardware: [
    {
      title: 'Power cycle the device',
      description: 'Clears temporary faults for laptops, monitors, docks, printers, and phones.',
      steps: ['Save your work', 'Turn the device off', 'Wait 10 seconds', 'Turn it back on and retest'],
    },
    {
      title: 'Check cables and peripherals',
      steps: ['Reseat USB/HDMI/DP/power cables', 'Try a different port', 'Disconnect non-essential peripherals and retest'],
    },
    {
      title: 'Try a different dock/monitor (if available)',
      steps: ['Swap to a known-working dock/monitor', 'Note which setup works/doesn\'t work'],
    },
  ],
  software: [
    {
      title: 'Close and reopen the app',
      steps: ['Fully quit the app (not just close the window)', 'Reopen and try again'],
    },
    {
      title: 'Restart your computer',
      steps: ['Restart (not shutdown)', 'Log back in and retest'],
    },
    {
      title: 'Check for updates',
      steps: ['Run software update (Windows/macOS)', 'Update the app if it has an in-app updater'],
    },
  ],
  network: [
    {
      title: 'Check Wi‑Fi / ethernet connection',
      steps: ['Confirm you are connected to the correct network', 'Toggle Wi‑Fi off/on (or unplug/replug ethernet)', 'Try loading 2–3 different websites'],
    },
    {
      title: 'Restart the router (if you are at home)',
      steps: ['Power off router', 'Wait 30 seconds', 'Power on and wait 2–3 minutes', 'Retest'],
    },
    {
      title: 'Try a different network (if possible)',
      steps: ['Use mobile hotspot briefly to compare', 'Note whether the issue is network-specific'],
    },
  ],
  email: [
    {
      title: 'Check webmail vs app',
      steps: ['Try email in the browser (webmail)', 'Try email in the desktop/mobile app', 'Note which one fails'],
    },
    {
      title: 'Sign out and back in',
      steps: ['Sign out of the email app', 'Sign back in and retest'],
    },
    {
      title: 'Check mailbox storage',
      steps: ['Confirm mailbox isn\'t full', 'Try deleting/archiving large items and retest sending/receiving'],
    },
  ],
  printing: [
    {
      title: 'Check printer status and paper',
      steps: ['Confirm printer is on and connected', 'Check paper/toner', 'Clear any visible error on the printer display'],
    },
    {
      title: 'Try printing a test page',
      steps: ['Print a test page from the printer menu (if available)', 'Try printing from a different app (e.g. PDF viewer)'],
    },
    {
      title: 'Restart the printer',
      steps: ['Power off', 'Wait 10 seconds', 'Power on and retest'],
    },
  ],
  access: [
    {
      title: 'Check your username and account',
      steps: ['Confirm the email/username you are using', 'Try logging in via an incognito/private window', 'If MFA is used, confirm phone time is correct'],
    },
    {
      title: 'Reset password (if allowed)',
      steps: ['Use the "Forgot password" link', 'Try again after resetting', 'Note any error message exactly'],
    },
    {
      title: 'Try from a different device/browser',
      steps: ['Try another browser (Chrome/Edge/Safari)', 'Try from phone vs computer to compare'],
    },
  ],
  other: [
    {
      title: 'Restart and retest',
      steps: ['Restart the device', 'Try the action again', 'Capture the error message/screenshot if it fails'],
    },
    {
      title: 'Capture useful details',
      steps: ['What were you trying to do?', 'What happened instead?', 'When did it start?', 'Does it happen every time?'],
    },
  ],
};

// Subcategory-specific quick wins - these override category-level quick wins when available
export const IT_REFERRAL_QUICK_WINS_BY_SUBCATEGORY: Record<string, Record<string, ITReferralQuickWin[]>> = {
  hardware: {
    'Laptop': [
      {
        title: 'Restart Chromebook',
        description: 'Chromebook-specific restart procedures',
        steps: ['Save all work to Google Drive', 'Click shutdown button', 'Wait 30 seconds', 'Power back on and test'],
      },
      {
        title: 'Clear Chrome browser data',
        steps: ['Open Chrome settings', 'Go to Privacy and security', 'Clear browsing data', 'Select cached images and files', 'Clear data'],
      },
      {
        title: 'Check ChromeOS updates',
        steps: ['Click time in bottom-right', 'Click settings gear', 'Go to About Chrome', 'Check for updates', 'Install if available'],
      },
      {
        title: 'Test with guest account',
        steps: ['Sign out of current account', 'Click Browse as Guest', 'Test the issue in guest mode', 'Note if issue persists'],
      },
    ],
    'Chromebook': [
      {
        title: 'Restart Chromebook',
        description: 'Chromebook-specific restart procedures',
        steps: ['Save all work to Google Drive', 'Click shutdown button', 'Wait 30 seconds', 'Power back on and test'],
      },
      {
        title: 'Clear Chrome browser data',
        steps: ['Open Chrome settings', 'Go to Privacy and security', 'Clear browsing data', 'Select cached images and files', 'Clear data'],
      },
      {
        title: 'Check ChromeOS updates',
        steps: ['Click time in bottom-right', 'Click settings gear', 'Go to About Chrome', 'Check for updates', 'Install if available'],
      },
      {
        title: 'Test with guest account',
        steps: ['Sign out of current account', 'Click Browse as Guest', 'Test the issue in guest mode', 'Note if issue persists'],
      },
    ],
    'Desktop': [
      {
        title: 'Check internal connections',
        description: 'Desktop-specific internal component checks',
        steps: ['Power off completely', 'Check internal cable connections', 'Reseat RAM and graphics card', 'Check CPU and case fans'],
      },
      {
        title: 'Test power supply unit',
        steps: ['Check PSU switch is on', 'Test with different power cable', 'Listen for PSU fan noise', 'Check motherboard power LEDs'],
      },
    ],
    'Monitor': [
      {
        title: 'Check display settings',
        description: 'Monitor-specific troubleshooting',
        steps: ['Check input source selection', 'Adjust resolution and refresh rate', 'Reset monitor to factory settings', 'Test with different cable'],
      },
      {
        title: 'Check monitor connections',
        steps: ['Reseat video cable', 'Try different video port', 'Test with different device', 'Check for bent pins'],
      },
    ],
    'Printer': [
      {
        title: 'Clear printer jams and errors',
        description: 'Printer-specific troubleshooting',
        steps: ['Check for paper jams', 'Clear print queue', 'Restart print spooler service', 'Reinstall printer drivers'],
      },
      {
        title: 'Check printer connectivity',
        steps: ['Verify Wi-Fi connection', 'Check USB cable connection', 'Restart printer', 'Test with different device'],
      },
    ],
  },
  software: {
    'Google Workspace': [
      {
        title: 'Clear Google Workspace cache',
        description: 'Google Workspace-specific troubleshooting',
        steps: ['Clear Chrome browser cache', 'Sign out of Google account', 'Clear browser cookies', 'Sign back in and test'],
      },
      {
        title: 'Check Google Workspace status',
        steps: ['Visit Google Workspace Status Dashboard', 'Check for service outages', 'Test with different Google services', 'Report if widespread issue'],
      },
      {
        title: 'Reset Google Workspace sync',
        steps: ['Stop Google Drive sync', 'Clear sync cache', 'Restart Google Drive sync', 'Wait for full sync completion'],
      },
    ],
    'Chrome Browser': [
      {
        title: 'Clear Chrome data and cache',
        description: 'Chrome browser troubleshooting',
        steps: ['Open Chrome settings', 'Privacy and security', 'Clear browsing data', 'Select all time range', 'Clear data'],
      },
      {
        title: 'Reset Chrome settings',
        steps: ['Chrome settings', 'Reset settings', 'Restore settings to default', 'Reset and restart Chrome'],
      },
      {
        title: 'Disable Chrome extensions',
        steps: ['Chrome extensions menu', 'Disable all extensions', 'Test without extensions', 'Re-enable one by one'],
      },
    ],
    'ChromeOS': [
      {
        title: 'Run ChromeOS diagnostics',
        description: 'ChromeOS system troubleshooting',
        steps: ['Open Chrome settings', 'About Chrome', 'Diagnostics', 'Run system health check'],
      },
      {
        title: 'Reset ChromeOS settings',
        steps: ['Chrome settings', 'Advanced', 'Reset settings', 'Powerwash (backup data first)', 'Set up Chromebook again'],
      },
      {
        title: 'Check ChromeOS updates',
        steps: ['Click time in bottom-right', 'Settings gear', 'About Chrome', 'Check for updates', 'Install and restart'],
      },
    ],
  },
  network: {
    'Wi-Fi': [
      {
        title: 'Troubleshoot Wi-Fi connection',
        description: 'Wi-Fi-specific troubleshooting',
        steps: ['Forget and reconnect to network', 'Move closer to Wi-Fi router', 'Restart Chromebook', 'Check Wi-Fi is enabled'],
      },
      {
        title: 'Check Wi-Fi signal and interference',
        steps: ['Move closer to router', 'Check for signal interference', 'Try different location', 'Ask IT to check Wi-Fi strength'],
      },
      {
        title: 'Reset network settings',
        steps: ['Restart Chromebook', 'Forget Wi-Fi network', 'Reconnect to Wi-Fi', 'Test internet connection'],
      },
    ],
  },
  email: {
    'Gmail': [
      {
        title: 'Clear Gmail cache and cookies',
        description: 'Gmail-specific troubleshooting',
        steps: ['Clear Chrome browser cache', 'Clear Gmail cookies', 'Sign out of Gmail', 'Sign back in and test'],
      },
      {
        title: 'Check Gmail settings',
        steps: ['Check Gmail forwarding settings', 'Check spam/junk folder', 'Check filters and labels', 'Verify send/receive settings'],
      },
      {
        title: 'Test Gmail in different ways',
        steps: ['Try Gmail in incognito mode', 'Test with different browser', 'Check Gmail storage quota', 'Try basic HTML view'],
      },
      {
        title: 'Check Google Account sync',
        steps: ['Check Google Account sync status', 'Verify 2-step verification settings', 'Check account recovery options', 'Test other Google services'],
      },
    ],
    'Email': [
      {
        title: 'Clear Gmail cache and cookies',
        description: 'Email-specific troubleshooting',
        steps: ['Clear Chrome browser cache', 'Clear Gmail cookies', 'Sign out of email', 'Sign back in and test'],
      },
      {
        title: 'Check email settings',
        steps: ['Check forwarding settings', 'Check spam/junk folder', 'Check filters and labels', 'Verify send/receive settings'],
      },
      {
        title: 'Test email in different ways',
        steps: ['Try in incognito mode', 'Test with different browser', 'Check storage quota', 'Try basic HTML view'],
      },
    ],
    'Webmail': [
      {
        title: 'Clear browser and cache',
        description: 'Webmail-specific troubleshooting',
        steps: ['Clear browser cache', 'Disable browser extensions', 'Try different browser', 'Check browser JavaScript'],
      },
      {
        title: 'Check webmail settings',
        steps: ['Verify login credentials', 'Check forwarding rules', 'Check spam/junk filters', 'Test account settings'],
      },
    ],
  },
  printing: {
    'Network Printer': [
      {
        title: 'Troubleshoot network printer',
        description: 'Network printer troubleshooting',
        steps: ['Check printer Wi-Fi connection', 'Restart printer', 'Check printer is on same network', 'Try printing from different device'],
      },
      {
        title: 'Reset network printer connection',
        steps: ['Restart network printer', 'Clear print queue', 'Reconnect to Wi-Fi', 'Test with simple document'],
      },
    ],
    'Local Printer': [
      {
        title: 'Check local printer connection',
        description: 'Local printer troubleshooting',
        steps: ['Check USB cable connection', 'Try different USB port', 'Reinstall local printer', 'Check printer status'],
      },
      {
        title: 'Reset local printer',
        steps: ['Power cycle printer', 'Clear print queue', 'Restart print spooler', 'Reinstall printer drivers'],
      },
    ],
  },
  access: {
    'Google Account': [
      {
        title: 'Fix Google Account login issues',
        description: 'Google Account troubleshooting',
        steps: ['Try incognito mode', 'Check password strength', 'Recover account if locked', 'Verify 2-step verification'],
      },
      {
        title: 'Check Google Account security',
        steps: ['Check recent account activity', 'Verify recovery email/phone', 'Check for suspicious activity', 'Update security settings'],
      },
      {
        title: 'Reset Google Account access',
        steps: ['Use account recovery', 'Check backup codes', 'Contact administrator for account reset', 'Try different device'],
      },
    ],
    'MFA/2FA': [
      {
        title: 'Fix multi-factor authentication',
        description: 'MFA troubleshooting',
        steps: ['Check authenticator app time', 'Resync MFA device', 'Try backup codes', 'Contact admin for MFA reset'],
      },
      {
        title: 'Reset MFA settings',
        steps: ['Clear MFA cookies', 'Reconfigure MFA device', 'Update phone number', 'Test different MFA method'],
      },
    ],
  },
};

function normalizeQuickWinKey(value?: string): string {
  return (value || '').trim().toLowerCase();
}

// Helper function to get quick wins for a category and optionally a subcategory
export function getQuickWinsForCategory(category: string, subCategory?: string): ITReferralQuickWin[] {
  const normalizedCategory = normalizeQuickWinKey(category);
  const subcategoryQuickWins = IT_REFERRAL_QUICK_WINS_BY_SUBCATEGORY[normalizedCategory];

  if (subcategoryQuickWins && subCategory) {
    const normalizedSubCategory = normalizeQuickWinKey(subCategory);
    const matchedEntry = Object.entries(subcategoryQuickWins).find(
      ([key]) => normalizeQuickWinKey(key) === normalizedSubCategory
    );

    if (matchedEntry) {
      return matchedEntry[1];
    }
  }

  // Otherwise, fall back to category-level quick wins
  return IT_REFERRAL_QUICK_WINS_BY_CATEGORY[normalizedCategory] || [];
}
