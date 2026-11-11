import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryServer } from './drivers/memoryDriver.js';
import { Outbox, createMemoryStorage, replayOutbox } from './outbox.js';
import { SyncChannel, UNKNOWN_BASE } from './syncChannel.js';
import { applyPatch } from './tree.js';

const PATH = 'ws/docs/p1/boq';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

/** Satu "perangkat": driver + kanal + pohon lokal yang berperan sebagai state aplikasi. */
function createDevice(server, { canWrite = true, storage, ...channelOptions } = {}) {
  const driver = server.connect();
  const outbox = new Outbox({ storage, prefix: 'outbox' });
  const device = { driver, outbox, state: undefined, events: [], errors: [] };
  device.channel = new SyncChannel({
    driver,
    path: PATH,
    outbox,
    onRemote: (event) => {
      device.events.push(event.kind);
      if (event.kind !== 'deleted') device.state = event.local;
    },
    onError: (error) => device.errors.push(error),
    ...channelOptions,
  });
  /** Meniru edit pengguna: ubah state lalu beri tahu kanal. */
  device.edit = (patch) => {
    device.state = applyPatch(device.state, patch);
    device.channel.setLocal(device.state);
  };
  device.start = (options = {}) => device.channel.start({ canWrite, ...options });
  return device;
}

