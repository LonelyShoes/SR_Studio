import { describe, expect, it, vi } from 'vitest';
import { MemoryServer } from './drivers/memoryDriver.js';
import { Outbox } from './outbox.js';
import { OTP_ATTEMPT_LIMIT, WorkspaceClient } from './workspace.js';
import { importLegacyProjects, migrateLegacyCloud, migrateLocalLibrary, readCloudIndex } from './migration.js';
import { LEGACY_LIBRARY_PATH, STORAGE_KEYS, WORKSPACE_ROOT } from './config.js';
import { blankState, calcTotals, ensureOrder } from '../../utils/normalize.js';

const settle = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

function connect(server, { role = 'master', name = 'Master', id = 'dev-1' } = {}) {
  const driver = server.connect();
  const workspace = new WorkspaceClient({
    driver,
    outbox: new Outbox({ prefix: 'outbox' }),
    getIdentity: () => ({ id, sessionId: `${id}-s1`, name, role }),
    readTimeoutMs: 200,
  });
  return { driver, workspace };
}

function sampleState(name, volume = 2) {
  const state = blankState('2026-02-02');
  state.project.name = name;
  state.project.client = 'Klien';
  state.categories[0].items[0].volume = volume;
  return ensureOrder(state);
}

function legacyProject(id, name, updatedAt, { volume = 2, revisions = 0 } = {}) {
  const stateSnapshot = sampleState(name, volume);
  return {
    id,
    name,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt,
    stateSnapshot: JSON.parse(JSON.stringify(stateSnapshot)),
    ...calcTotals(stateSnapshot),
    revisions: Array.from({ length: revisions }, (_, i) => ({
      id: `rev_${id}_${i}`,
      timestamp: `2026-08-0${i + 1}T00:00:00.000Z`,
      note: `Rev ${i}`,
      grandTotal: 1,
      stateSnapshot: JSON.parse(JSON.stringify(sampleState(name, i + 1))),
    })),
  };
}

const memoryStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
  };
};

