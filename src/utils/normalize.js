import { ITEM_DATABASE } from '../data/itemDatabase';
import { parseNum } from './formatters';

// Poin 3: hasil ekstraksi dari BoQContext.jsx (baris 28-307).
// Fungsi murni — tidak ada React di sini, mudah di-test & di-reuse.
export function getDefaultCategorySchedules(durationWeeks = 12, categories = []) {
  const defaults = {
    persiapan: { startRel: 0.0, endRel: 0.18 },
    tanah_pondasi: { startRel: 0.0, endRel: 0.33 },
    struktur: { startRel: 0.2, endRel: 0.6 },
    dinding: { startRel: 0.35, endRel: 0.7 },
    atap: { startRel: 0.5, endRel: 0.8 },
    lantai: { startRel: 0.6, endRel: 0.88 },
    plafond: { startRel: 0.65, endRel: 0.9 },
    kusen: { startRel: 0.65, endRel: 0.9 },
    finishing: { startRel: 0.75, endRel: 1.0 },
    mep: { startRel: 0.45, endRel: 0.95 },
    sanitasi: { startRel: 0.45, endRel: 0.95 },
    lain: { startRel: 0.8, endRel: 1.0 },
  };
  const scheduleMap = {};
  const cats = categories.length > 0 ? categories : ITEM_DATABASE.categories;
  cats.forEach((cat, idx) => {
    const key = cat.id || `cat-${idx}`;
    const def = defaults[key] || {
      startRel: Math.min(0.85, (idx / cats.length) * 0.7),
      endRel: Math.min(1.0, ((idx + 2) / cats.length) * 0.9 + 0.1),
    };
    let startWeek = Math.max(1, Math.round(def.startRel * (durationWeeks - 1)) + 1);
    let endWeek = Math.max(startWeek, Math.round(def.endRel * durationWeeks));
    endWeek = Math.min(durationWeeks, endWeek);
    scheduleMap[key] = { startWeek, endWeek };
  });
  return scheduleMap;
}

export function blankState(today = new Date().toISOString().slice(0, 10)) {
  return {
    project: { name: '', location: '', date: today, client: '', clusterUnits: 1, clusterTypology: 'double', clusterRowUnits: 4, libraryId: null },
    ppn: false,
    categories: ITEM_DATABASE.categories.map((cat) => ({
      id: cat.id, name: cat.name, custom: false, expanded: false,
      items: cat.items.map((it, idx) => ({
        code: it[0], uraian: it[1], satuan: it[2], hargaDefault: it[3], harga: it[3],
        source: it[4], volume: 0, custom: false, key: `${cat.id}-${idx}`,
      })),
    })),
    pendingQueue: [],
  };
}

export function normalizeState(rawState) {
  const today = new Date().toISOString().slice(0, 10);
  if (!rawState || typeof rawState !== 'object') return blankState(today);
  const rawProject = rawState.project || {};
  const project = {
    name: typeof rawProject.name === 'string' ? rawProject.name : '',
    location: typeof rawProject.location === 'string' ? rawProject.location : '',
    date: typeof rawProject.date === 'string' ? rawProject.date : today,
    client: typeof rawProject.client === 'string' ? rawProject.client : '',
    clusterUnits: Math.max(1, parseInt(rawProject.clusterUnits) || 1),
    clusterTypology: rawProject.clusterTypology === 'shared' ? 'shared' : 'double',
    clusterRowUnits: Math.max(2, parseInt(rawProject.clusterRowUnits) || parseInt(rawProject.clusterUnits) || 4),
    libraryId: rawProject.libraryId || null,
  };
  let rawCategories = rawState.categories;
  if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) rawCategories = Object.values(rawCategories);
  if (!Array.isArray(rawCategories) || rawCategories.length === 0) rawCategories = ITEM_DATABASE.categories;
  const categories = rawCategories.map((cat, cIdx) => {
    if (!cat || typeof cat !== 'object') return null;
    let rawItems = cat.items;
    if (rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)) rawItems = Object.values(rawItems);
    if (!Array.isArray(rawItems)) rawItems = [];
    const items = rawItems.map((it, iIdx) => {
      if (!it || typeof it !== 'object') return null;
      let uraian = it.uraian;
      if (typeof uraian === 'object' && uraian !== null) uraian = uraian.uraian || uraian.name || uraian.label || '';
      let satuan = it.satuan;
      if (typeof satuan === 'object' && satuan !== null) satuan = satuan.satuan || satuan.unit || '';
      return {
        code: typeof it.code === 'string' ? it.code : '',
        uraian: typeof uraian === 'string' ? uraian : String(uraian || ''),
        satuan: typeof satuan === 'string' ? satuan : String(satuan || ''),
        hargaDefault: typeof it.hargaDefault === 'number' ? it.hargaDefault : parseNum(it.hargaDefault),
        harga: typeof it.harga === 'number' ? it.harga : parseNum(it.harga),
        source: typeof it.source === 'string' ? it.source : '',
        volume: typeof it.volume === 'number' ? it.volume : parseNum(it.volume),
        custom: !!it.custom,
        key: it.key || `${cat.id || cIdx}-${iIdx}`,
        originalVolume: it.originalVolume !== undefined ? Number(it.originalVolume) : undefined,
        sharedWallReduced: !!it.sharedWallReduced,
        sharedWallPercent: it.sharedWallPercent !== undefined ? Number(it.sharedWallPercent) : undefined,
      };
    }).filter(Boolean);
    return { id: cat.id || `cat-${cIdx}`, name: typeof cat.name === 'string' ? cat.name : `Kategori ${cIdx + 1}`, custom: !!cat.custom, expanded: !!cat.expanded, items };
  }).filter(Boolean);
  let rawQueue = rawState.pendingQueue;
  if (rawQueue && typeof rawQueue === 'object' && !Array.isArray(rawQueue)) rawQueue = Object.values(rawQueue);
  return {
    project, ppn: !!rawState.ppn,
    categories: categories.length > 0 ? categories : blankState(today).categories,
    pendingQueue: Array.isArray(rawQueue) ? rawQueue : [],
  };
}

