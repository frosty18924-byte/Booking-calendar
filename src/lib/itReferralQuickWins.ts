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
      steps: ['Swap to a known-working dock/monitor', 'Note which setup works/doesn’t work'],
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
      steps: ['Confirm mailbox isn’t full', 'Try deleting/archiving large items and retest sending/receiving'],
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
      steps: ['Use the “Forgot password” link', 'Try again after resetting', 'Note any error message exactly'],
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

