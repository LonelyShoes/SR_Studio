/**
 * Migrasi data versi lama → skema realtime v3. Semua langkah NON-DESTRUKTIF dan idempoten:
 *
 *  1. Blob cloud lama (`sr_studio_library/<workspace>`) dibaca dan TIDAK pernah diubah/dihapus,
 *     sehingga tetap menjadi cadangan utuh.
 *  2. Library lokal tiap perangkat (localStorage versi lama) ikut direkonsiliasi sekali,
 *     agar proyek yang dulu gagal terunggah tidak hilang.
 *  3. Aturan gabung sama dengan versi lama: proyek yang belum ada → dibuat; versi yang
 *     `updatedAt`-nya lebih baru menang (versi cloud sebelumnya dicadangkan ke riwayat);
 *     proyek yang sudah dihapus Master (tombstone) tidak pernah dihidupkan lagi.
 */

import { LEGACY_LIBRARY_PATH, LIMITS, STORAGE_KEYS } from './config.js';
import { decodeKey, paths } from './keys.js';
import { docToState, toMillis } from './codec.js';
import { isPlainObject } from './tree.js';
import { calcTotals, normalizeLibrary } from '../../utils/normalize.js';

const NEWER_TOLERANCE_MS = 1000;
const LOCK_TTL_MS = 2 * 60 * 1000;
const asList = (value) => (Array.isArray(value) ? value : isPlainObject(value) ? Object.values(value) : []);

/** Membaca indeks proyek & tombstone yang sudah ada di v3. */
export async function readCloudIndex(workspace) {
  const [projects, tombstones] = await Promise.all([workspace.read(paths.projects), workspace.read(paths.tombstones)]);
  const existing = new Map();
  if (isPlainObject(projects)) {
    for (const key of Object.keys(projects)) {
      if (isPlainObject(projects[key]) && projects[key].createdAt !== undefined) existing.set(decodeKey(key), projects[key]);
    }
  }
  const deleted = new Set(isPlainObject(tombstones) ? Object.keys(tombstones).map(decodeKey) : []);
  return { existing, deleted };
}

/** Memilih revisi lama yang dibawa serta (terbaru dulu, sesuai kuota manual). */
function pickRevisions(project, limit) {
  return asList(project.revisions)
    .filter((revision) => revision && revision.id && revision.stateSnapshot)
    .sort((a, b) => toMillis(b.timestamp, 0) - toMillis(a.timestamp, 0))
    .slice(0, limit);
}

/**
 * Mengimpor daftar proyek berformat lama ke v3.
 * @param {import('./workspace.js').WorkspaceClient} workspace
 * @param {Array} rawProjects daftar proyek (format Library lama / file backup JSON)
 * @param {{ deletedIds?: string[], source: string, index?: { existing: Map, deleted: Set }, importedAt?: number, respectTombstones?: boolean }} options
 *   `respectTombstones: false` dipakai saat pengguna sengaja mengimpor file backup (boleh memulihkan
 *   proyek yang pernah dihapus).
 */
export async function importLegacyProjects(
  workspace,
  rawProjects,
  { deletedIds = [], source, index, importedAt = 0, respectTombstones = true }
) {
  const { existing, deleted } = index || (await readCloudIndex(workspace));
  const report = { source, created: [], updated: [], unchanged: [], skippedDeleted: [], tombstoned: 0, trashed: [] };
  const legacyDeleted = new Set(asList(deletedIds).map(String));
  const writes = [];

  for (const project of normalizeLibrary(rawProjects)) {
    if (!project.stateSnapshot) continue;
    if (respectTombstones && (deleted.has(project.id) || legacyDeleted.has(project.id))) {
      report.skippedDeleted.push(project.id);
      continue;
    }

    const cloudMeta = existing.get(project.id);
    const localUpdatedAt = toMillis(project.updatedAt, 0);

    if (!cloudMeta) {
      const created = workspace.createProject({
        id: project.id,
        state: project.stateSnapshot,
        schedule: project.scheduleSnapshot,
        calc: project.calcSnapshot,
        status: 'saved',
        createdAt: toMillis(project.createdAt, localUpdatedAt || Date.now()),
        updatedAt: localUpdatedAt || Date.now(),
        owner: { id: 'legacy', name: 'Data versi lama' },
        updatedBy: null,
        revisions: pickRevisions(project, LIMITS.manualRevisions),
      });
      writes.push(created.done);
      existing.set(project.id, { createdAt: localUpdatedAt, updatedAt: localUpdatedAt });
      report.created.push(project.id);
      continue;
    }

    if (localUpdatedAt > toMillis(cloudMeta.updatedAt, 0) + NEWER_TOLERANCE_MS) {
      // Versi lama lebih baru daripada cloud: cadangkan versi cloud, lalu perbarui isinya.
      const current = await workspace.readDocBundle(project.id);
      if (current) {
        const currentState = docToState(current.boq);
        await workspace.addRevision(
          project.id,
          {
            timestamp: toMillis(cloudMeta.updatedAt, Date.now()),
            note: `Otomatis: sebelum impor versi lebih baru dari ${source}`,
            ...calcTotals(currentState),
            stateSnapshot: currentState,
          },
          { auto: true }
        );
      }
      await workspace.replaceDoc(project.id, { state: project.stateSnapshot });
      report.updated.push(project.id);
      continue;
    }

    report.unchanged.push(project.id);
  }

  // Penghapusan versi lama → tombstone. Proyek v3 yang tidak disentuh sejak impor terakhir
  // dipindah ke sampah (masih bisa dipulihkan); yang sudah diedit di v3 dibiarkan.
  const tombstonePatch = {};
  for (const id of legacyDeleted) {
    const cloudMeta = existing.get(id);
    if (cloudMeta && importedAt && toMillis(cloudMeta.updatedAt, Infinity) <= importedAt) {
      await workspace.deleteProject(id);
      report.trashed.push(id);
    } else if (!cloudMeta && !deleted.has(id)) {
      tombstonePatch[workspace.abs(paths.tombstone(id))] = true;
      report.tombstoned += 1;
    }
  }
  if (Object.keys(tombstonePatch).length) writes.push(workspace.driver.write(tombstonePatch));

  await Promise.all(writes);
  return report;
}