export function normalizeLibraryProject(proj) {
  if (!proj || typeof proj !== 'object') return null;
  const stateSnapshot = proj.stateSnapshot ? normalizeState(proj.stateSnapshot) : null;
  const now = new Date().toISOString();
  let rawRevisions = proj.revisions;
  if (rawRevisions && typeof rawRevisions === 'object' && !Array.isArray(rawRevisions)) rawRevisions = Object.values(rawRevisions);
  const revisions = (Array.isArray(rawRevisions) ? rawRevisions : []).map((rev) => {
    if (!rev || typeof rev !== 'object') return null;
    return {
      id: rev.id || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: rev.timestamp || now, note: rev.note || 'Snapshot Revisi',
      grandTotal: typeof rev.grandTotal === 'number' ? rev.grandTotal : 0,
      subtotal: typeof rev.subtotal === 'number' ? rev.subtotal : 0,
      filledItemsCount: typeof rev.filledItemsCount === 'number' ? rev.filledItemsCount : 0,
      stateSnapshot: rev.stateSnapshot ? normalizeState(rev.stateSnapshot) : null,
    };
  }).filter(Boolean);
  let calcSubtotal = typeof proj.subtotal === 'number' ? proj.subtotal : 0;
  let calcFilledCount = typeof proj.filledItemsCount === 'number' ? proj.filledItemsCount : 0;
  if (stateSnapshot?.categories) {
    calcSubtotal = stateSnapshot.categories.reduce((s, cat) => s + (cat.items || []).reduce((s2, it) => s2 + (it.harga || 0) * (it.volume || 0), 0), 0);
    calcFilledCount = stateSnapshot.categories.reduce((s, cat) => s + (cat.items || []).filter((it) => it.volume > 0).length, 0);
  }
  const isPpn = stateSnapshot ? stateSnapshot.ppn : !!proj.ppn;
  const calcPpnAmount = isPpn ? calcSubtotal * 0.11 : 0;
  const calcGrandTotal = typeof proj.grandTotal === 'number' && proj.grandTotal > 0 ? proj.grandTotal : calcSubtotal + calcPpnAmount;
  return {
    id: proj.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: proj.name || stateSnapshot?.project?.name || 'Proyek Tanpa Nama',
    client: proj.client || stateSnapshot?.project?.client || '-',
    location: proj.location || stateSnapshot?.project?.location || '-',
    date: proj.date || stateSnapshot?.project?.date || now.slice(0, 10),
    grandTotal: calcGrandTotal, subtotal: calcSubtotal, ppn: isPpn, ppnAmount: calcPpnAmount,
    filledItemsCount: calcFilledCount,
    categoriesCount: stateSnapshot?.categories?.length || (Array.isArray(proj.categories) ? proj.categories.length : 0),
    createdAt: proj.createdAt || now, updatedAt: proj.updatedAt || proj.createdAt || now,
    stateSnapshot, revisions,
  };
}

export function normalizeLibrary(list) {
  if (list && typeof list === 'object' && !Array.isArray(list)) list = Object.values(list);
  if (!Array.isArray(list)) return [];
  return list.map(normalizeLibraryProject).filter(Boolean);
}

export function calcTotals(state) {
  const categoriesList = Array.isArray(state?.categories) ? state.categories : [];
  const subtotal = categoriesList.reduce(
    (s, cat) => s + (Array.isArray(cat?.items) ? cat.items : []).reduce((s2, it) => s2 + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0), 0);
  const ppnAmount = state?.ppn ? subtotal * 0.11 : 0;
  const filledItemsCount = categoriesList.reduce(
    (s, cat) => s + (Array.isArray(cat?.items) ? cat.items : []).filter((it) => it && (Number(it.volume) || 0) > 0).length, 0);
  return { subtotal, ppnAmount, grandTotal: subtotal + ppnAmount, filledItemsCount };
}
