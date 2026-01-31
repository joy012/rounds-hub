import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bed, InvRow, JsonObject, JsonValue, Ward } from './types';

/**
 * Ward data is stored in local storage (AsyncStorage).
 * Data persists until the user removes it (e.g. delete bed, discharge) or the app is uninstalled.
 * All reads/writes sync with local storage; the UI shows a loading skeleton during initial sync.
 */
const WARD_STORAGE_KEY = 'ward_data';

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseBedFromJson(value: JsonValue): Bed | null {
  if (!isJsonObject(value)) return null;
  const id = value.id;
  const number = value.number;
  if (typeof id !== 'string' || typeof number !== 'number' || number < 1) return null;
  const bed: Bed = { id, number };
  if (value.patient !== undefined && value.patient !== null && typeof value.patient === 'object' && !Array.isArray(value.patient)) {
    const p = value.patient as JsonObject;
    if (typeof p.name === 'string' || typeof p.age === 'number' || typeof p.gender === 'string' || p.dx || p.plan || Array.isArray(p.inv)) {
      const dxObj = p.dx && typeof p.dx === 'object' && !Array.isArray(p.dx) ? (p.dx as JsonObject) : null;
      const planObj = p.plan && typeof p.plan === 'object' && !Array.isArray(p.plan) ? (p.plan as JsonObject) : null;
      const invArr = Array.isArray(p.inv) ? (p.inv as JsonValue[]).filter((r): r is JsonObject => isJsonObject(r) && typeof r.id === 'string') : [];
      const invRows: InvRow[] = invArr.map((r): InvRow => ({
        id: r.id as string,
        date: typeof r.date === 'string' ? r.date : undefined,
        dateImage: typeof r.dateImage === 'string' ? r.dateImage : undefined,
        investigation: typeof r.investigation === 'string' ? r.investigation : undefined,
        investigationImage: typeof r.investigationImage === 'string' ? r.investigationImage : undefined,
        findings: typeof r.findings === 'string' ? r.findings : undefined,
        findingsImage: typeof r.findingsImage === 'string' ? r.findingsImage : undefined,
      }));
      bed.patient = {
        ...(typeof p.name === 'string' && { name: p.name }),
        ...(typeof p.age === 'number' && p.age >= 1 && p.age <= 150 && { age: p.age }),
        ...(p.gender === 'Male' || p.gender === 'Female' || p.gender === 'Other' ? { gender: p.gender } : {}),
        ...(dxObj && { dx: { text: typeof dxObj.text === 'string' ? dxObj.text : undefined, image: typeof dxObj.image === 'string' ? dxObj.image : undefined } }),
        ...(planObj && { plan: { text: typeof planObj.text === 'string' ? planObj.text : undefined, image: typeof planObj.image === 'string' ? planObj.image : undefined } }),
        ...(invRows.length > 0 && { inv: invRows }),
      };
    }
  }
  return bed;
}

function parseWardFromJson(raw: string): Ward | null {
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(raw) as JsonValue;
  } catch {
    return null;
  }
  if (!isJsonObject(parsed)) return null;
  const id = parsed.id;
  const title = parsed.title;
  const bedsRaw = parsed.beds;
  const wardNumber = parsed.wardNumber;
  if (typeof id !== 'string' || typeof title !== 'string' || !Array.isArray(bedsRaw)) return null;
  if (wardNumber !== undefined && wardNumber !== null && typeof wardNumber !== 'string') return null;
  const beds: Bed[] = [];
  for (const b of bedsRaw) {
    const bed = parseBedFromJson(b);
    if (!bed) return null;
    beds.push(bed);
  }
  return { id, title, wardNumber: typeof wardNumber === 'string' ? wardNumber : undefined, beds };
}

export async function loadWard(): Promise<Ward | null> {
  try {
    const raw = await AsyncStorage.getItem(WARD_STORAGE_KEY);
    if (!raw) return null;
    return parseWardFromJson(raw);
  } catch {
    return null;
  }
}

export async function saveWard(ward: Ward): Promise<void> {
  const payload = JSON.stringify(ward);
  try {
    await AsyncStorage.setItem(WARD_STORAGE_KEY, payload);
  } catch {
    try {
      await AsyncStorage.setItem(WARD_STORAGE_KEY, payload);
    } catch {
      throw new Error('Failed to save to device');
    }
  }
}
