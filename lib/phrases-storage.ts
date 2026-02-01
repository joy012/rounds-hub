import AsyncStorage from '@react-native-async-storage/async-storage';

const PHRASES_STORAGE_KEY = 'user_phrases';

export async function loadPhrases(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PHRASES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

export async function savePhrases(phrases: string[]): Promise<void> {
  await AsyncStorage.setItem(PHRASES_STORAGE_KEY, JSON.stringify(phrases));
}
