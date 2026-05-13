export const PROFILE_PHOTOS_BUCKET = 'profile-photos';

export function getProfileInitials(name: string | null | undefined, email?: string | null) {
  const source = (name || email || '').trim();
  if (!source) return 'U';

  const words = source
    .replace(/[@._-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function getProfileAvatarUrl(path: string | null | undefined, supabaseUrl?: string | null) {
  const cleanPath = path?.trim();
  const cleanBase = supabaseUrl?.trim()?.replace(/\/$/, '');

  if (!cleanPath || !cleanBase) return null;
  return `${cleanBase}/storage/v1/object/public/${PROFILE_PHOTOS_BUCKET}/${cleanPath}`;
}