/**
 * Migrasi blob cloud versi lama. Aman dijalankan berulang dan oleh banyak perangkat sekaligus
 * (dilindungi kunci transaksi); hanya bekerja bila blob lama berubah sejak impor terakhir.
 */
export async function migrateLegacyCloud(workspace, { force = false } = {}) {
  const driver = workspace.driver;
  const [state, sourceUpdatedAt] = await Promise.all([
    workspace.read(paths.legacyMeta),
    driver.read(`${LEGACY_LIBRARY_PATH}/updatedAt`),
  ]);

  if (!sourceUpdatedAt) {
    if (!state) {
      await driver.write({ [workspace.abs(paths.legacyMeta)]: { importedAt: driver.timestamp, sourceUpdatedAt: 'none' } });
    }
    return { skipped: true, reason: 'no-legacy-data' };
  }
  if (!force && isPlainObject(state) && state.sourceUpdatedAt === sourceUpdatedAt) {
    return { skipped: true, reason: 'up-to-date' };
  }

  const now = driver.now();
  const who = workspace.who();
  const lock = await driver.transact(workspace.abs(paths.migrationLock), (current) => {
    if (isPlainObject(current) && now - (Number(current.at) || 0) < LOCK_TTL_MS && current.by !== who.id) return undefined;
    return { by: who.id, at: now };
  });
  if (!lock.committed) return { skipped: true, reason: 'locked' };

  try {
    const blob = await driver.read(LEGACY_LIBRARY_PATH);
    const report = await importLegacyProjects(workspace, blob?.library, {
      deletedIds: blob?.deletedIds,
      source: 'cloud versi lama',
      importedAt: isPlainObject(state) ? Number(state.importedAt) || 0 : 0,
    });
    await driver.write({
      [workspace.abs(paths.legacyMeta)]: {
        importedAt: driver.timestamp,
        sourceUpdatedAt,
        created: report.created.length,
        updated: report.updated.length,
      },
      [workspace.abs(paths.migrationLock)]: null,
    });
    return { skipped: false, report };
  } catch (error) {
    await driver.write({ [workspace.abs(paths.migrationLock)]: null }).catch(() => {});
    throw error;
  }
}

/** Membaca Library & daftar hapus versi lama dari localStorage perangkat ini. */
export function readLegacyLocalLibrary(storage = globalThis.localStorage) {
  const parse = (key) => {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const library = normalizeLibrary(parse(STORAGE_KEYS.legacyLibrary));
  const deletedIds = asList(parse(STORAGE_KEYS.legacyDeletedIds)).map(String);
  return { library, deletedIds };
}

export function isLocalMigrationDone(storage = globalThis.localStorage) {
  try {
    return !!storage?.getItem(STORAGE_KEYS.localMigration);
  } catch {
    return true; // tanpa storage tidak ada yang bisa dimigrasikan
  }
}

/**
 * Rekonsiliasi satu kali Library lokal perangkat ini dengan cloud v3 (idempoten).
 * Salinan localStorage lama baru dilepas lewat `releaseLegacyLocalLibrary` setelah
 * pemanggil memastikan cache baru (IndexedDB) sudah terisi.
 */
export async function migrateLocalLibrary(workspace, { storage = globalThis.localStorage } = {}) {
  if (isLocalMigrationDone(storage)) return { skipped: true, reason: 'done' };

  const { library, deletedIds } = readLegacyLocalLibrary(storage);
  let report = null;
  if (library.length > 0 || deletedIds.length > 0) {
    report = await importLegacyProjects(workspace, library, { deletedIds, source: 'perangkat ini' });
  }

  try {
    storage.setItem(
      STORAGE_KEYS.localMigration,
      JSON.stringify({ at: Date.now(), created: report?.created.length || 0, updated: report?.updated.length || 0 })
    );
  } catch {
    // Penanda gagal ditulis → rekonsiliasi diulang di kunjungan berikutnya (aman, idempoten).
  }
  return { skipped: false, report };
}

/** Melepas salinan Library lama yang besar (≈ ukuran seluruh Library ×2) dari localStorage. */
export function releaseLegacyLocalLibrary(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEYS.legacyLibrary);
    storage?.removeItem(STORAGE_KEYS.legacyCloudCache);
  } catch {
    // Diabaikan: hanya optimasi kuota.
  }
}
