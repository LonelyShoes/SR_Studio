import { describe, expect, it } from 'vitest';
import * as actions from './boqActions';
import { blankState, calcTotals, ensureOrder } from '../utils/normalize';

const fresh = () => ensureOrder(blankState('2026-01-01'));
const firstCat = (state) => state.categories[0];

describe('boqActions: proyek & kategori', () => {
  it('mengubah field proyek & PPN tanpa memutasi state lama', () => {
    const state = fresh();
    const next = actions.togglePpn(actions.setProjectField(state, 'name', 'Rumah A'));
    expect(next.project.name).toBe('Rumah A');
    expect(next.ppn).toBe(true);
    expect(state.project.name).toBe('');
    expect(state.ppn).toBe(false);
    expect(next.categories).toBe(state.categories);
  });

  it('menambah, mengganti nama, dan menghapus kategori', () => {
    let state = actions.addCategory(fresh(), '  Pekerjaan Taman  ');
    const added = state.categories.at(-1);
    expect(added).toMatchObject({ name: 'Pekerjaan Taman', custom: true, expanded: true, items: [] });
    expect(actions.addCategory(state, '   ')).toBe(state);

    state = actions.renameCategory(state, added.id, 'Lansekap');
    expect(state.categories.at(-1).name).toBe('Lansekap');
    state = actions.removeCategory(state, added.id);
    expect(state.categories.some((cat) => cat.id === added.id)).toBe(false);
  });

  it('expand/collapse hanya menyentuh flag tampilan', () => {
    const state = fresh();
    const toggled = actions.toggleCategoryExpand(state, firstCat(state).id);
    expect(firstCat(toggled).expanded).toBe(true);
    expect(actions.expandAllCategories(state, true).categories.every((cat) => cat.expanded)).toBe(true);
    expect(calcTotals(toggled)).toEqual(calcTotals(state));
  });
});

describe('boqActions: item', () => {
  it('volume & harga dibatasi ≥ 0 dan menerima koma desimal', () => {
    const state = fresh();
    const { id } = firstCat(state);
    const key = firstCat(state).items[0].key;
    let next = actions.setItemVolume(state, id, key, '2,5');
    expect(firstCat(next).items[0].volume).toBe(2.5);
    next = actions.setItemVolume(next, id, key, '-4');
    expect(firstCat(next).items[0].volume).toBe(0);
    next = actions.setItemPrice(next, id, key, 'abc');
    expect(firstCat(next).items[0].harga).toBe(0);
  });

  it('item kustom: bentuk argumen lama & objek sama-sama diterima', () => {
    const state = fresh();
    const { id } = firstCat(state);
    const legacy = actions.normalizeCustomItemInput('Sewa Scaffolding', 'set', '150000', '3');
    const modern = actions.normalizeCustomItemInput({ label: 'Sewa Genset', satuan: 'hari', hargaDefault: 500000, jumlah: 2, source: 'Kalkulator' });
    expect(legacy).toMatchObject({ uraian: 'Sewa Scaffolding', satuan: 'set', harga: 150000, volume: 3, source: 'Custom Manual', code: 'CUST' });
    expect(modern).toMatchObject({ uraian: 'Sewa Genset', satuan: 'hari', harga: 500000, volume: 2, source: 'Kalkulator' });

    let next = actions.addCustomItem(state, id, legacy);
    next = actions.addCustomItem(next, id, modern);
    const added = firstCat(next).items.slice(-2);
    expect(added[0].key).not.toBe(added[1].key);
    expect(added.every((item) => item.custom && item.key.startsWith('cust-'))).toBe(true);
    expect(actions.addCustomItem(state, id, actions.normalizeCustomItemInput('  '))).toBe(state);
  });

  it('updateCustomItem hanya mengubah field yang diberikan', () => {
    let state = actions.addCustomItem(fresh(), firstCat(fresh()).id, actions.normalizeCustomItemInput('Awal', 'ls', 100, 1));
    const cat = firstCat(state);
    const key = cat.items.at(-1).key;
    state = actions.updateCustomItem(state, cat.id, key, { uraian: 'Baru' });
    expect(firstCat(state).items.at(-1)).toMatchObject({ uraian: 'Baru', satuan: 'ls', harga: 100 });
    state = actions.updateCustomItem(state, cat.id, key, undefined, 'm2', '250');
    expect(firstCat(state).items.at(-1)).toMatchObject({ uraian: 'Baru', satuan: 'm2', harga: 250 });
  });

  it('deleteOrResetItem: kustom dihapus, standar dikembalikan ke bawaan', () => {
    let state = fresh();
    const cat = firstCat(state);
    const standardKey = cat.items[0].key;
    state = actions.setItemPrice(actions.setItemVolume(state, cat.id, standardKey, 9), cat.id, standardKey, 1);
    state = actions.addCustomItem(state, cat.id, actions.normalizeCustomItemInput('Hapus aku', 'ls', 1, 1));
    const customKey = firstCat(state).items.at(-1).key;

    state = actions.deleteOrResetItem(state, cat.id, customKey);
    expect(firstCat(state).items.some((item) => item.key === customKey)).toBe(false);
    state = actions.deleteOrResetItem(state, cat.id, standardKey);
    expect(firstCat(state).items[0]).toMatchObject({ volume: 0, harga: cat.items[0].hargaDefault });
  });
});

