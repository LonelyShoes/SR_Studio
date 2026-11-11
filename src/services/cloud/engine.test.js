import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryServer } from './drivers/memoryDriver.js';
import { createMemoryStorage } from './outbox.js';
import { SyncEngine } from './engine.js';
import { LEGACY_LIBRARY_PATH, STORAGE_KEYS, WORKSPACE_ROOT } from './config.js';
import { createLocalStore } from '../storage/localStore.js';
import { createLibraryCache } from '../storage/libraryCache.js';
import { CalculatorStore } from '../../hooks/usePersistentCalculatorState.js';
import { blankState, calcTotals, ensureOrder, normalizeState } from '../../utils/normalize.js';

const tick = (ms = 1000) => vi.advanceTimersByTimeAsync(ms);
const workspaceTree = (server) => {
  const [root, ns] = WORKSPACE_ROOT.split('/');
  return server.tree?.[root]?.[ns] || {};
};

/** Satu perangkat: engine + "UI" tiruan yang menyimpan state seperti React. */
function createDevice(server, { role = 'master', name = 'Master', id = 'pc', storage = createMemoryStorage(), state, schedule = null, docId = null } = {}) {
  const ui = { state: state || blankState('2026-01-01'), schedule, docId, toasts: [], docEvents: [] };
  const identity = { id, sessionId: `${id}-s1`, name, role };
  const calcStore = new CalculatorStore(docId);
  const device = { ui, identity, calcStore, storage };

  const engine = new SyncEngine({
    createDriver: async () => {
      device.driver = server.connect();
      return device.driver;
    },
    store: createLocalStore(storage),
    cache: createLibraryCache(null),
    calcStore,
    getIdentity: () => identity,
    hooks: {
      applyBoq: (updater) => {
        ui.state = ensureOrder(updater(ui.state));
        engine.setLocalBoq(ui.state, ui.docId);
      },
      applySchedule: (updater) => {
        ui.schedule = updater(ui.schedule);
        engine.setLocalSchedule(ui.schedule, ui.docId);
      },
      onDocChange: (nextDocId, info) => {
        ui.docId = nextDocId;
        ui.docEvents.push(info.reason);
        if (info.reason === 'open') {
          ui.state = info.state || blankState('2026-01-01');
          ui.schedule = info.schedule || null;
        } else if (info.reason === 'reset' || (info.reason === 'deleted' && !info.keepLocal)) {
          ui.state = blankState('2026-01-01');
          ui.schedule = null;
        } else if (info.name && info.reason === 'create') {
          ui.state = { ...ui.state, project: { ...ui.state.project, name: info.name } };
        }
        engine.setLocalBoq(ui.state, ui.docId);
        engine.setLocalSchedule(ui.schedule, ui.docId);
      },
      notify: (text, type) => ui.toasts.push({ text, type }),
    },
  });
  device.engine = engine;
  device.edit = (mutator) => {
    ui.state = ensureOrder(mutator(ui.state));
    engine.setLocalBoq(ui.state, ui.docId);
  };
  device.setVolume = (catIndex, itemIndex, volume) =>
    device.edit((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, c) =>
        c !== catIndex ? cat : { ...cat, items: cat.items.map((it, i) => (i !== itemIndex ? it : { ...it, volume })) }
      ),
    }));
  device.rename = (projectName) => device.edit((prev) => ({ ...prev, project: { ...prev.project, name: projectName } }));
  device.library = () => engine.getSnapshot().library;

  engine.resume(docId, { state: ui.state, schedule: ui.schedule });
  engine.setCanWrite(role === 'master');
  engine.start();
  return device;
}

