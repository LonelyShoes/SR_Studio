import { describe, it, expect, beforeAll } from 'vitest';

// Stub localStorage minimal (environment vitest = node)
function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

let mod;

beforeAll(async () => {
  globalThis.window = globalThis;
  globalThis.localStorage = createMemoryStorage({
    sr_studio_active_library_id_v2: 'proj_A',
    sr_calc_wall_luas: '12.5',
  });
  mod = await import('./usePersistentCalculatorState');
});

describe('scope state kalkulator per Library RAB', () => {
  it('memigrasi kunci lama ke scope library yang aktif', () => {
    expect(localStorage.getItem('sr_calc_wall_luas')).toBeNull();
    expect(localStorage.getItem('sr_calc_wall_luas@@proj_A')).toBe('12.5');
  });

  it('memindahkan isian draft ke proyek baru saat disimpan ke Library', () => {
    localStorage.setItem('sr_calc_floor_area@@__draft__', '40');
    mod.copyCalculatorScope(null, 'proj_B', { move: true });
    expect(localStorage.getItem('sr_calc_floor_area@@proj_B')).toBe('40');
    expect(localStorage.getItem('sr_calc_floor_area@@__draft__')).toBeNull();
  });

  it('menyalin isian saat duplikasi tanpa menghapus sumber', () => {
    mod.copyCalculatorScope('proj_A', 'proj_C');
    expect(localStorage.getItem('sr_calc_wall_luas@@proj_C')).toBe('12.5');
    expect(localStorage.getItem('sr_calc_wall_luas@@proj_A')).toBe('12.5');
  });

  it('hanya menghapus isian milik library yang dihapus', () => {
    mod.clearCalculatorScope('proj_C');
    expect(localStorage.getItem('sr_calc_wall_luas@@proj_C')).toBeNull();
    expect(localStorage.getItem('sr_calc_wall_luas@@proj_A')).toBe('12.5');
  });
});
