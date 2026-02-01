import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { loadPreferences } from '@/lib/preferences';
import { loadReferences } from '@/lib/references-storage';
import { loadWard } from '@/lib/storage';
import type { Ward } from './types';

const WARD_STORAGE_KEY = 'ward_data';
const PREFERENCES_STORAGE_KEY = 'user_preferences';
const REFERENCES_STORAGE_KEY = 'user_references';
const PHRASES_STORAGE_KEY = 'user_phrases';

export interface BackupPayload {
  version: number;
  ward: Ward | null;
  preferences: Awaited<ReturnType<typeof loadPreferences>>;
  references: Awaited<ReturnType<typeof loadReferences>>;
  phrases: string[];
}

export async function exportBackupAsJson(): Promise<void> {
  const [ward, preferences, references] = await Promise.all([
    loadWard(),
    loadPreferences(),
    loadReferences(),
  ]);
  let phrases: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(PHRASES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      phrases = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
    }
  } catch {
    // ignore
  }
  const payload: BackupPayload = {
    version: 1,
    ward,
    preferences,
    references,
    phrases,
  };
  const json = JSON.stringify(payload, null, 2);
  const filename = `RoundsHub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const docDir = FileSystem.documentDirectory;
  if (!docDir) throw new Error('Document directory is not available');
  const uri = docDir.endsWith('/') ? `${docDir}${filename}` : `${docDir}/${filename}`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save backup',
  });
}

function buildBackupPdfHtml(
  ward: Ward | null,
  _preferences: Awaited<ReturnType<typeof loadPreferences>>,
  references: Awaited<ReturnType<typeof loadReferences>>
): string {
  const date = new Date().toISOString().slice(0, 10);
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  let wardSection = '';
  if (ward) {
    wardSection = `
      <div class="section">
        <div class="section-title">Ward</div>
        <div class="section-content">
          <p><strong>${escape(ward.title ?? '')}</strong> — Ward ${escape(ward.wardNumber ?? '')}</p>
          <p>${ward.beds.length} bed(s)</p>
          <table class="inv-table">
            <thead><tr><th>Bed</th><th>Patient</th><th>Diagnosis</th><th>Plan</th></tr></thead>
            <tbody>
              ${ward.beds
                .map(
                  (b) =>
                    `<tr><td>${b.number}</td><td>${escape(b.patient?.name ?? '—')}</td><td>${escape((b.patient?.dx?.text ?? '').slice(0, 80) || '—')}</td><td>${escape((b.patient?.plan?.text ?? '').slice(0, 80) || '—')}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }
  const refSection =
    references.length > 0
      ? `<div class="section"><div class="section-title">Quick reference</div><div class="section-content">${references
          .map(
            (r) =>
              `<p><strong>${escape(r.title)}</strong><br/>${escape(r.body).replace(/\n/g, '<br/>')}</p>`
          )
          .join('')}</div></div>`
      : '';
  const style = `
    * { box-sizing: border-box; }
    body { font-family: Georgia, serif; font-size: 11px; color: #1a1a1a; padding: 24px; line-height: 1.45; max-width: 800px; margin: 0 auto; }
    .doc-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1a1a1a; }
    .doc-title { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; }
    .doc-subtitle { font-size: 12px; color: #555; margin: 0; }
    .section { margin-bottom: 18px; page-break-inside: avoid; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #2d4a42; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #c5d4cf; }
    .section-content { padding-left: 2px; }
    .section-content p { margin: 0 0 6px 0; }
    table.inv-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    table.inv-table th, table.inv-table td { border: 1px solid #c5d4cf; padding: 8px 10px; text-align: left; }
    table.inv-table th { background: #e8f0ed; font-weight: 700; color: #2d4a42; }
  `;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${style}</style></head><body>
    <div class="doc-header">
      <div class="doc-title">RoundsHub Backup</div>
      <div class="doc-subtitle">${date}</div>
    </div>
    ${wardSection}
    ${refSection}
  </body></html>`;
}

export async function exportBackupAsPdf(): Promise<void> {
  const [ward, preferences, references] = await Promise.all([
    loadWard(),
    loadPreferences(),
    loadReferences(),
  ]);
  const html = buildBackupPdfHtml(ward, preferences, references);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const filename = `RoundsHub-backup-${new Date().toISOString().slice(0, 10)}.pdf`;
  const docDir = FileSystem.documentDirectory;
  if (!docDir) throw new Error('Document directory is not available');
  const destUri = docDir.endsWith('/') ? `${docDir}${filename}` : `${docDir}/${filename}`;
  let shareUri = destUri;
  try {
    await FileSystem.copyAsync({ from: uri, to: destUri });
  } catch {
    shareUri = uri;
  }
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save PDF',
  });
}

function isBackupPayload(raw: unknown): raw is BackupPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.version === 'number' &&
    o.version === 1 &&
    (o.ward === null || (typeof o.ward === 'object' && typeof (o.ward as Record<string, unknown>).id === 'string'))
  );
}

export async function importBackupFromJson(fileUri: string): Promise<void> {
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const parsed = JSON.parse(content) as unknown;
  if (!isBackupPayload(parsed)) throw new Error('Invalid backup file');
  const pairs: [string, string][] = [];
  if (parsed.ward) {
    pairs.push([WARD_STORAGE_KEY, JSON.stringify(parsed.ward)]);
  }
  pairs.push([PREFERENCES_STORAGE_KEY, JSON.stringify(parsed.preferences ?? {})]);
  pairs.push([REFERENCES_STORAGE_KEY, JSON.stringify(parsed.references ?? [])]);
  pairs.push([PHRASES_STORAGE_KEY, JSON.stringify(parsed.phrases ?? [])]);
  await AsyncStorage.multiSet(pairs);
}
