export const PERMISSIONS = {
  ROSTER: {
    canView: ['scheduler', 'admin'],
    canEdit: ['scheduler', 'admin'],
  },
  BOOKINGS: {
    canView: ['scheduler', 'admin', 'staff'],
    canCreate: ['scheduler', 'admin'],
    canDelete: ['scheduler', 'admin'],
  },
  ATTENDANCE: {
    canMark: ['scheduler', 'admin'],
  },
  ADMIN_DASHBOARD: {
    canView: ['admin', 'scheduler'],
    canEdit: ['admin'],
    canDelete: ['admin'],
  },
  COURSE_SCHEDULING: {
    canView: ['admin', 'scheduler'],
    canCreate: ['admin', 'scheduler'],
    canEdit: ['admin'],
    canDelete: ['admin'],
  },
  STAFF_MANAGEMENT: {
    canView: ['admin'],
    canEdit: ['admin'],
    canDelete: ['admin'],
  },
} as const;

export function hasPermission(userRole: string | null, permission: keyof typeof PERMISSIONS, action: string): boolean {
  if (!userRole) return false;
  
  const normalizedRole = userRole.trim().toLowerCase();
  const perm = PERMISSIONS[permission];
  const actionKey = action as keyof typeof perm;
  
  if (!perm[actionKey]) return false;
  
  return (perm[actionKey] as string[]).includes(normalizedRole);
}