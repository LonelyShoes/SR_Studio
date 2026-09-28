import { describe, it, expect } from 'vitest';
import { calculateFFD } from '../components/calculators/RebarCalculator';

describe('calculateFFD – cutting stock 12 m', () => {
  it('memacking potongan pendek ke lonjor yang sama', () => {
    const r = calculateFFD([{ length: 5.9, qty: 2, diameter: 10 }], 12);
    expect(r.totalLonjor).toBe(1);
  });
  it('batang 23,8 m D10 butuh 3 lonjor karena lewatan 40D', () => {
    // 23,8 + 0,4 lewatan = 24,2 m > 2 lonjor
    const r = calculateFFD([{ length: 23.8, qty: 1, diameter: 10 }], 12);
    expect(r.totalLonjor).toBe(3);
  });
  it('sisa potongan batang panjang dipakai untuk potongan lain', () => {
    // 15 m D10: 1 lonjor utuh + sisa 3,4 m; potongan 8 m muat di lonjor sisa
    const r = calculateFFD([{ length: 15, qty: 1, diameter: 10 }, { length: 8, qty: 1, diameter: 10 }], 12);
    expect(r.totalLonjor).toBe(2);
  });
});

import { parseNum } from './formatters';
describe('parseNum', () => {
  it('menerima koma desimal', () => { expect(parseNum('2,5')).toBe(2.5); expect(parseNum('3.25')).toBe(3.25); expect(parseNum('-1')).toBe(0); });
});
