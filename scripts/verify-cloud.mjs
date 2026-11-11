#!/usr/bin/env node
/**
 * Verifikasi BACA-SAJA hasil migrasi cloud (v2 → v3). Tidak menulis apa pun ke database.
 *
 *   npm run verify:cloud
 *
 * Membandingkan setiap proyek di data versi lama (`sr_studio_library/<workspace>`) dengan
 * dokumen realtime v3 (`sr_studio_v3/<workspace>`): total RAB, jumlah item, item terisi,
 * dan riwayat versi. Proyek yang sudah diedit di v3 setelah migrasi dilaporkan sebagai
 * "berbeda (diedit setelah migrasi)" — itu wajar, bukan kegagalan.
 */
import { DEFAULT_DATABASE_URL, LEGACY_LIBRARY_PATH, LIMITS, WORKSPACE_ROOT } from '../src/services/cloud/config.js';
import { decodeRevision, docToState, toMillis } from '../src/services/cloud/codec.js';
import { decodeKey } from '../src/services/cloud/keys.js';
import { calcTotals, normalizeLibrary } from '../src/utils/normalize.js';

const asList = (value) => (Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []);
const rupiah = (value) => `Rp ${Math.round(value).toLocaleString('id-ID')}`;

async function readJson(path) {
  const response = await fetch(`${DEFAULT_DATABASE_URL}/${path}.json`);
  if (!response.ok) throw new Error(`Gagal membaca ${path}: HTTP ${response.status}`);
  return response.json();
}

const [legacy, workspace] = await Promise.all([readJson(LEGACY_LIBRARY_PATH), readJson(WORKSPACE_ROOT)]);

if (!workspace) {
  console.log('Data realtime v3 belum ada. Migrasi berjalan otomatis saat aplikasi versi baru pertama kali dibuka.');
  process.exit(2);
}

const projects = workspace.projects || {};
const docs = workspace.docs || {};
const tombstones = new Set(Object.keys(workspace.tombstones || {}).map(decodeKey));
const legacyProjects = asList(legacy?.library).filter(Boolean);
const legacyDeleted = new Set(asList(legacy?.deletedIds).map(String));

console.log(`Database : ${new URL(DEFAULT_DATABASE_URL).hostname.split('.')[0]}`);
console.log(`Migrasi  : ${JSON.stringify(workspace.meta?.legacy || null)}`);
console.log(`Proyek   : versi lama ${legacyProjects.length} | v3 ${Object.keys(projects).length} | tombstone ${tombstones.size}\n`);

let failures = 0;
for (const raw of legacyProjects) {
  const [normalized] = normalizeLibrary([raw]);
  const meta = projects[raw.id];
  const doc = docs[raw.id]?.boq;

  if (!meta || !doc) {
    if (tombstones.has(raw.id) || legacyDeleted.has(raw.id)) {
      console.log(`DIHAPUS  "${raw.name}" (sudah dihapus Master — tidak dimigrasikan)`);
    } else {
      failures += 1;
      console.log(`HILANG   "${raw.name}" (${raw.id}) belum ada di v3`);
    }
    continue;
  }

  const state = docToState(doc);
  const before = calcTotals(normalized.stateSnapshot);
  const after = calcTotals(state);
  const itemsBefore = normalized.stateSnapshot.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const itemsAfter = state.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const identical =
    Math.abs(before.grandTotal - after.grandTotal) < 1e-6 &&
    before.filledItemsCount === after.filledItemsCount &&
    itemsBefore === itemsAfter;
  const editedSince = toMillis(meta.updatedAt, 0) > toMillis(raw.updatedAt, 0) + 1000;

  const legacyRevisions = asList(raw.revisions).filter((revision) => revision && revision.id && revision.stateSnapshot);
  const revisionIndex = workspace.revisions?.[raw.id] || {};
  const revisionData = workspace.revisionData?.[raw.id] || {};
  const migratedRevisions = Object.keys(revisionIndex)
    .map((key) => decodeRevision(decodeKey(key), revisionIndex[key], revisionData[key]))
    .filter(Boolean);
  const expectedRevisions = Math.min(LIMITS.manualRevisions, legacyRevisions.length);
  const carried = legacyRevisions.filter((revision) => migratedRevisions.some((entry) => entry.id === revision.id && entry.stateSnapshot));
  const revisionsOk = editedSince || carried.length >= expectedRevisions;

  let label = 'OK      ';
  if (!identical && editedSince) label = 'DIEDIT  ';
  else if (!identical || !revisionsOk) {
    label = 'BERBEDA ';
    failures += 1;
  }
  console.log(
    `${label} "${raw.name}" | ${rupiah(before.grandTotal)} → ${rupiah(after.grandTotal)} | item ${itemsBefore}→${itemsAfter} | terisi ${before.filledItemsCount}→${after.filledItemsCount} | revisi ${legacyRevisions.length}→${migratedRevisions.length}`
  );
}

const extra = Object.keys(projects).filter((id) => !legacyProjects.some((project) => project.id === id));
if (extra.length) {
  console.log(`\nProyek/draf baru di v3 (dibuat setelah migrasi): ${extra.length}`);
  for (const id of extra) console.log(`  + "${projects[id].name}" [${projects[id].status}] ${rupiah(projects[id].grandTotal || 0)}`);
}

console.log(failures === 0 ? '\nVERIFIKASI LULUS: semua proyek versi lama ada di v3 dengan isi yang sama.' : `\nVERIFIKASI GAGAL: ${failures} proyek perlu diperiksa.`);
process.exit(failures === 0 ? 0 : 1);
