import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Bed, Ward } from './types';

const PDF_HTML_STYLE = `
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #1a1a1a; padding: 16px; line-height: 1.4; }
    h1 { font-size: 16px; margin: 0 0 12px 0; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    h2 { font-size: 14px; margin: 14px 0 6px 0; color: #333; }
    .section { margin-bottom: 14px; }
    .section p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .muted { color: #666; }
    img.signature { max-width: 200px; max-height: 80px; object-fit: contain; }
  </style>
`;

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function buildPatientSection(patient: NonNullable<Bed['patient']>): string {
  const parts: string[] = [];
  if (patient.name) parts.push(`<p><strong>Name:</strong> ${escapeHtml(patient.name)}</p>`);
  if (patient.age != null) parts.push(`<p><strong>Age:</strong> ${patient.age}</p>`);
  if (patient.gender) parts.push(`<p><strong>Gender:</strong> ${escapeHtml(patient.gender)}</p>`);
  if (patient.admissionDate)
    parts.push(`<p><strong>Admission:</strong> ${escapeHtml(patient.admissionDate)}</p>`);
  if (patient.dischargeDate)
    parts.push(`<p><strong>Discharge:</strong> ${escapeHtml(patient.dischargeDate)}</p>`);
  if (parts.length === 0) return '';
  return `<div class="section"><h2>Patient info</h2>${parts.join('')}</div>`;
}

function buildDxPlanSection(label: string, content: { text?: string; image?: string } | undefined): string {
  if (!content?.text && !content?.image) return '';
  const parts: string[] = [];
  if (content.text) parts.push(`<p>${escapeHtml(content.text)}</p>`);
  if (content.image) {
    const src = content.image.startsWith('data:') ? content.image : `data:image/png;base64,${content.image}`;
    parts.push(`<p><img class="signature" src="${src}" alt="handwriting" /></p>`);
  }
  return `<div class="section"><h2>${escapeHtml(label)}</h2>${parts.join('')}</div>`;
}

function buildInvTable(rows: NonNullable<NonNullable<Bed['patient']>['inv']>): string {
  if (!rows?.length) return '';
  const cells = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.date ?? '')}</td><td>${escapeHtml(r.investigation ?? '')}</td><td>${escapeHtml(r.findings ?? '')}</td></tr>`
    )
    .join('');
  return `
  <div class="section">
    <h2>Investigations</h2>
    <table>
      <thead><tr><th>Date</th><th>Investigation</th><th>Findings</th></tr></thead>
      <tbody>${cells}</tbody>
    </table>
  </div>`;
}

export function buildBedPdfHtml(bed: Bed, ward: Ward): string {
  const patient = bed.patient;
  const title = `${escapeHtml(ward.title)} – Ward ${escapeHtml(ward.wardNumber ?? '')} – Bed ${bed.number}`;
  const patientHtml = patient ? buildPatientSection(patient) : '';
  const dxHtml = patient?.dx ? buildDxPlanSection('Dx', patient.dx) : '';
  const planHtml = patient?.plan ? buildDxPlanSection('Plan', patient.plan) : '';
  const invHtml = patient?.inv ? buildInvTable(patient.inv) : '';

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"/>${PDF_HTML_STYLE}</head>
  <body>
    <h1>${title}</h1>
    ${patientHtml}
    ${dxHtml}
    ${planHtml}
    ${invHtml}
  </body>
  </html>`;
}

function sanitizeFilenamePart(s: string, maxLen = 40): string {
  return s
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);
}

export function getBedPdfFilename(bed: Bed, ward: Ward): string {
  const department = sanitizeFilenamePart(ward.title ?? 'Department');
  const wardNum = (ward.wardNumber ?? '').replace(/\s+/g, '-') || '0';
  const bedNum = String(bed.number);
  const date = new Date().toISOString().slice(0, 10);
  const patientName = bed.patient?.name?.trim();
  const namePart = patientName ? `-${sanitizeFilenamePart(patientName, 30)}` : '';
  return `${department}-Ward${wardNum}-Bed${bedNum}${namePart}-${date}.pdf`;
}

export async function exportBedToPdf(bed: Bed, ward: Ward): Promise<void> {
  const html = buildBedPdfHtml(bed, ward);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const filename = getBedPdfFilename(bed, ward);
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    throw new Error('Document directory is not available');
  }
  const destUri = docDir.endsWith('/') ? `${docDir}${filename}` : `${docDir}/${filename}`;

  let shareUri = destUri;
  try {
    await FileSystem.copyAsync({ from: uri, to: destUri });
  } catch {
    // If copy fails (e.g. permissions), share the temp file from print directly
    shareUri = uri;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save PDF',
  });
}
