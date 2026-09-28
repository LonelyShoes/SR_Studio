import { parseNum, calcRebarWeightPerM } from './formatters';
import { CONCRETE_MIX, DENSITIES } from '../data/calculatorConstants';

// Poin 1 (lanjutan): logika murni FoundationCalculator yang diekstrak.
// Semua fungsi di sini tidak menyentuh React — bisa di-test via vitest.

export function calcEffectiveMultiplier(clusterApplyMode, clusterUnits) {
  return clusterApplyMode === 'multiplied' ? Math.max(1, Number(clusterUnits) || 1) : 1;
}

export function calcSharedRatio(clusterRowUnits) {
  const rowN = Math.max(2, Number(clusterRowUnits) || 4);
  return { rowN, sharedRatio: (rowN + 1) / (2 * rowN) };
}

export function calcBatuKaliEffectiveLength({ bkPanjang, bkPanjangBatas, clusterTypology, effectiveMultiplier, sharedRatio }) {
  const base = parseNum(bkPanjang);
  const batas = parseNum(bkPanjangBatas);
  let effective = base * effectiveMultiplier;
  let hemat = 0;
  if (clusterTypology === 'shared' && effectiveMultiplier > 1 && batas > 0) {
    const pInternal = Math.max(0, base - batas);
    const pBatasShared = batas * effectiveMultiplier * sharedRatio;
    effective = pInternal * effectiveMultiplier + pBatasShared;
    hemat = batas * effectiveMultiplier - pBatasShared;
  }
  return { effective, hemat };
}

export function calcBatuKaliVolumes({ panjangEffective, lebarAtas, lebarBawah, tinggi, rasio, tGalian, galianDalam, galianLebar, tUrug, urugTebal, tAan, aanTebal }) {
  const p = Number(panjangEffective);
  const la = parseNum(lebarAtas);
  const lb = parseNum(lebarBawah);
  const t = parseNum(tinggi);
  const r = parseNum(rasio);
  if (!(p > 0 && la > 0 && lb > 0 && t > 0)) return { has: false };
  const luasPenampang = ((la + lb) / 2) * t;
  const volPasangan = luasPenampang * p;
  const faktor = 0.76 + r * 0.675;
  const semenKg = volPasangan * (1 / faktor) * 1250 * 0.45;
  const pasirM3 = volPasangan * (r / faktor) * 0.45;
  const batuM3 = volPasangan * 1.2;
  let volGalian;
  let volUrug;
  let volAan;
  let volUrugKembali;
  if (tGalian) {
    const gd = parseNum(galianDalam);
    const gl = parseNum(galianLebar);
    if (gd > 0 && gl > 0) volGalian = gd * gl * p;
  }
  if (tUrug) {
    const ut = parseNum(urugTebal);
    if (ut > 0) volUrug = lb * ut * p;
  }
  if (tAan) {
    const at = parseNum(aanTebal);
    if (at > 0) volAan = lb * at * p;
  }
  if (volGalian !== undefined) {
    volUrugKembali = Math.max(0, volGalian - (volPasangan + (volUrug || 0) + (volAan || 0)));
  }
  return { has: true, volPasangan, semenKg, semenZak: Math.ceil(semenKg / 40), pasirM3, batuM3, volGalian, volUrug, volAan, volUrugKembali };
}

