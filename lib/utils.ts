import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fallback unique ID when crypto.getRandomValues is unavailable (e.g. React Native without polyfill). */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format ISO date (YYYY-MM-DD) as "26 Jan, 2026" for display and PDF. */
export function formatDisplayDate(iso: string | undefined): string {
  if (!iso || !ISO_DATE_REGEX.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const month = m >= 1 && m <= 12 ? MONTH_SHORT[m - 1] : '';
  const day = d >= 1 && d <= 31 ? d : 0;
  const year = y >= 1 && y <= 9999 ? y : 0;
  if (!month || !day || !year) return '';
  return `${day} ${month}, ${year}`;
}
