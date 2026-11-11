import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from '../services/cloud/outbox.js';

let CalculatorStore;
let isLocalOnlyCalculatorKey;

beforeAll(async () => {
  globalThis.localStorage = createMemoryStorage({
    'sr_calc_wall_luas@@proj_A': '"12.5"',
    'sr_calc_fd_active_sub@@proj_A': '"footplat"',
    'sr_calc_wall_luas@@proj_B': '"99"',
    sr_studio_calc_scope_migrated_v1: '1',
  });
  ({ CalculatorStore, isLocalOnlyCalculatorKey } = await import('./usePersistentCalculatorState'));
});

describe('CalculatorStore', () => {
  it('memuat isian sesuai dokumen aktif dan berpindah dokumen', () => {
    const store = new CalculatorStore('proj_A');
    expect(store.get('sr_calc_wall_luas')).toBe('"12.5"');
    store.setScope('proj_B');
    expect(store.get('sr_calc_wall_luas')).toBe('"99"');
    expect(store.get('sr_calc_fd_active_sub')).toBeUndefined();
    store.setScope(null);
    expect(store.snapshot()).toEqual({});
  });

  it('perubahan pengguna memberi tahu pelanggan & baru ditulis saat persist()', () => {
    const store = new CalculatorStore('proj_A');
    const onKey = vi.fn();
    const onChange = vi.fn();
    store.subscribe('sr_calc_floor_area', onKey);
    store.onChange(onChange);

    store.set('sr_calc_floor_area', '"40"');
    store.set('sr_calc_floor_area', '"40"'); // nilai sama → tidak ada notifikasi
    expect(onKey).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('sr_calc_floor_area@@proj_A')).toBeNull();

    store.persist();
    expect(localStorage.getItem('sr_calc_floor_area@@proj_A')).toBe('"40"');
    store.set('sr_calc_floor_area', undefined);
    store.persist();
    expect(localStorage.getItem('sr_calc_floor_area@@proj_A')).toBeNull();
  });

  it('status tampilan per pengguna tidak ikut disinkronkan dan tidak tertimpa data cloud', () => {
    expect(isLocalOnlyCalculatorKey('sr_calc_fd_active_sub')).toBe(true);
    expect(isLocalOnlyCalculatorKey('sr_calc_wall_luas')).toBe(false);

    const store = new CalculatorStore('proj_A');
    expect(store.syncSnapshot()).toEqual({ 'sr_calc_wall_luas': '"12.5"' });

    const onLocal = vi.fn();
    const onRemoteChange = vi.fn();
    store.subscribe('sr_calc_wall_luas', onRemoteChange);
    store.onChange(onLocal);
    store.replaceSynced({ sr_calc_wall_luas: '"30"', sr_calc_cc_mutu: '"K225"' });

    expect(store.get('sr_calc_wall_luas')).toBe('"30"');
    expect(store.get('sr_calc_cc_mutu')).toBe('"K225"');
    expect(store.get('sr_calc_fd_active_sub')).toBe('"footplat"'); // tetap milik perangkat ini
    expect(onRemoteChange).toHaveBeenCalledTimes(1);
    expect(onLocal).not.toHaveBeenCalled(); // data dari cloud bukan "perubahan pengguna"
  });

  it('renameScope memindahkan isian draf ke dokumen baru', () => {
    const store = new CalculatorStore(null);
    store.set('sr_calc_rb_dia', '"10"');
    store.renameScope('proj_baru');
    expect(store.scope).toBe('proj_baru');
    expect(store.get('sr_calc_rb_dia')).toBe('"10"');
    expect(localStorage.getItem('sr_calc_rb_dia@@proj_baru')).toBe('"10"');
    expect(localStorage.getItem('sr_calc_rb_dia@@__draft__')).toBeNull();
  });
});