describe('boqActions: dinding bersama', () => {
  it('reduksi dapat diterapkan berulang tanpa menumpuk, lalu dikembalikan utuh', () => {
    let state = fresh();
    const cat = firstCat(state);
    const key = cat.items[0].key;
    state = actions.setItemVolume(state, cat.id, key, 100);

    const first = actions.applySharedWallReduction(state, { [key]: true }, 25);
    expect(first.count).toBe(1);
    expect(firstCat(first.state).items[0]).toMatchObject({ volume: 75, originalVolume: 100, sharedWallReduced: true, sharedWallPercent: 25 });

    const second = actions.applySharedWallReduction(first.state, { [key]: true }, 40);
    expect(firstCat(second.state).items[0].volume).toBe(60); // dari volume asli, bukan dari 75

    const reverted = actions.revertSharedWallReduction(second.state);
    expect(reverted.count).toBe(1);
    expect(firstCat(reverted.state).items[0].volume).toBe(100);
    expect(firstCat(reverted.state).items[0].sharedWallReduced).toBe(false);
    expect('sharedWallPercent' in firstCat(reverted.state).items[0]).toBe(false);
    expect('originalVolume' in firstCat(reverted.state).items[0]).toBe(false);
  });
});

describe('boqActions: tenaga kerja & antrian kalkulator', () => {
  it('HOK membuat kategori upah lalu memperbarui item bernama sama', () => {
    let state = actions.applyLaborTakeoff(fresh(), [{ name: 'Tukang Batu', quantity: 12.345, priceDefault: 160000 }]);
    const labor = state.categories.find((cat) => cat.id === 'upah_tenaga');
    expect(labor.items).toHaveLength(1);
    expect(labor.items[0]).toMatchObject({ uraian: 'Tukang Batu', volume: 12.35, harga: 160000, satuan: 'OH' });

    state = actions.applyLaborTakeoff(state, [{ name: ' tukang batu ', quantity: 20 }, { name: 'Mandor', quantity: 0 }]);
    const updated = state.categories.find((cat) => cat.id === 'upah_tenaga');
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].volume).toBe(20);
  });

  it('resolveCategory memetakan alias kalkulator ke kategori BoQ', () => {
    const { categories } = fresh();
    expect(actions.resolveCategory('beton', categories).id).toBe('struktur');
    expect(actions.resolveCategory('pondasi', categories).id).toBe('tanah_pondasi');
    expect(actions.resolveCategory('tidak-dikenal', categories).id).toBe('struktur');
    expect(actions.resolveCategory('x', [])).toBeNull();
  });

  it('usulan kalkulator: masuk antrian, lalu diterapkan sebagai item baru atau ditambahkan ke item lama', () => {
    let state = fresh();
    const queued = actions.formatQueueItems([
      { category: 'beton', label: 'Semen Portland', satuan: 'Sak', jumlah: 10, harga: 65000 },
      { category: 'sanitasi', uraian: 'Pipa 3"', satuan: 'btg', volume: NaN, harga: 'x' },
    ]);
    expect(queued[1]).toMatchObject({ category: 'mep', jumlah: 0, harga: 0, label: 'Pipa 3"' });
    state = actions.enqueueItems(state, queued);
    expect(state.pendingQueue).toHaveLength(2);

    // 1) sebagai item baru di kategori hasil pemetaan
    state = actions.applyPendingItem(state, queued[0].id);
    const struktur = state.categories.find((cat) => cat.id === 'struktur');
    expect(struktur.items.at(-1)).toMatchObject({ uraian: 'Semen Portland', volume: 10, harga: 65000, custom: true, code: 'CALC' });
    expect(state.pendingQueue).toHaveLength(1);

    // 2) ditambahkan ke item yang sudah ada (volume dijumlah, harga yang sudah ada dipertahankan)
    const target = struktur.items[0];
    const more = actions.formatQueueItems([{ category: 'beton', label: 'Tambahan', jumlah: 4, harga: 999 }]);
    state = actions.enqueueItems(state, more);
    state = actions.applyAllPendingItems(state, { [more[0].id]: `struktur::${target.key}` });
    const merged = state.categories.find((cat) => cat.id === 'struktur').items[0];
    expect(merged.volume).toBe((target.volume || 0) + 4);
    expect(merged.harga).toBe(target.harga);
    expect(state.pendingQueue).toEqual([]);
  });

  it('usulan dapat dibuang satu per satu atau sekaligus', () => {
    const queued = actions.formatQueueItems([{ label: 'A', jumlah: 1 }, { label: 'B', jumlah: 2 }]);
    let state = actions.enqueueItems(fresh(), queued);
    state = actions.dismissPendingItem(state, queued[0].id);
    expect(state.pendingQueue.map((entry) => entry.label)).toEqual(['B']);
    expect(actions.clearPendingItems(state).pendingQueue).toEqual([]);
    expect(actions.applyPendingItem(state, 'tidak-ada')).toBe(state);
  });
});
