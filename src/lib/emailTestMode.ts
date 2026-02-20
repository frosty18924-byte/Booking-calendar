'use client';

const EMAIL_TEST_MODE_KEY = 'email_test_mode';
const EMAIL_TEST_ADDRESS_KEY = 'email_test_address';

export interface EmailTestSettings {
  enabled: boolean;
  address: string;
}

export function loadEmailTestSettings(): EmailTestSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, address: '' };
  }

  const enabledRaw = localStorage.getItem(EMAIL_TEST_MODE_KEY) || 'false';
  const address = (localStorage.getItem(EMAIL_TEST_ADDRESS_KEY) || '').trim();
  const enabled = ['true', '1', 'yes', 'on'].includes(enabledRaw.toLowerCase());

  return { enabled, address };
}

export function saveEmailTestSettings(settings: EmailTestSettings) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(EMAIL_TEST_MODE_KEY, settings.enabled ? 'true' : 'false');
  localStorage.setItem(EMAIL_TEST_ADDRESS_KEY, settings.address.trim());
}

export function getEmailTestHeaders(): Record<string, string> {
  const settings = loadEmailTestSettings();
  const headers: Record<string, string> = {
    'x-email-test-mode': settings.enabled ? 'true' : 'false',
  };

  if (settings.address) {
    headers['x-test-email-address'] = settings.address;
  }

  return headers;
}