describe('SyncEngine: alur realtime antar perangkat', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('input Master langsung menjadi draf cloud dan terbaca perangkat lain secara realtime', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    const hp = createDevice(server, { role: 'client', name: 'Budi', id: 'hp' });
    await tick();
    expect(pc.engine.getSnapshot().phase).toBe('synced');
    expect(hp.library()).toEqual([]);

    pc.rename('Rumah Pak Hadi');
    await tick();
    expect(pc.ui.docId).toMatch(/^proj_/);
    expect(hp.library()).toMatchObject([{ id: pc.ui.docId, name: 'Rumah Pak Hadi', status: 'draft' }]);

    hp.engine.openProject(pc.ui.docId);
    await tick();
    expect(hp.engine.getSnapshot().docLoading).toBe(false);
    expect(hp.ui.state.project.name).toBe('Rumah Pak Hadi');

    pc.setVolume(0, 0, 12);
    await tick();
    expect(hp.ui.state.categories[0].items[0].volume).toBe(12);
    expect(hp.library()[0].grandTotal).toBe(calcTotals(pc.ui.state).grandTotal);
    expect(hp.library()[0].updatedBy.name).toBe('Master');

    const activity = hp.engine.getSnapshot().activity;
    expect(activity.some((entry) => entry.type === 'draft.create')).toBe(true);
    expect(activity.some((entry) => entry.type === 'edit.boq' && entry.by.name === 'Master')).toBe(true);
    expect(hp.engine.getSnapshot().presence.map((p) => p.name).sort()).toEqual(['Budi', 'Master']);
    expect(hp.engine.getSnapshot().presence.every((p) => p.docId === pc.ui.docId)).toBe(true);
  });

  it('Klien tanpa izin hanya membaca; setelah izin diberikan inputnya tersiar ke Master', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Ruko 2 Lantai');
    await tick();
    const hp = createDevice(server, { role: 'client', name: 'Sari', id: 'hp' });
    await tick();
    hp.engine.openProject(pc.ui.docId);
    await tick();

    const writesBefore = hp.driver.writes.filter((patch) => Object.keys(patch).some((path) => path.includes('/docs/'))).length;
    hp.setVolume(1, 0, 99); // tanpa izin: tidak boleh sampai ke cloud
    await tick(3000);
    expect(hp.driver.writes.filter((patch) => Object.keys(patch).some((path) => path.includes('/docs/'))).length).toBe(writesBefore);
    expect(pc.ui.state.categories[1].items[0].volume).toBe(0);

    hp.engine.setCanWrite(true); // OTP diterima
    await tick();
    expect(pc.ui.state.categories[1].items[0].volume).toBe(99);
  });

  it('dua perangkat mengedit item berbeda bersamaan tanpa saling menimpa', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Gudang');
    await tick();
    const laptop = createDevice(server, { name: 'Master 2', id: 'laptop' });
    await tick();
    laptop.engine.openProject(pc.ui.docId);
    await tick();

    pc.setVolume(0, 0, 5);
    laptop.setVolume(2, 1, 8);
    laptop.calcStore.set('sr_calc_wall_luas', '"24.5"');
    await tick(3000);

    for (const device of [pc, laptop]) {
      expect(device.ui.state.categories[0].items[0].volume).toBe(5);
      expect(device.ui.state.categories[2].items[1].volume).toBe(8);
      expect(device.calcStore.get('sr_calc_wall_luas')).toBe('"24.5"');
    }
    expect(pc.library()[0].grandTotal).toBe(calcTotals(pc.ui.state).grandTotal);
    expect(pc.library()[0].filledItemsCount).toBe(2);
  });

  it('jadwal (Kurva S) tersinkron per proyek', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Proyek Jadwal');
    await tick();
    const hp = createDevice(server, { role: 'client', id: 'hp', name: 'Lapangan' });
    await tick();
    hp.engine.openProject(pc.ui.docId);
    await tick();

    pc.ui.schedule = { durationWeeks: 16, startDate: '2026-03-01', categorySchedules: { persiapan: { startWeek: 1, endWeek: 2 } }, actualProgress: { 1: 7.5 } };
    pc.engine.setLocalSchedule(pc.ui.schedule, pc.ui.docId);
    await tick();
    expect(hp.ui.schedule).toEqual(pc.ui.schedule);
  });

  it('pekerjaan offline terkirim saat tersambung lagi, digabung dengan perubahan orang lain', async () => {
    const server = new MemoryServer();
    const kantor = createDevice(server);
    await tick();
    kantor.rename('Kontrakan');
    await tick();
    const lapangan = createDevice(server, { name: 'Lapangan', id: 'tablet' });
    await tick();
    lapangan.engine.openProject(kantor.ui.docId);
    await tick();

    lapangan.driver.setOnline(false);
    await tick();
    expect(lapangan.engine.getSnapshot().phase).toBe('offline');
    lapangan.setVolume(0, 2, 40);
    kantor.setVolume(0, 3, 15);
    await tick(3000);
    expect(lapangan.engine.getSnapshot().pending).toBeGreaterThan(0);
    expect(kantor.ui.state.categories[0].items[2].volume).toBe(0);

    lapangan.driver.setOnline(true);
    await tick(3000);
    for (const device of [kantor, lapangan]) {
      expect(device.ui.state.categories[0].items[2].volume).toBe(40);
      expect(device.ui.state.categories[0].items[3].volume).toBe(15);
    }
    expect(lapangan.engine.getSnapshot().phase).toBe('synced');
    expect(lapangan.engine.getSnapshot().pending).toBe(0);
  });

  it('proyek yang dihapus Master menutup dokumen di perangkat lain dan bisa dipulihkan dari sampah', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Akan Dihapus');
    pc.setVolume(0, 0, 3);
    await tick();
    const docId = pc.ui.docId;
    const hp = createDevice(server, { role: 'client', id: 'hp', name: 'Klien' });
    await tick();
    hp.engine.openProject(docId);
    await tick();

    await pc.engine.deleteProject(docId);
    await tick();
    expect(pc.ui.docId).toBeNull();
    expect(hp.ui.docId).toBeNull();
    expect(hp.ui.docEvents.at(-1)).toBe('deleted');
    expect(hp.ui.state.project.name).toBe('');
    expect(hp.library()).toEqual([]);
    expect(pc.engine.getSnapshot().trash).toMatchObject([{ id: docId, name: 'Akan Dihapus' }]);

    await pc.engine.restoreFromTrash(docId);
    await tick();
    expect(hp.library()).toMatchObject([{ id: docId, name: 'Akan Dihapus' }]);
    hp.engine.openProject(docId);
    await tick();
    expect(hp.ui.state.categories[0].items[0].volume).toBe(3);
  });

  it('simpan ke Library, checkpoint, rollback, dan duplikasi', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Villa');
    pc.setVolume(0, 0, 10);
    await tick();
    const docId = pc.ui.docId;

    await pc.engine.promoteDraft(docId);
    await tick();
    expect(pc.library()[0]).toMatchObject({ status: 'saved', revisionCount: 1 });

    await pc.engine.checkpoint(docId, { note: 'Sebelum revisi atap' });
    pc.setVolume(0, 0, 25);
    await tick();
    const revisions = await pc.engine.loadRevisions(docId);
    const manual = revisions.find((revision) => revision.note === 'Sebelum revisi atap');
    expect(manual.stateSnapshot.categories[0].items[0].volume).toBe(10);

    await pc.engine.restoreRevision(docId, manual.id);
    await tick();
    expect(pc.ui.state.categories[0].items[0].volume).toBe(10);
    expect(workspaceTree(server).docs[docId].boq.cats.persiapan.items['persiapan-0'].volume).toBe(10);
    const after = await pc.engine.loadRevisions(docId);
    expect(after.some((revision) => /sebelum rollback/i.test(revision.note) && revision.stateSnapshot.categories[0].items[0].volume === 25)).toBe(true);

    const copy = await pc.engine.duplicateProject(docId);
    await tick();
    expect(pc.library().map((entry) => entry.name).sort()).toEqual(['Villa', 'Villa (Salinan)']);
    expect(copy.id).not.toBe(docId);

    const newId = await pc.engine.saveAsNew({ name: 'Villa Tipe B' });
    await tick();
    expect(pc.ui.docId).toBe(newId);
    expect(pc.ui.state.project.name).toBe('Villa Tipe B');
    pc.setVolume(0, 0, 77);
    await tick();
    expect(workspaceTree(server).docs[docId].boq.cats.persiapan.items['persiapan-0'].volume).toBe(10);
    expect(workspaceTree(server).docs[newId].boq.cats.persiapan.items['persiapan-0'].volume).toBe(77);
  });

  it('draf dengan nama sama dapat dilebur ke proyek tersimpan (versi lama dicadangkan)', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Kost Putri');
    pc.setVolume(0, 0, 1);
    await tick();
    const targetId = pc.ui.docId;
    await pc.engine.promoteDraft(targetId);
    pc.engine.closeDoc({ reset: true });
    await tick();

    pc.rename('Kost Putri');
    pc.setVolume(0, 0, 9);
    await tick();
    const draftId = pc.ui.docId;
    expect(draftId).not.toBe(targetId);

    await pc.engine.mergeIntoProject(targetId, { note: 'Perbarui dari draf' });
    await tick();
    expect(pc.ui.docId).toBe(targetId);
    expect(pc.ui.state.categories[0].items[0].volume).toBe(9);
    expect(pc.library().map((entry) => entry.id)).toEqual([targetId]);
    const revisions = await pc.engine.loadRevisions(targetId);
    expect(revisions.some((revision) => revision.note === 'Perbarui dari draf' && revision.stateSnapshot.categories[0].items[0].volume === 1)).toBe(true);
  });
});

