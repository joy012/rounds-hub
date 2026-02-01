import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './utils';

const SKETCHES_STORAGE_KEY = 'user_sketches';

export interface Sketch {
  id: string;
  title: string;
  image?: string; // base64 PNG
  updatedAt: string; // ISO
}

function parseSketch(raw: unknown): Sketch | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  const title = o.title;
  const updatedAt = o.updatedAt;
  if (typeof id !== 'string' || typeof title !== 'string') return null;
  const updated = typeof updatedAt === 'string' ? updatedAt : new Date().toISOString();
  const image = typeof o.image === 'string' ? o.image : undefined;
  return { id, title, image, updatedAt: updated };
}

export async function loadSketches(): Promise<Sketch[]> {
  try {
    const raw = await AsyncStorage.getItem(SKETCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const sketches: Sketch[] = [];
    for (const item of parsed) {
      const sketch = parseSketch(item);
      if (sketch) sketches.push(sketch);
    }
    sketches.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return sketches;
  } catch {
    return [];
  }
}

export async function saveSketches(sketches: Sketch[]): Promise<void> {
  await AsyncStorage.setItem(SKETCHES_STORAGE_KEY, JSON.stringify(sketches));
}

export function createSketch(title: string, image?: string): Sketch {
  return {
    id: generateId(),
    title,
    image,
    updatedAt: new Date().toISOString(),
  };
}

/** Display title: sketch title if set, else "Untitled sketch". */
export function sketchDisplayTitle(sketch: Sketch): string {
  const t = sketch.title?.trim();
  return t ? t : 'Untitled sketch';
}