describe('SyncChannel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('snapshot pertama diadopsi, lalu edit lokal dikirim sebagai patch kecil', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 }, b: { volume: 2 } } } } } });
    const device = createDevice(server);
    device.start();
    await settle();
    expect(device.state).toEqual({ a: { volume: 1 }, b: { volume: 2 } });
    expect(device.channel.pending).toBe(false);

    device.edit({ 'a/volume': 5 });
    expect(device.channel.pending).toBe(true);
    vi.advanceTimersByTime(400);
    await settle();
    expect(device.driver.writes).toEqual([{ [`${PATH}/a/volume`]: 5 }]);
    expect(server.tree.ws.docs.p1.boq.a.volume).toBe(5);
    expect(device.channel.pending).toBe(false);
    expect(device.outbox.size).toBe(0);
  });

  it('dua perangkat mengedit field berbeda bersamaan: tidak ada yang tertimpa', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1, harga: 10 }, b: { volume: 2 } } } } } });
    const pc = createDevice(server);
    const hp = createDevice(server);
    pc.start();
    hp.start();
    await settle();

    pc.edit({ 'a/volume': 9 });
    hp.edit({ 'b/volume': 7 });
    hp.edit({ 'a/harga': 15 });
    vi.advanceTimersByTime(400);
    await settle();

    const expected = { a: { volume: 9, harga: 15 }, b: { volume: 7 } };
    expect(server.tree.ws.docs.p1.boq).toEqual(expected);
    expect(pc.state).toEqual(expected);
    expect(hp.state).toEqual(expected);
  });

  it('ketikan yang belum terkirim tidak hilang saat data server masuk', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 }, b: { volume: 2 } } } } } });
    const pc = createDevice(server);
    const hp = createDevice(server);
    pc.start();
    hp.start();
    await settle();

    pc.edit({ 'a/volume': 12 }); // masih dalam jendela debounce
    hp.edit({ 'b/volume': 8 });
    hp.channel.flush();
    await settle();

    expect(pc.state).toEqual({ a: { volume: 12 }, b: { volume: 8 } });
    vi.advanceTimersByTime(400);
    await settle();
    expect(server.tree.ws.docs.p1.boq).toEqual({ a: { volume: 12 }, b: { volume: 8 } });
    expect(pc.driver.writes).toEqual([{ [`${PATH}/a/volume`]: 12 }]);
  });

  it('edit offline dikirim saat tersambung lagi dan digabung dengan perubahan orang lain', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 }, b: { volume: 2 } } } } } });
    const lapangan = createDevice(server);
    const kantor = createDevice(server);
    lapangan.start();
    kantor.start();
    await settle();

    lapangan.driver.setOnline(false);
    lapangan.edit({ 'a/volume': 30 });
    lapangan.edit({ 'c/volume': 4 });
    vi.advanceTimersByTime(400);
    await settle();
    expect(lapangan.outbox.size).toBe(1);
    expect(lapangan.channel.pending).toBe(true);

    kantor.edit({ 'b/volume': 20 });
    vi.advanceTimersByTime(400);
    await settle();
    expect(lapangan.state).toEqual({ a: { volume: 30 }, b: { volume: 2 }, c: { volume: 4 } });

    lapangan.driver.setOnline(true);
    await settle();
    const expected = { a: { volume: 30 }, b: { volume: 20 }, c: { volume: 4 } };
    expect(server.tree.ws.docs.p1.boq).toEqual(expected);
    expect(lapangan.state).toEqual(expected);
    expect(kantor.state).toEqual(expected);
    expect(lapangan.outbox.size).toBe(0);
    expect(lapangan.channel.pending).toBe(false);
  });

  it('patch yang tertinggal di outbox dikirim ulang pada sesi berikutnya', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 } } } } } });
    const storage = createMemoryStorage();

    const first = createDevice(server, { storage });
    first.start();
    await settle();
    first.driver.setOnline(false);
    first.edit({ 'a/volume': 77 });
    first.channel.flush();
    expect(storage.length).toBe(1);
    // Tab ditutup saat offline: antrian SDK di memori hilang, outbox di storage tetap ada.

    const second = createDevice(server, { storage });
    expect(second.outbox.list()).toHaveLength(1);
    const result = await replayOutbox(second.driver, second.outbox);
    expect(result).toMatchObject({ sent: 1, failed: 0 });
    expect(server.tree.ws.docs.p1.boq.a.volume).toBe(77);
    expect(storage.length).toBe(0);
  });

  it('base tersimpan + edit sesi lalu yang belum terkirim tetap digabung benar', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 }, b: { volume: 2 }, c: { volume: 3 } } } } } });
    // Sejak sinkron terakhir: orang lain mengubah b, perangkat ini mengubah a & menghapus c.
    server.apply({ [`${PATH}/b/volume`]: 22 });
    const device = createDevice(server);
    device.state = { a: { volume: 11 }, b: { volume: 2 } };
    device.start({
      base: { a: { volume: 1 }, b: { volume: 2 }, c: { volume: 3 } },
      local: device.state,
    });
    await settle();
    expect(device.state).toEqual({ a: { volume: 11 }, b: { volume: 22 } });
    vi.advanceTimersByTime(400);
    await settle();
    expect(server.tree.ws.docs.p1.boq).toEqual({ a: { volume: 11 }, b: { volume: 22 } });
  });

  it('mode baca: tidak pernah menulis sampai izin diberikan', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 } } } } } });
    const klien = createDevice(server, { canWrite: false });
    klien.start();
    await settle();
    klien.edit({ 'a/volume': 3 });
    vi.advanceTimersByTime(5000);
    await settle();
    expect(klien.driver.writes).toEqual([]);
    expect(klien.channel.pending).toBe(false);
    expect(klien.channel.dirty).toBe(true);

    klien.channel.setCanWrite(true);
    vi.advanceTimersByTime(400);
    await settle();
    expect(server.tree.ws.docs.p1.boq.a.volume).toBe(3);
  });

  it('resolveInitial: gabungan saat base belum diketahui (server menang pada kunci yang sama)', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { sama: 'server', hanyaServer: 's' } } } } });
    const device = createDevice(server, {
      resolveInitial: (remote, local) => {
        const base = {};
        for (const key of Object.keys(local || {})) if (remote && key in remote) base[key] = local[key];
        return { base, local: applyPatch(remote, Object.fromEntries(Object.entries(local || {}).filter(([k]) => !(remote && k in remote)))) };
      },
    });
    device.state = { sama: 'lokal', hanyaLokal: 'l' };
    device.start({ base: UNKNOWN_BASE, local: device.state });
    await settle();
    expect(device.state).toEqual({ sama: 'server', hanyaServer: 's', hanyaLokal: 'l' });
    vi.advanceTimersByTime(400);
    await settle();
    expect(server.tree.ws.docs.p1.boq).toEqual({ sama: 'server', hanyaServer: 's', hanyaLokal: 'l' });
  });

  it('dokumen dihapus pengguna lain → event deleted, tidak ada tulisan lanjutan', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 } } } } } });
    const device = createDevice(server, { missingMeansDeleted: true });
    device.start();
    await settle();
    server.apply({ 'ws/docs/p1': null });
    expect(device.events.at(-1)).toBe('deleted');
    device.edit({ 'a/volume': 9 });
    vi.advanceTimersByTime(2000);
    await settle();
    expect(device.driver.writes).toEqual([]);
    expect(server.tree).toBeUndefined();
  });

  it('decorate menyertakan metadata dalam update atomik & onBeforeWrite menerima base pra-edit', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 } } } } } });
    const before = [];
    const device = createDevice(server, {
      decorate: () => ({ 'ws/projects/p1/updatedAt': { '.sv': 'timestamp' } }),
      onBeforeWrite: (info) => before.push(info),
    });
    device.start();
    await settle();
    device.edit({ 'a/volume': 2 });
    device.channel.flush();
    device.edit({ 'a/volume': 3 });
    device.channel.flush();
    await settle();
    expect(typeof server.tree.ws.projects.p1.updatedAt).toBe('number');
    expect(before.map((info) => info.first)).toEqual([true, false]);
    expect(before[0].base).toEqual({ a: { volume: 1 } });
  });

  it('tulisan yang ditolak server dikembalikan ke keadaan server', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 1 } } } } } });
    const device = createDevice(server);
    device.start();
    await settle();
    server.denyPrefix = 'ws/docs';
    device.edit({ 'a/volume': 99 });
    device.channel.flush();
    await settle();
    expect(device.errors).toHaveLength(1);
    expect(device.outbox.size).toBe(0);
    expect(server.tree.ws.docs.p1.boq.a.volume).toBe(1);
  });

  it('maxWait memaksa pengiriman walau pengguna terus mengetik', async () => {
    const server = new MemoryServer({ ws: { docs: { p1: { boq: { a: { volume: 0 } } } } } });
    const device = createDevice(server);
    device.start();
    await settle();
    for (let i = 1; i <= 10; i++) {
      device.edit({ 'a/volume': i });
      vi.advanceTimersByTime(200);
    }
    await settle();
    expect(device.driver.writes.length).toBeGreaterThanOrEqual(1);
    expect(server.tree.ws.docs.p1.boq.a.volume).toBeGreaterThan(0);
  });
});