describe('SyncEngine: persistensi & pembaruan dari versi lama', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('state & titik sinkron tersimpan; sesi berikutnya melanjutkan tanpa kehilangan input offline', async () => {
    const server = new MemoryServer();
    const storage = createMemoryStorage();
    const first = createDevice(server, { storage });
    await tick();
    first.rename('Rumah Tumbuh');
    await tick();
    const docId = first.ui.docId;
    first.driver.setOnline(false);
    first.setVolume(0, 0, 33);
    await tick(3000);
    expect(storage.getItem(STORAGE_KEYS.activeDocId)).toBe(docId);
    const savedState = normalizeState(JSON.parse(storage.getItem(STORAGE_KEYS.boqState)));
    expect(savedState.categories[0].items[0].volume).toBe(33);
    // Tab ditutup saat offline (tanpa dispose): antrian SDK hilang, outbox & state tetap ada.

    const second = createDevice(server, { storage, state: savedState, docId, id: 'pc' });
    await tick(3000);
    expect(second.ui.docId).toBe(docId);
    expect(workspaceTree(server).docs[docId].boq.cats.persiapan.items['persiapan-0'].volume).toBe(33);
    expect(second.ui.state.categories[0].items[0].volume).toBe(33);
    expect(second.engine.getSnapshot().pending).toBe(0);
  });

  it('migrasi otomatis saat bootstrap: blob cloud lama + Library lokal perangkat', async () => {
    const legacyState = ensureOrder({ ...blankState('2026-08-01'), project: { ...blankState().project, name: 'Kontrakan Maulana #6' } });
    legacyState.categories[0].items[0].volume = 4;
    const legacyProject = (id, name, updatedAt) => ({
      id, name, createdAt: '2026-08-01T00:00:00.000Z', updatedAt,
      stateSnapshot: { ...legacyState, project: { ...legacyState.project, name } },
      revisions: [],
    });
    const [root, ns] = LEGACY_LIBRARY_PATH.split('/');
    const server = new MemoryServer({
      [root]: { [ns]: { updatedAt: '2026-10-30T08:13:01.533Z', library: [legacyProject('proj_cloud', 'Dari Cloud Lama', '2026-10-01T00:00:00.000Z')], deletedIds: ['proj_x'] } },
    });
    const storage = createMemoryStorage({
      [STORAGE_KEYS.legacyLibrary]: JSON.stringify([
        legacyProject('proj_cloud', 'Dari Cloud Lama', '2026-10-01T00:00:00.000Z'),
        legacyProject('proj_lokal', 'Hanya di Perangkat', '2026-10-05T00:00:00.000Z'),
      ]),
    });
    const pc = createDevice(server, { storage });
    await tick(3000);

    expect(pc.library().map((entry) => entry.name).sort()).toEqual(['Dari Cloud Lama', 'Hanya di Perangkat']);
    expect(pc.library().every((entry) => entry.stateSnapshot && entry.status === 'saved')).toBe(true);
    expect(pc.engine.getSnapshot().migration.cloud.created).toEqual(['proj_cloud']);
    expect(pc.engine.getSnapshot().migration.local.created).toEqual(['proj_lokal']);
    expect(storage.getItem(STORAGE_KEYS.legacyLibrary)).toBeNull();
    expect(Object.keys(server.tree[root][ns].library)).toHaveLength(1); // blob lama tetap utuh

    const hp = createDevice(server, { role: 'client', id: 'hp', name: 'Klien' });
    await tick(3000);
    expect(hp.library()).toHaveLength(2);
    hp.engine.openProject('proj_cloud');
    await tick();
    expect(hp.ui.state.project.name).toBe('Dari Cloud Lama');
    expect(hp.ui.state.categories[0].items[0].volume).toBe(4);
  });

  it('salinan kerja lama yang identik dengan cloud langsung tersambung; yang berbeda dijadikan draf terpisah', async () => {
    const server = new MemoryServer();
    const author = createDevice(server);
    await tick();
    author.rename('Proyek Bersama');
    author.setVolume(0, 0, 6);
    await tick();
    const docId = author.ui.docId;
    await author.engine.promoteDraft(docId);
    await tick();
    const cloudState = JSON.parse(JSON.stringify(author.ui.state));

    // Perangkat A: salinan lokal sama persis → tersambung tanpa membuat apa pun.
    const same = createDevice(server, { id: 'a', name: 'Master A', state: normalizeState(cloudState), docId });
    await tick(3000);
    expect(same.ui.docId).toBe(docId);
    expect(same.ui.docEvents).toEqual([]);

    // Perangkat B: punya perubahan yang belum pernah disimpan → tidak menimpa proyek bersama.
    const edited = normalizeState(cloudState);
    edited.categories[0].items[0].volume = 600;
    const diverged = createDevice(server, { id: 'b', name: 'Master B', state: edited, docId });
    await tick(3000);
    expect(diverged.ui.docEvents).toContain('diverged');
    expect(diverged.ui.docId).not.toBe(docId);
    expect(diverged.ui.docId).toMatch(/^proj_/);
    expect(diverged.ui.state.categories[0].items[0].volume).toBe(600);
    expect(workspaceTree(server).docs[docId].boq.cats.persiapan.items['persiapan-0'].volume).toBe(6);
    const draft = author.library().find((entry) => entry.id === diverged.ui.docId);
    expect(draft).toMatchObject({ status: 'draft', name: 'Proyek Bersama' });
  });

  it('reset area kerja langsung tersimpan kosong (tidak meninggalkan isi proyek lama di perangkat)', async () => {
    const server = new MemoryServer();
    const storage = createMemoryStorage();
    const pc = createDevice(server, { storage });
    await tick();
    pc.rename('Proyek Lama');
    pc.setVolume(0, 0, 5);
    await tick();
    const docId = pc.ui.docId;

    pc.engine.closeDoc({ reset: true });
    // Tab ditutup tepat setelah reset, sebelum UI sempat render ulang:
    const persisted = normalizeState(JSON.parse(storage.getItem(STORAGE_KEYS.boqState)));
    expect(persisted.project.name).toBe('');
    expect(calcTotals(persisted).filledItemsCount).toBe(0);
    expect(storage.getItem(STORAGE_KEYS.activeDocId)).toBeNull();

    // Sesi berikutnya tidak membuat draf duplikat dari proyek lama.
    const next = createDevice(server, { storage, state: persisted, id: 'pc' });
    await tick(3000);
    expect(next.ui.docId).toBeNull();
    expect(next.library().map((entry) => entry.id)).toEqual([docId]);
  });

  it('verifikasi yang belum selesai diulang pada sesi berikutnya (tidak langsung menimpa salinan lokal)', async () => {
    const server = new MemoryServer();
    const author = createDevice(server);
    await tick();
    author.rename('Proyek Verifikasi');
    author.setVolume(0, 0, 6);
    await tick();
    const docId = author.ui.docId;
    await author.engine.promoteDraft(docId);
    await tick();

    // Perangkat lama: salinan kerja berbeda, dibuka pertama kali dalam keadaan OFFLINE.
    const edited = normalizeState(JSON.parse(JSON.stringify(author.ui.state)));
    edited.categories[0].items[0].volume = 600;
    const storage = createMemoryStorage();
    const offline = new MemoryServer(); // server tanpa data & tak pernah tersambung = offline
    const first = createDevice(offline, { storage, state: edited, docId, id: 'lama', name: 'Master Lama' });
    first.driver?.setOnline(false);
    await tick(600);
    first.engine.commit(); // sesi offline menyimpan catatan dengan titik sinkron "belum diketahui"
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.syncBase))).toMatchObject({ docId, boq: null });

    // Sesi kedua (online): harus tetap diverifikasi → perubahan lokal dijadikan draf, bukan dibuang.
    const second = createDevice(server, { storage, state: edited, docId, id: 'lama', name: 'Master Lama' });
    await tick(3000);
    expect(second.ui.docEvents).toContain('diverged');
    expect(second.ui.state.categories[0].items[0].volume).toBe(600);
    expect(workspaceTree(server).docs[docId].boq.cats.persiapan.items['persiapan-0'].volume).toBe(6);
  });

  it('backup & impor: ekspor memuat snapshot + revisi; impor memulihkan proyek', async () => {
    const server = new MemoryServer();
    const pc = createDevice(server);
    await tick();
    pc.rename('Untuk Backup');
    pc.setVolume(0, 0, 2);
    await tick();
    await pc.engine.promoteDraft(pc.ui.docId);
    await tick();
    const backup = await pc.engine.exportBackup();
    expect(backup).toHaveLength(1);
    expect(backup[0].stateSnapshot.categories[0].items[0].volume).toBe(2);
    expect(backup[0].revisions).toHaveLength(1);

    const other = new MemoryServer();
    const fresh = createDevice(other, { id: 'baru' });
    await tick();
    const report = await fresh.engine.importBackup(JSON.parse(JSON.stringify(backup)));
    await tick();
    expect(report.created).toHaveLength(1);
    expect(fresh.library()).toMatchObject([{ name: 'Untuk Backup', status: 'saved' }]);
  });
});
