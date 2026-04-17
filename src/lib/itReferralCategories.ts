export type ITReferralCategory = {
  id: string;
  label: string;
  description: string;
};

export const IT_REFERRAL_CATEGORIES: ITReferralCategory[] = [
  { id: 'hardware', label: 'Hardware', description: 'Computers, printers, devices, and peripherals' },
  { id: 'software', label: 'Software', description: 'Applications, programs, and software issues' },
  { id: 'network', label: 'Network', description: 'Internet, WiFi, connectivity, and access' },
  { id: 'email', label: 'Email', description: 'Email account, mail client, and messaging' },
  { id: 'printing', label: 'Printing', description: 'Printer setup, drivers, and print jobs' },
  { id: 'access', label: 'Access', description: 'Accounts, permissions, logins, and MFA' },
  { id: 'other', label: 'Other', description: 'Other IT related issues' },
];

export function getITReferralCategoryLabel(categoryId: string | null | undefined): string {
  if (!categoryId) return '';
  return IT_REFERRAL_CATEGORIES.find((category) => category.id === categoryId)?.label ?? categoryId;
}

export function getITReferralCategoryDescription(categoryId: string | null | undefined): string {
  if (!categoryId) return '';
  return IT_REFERRAL_CATEGORIES.find((category) => category.id === categoryId)?.description ?? '';
}

