import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReferenceCard } from './types';
import { generateId } from './utils';

const REFERENCES_STORAGE_KEY = 'user_references';

function parseReferenceCard(raw: unknown): ReferenceCard | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  const title = o.title;
  const body = o.body;
  const order = o.order;
  if (typeof id !== 'string' || typeof title !== 'string' || typeof body !== 'string') return null;
  const orderNum = typeof order === 'number' && Number.isFinite(order) ? order : 0;
  return { id, title, body, order: orderNum };
}

export async function loadReferences(): Promise<ReferenceCard[]> {
  try {
    const raw = await AsyncStorage.getItem(REFERENCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cards: ReferenceCard[] = [];
    for (const item of parsed) {
      const card = parseReferenceCard(item);
      if (card) cards.push(card);
    }
    cards.sort((a, b) => a.order - b.order);
    return cards;
  } catch {
    return [];
  }
}

export async function saveReferences(cards: ReferenceCard[]): Promise<void> {
  const payload = JSON.stringify(
    cards.map((c, i) => ({ ...c, order: i }))
  );
  await AsyncStorage.setItem(REFERENCES_STORAGE_KEY, payload);
}

export function createReferenceCard(title: string, body: string, order: number): ReferenceCard {
  return {
    id: generateId(),
    title,
    body,
    order,
  };
}