describe('WorkspaceClient: proyek, sampah, revisi', () => {
  it('membuat proyek secara atomik dan menyiarkannya ke perangkat lain', async () => {
    const server = new MemoryServer();
    const pc = connect(server);
    const hp = connect(server, { role: 'client', name: 'Klien', id: 'dev-2' });
    let seen = [];
    hp.workspace.watchProjects((entries) => { seen = entries; });

    const state = sampleState('Rumah Tinggal', 3);
    const created = pc.workspace.createProject({ state });
    await created.done;
    await settle();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ id: created.id, name: 'Rumah Tinggal', status: 'saved', filledItemsCount: 1 });
    expect(seen[0].grandTotal).toBe(calcTotals(state).grandTotal);
    const snapshot = await hp.workspace.readProjectSnapshot(created.id);
    expect(calcTotals(snapshot.stateSnapshot)).toEqual(calcTotals(state));
  });

  it('hapus → sampah → pulihkan mempertahankan isi; purge membuangnya', async () => {
    const server = new MemoryServer();
    const { workspace } = connect(server);
    let projects = [];
    let trash = [];
    workspace.watchProjects((entries) => { projects = entries; });
    workspace.watchTrash((list) => { trash = list; });

    const state = sampleState('Ruko', 5);
    const { id, done } = workspace.createProject({ state });
    await done;
    await workspace.deleteProject(id);
    await settle();
    expect(projects).toHaveLength(0);
    expect(trash).toMatchObject([{ id, name: 'Ruko' }]);
    expect((await readCloudIndex(workspace)).deleted.has(id)).toBe(true);

    await workspace.restoreFromTrash(id);
    await settle();
    expect(projects).toHaveLength(1);
    expect(trash).toHaveLength(0);
    expect(calcTotals((await workspace.readProjectSnapshot(id)).stateSnapshot)).toEqual(calcTotals(state));
    expect((await readCloudIndex(workspace)).deleted.has(id)).toBe(false);

    await workspace.deleteProject(id);
    await workspace.purgeTrash(id);
    await settle();
    expect(trash).toHaveLength(0);
    await expect(workspace.restoreFromTrash(id)).rejects.toThrow();
  });

  it('revisi dirotasi dengan kuota manual & otomatis terpisah', async () => {
    const server = new MemoryServer();
    const { workspace } = connect(server);
    const state = sampleState('Gudang');
    const { id, done } = workspace.createProject({ state });
    await done;

    for (let i = 0; i < 7; i++) {
      await workspace.addRevision(id, { timestamp: 1000 + i, note: `manual ${i}`, ...calcTotals(state), stateSnapshot: state });
    }
    for (let i = 0; i < 6; i++) {
      await workspace.addRevision(id, { timestamp: 2000 + i, note: `auto ${i}`, ...calcTotals(state), stateSnapshot: state }, { auto: true });
    }
    const revisions = await workspace.loadRevisions(id);
    expect(revisions.filter((r) => !r.auto).map((r) => r.note)).toEqual(['manual 6', 'manual 5', 'manual 4', 'manual 3', 'manual 2']);
    expect(revisions.filter((r) => r.auto)).toHaveLength(5);
    expect(revisions[0].stateSnapshot.project.name).toBe('Gudang');
    expect(server.tree.sr_studio_v3[Object.keys(server.tree.sr_studio_v3)[0]].projects[id].revisionCount).toBe(10);

    await workspace.deleteRevision(id, revisions[0].id);
    expect(await workspace.loadRevisions(id)).toHaveLength(9);
  });

  it('duplikasi menghasilkan proyek baru yang independen', async () => {
    const server = new MemoryServer();
    const { workspace } = connect(server);
    const { id, done } = workspace.createProject({ state: sampleState('Asli', 4), schedule: { durationWeeks: 10, startDate: '2026-01-01', categorySchedules: {}, actualProgress: { 1: 10 } } });
    await done;
    const copy = await workspace.duplicateProject(id, { name: 'Asli (Salinan)' });
    await copy.done;
    expect(copy.id).not.toBe(id);
    const snapshot = await workspace.readProjectSnapshot(copy.id);
    expect(snapshot.stateSnapshot.project.name).toBe('Asli (Salinan)');
    expect(snapshot.scheduleSnapshot.actualProgress).toEqual({ 1: 10 });
  });

  it('record proyek tak utuh tidak tampil dan dibersihkan Master', async () => {
    const server = new MemoryServer();
    const { workspace, driver } = connect(server);
    await driver.write({ [`${WORKSPACE_ROOT}/projects/hantu/updatedAt`]: 123 });
    let projects = null;
    workspace.watchProjects((entries) => { projects = entries; });
    await settle();
    expect(projects).toEqual([]);
    expect(server.tree).toBeUndefined();
  });
});

