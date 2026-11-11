/**
 * Encoding kunci & peta path untuk Firebase Realtime Database.
 *
 * RTDB melarang `. $ # [ ] /` dan karakter kontrol pada kunci, serta mengubah objek
 * berkunci angka rapat menjadi array. `encodeKey` membuat semua id aplikasi aman
 * dipakai sebagai kunci dan dapat dikembalikan persis lewat `decodeKey`.
 */

// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[.$#[\]/%\u0000-\u001f\u007f]/g;

export function encodeKey(key) {
  const text = String(key ?? '');
  if (text === '') return '%e';
  if (/^\d+$/.test(text)) return `%n${text}`;
  return text.replace(UNSAFE_CHARS, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}

export function decodeKey(encoded) {
  const text = String(encoded ?? '');
  if (text === '%e') return '';
  if (text.startsWith('%n')) return text.slice(2);
  return text.replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Path relatif terhadap akar workspace (`sr_studio_v3/<workspaceId>`). */
export const paths = Object.freeze({
  meta: 'meta',
  legacyMeta: 'meta/legacy',
  migrationLock: 'meta/migrationLock',
  projects: 'projects',
  project: (id) => `projects/${encodeKey(id)}`,
  doc: (id) => `docs/${encodeKey(id)}`,
  boq: (id) => `docs/${encodeKey(id)}/boq`,
  schedule: (id) => `docs/${encodeKey(id)}/schedule`,
  calc: (id) => `docs/${encodeKey(id)}/calc`,
  // Riwayat versi: indeks ringan (untuk daftar & rotasi) terpisah dari isi snapshot yang berat.
  revisions: (id) => `revisions/${encodeKey(id)}`,
  revision: (id, revisionId) => `revisions/${encodeKey(id)}/${encodeKey(revisionId)}`,
  revisionData: (id) => `revisionData/${encodeKey(id)}`,
  revisionDatum: (id, revisionId) => `revisionData/${encodeKey(id)}/${encodeKey(revisionId)}`,
  // Sampah: indeks ringan + isi dokumen (dipulihkan/dibersihkan oleh Master).
  trash: 'trash',
  trashed: (id) => `trash/${encodeKey(id)}`,
  trashData: (id) => `trashData/${encodeKey(id)}`,
  tombstones: 'tombstones',
  tombstone: (id) => `tombstones/${encodeKey(id)}`,
  presence: 'presence',
  presenceOf: (sessionId) => `presence/${encodeKey(sessionId)}`,
  activity: 'activity',
  activityEntry: (id) => `activity/${id}`,
  otp: 'security/otp',
});

/** ID unik yang aman sebagai kunci RTDB dan terurut kasar berdasarkan waktu. */
export function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}_${Date.now()}_${random}`;
}
