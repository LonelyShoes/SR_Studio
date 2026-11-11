import { describe, it, expect } from 'vitest';
import { applyPatch, diffTree, mergeRemote, pickKeys, sanitizeTree, treeEqual } from './tree.js';
import { decodeKey, encodeKey } from './keys.js';
import {
  canonicalDoc,
  calcToDoc,
  decodeRevision,
  docToCalc,
  docToSchedule,
  docToState,
  encodeRevision,
  scheduleToDoc,
  stateToDoc,
} from './codec.js';
import { pbkdf2Hex, pbkdf2Sync, randomDigits, safeEqual, sha256Hex, sha256Sync, toHex } from './crypto.js';
import { MASTER_CODE_HASH, MASTER_CODE_ITERATIONS, MASTER_CODE_SALT } from './config.js';
import { blankState, calcTotals, ensureOrder, isMeaningfulState, normalizeState } from '../../utils/normalize.js';

describe('tree: sanitize / diff / patch / merge', () => {
  it('membuang nilai yang tidak bisa disimpan RTDB', () => {
    expect(sanitizeTree({ a: undefined, b: null, c: {}, d: NaN, e: Infinity, f: '', g: 0, h: false })).toEqual({
      d: 0,
      e: 0,
      f: '',
      g: 0,
      h: false,
    });
    expect(sanitizeTree({ a: { b: {} } })).toBeUndefined();
    expect(sanitizeTree(['x', null, 'z'])).toEqual({ 0: 'x', 2: 'z' });
  });

  it('diff menghasilkan path minimal tanpa leluhur ganda', () => {
    const base = { a: { x: 1, y: 2 }, b: 'tetap', c: { dalam: true } };
    const next = { a: { x: 1, y: 3, z: { baru: 1 } }, b: 'tetap', d: 5 };
    const patch = diffTree(base, next);
    expect(patch).toEqual({ 'a/y': 3, 'a/z': { baru: 1 }, c: null, d: 5 });
    const paths = Object.keys(patch);
    for (const p of paths) for (const q of paths) expect(p !== q && q.startsWith(`${p}/`)).toBe(false);
    expect(diffTree(base, base)).toEqual({});
  });

  it('applyPatch(base, diff(base,next)) selalu sama dengan next dan tidak memutasi input', () => {
    const base = { a: { x: 1, y: { k: 2 } }, b: 1 };
    const frozen = JSON.stringify(base);
    const next = { a: { y: { k: 9, n: 'x' } }, c: { d: { e: true } } };
    expect(applyPatch(base, diffTree(base, next))).toEqual(next);
    expect(JSON.stringify(base)).toBe(frozen);
    expect(applyPatch(undefined, diffTree(undefined, next))).toEqual(next);
    expect(applyPatch(base, diffTree(base, undefined))).toBeUndefined();
  });

  it('menghapus leaf terakhir ikut memangkas induk kosong', () => {
    expect(applyPatch({ a: { b: { c: 1 } }, z: 1 }, { 'a/b/c': null })).toEqual({ z: 1 });
    expect(applyPatch({ z: 1 }, { 'tidak/ada': null })).toEqual({ z: 1 });
  });

  it('3-way merge: edit lokal & edit server pada field berbeda sama-sama selamat', () => {
    const base = { item1: { volume: 1, harga: 10 }, item2: { volume: 2 } };
    const local = { item1: { volume: 5, harga: 10 }, item2: { volume: 2 } };
    const remote = { item1: { volume: 1, harga: 99 }, item2: { volume: 7 }, item3: { volume: 3 } };
    expect(mergeRemote(base, local, remote)).toEqual({
      item1: { volume: 5, harga: 99 },
      item2: { volume: 7 },
      item3: { volume: 3 },
    });
  });

  it('3-way merge: tanpa perubahan lokal hasilnya persis data server', () => {
    const base = { a: 1 };
    const remote = { a: 2, b: { c: 3 } };
    expect(mergeRemote(base, base, remote)).toBe(remote);
  });

  it('treeEqual & pickKeys', () => {
    expect(treeEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(treeEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(treeEqual(undefined, null)).toBe(true);
    expect(pickKeys({ a: 1, b: 2 }, { b: 9, c: 9 })).toEqual({ b: 2 });
    expect(pickKeys({ a: 1 }, undefined)).toBeUndefined();
  });
});

describe('keys: encoding aman untuk RTDB', () => {
  it('bolak-balik untuk karakter terlarang, angka murni, dan string kosong', () => {
    const samples = ['persiapan-0', 'a.b$c#d[e]f/g', '100%', '', '0', '12345', 'cust-1790000000000-ab1c', 'x\u0001y'];
    for (const sample of samples) {
      const encoded = encodeKey(sample);
      expect(encoded).not.toMatch(/[.$#[\]/]/);
      expect(encoded).not.toMatch(/^\d+$/);
      expect(encoded.length).toBeGreaterThan(0);
      expect(decodeKey(encoded)).toBe(sample);
    }
  });
});

describe('codec: state ⇄ dokumen cloud', () => {
  const sample = () => {
    const state = blankState('2026-01-02');
    state.project = { ...state.project, name: 'Rumah A', client: 'Pak B', location: 'Semarang', clusterUnits: 3, buildingAreaPerUnit: 45 };
    state.ppn = true;
    state.categories[0].items[0].volume = 2.5;
    state.categories[0].expanded = true;
    state.categories[1].items[1].harga = 123456;
    state.categories[1].items.push({
      code: 'CUST', uraian: 'Item khusus a.b/c', satuan: 'm3', hargaDefault: 5000, harga: 5000,
      source: 'Custom Manual', volume: 4, custom: true, key: 'cust-1-abcd',
    });
    state.pendingQueue = [
      { id: 'queue_1_a', category: 'struktur', label: 'Semen', uraian: 'Semen', satuan: 'zak', jumlah: 10, volume: 10, harga: 65000, source: 'Kalkulator' },
    ];
    return ensureOrder(state);
  };

  it('bolak-balik tanpa kehilangan data (kecuali preferensi tampilan)', () => {
    const state = sample();
    const doc = sanitizeTree(stateToDoc(state));
    const restored = docToState(doc, state);
    expect(calcTotals(restored)).toEqual(calcTotals(state));
    expect(restored.project).toEqual(state.project);
    expect(restored.ppn).toBe(true);
    expect(restored.categories.map((c) => c.id)).toEqual(state.categories.map((c) => c.id));
    expect(restored.categories[0].expanded).toBe(true);
    expect(restored.categories[1].items.at(-1).uraian).toBe('Item khusus a.b/c');
    expect(restored.pendingQueue).toHaveLength(1);
    expect(sanitizeTree(stateToDoc(restored))).toEqual(doc);
  });

  it('dokumen tidak memuat array, undefined, atau preferensi perangkat', () => {
    const doc = sanitizeTree(stateToDoc(sample()));
    const json = JSON.stringify(doc);
    expect(json).not.toContain('[');
    expect(json).not.toContain('expanded');
    expect(json).not.toContain('libraryId');
    expect(doc.project.buildingAreaPerUnit).toBe(45);
  });

  it('mengubah satu volume hanya menghasilkan satu path patch', () => {
    const before = sample();
    const after = { ...before, categories: before.categories.map((c, i) => (i !== 2 ? c : { ...c, items: c.items.map((it, j) => (j === 0 ? { ...it, volume: 7 } : it)) })) };
    const patch = diffTree(sanitizeTree(stateToDoc(before)), sanitizeTree(stateToDoc(after)));
    expect(Object.keys(patch)).toEqual([`cats/${encodeKey(before.categories[2].id)}/items/${encodeKey(before.categories[2].items[0].key)}/volume`]);
  });

  it('record tanpa order (sisa edit vs hapus) diabaikan', () => {
    const doc = sanitizeTree(stateToDoc(sample()));
    doc.cats.persiapan.items.zombie = { volume: 5 };
    doc.cats.hantu = { name: 'tanpa order' };
    const state = docToState(doc);
    expect(state.categories.some((c) => c.id === 'hantu')).toBe(false);
    expect(state.categories[0].items.some((it) => it.key === 'zombie')).toBe(false);
  });

  it('dokumen tanpa kategori tetap kosong (tidak diisi ulang dari database)', () => {
    expect(docToState({ v: 1, project: { name: 'Kosong' } }).categories).toEqual([]);
    expect(canonicalDoc({ project: { name: 'Kosong' }, categories: [] }).cats).toBeUndefined();
  });

  it('normalizeState mempertahankan luas bangunan & membuat key unik', () => {
    const state = normalizeState({
      project: { name: 'X', buildingAreaPerUnit: '54' },
      categories: [{ id: 'a', name: 'A', items: [{ key: 'k', uraian: 'satu' }, { key: 'k', uraian: 'dua' }] }, { id: 'a', name: 'A2', items: [] }],
    });
    expect(state.project.buildingAreaPerUnit).toBe(54);
    expect(state.categories.map((c) => c.id)).toEqual(['a', 'a__2']);
    expect(state.categories[0].items.map((it) => it.key)).toEqual(['k', 'k__2']);
    expect(state.categories[0].items.map((it) => it.order)).toEqual([0, 1]);
  });

  it('ensureOrder stabil: tidak menomori ulang elemen lama saat menambah/menghapus', () => {
    const state = sample();
    const cat = state.categories[0];
    const removed = { ...state, categories: [{ ...cat, items: cat.items.filter((_, i) => i !== 1) }, ...state.categories.slice(1)] };
    expect(ensureOrder(removed)).toBe(removed);
    const added = { ...state, categories: [{ ...cat, items: [...cat.items, { key: 'baru', uraian: 'baru' }] }, ...state.categories.slice(1)] };
    const ordered = ensureOrder(added);
    expect(ordered.categories[0].items.at(-1).order).toBe(cat.items.at(-1).order + 1);
    expect(ordered.categories[0].items[0]).toBe(cat.items[0]);
  });

  it('isMeaningfulState membedakan state kosong dan terisi', () => {
    expect(isMeaningfulState(blankState())).toBe(false);
    expect(isMeaningfulState(sample())).toBe(true);
  });

  it('jadwal & kalkulator bolak-balik', () => {
    const schedule = { durationWeeks: 16, startDate: '2026-03-01', categorySchedules: { persiapan: { startWeek: 1, endWeek: 3 } }, actualProgress: { 1: 5, 2: 12.5 } };
    const doc = scheduleToDoc(schedule);
    expect(Object.keys(doc.actual)).toEqual(['w1', 'w2']);
    expect(docToSchedule(doc)).toEqual(schedule);
    expect(docToSchedule(undefined)).toBeNull();

    const calc = { sr_calc_wall_luas: '"12.5"', 'sr_calc_x.y': '[1,2]' };
    expect(docToCalc(calcToDoc(calc))).toEqual(calc);
    expect(calcToDoc({})).toBeUndefined();
  });

  it('revisi bolak-balik lewat string JSON', () => {
    const state = sample();
    const totals = calcTotals(state);
    const encoded = encodeRevision({ timestamp: '2026-05-05T10:00:00.000Z', note: 'Cek', ...totals, stateSnapshot: state, auto: true, by: 'Master' });
    expect(typeof encoded.data).toBe('string');
    expect(encoded.index.note).toBe('Cek');
    expect(decodeRevision('rev_1', encoded.index).stateSnapshot).toBeNull();
    const decoded = decodeRevision('rev_1', encoded.index, encoded.data);
    expect(decoded.timestamp).toBe('2026-05-05T10:00:00.000Z');
    expect(decoded.auto).toBe(true);
    expect(calcTotals(decoded.stateSnapshot)).toEqual(totals);
  });
});

describe('crypto', () => {
  it('SHA-256 JS murni cocok dengan vektor uji & WebCrypto', async () => {
    expect(toHex(sha256Sync('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(sha256Sync(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    const long = 'a'.repeat(1000);
    expect(toHex(sha256Sync(long))).toBe(await sha256Hex(long));
  });

  it('PBKDF2 JS murni cocok dengan WebCrypto', async () => {
    expect(toHex(pbkdf2Sync('password', 'salt', 1))).toBe('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
    expect(toHex(pbkdf2Sync('rahasia', 'garam', 1500))).toBe(await pbkdf2Hex('rahasia', 'garam', 1500));
  });

  it('hash Master Code bawaan valid untuk 64 hex & menolak kode salah', async () => {
    expect(MASTER_CODE_HASH).toMatch(/^[0-9a-f]{64}$/);
    const wrong = await pbkdf2Hex('00000000', MASTER_CODE_SALT, MASTER_CODE_ITERATIONS);
    expect(safeEqual(wrong, MASTER_CODE_HASH)).toBe(false);
  });

  it('randomDigits menghasilkan digit sepanjang permintaan', () => {
    expect(randomDigits(6)).toMatch(/^\d{6}$/);
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});
