/**
 * Pemformat log aktivitas & waktu relatif (murni, tanpa React).
 */

const quote = (name) => (name ? `"${name}"` : 'sebuah proyek');

const DESCRIBERS = {
  'draft.create': (entry) => `mulai mengerjakan draf ${quote(entry.projectName)}`,
  'project.create': (entry) => `menyimpan proyek ${quote(entry.projectName)} ke Library`,
  'project.checkpoint': (entry) =>
    `menyimpan versi ${quote(entry.projectName)}${entry.detail ? ` — ${entry.detail}` : ''}`,
  'project.update': (entry) => `memperbarui proyek ${quote(entry.projectName)} dari draf`,
  'project.duplicate': (entry) => `menduplikasi proyek menjadi ${quote(entry.projectName)}`,
  'project.delete': (entry) => `memindahkan proyek ${quote(entry.projectName)} ke Sampah`,
  'project.restore': (entry) => `memulihkan proyek ${quote(entry.projectName)} dari Sampah`,
  'revision.restore': (entry) => `mengembalikan ${quote(entry.projectName)} ke versi sebelumnya`,
  'edit.boq': (entry) => `mengubah ${entry.count || 1} isian RAB di ${quote(entry.projectName)}`,
  'edit.schedule': (entry) => `memperbarui jadwal/progres ${quote(entry.projectName)} (${entry.count || 1} perubahan)`,
  'edit.calc': (entry) => `mengisi kalkulator untuk ${quote(entry.projectName)} (${entry.count || 1} isian)`,
  'otp.redeem': (entry) => `memakai Kode OTP${entry.detail ? ` untuk ${entry.detail}` : ''}`,
  'library.import': (entry) => `mengimpor file backup Library${entry.detail ? ` (${entry.detail})` : ''}`,
};

/** Kalimat aktivitas tanpa nama pelaku, mis. `mengubah 3 isian RAB di "Rumah A"`. */
export function describeActivity(entry) {
  const describe = DESCRIBERS[entry?.type];
  return describe ? describe(entry) : 'melakukan perubahan';
}

/** Kelompok aktivitas untuk pewarnaan ikon. */
export function activityKind(type = '') {
  if (type.startsWith('edit.')) return 'edit';
  if (type === 'project.delete') return 'delete';
  if (type.startsWith('otp.')) return 'security';
  return 'project';
}

/** Waktu relatif berbahasa Indonesia, mis. "baru saja", "5 menit lalu", "kemarin 14.20". */
export function formatRelativeTime(timestamp, now = Date.now()) {
  const time = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp);
  if (!Number.isFinite(time) || time <= 0) return '-';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 45) return 'baru saja';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const date = new Date(time);
  const clock = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (hours < 48) return `kemarin ${clock}`;
  return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${clock}`;
}

/** Inisial untuk avatar, mis. "Budi Santoso" → "BS". */
export function initialsOf(name = '') {
  const parts = String(name)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}
