import { describe, it, expect } from 'vitest';
import { parseNum, formatRp, calcRebarWeightPerM } from './formatters';
import { normalizeState, calcTotals } from './normalize';
import { volumeTrapesium, applyClusterMultiplier } from '../hooks/useCalculatorQueue';
import {
  calcEffectiveMultiplier,
  calcBatuKaliEffectiveLength,
  calcBatuKaliVolumes,
  calcFootplatTotals,
  buildBorepileItem,
  calcBorepileTotals,
} from './foundationCalc';

describe('formatters', () => {
  it('parseNum menolak NaN/negatif', () => {
    expect(parseNum('abc')).toBe(0);
    expect(parseNum('-5')).toBe(0);
    expect(parseNum('12.5')).toBe(12.5);
  });
  it('formatRp memformat IDR', () => {
    expect(formatRp(1500000)).toContain('1.500.000');
  });
  it('berat besi D10 ~0.617 kg/m', () => {
    expect(calcRebarWeightPerM(10)).toBeCloseTo(0.617, 2);
  });
});

describe('normalize + totals', () => {
  it('normalizeState(null) menghasilkan state kosong valid', () => {
    const s = normalizeState(null);
    expect(s.project.clusterUnits).toBe(1);
    expect(Array.isArray(s.categories)).toBe(true);
  });
  it('calcTotals menghitung subtotal & PPN 11%', () => {
    const s = normalizeState(null);
    s.categories[0].items[0].harga = 10000;
    s.categories[0].items[0].volume = 2;
    s.ppn = true;
    const t = calcTotals(s);
    expect(t.subtotal).toBe(20000);
    expect(t.ppnAmount).toBe(2200);
    expect(t.grandTotal).toBe(22200);
  });
});

describe('kalkulator helpers', () => {
  it('volumeTrapesium = P * (La+Lb)/2 * T', () => {
    expect(volumeTrapesium(10, 0.3, 0.6, 0.8)).toBeCloseTo(3.6, 5);
  });
  it('cluster multiplier mengganda', () => {
    expect(applyClusterMultiplier(5, 4, 'multiplied')).toBe(20);
    expect(applyClusterMultiplier(5, 4, 'single')).toBe(5);
  });
});

describe('foundationCalc', () => {
  it('multiplier & panjang efektif dinding bersama', () => {
    expect(calcEffectiveMultiplier('multiplied', 4)).toBe(4);
    expect(calcEffectiveMultiplier('single', 4)).toBe(1);
    const { effective, hemat } = calcBatuKaliEffectiveLength({
      bkPanjang: '10', bkPanjangBatas: '4', clusterTypology: 'shared',
      effectiveMultiplier: 4, sharedRatio: 0.625,
    });
    expect(effective).toBeCloseTo(34, 5);
    expect(hemat).toBeCloseTo(6, 5);
  });
  it('volume batu kali trapesium + kebutuhan material', () => {
    const r = calcBatuKaliVolumes({
      panjangEffective: 10, lebarAtas: '0.3', lebarBawah: '0.6', tinggi: '0.8',
      rasio: '4', tGalian: false, tUrug: false, tAan: false,
    });
    expect(r.has).toBe(true);
    expect(r.volPasangan).toBeCloseTo(3.6, 5);
    expect(r.batuM3).toBeCloseTo(4.32, 5);
  });
  it('footplat kosong -> has:false; borepile Ø30cm L6m', () => {
    expect(calcFootplatTotals({ fpList: [] }).has).toBe(false);
    const item = buildBorepileItem({
      nama: '', seq: 1, diameter: '30', kedalaman: '6', jumlah: '2',
      mutu: 'K225', diaUtama: '16', jmlUtama: '6', panjangUtama: '',
      diaSpiral: '8', jarakSpiral: '200',
    });
    expect(item).not.toBeNull();
    expect(item.volTotal).toBeCloseTo(Math.PI * 0.15 * 0.15 * 6 * 2, 5);
    const t = calcBorepileTotals([item]);
    expect(t.has).toBe(true);
    expect(t.volSpoil).toBeCloseTo(t.totalVol * 1.15, 5);
  });
});