describe('WorkspaceClient: presence & aktivitas', () => {
  it('presence muncul saat online dan hilang saat koneksi putus', async () => {
    const server = new MemoryServer();
    const pc = connect(server);
    const hp = connect(server, { role: 'client', name: 'Budi', id: 'dev-2' });
    let sessions = [];
    pc.workspace.watchPresence((list) => { sessions = list; });
    pc.workspace.startPresence();
    hp.workspace.startPresence();
    await settle();
    expect(sessions.map((s) => s.name).sort()).toEqual(['Budi', 'Master']);

    hp.driver.setOnline(false);
    await settle();
    expect(sessions.map((s) => s.name)).toEqual(['Master']);
  });

  it('edit beruntun digabung menjadi satu entri aktivitas', async () => {
    const server = new MemoryServer();
    const { workspace } = connect(server);
    let feed = [];
    workspace.watchActivity((list) => { feed = list; });
    vi.useFakeTimers();
    try {
      workspace.noteEdit('p1', 'Rumah', 'boq', 1);
      workspace.noteEdit('p1', 'Rumah', 'boq', 2);
      workspace.noteEdit('p1', 'Rumah', 'boq', 4);
      workspace.noteEdit('p1', 'Rumah', 'schedule', 1);
      workspace.logActivity({ type: 'project.create', projectId: 'p1', projectName: 'Rumah' });
      await vi.advanceTimersByTimeAsync(10);
      expect(feed).toHaveLength(3);
      expect(feed.find((entry) => entry.type === 'edit.boq').count).toBe(1); // pembaruan jumlah ditahan dulu

      const writesBefore = workspace.driver.writes.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(workspace.driver.writes.length).toBe(writesBefore + 1); // dua edit susulan → satu tulisan
      expect(feed).toHaveLength(3);
      expect(feed.find((entry) => entry.type === 'edit.boq').count).toBe(7);
      expect(feed[0].by.name).toBe('Master');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('WorkspaceClient: OTP sekali pakai', () => {
  it('kode benar diterima satu kali, lalu hangus', async () => {
    const server = new MemoryServer();
    const master = connect(server);
    const klienA = connect(server, { role: 'client', name: 'A', id: 'a' });
    const klienB = connect(server, { role: 'client', name: 'B', id: 'b' });
    const { code, hash } = await master.workspace.issueOtp();
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(server.tree)).not.toContain(`"${code}"`);
    expect(JSON.stringify(server.tree)).toContain(hash);

    const first = await klienA.workspace.redeemOtp(code, 'membuka BoQ');
    const second = await klienB.workspace.redeemOtp(code, 'membuka BoQ');
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.message).toMatch(/hangus/);
  });

  it('kode salah ditolak dan percobaan berulang mengunci kode', async () => {
    const server = new MemoryServer();
    const master = connect(server);
    const klien = connect(server, { role: 'client', name: 'A', id: 'a' });
    const { code } = await master.workspace.issueOtp();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < OTP_ATTEMPT_LIMIT; i++) {
      expect((await klien.workspace.redeemOtp(wrong)).success).toBe(false);
    }
    const locked = await klien.workspace.redeemOtp(code);
    expect(locked.success).toBe(false);
    expect(locked.message).toMatch(/diblokir/);
    expect((await klien.workspace.redeemOtp('12ab')).message).toMatch(/6 digit/);
  });

  it('kode kedaluwarsa & tanpa koneksi ditolak dengan pesan jelas', async () => {
    const server = new MemoryServer();
    const master = connect(server);
    const klien = connect(server, { role: 'client', name: 'A', id: 'a' });
    const { code } = await master.workspace.issueOtp();
    server.clock += 31 * 60 * 1000;
    expect((await klien.workspace.redeemOtp(code)).message).toMatch(/kedaluwarsa/);

    const fresh = await master.workspace.issueOtp();
    klien.driver.setOnline(false);
    expect((await klien.workspace.redeemOtp(fresh.code)).message).toMatch(/koneksi/);
  });
});

describe('migrasi data versi lama', () => {
  const legacyBlob = () => ({
    updatedAt: '2026-10-30T08:13:01.533Z',
    library: [
      legacyProject('proj_a', 'Kontrakan A', '2026-10-24T15:33:45.095Z', { volume: 3, revisions: 7 }),
      legacyProject('proj_b', 'Kontrakan B', '2026-09-15T07:09:19.273Z', { volume: 5 }),
      legacyProject('proj_dihapus', 'Sudah Dihapus', '2026-09-01T00:00:00.000Z'),
    ],
    deletedIds: ['proj_dihapus', 'proj_lama'],
  });
  const seed = (blob) => {
    const [root, ns] = LEGACY_LIBRARY_PATH.split('/');
    return { [root]: { [ns]: blob } };
  };

  it('mengimpor semua proyek tanpa mengubah blob lama, dan idempoten', async () => {
    const blob = legacyBlob();
    const server = new MemoryServer(seed(blob));
    const frozenLegacy = JSON.stringify(server.tree.sr_studio_library);
    const { workspace } = connect(server);

    const first = await migrateLegacyCloud(workspace);
    expect(first.skipped).toBe(false);
    expect(first.report.created.sort()).toEqual(['proj_a', 'proj_b']);
    expect(first.report.skippedDeleted).toEqual(['proj_dihapus']);
    expect(JSON.stringify(server.tree.sr_studio_library)).toBe(frozenLegacy);

    let projects = [];
    workspace.watchProjects((entries) => { projects = entries; });
    await settle();
    expect(projects.map((p) => p.id)).toEqual(['proj_a', 'proj_b']);
    expect(projects[0].updatedAt).toBe('2026-10-24T15:33:45.095Z');
    expect(projects[0].createdAt).toBe('2026-08-01T00:00:00.000Z');
    expect(projects[0].revisionCount).toBe(5);
    for (const project of blob.library.slice(0, 2)) {
      const snapshot = await workspace.readProjectSnapshot(project.id);
      expect(calcTotals(snapshot.stateSnapshot)).toEqual(calcTotals(project.stateSnapshot));
    }
    const index = await readCloudIndex(workspace);
    expect([...index.deleted].sort()).toEqual(['proj_dihapus', 'proj_lama']);

    const second = await migrateLegacyCloud(workspace);
    expect(second).toMatchObject({ skipped: true, reason: 'up-to-date' });
  });

  it('klien lama menyimpan versi lebih baru → diimpor ulang, versi cloud dicadangkan', async () => {
    const blob = legacyBlob();
    const server = new MemoryServer(seed(blob));
    const { workspace, driver } = connect(server);
    await migrateLegacyCloud(workspace);

    // Perangkat dengan aplikasi versi lama menimpa blob: proj_b diperbarui + proyek baru.
    const newer = legacyBlob();
    newer.updatedAt = '2026-11-20T00:00:00.000Z';
    newer.library[1] = legacyProject('proj_b', 'Kontrakan B', '2026-11-19T00:00:00.000Z', { volume: 50 });
    newer.library.push(legacyProject('proj_c', 'Baru dari HP lama', '2026-11-19T10:00:00.000Z'));
    await driver.write({ [LEGACY_LIBRARY_PATH]: newer });

    const result = await migrateLegacyCloud(workspace);
    expect(result.report.created).toEqual(['proj_c']);
    expect(result.report.updated).toEqual(['proj_b']);
    expect(result.report.unchanged).toEqual(['proj_a']);
    const snapshot = await workspace.readProjectSnapshot('proj_b');
    expect(snapshot.stateSnapshot.categories[0].items[0].volume).toBe(50);
    const revisions = await workspace.loadRevisions('proj_b');
    expect(revisions.some((r) => r.auto && /sebelum impor/i.test(r.note))).toBe(true);
    expect(revisions.find((r) => r.auto).stateSnapshot.categories[0].items[0].volume).toBe(5);
  });

  it('versi cloud yang lebih baru tidak pernah ditimpa data lama', async () => {
    const server = new MemoryServer();
    server.clock = Date.parse('2026-12-01T00:00:00.000Z'); // waktu server saat proyek diedit realtime
    const { workspace } = connect(server);
    const { done } = workspace.createProject({ id: 'proj_a', state: sampleState('Versi Realtime', 99) });
    await done;
    const report = await importLegacyProjects(workspace, [legacyProject('proj_a', 'Versi Usang', '2026-01-01T00:00:00.000Z')], { source: 'uji' });
    expect(report.unchanged).toEqual(['proj_a']);
    expect((await workspace.readProjectSnapshot('proj_a')).stateSnapshot.project.name).toBe('Versi Realtime');
  });

  it('Library lokal perangkat direkonsiliasi sekali; proyek lokal yang belum terunggah ikut naik', async () => {
    const server = new MemoryServer();
    const { workspace } = connect(server);
    await workspace.driver.write({ [`${WORKSPACE_ROOT}/tombstones/proj_dihapus`]: true });
    const storage = memoryStorage({
      [STORAGE_KEYS.legacyLibrary]: JSON.stringify([
        legacyProject('proj_lokal', 'Hanya di HP', '2026-10-01T00:00:00.000Z'),
        legacyProject('proj_dihapus', 'Zombie', '2026-10-01T00:00:00.000Z'),
      ]),
    });

    const first = await migrateLocalLibrary(workspace, { storage });
    expect(first.report.created).toEqual(['proj_lokal']);
    expect(first.report.skippedDeleted).toEqual(['proj_dihapus']);
    expect(storage.has(STORAGE_KEYS.localMigration)).toBe(true);
    expect(storage.has(STORAGE_KEYS.legacyLibrary)).toBe(true);

    const second = await migrateLocalLibrary(workspace, { storage });
    expect(second).toMatchObject({ skipped: true });
  });

  it('dua perangkat memigrasi bersamaan → hanya satu yang bekerja', async () => {
    const server = new MemoryServer(seed(legacyBlob()));
    const a = connect(server, { id: 'a' });
    const b = connect(server, { id: 'b' });
    const [ra, rb] = await Promise.all([migrateLegacyCloud(a.workspace), migrateLegacyCloud(b.workspace)]);
    const worked = [ra, rb].filter((r) => !r.skipped);
    expect(worked).toHaveLength(1);
    const index = await readCloudIndex(a.workspace);
    expect(index.existing.size).toBe(2);
  });
});