export function calcFootplatTotals({ fpList, clusterApplyMode, clusterTypology, effectiveMultiplier, sharedRatio, tGalian, galianDalam, tLK, lkTebal, tUrug, urugTebal }) {
  if (!fpList || fpList.length === 0) return { has: false, count: 0, totalVol: 0 };
  let totalVol = 0;
  let totalBesi = 0;
  const mixTotals = { semen: 0, pasir: 0, kerikil: 0 };
  let footprintArea = 0;
  fpList.forEach((it) => {
    const itMult = clusterApplyMode === 'multiplied' && clusterTypology === 'shared' && it.isSharedBoundary
      ? effectiveMultiplier * sharedRatio
      : effectiveMultiplier;
    totalVol += it.volTotal * itMult;
    totalBesi += it.besiTotal * itMult;
    footprintArea += it.p * it.l * it.jumlah * itMult;
    const m = CONCRETE_MIX[it.mutu] || CONCRETE_MIX.K250;
    mixTotals.semen += it.volTotal * itMult * m.semen;
    mixTotals.pasir += it.volTotal * itMult * m.pasir;
    mixTotals.kerikil += it.volTotal * itMult * m.kerikil;
  });
  let volGalian;
  let volLK;
  let volUrug;
  if (tGalian && parseNum(galianDalam) > 0) volGalian = footprintArea * parseNum(galianDalam);
  if (tLK && parseNum(lkTebal) > 0) volLK = footprintArea * parseNum(lkTebal);
  if (tUrug && parseNum(urugTebal) > 0) volUrug = footprintArea * parseNum(urugTebal);
  return {
    has: true, count: fpList.length, totalVol, totalBesi, mixTotals,
    semenZak: Math.ceil(mixTotals.semen / 40),
    pasirM3: mixTotals.pasir / DENSITIES.PASIR,
    kerikilM3: mixTotals.kerikil / DENSITIES.KERIKIL,
    volGalian, volLK, volUrug,
  };
}

export function buildBorepileItem({ nama, seq, diameter, kedalaman, jumlah, mutu, diaUtama, jmlUtama, panjangUtama, diaSpiral, jarakSpiral }) {
  const d = parseNum(diameter);
  const ked = parseNum(kedalaman);
  const qty = parseInt(jumlah, 10) || 1;
  if (!(d > 0 && ked > 0)) return null;
  const dUt = parseNum(diaUtama);
  const jUt = parseInt(jmlUtama, 10) || 0;
  const pUt = parseNum(panjangUtama) || ked;
  const dSp = parseNum(diaSpiral);
  const jSp = parseNum(jarakSpiral);
  const rM = d / 100 / 2;
  const volPerTitik = Math.PI * rM * rM * ked;
  const besiUtama = jUt * pUt * calcRebarWeightPerM(dUt) * qty;
  let besiSpiral = 0;
  if (jSp > 0 && dSp > 0) {
    const keliling = Math.PI * Math.max(0, d / 100 - 2 * 0.075);
    besiSpiral = Math.ceil(ked / (jSp / 1000)) * keliling * calcRebarWeightPerM(dSp) * qty;
  }
  return {
    id: Date.now(), nama: String(nama || '').trim() || `BP-${seq}`,
    diameter: d, kedalaman: ked, jumlah: qty, mutu,
    volTotal: volPerTitik * qty, besiTotal: besiUtama + besiSpiral,
    dimText: `Ø${d} cm × ${ked} m`,
  };
}

export function calcBorepileTotals(bpList) {
  if (!bpList || bpList.length === 0) return { has: false };
  let totalVol = 0;
  let totalBesi = 0;
  const mixTotals = { semen: 0, pasir: 0, kerikil: 0 };
  bpList.forEach((it) => {
    totalVol += it.volTotal;
    totalBesi += it.besiTotal;
    const m = CONCRETE_MIX[it.mutu] || CONCRETE_MIX.K225;
    mixTotals.semen += it.volTotal * m.semen;
    mixTotals.pasir += it.volTotal * m.pasir;
    mixTotals.kerikil += it.volTotal * m.kerikil;
  });
  return {
    has: true, totalVol, totalBesi, mixTotals,
    semenZak: Math.ceil(mixTotals.semen / 40),
    pasirM3: mixTotals.pasir / DENSITIES.PASIR,
    kerikilM3: mixTotals.kerikil / DENSITIES.KERIKIL,
    volSpoil: totalVol * 1.15,
  };
}
