export const isDev = process.env.NODE_ENV !== 'production';

export function debugLog(...args: unknown[]): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function debugWarn(...args: unknown[]): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
}
