import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './utils';

const CHECKLIST_STORAGE_KEY = 'user_checklist';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
  /** ISO date (YYYY-MM-DD). Optional. */
  date?: string;
}

function parseItem(raw: unknown): ChecklistItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  const text = o.text;
  const done = o.done;
  const order = o.order;
  const date = o.date;
  if (typeof id !== 'string' || typeof text !== 'string') return null;
  const dateStr =
    typeof date === 'string' && ISO_DATE_REGEX.test(date) ? date : undefined;
  return {
    id,
    text,
    done: done === true,
    order: typeof order === 'number' && Number.isFinite(order) ? order : 0,
    date: dateStr,
  };
}

export async function loadChecklist(): Promise<ChecklistItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: ChecklistItem[] = [];
    for (const item of parsed) {
      const row = parseItem(item);
      if (row) items.push(row);
    }
    items.sort((a, b) => {
      const dateA = a.date;
      const dateB = b.date;
      if (!dateA && !dateB) return a.order - b.order;
      if (!dateA) return 1;
      if (!dateB) return -1;
      const cmp = dateA.localeCompare(dateB);
      return cmp !== 0 ? cmp : a.order - b.order;
    });
    return items;
  } catch {
    return [];
  }
}

export async function saveChecklist(items: ChecklistItem[]): Promise<void> {
  const payload = JSON.stringify(items.map((item, i) => ({ ...item, order: i })));
  await AsyncStorage.setItem(CHECKLIST_STORAGE_KEY, payload);
}

export function createChecklistItem(text: string, order: number): ChecklistItem {
  return {
    id: generateId(),
    text,
    done: false,
    order,
  };
}
