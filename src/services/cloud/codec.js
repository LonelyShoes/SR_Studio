/**
 * Codec dokumen cloud ⇄ state aplikasi.
 *
 * Di cloud, kategori/item/antrian disimpan sebagai MAP berkunci id (bukan array) dengan
 * nomor urut `order`. Dengan begitu dua pengguna yang mengubah item berbeda pada saat
 * bersamaan tidak saling menimpa: tiap perubahan hanyalah update satu path kecil.
 *
 * Field `order` hanya ditulis saat elemen dibuat dan tidak pernah diubah oleh edit biasa,
 * sehingga berfungsi juga sebagai penanda "elemen utuh": record tanpa `order`
 * (sisa edit yang berpapasan dengan penghapusan) diabaikan dan dibersihkan otomatis.
 */

import { encodeKey, decodeKey } from './keys.js';
import { isPlainObject, sanitizeTree } from './tree.js';
import { calcTotals, normalizeProject, normalizeSchedule, normalizeState, PPN_RATE } from '../../utils/normalize.js';

export const DOC_VERSION = 1;

const finite = (value, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const text = (value) => (typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value));
const hasOrder = (record) => isPlainObject(record) && typeof record.order === 'number';

function sortedEntries(map) {
  if (!isPlainObject(map)) return [];
  return Object.keys(map)
    .filter((key) => hasOrder(map[key]))
    .map((key) => [decodeKey(key), map[key]])
    .sort((a, b) => a[1].order - b[1].order || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/* ------------------------------------------------------------------ BoQ state */

export function stateToDoc(state) {
  const project = state?.project || {};
  const doc = {
    v: DOC_VERSION,
    project: {
      name: text(project.name),
      location: text(project.location),
      date: text(project.date),
      client: text(project.client),
      clusterUnits: Math.max(1, Math.round(finite(project.clusterUnits, 1))),
      clusterTypology: project.clusterTypology === 'shared' ? 'shared' : 'double',
      clusterRowUnits: Math.max(2, Math.round(finite(project.clusterRowUnits, 4))),
    },
  };
  const area = finite(project.buildingAreaPerUnit, 0);
  if (area > 0) doc.project.buildingAreaPerUnit = area;
  if (state?.ppn) doc.ppn = true;

  const cats = {};
  (Array.isArray(state?.categories) ? state.categories : []).forEach((cat, cIdx) => {
    if (!cat) return;
    const items = {};
    (Array.isArray(cat.items) ? cat.items : []).forEach((it, iIdx) => {
      if (!it) return;
      const record = {
        order: finite(it.order, iIdx),
        uraian: text(it.uraian),
        satuan: text(it.satuan),
        harga: finite(it.harga),
        hargaDefault: finite(it.hargaDefault),
      };
      if (it.code) record.code = text(it.code);
      if (it.source) record.source = text(it.source);
      const volume = finite(it.volume);
      if (volume) record.volume = volume;
      if (it.custom) record.custom = true;
      if (it.sharedWallReduced) {
        record.sharedWallReduced = true;
        if (it.sharedWallPercent !== undefined) record.sharedWallPercent = finite(it.sharedWallPercent);
      }
      if (it.originalVolume !== undefined) record.originalVolume = finite(it.originalVolume);
      items[encodeKey(it.key)] = record;
    });
    const record = { order: finite(cat.order, cIdx), name: text(cat.name) };
    if (cat.custom) record.custom = true;
    if (Object.keys(items).length) record.items = items;
    cats[encodeKey(cat.id)] = record;
  });
  if (Object.keys(cats).length) doc.cats = cats;

  const queue = {};
  (Array.isArray(state?.pendingQueue) ? state.pendingQueue : []).forEach((entry, index) => {
    if (!entry || !entry.id) return;
    const record = {
      order: finite(entry.order, index),
      category: text(entry.category) || 'struktur',
      label: text(entry.label || entry.uraian) || 'Material Kalkulator',
      satuan: text(entry.satuan) || 'ls',
      jumlah: finite(entry.jumlah !== undefined ? entry.jumlah : entry.volume),
      harga: finite(entry.harga),
    };
    if (entry.source) record.source = text(entry.source);
    queue[encodeKey(entry.id)] = record;
  });
  if (Object.keys(queue).length) doc.queue = queue;

  return doc;
}

/**
 * @param {object} doc Dokumen cloud (`docs/<id>/boq`).
 * @param {object} [prevState] State lokal sebelumnya — preferensi tampilan per perangkat
 *   (kategori terbuka/tertutup, libraryId) dipertahankan dari sini.
 */
export function docToState(doc, prevState) {
  const source = isPlainObject(doc) ? doc : {};
  const expanded = new Map((prevState?.categories || []).map((cat) => [cat.id, !!cat.expanded]));

  const categories = sortedEntries(source.cats).map(([id, cat]) => ({
    id,
    name: text(cat.name) || 'Kategori',
    custom: !!cat.custom,
    expanded: expanded.get(id) || false,
    order: cat.order,
    items: sortedEntries(cat.items).map(([key, it]) => {
      const item = {
        code: text(it.code),
        uraian: text(it.uraian),
        satuan: text(it.satuan),
        hargaDefault: finite(it.hargaDefault),
        harga: finite(it.harga),
        source: text(it.source),
        volume: finite(it.volume),
        custom: !!it.custom,
        key,
        order: it.order,
        originalVolume: it.originalVolume !== undefined ? finite(it.originalVolume) : undefined,
        sharedWallReduced: !!it.sharedWallReduced,
        sharedWallPercent: it.sharedWallPercent !== undefined ? finite(it.sharedWallPercent) : undefined,
      };
      return item;
    }),
  }));

  const pendingQueue = sortedEntries(source.queue).map(([id, entry]) => {
    const amount = finite(entry.jumlah);
    const label = text(entry.label) || 'Material Kalkulator';
    return {
      id,
      category: text(entry.category) || 'struktur',
      label,
      uraian: label,
      satuan: text(entry.satuan) || 'ls',
      jumlah: amount,
      volume: amount,
      harga: finite(entry.harga),
      source: text(entry.source) || 'Kalkulator',
      order: entry.order,
    };
  });

  const project = normalizeProject(source.project);
  project.libraryId = prevState?.project?.libraryId || null;
  return { project, ppn: !!source.ppn, categories, pendingQueue };
}

/** Bentuk kanonik state untuk perbandingan/penyimpanan (tanpa preferensi tampilan). */
export const canonicalDoc = (state) => sanitizeTree(stateToDoc(normalizeState(state, { allowEmptyCategories: true })));

/* ------------------------------------------------------------------ Jadwal */

export function scheduleToDoc(schedule) {
  const normalized = normalizeSchedule(schedule);
  if (!normalized) return undefined;
  const doc = { durationWeeks: normalized.durationWeeks, startDate: normalized.startDate };
  const cats = {};
  for (const catId of Object.keys(normalized.categorySchedules)) {
    const { startWeek, endWeek } = normalized.categorySchedules[catId];
    cats[encodeKey(catId)] = { startWeek, endWeek };
  }
  if (Object.keys(cats).length) doc.cats = cats;
  const actual = {};
  for (const week of Object.keys(normalized.actualProgress)) {
    actual[`w${week}`] = normalized.actualProgress[week];
  }
  if (Object.keys(actual).length) doc.actual = actual;
  return doc;
}

export function docToSchedule(doc) {
  if (!isPlainObject(doc)) return null;
  const categorySchedules = {};
  if (isPlainObject(doc.cats)) {
    for (const key of Object.keys(doc.cats)) categorySchedules[decodeKey(key)] = doc.cats[key];
  }
  const actualProgress = {};
  if (isPlainObject(doc.actual)) {
    for (const key of Object.keys(doc.actual)) {
      if (key.startsWith('w')) actualProgress[key.slice(1)] = doc.actual[key];
    }
  }
  return normalizeSchedule({
    durationWeeks: doc.durationWeeks,
    startDate: doc.startDate,
    categorySchedules,
    actualProgress,
  });
}

/* ------------------------------------------------------------------ Kalkulator */

/** @param {Record<string, string>} values peta kunci kalkulator → string JSON */
export function calcToDoc(values) {
  const doc = {};
  for (const key of Object.keys(values || {})) {
    if (typeof values[key] === 'string') doc[encodeKey(key)] = values[key];
  }
  return Object.keys(doc).length ? doc : undefined;
}

export function docToCalc(doc) {
  const values = {};
  if (isPlainObject(doc)) {
    for (const key of Object.keys(doc)) {
      if (typeof doc[key] === 'string') values[decodeKey(key)] = doc[key];
    }
  }
  return values;
}

/* ------------------------------------------------------------------ Metadata proyek */

const round2 = (value) => Math.round(finite(value) * 100) / 100;

/** Ringkasan turunan dokumen yang ditampilkan di daftar Library. */
export function buildProjectSummary(state) {
  const { subtotal, ppnAmount, grandTotal, filledItemsCount } = calcTotals(state);
  const project = state?.project || {};
  return {
    name: text(project.name).trim() || 'Proyek Tanpa Nama',
    client: text(project.client).trim() || '-',
    location: text(project.location).trim() || '-',
    date: text(project.date),
    subtotal: round2(subtotal),
    ppn: !!state?.ppn,
    ppnAmount: round2(ppnAmount),
    grandTotal: round2(grandTotal),
    filledItemsCount,
    categoriesCount: Array.isArray(state?.categories) ? state.categories.length : 0,
  };
}

const toMillis = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toIso = (value, fallback) => {
  const ms = toMillis(value, NaN);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
};

export { toMillis, toIso };

/** Record `projects/<id>` → entri Library (tanpa snapshot). */
export function metaToEntry(id, meta) {
  // `createdAt` hanya ditulis saat proyek dibuat → record tanpa field ini adalah sisa tulisan
  // yang berpapasan dengan penghapusan, bukan proyek sungguhan.
  if (!isPlainObject(meta) || meta.createdAt === undefined) return null;
  const now = new Date().toISOString();
  const subtotal = finite(meta.subtotal);
  const ppn = !!meta.ppn;
  return {
    id,
    name: text(meta.name) || 'Proyek Tanpa Nama',
    client: text(meta.client) || '-',
    location: text(meta.location) || '-',
    date: text(meta.date) || now.slice(0, 10),
    subtotal,
    ppn,
    ppnAmount: meta.ppnAmount !== undefined ? finite(meta.ppnAmount) : ppn ? subtotal * PPN_RATE : 0,
    grandTotal: finite(meta.grandTotal),
    filledItemsCount: Math.round(finite(meta.filledItemsCount)),
    categoriesCount: Math.round(finite(meta.categoriesCount)),
    createdAt: toIso(meta.createdAt, now),
    updatedAt: toIso(meta.updatedAt ?? meta.createdAt, now),
    status: meta.status === 'draft' ? 'draft' : 'saved',
    owner: isPlainObject(meta.owner) ? { id: text(meta.owner.id), name: text(meta.owner.name) } : null,
    updatedBy: isPlainObject(meta.updatedBy)
      ? { id: text(meta.updatedBy.id), name: text(meta.updatedBy.name), role: text(meta.updatedBy.role) }
      : null,
    revisionCount: Math.max(0, Math.round(finite(meta.revisionCount))),
  };
}

/* ------------------------------------------------------------------ Revisi & sampah */

/**
 * Revisi dipecah dua: `index` (ringan, untuk daftar & rotasi) dan `data` (satu string JSON
 * berisi snapshot, sehingga atomik dan tidak ikut di-diff per field).
 */
export function encodeRevision(revision) {
  const index = {
    at: toMillis(revision.timestamp, Date.now()),
    note: text(revision.note) || 'Snapshot Revisi',
    grandTotal: round2(revision.grandTotal),
    subtotal: round2(revision.subtotal),
    filledItemsCount: Math.round(finite(revision.filledItemsCount)),
  };
  if (revision.auto) index.auto = true;
  if (revision.by) index.by = text(revision.by);
  const data = JSON.stringify({
    boq: canonicalDoc(revision.stateSnapshot),
    schedule: scheduleToDoc(revision.scheduleSnapshot) || null,
  });
  return { index, data };
}

/** @param {string} [data] string JSON snapshot; bila tidak ada, revisi dikembalikan tanpa snapshot */
export function decodeRevision(id, index, data) {
  if (!isPlainObject(index)) return null;
  let payload = null;
  try {
    payload = typeof data === 'string' ? JSON.parse(data) : null;
  } catch {
    payload = null;
  }
  const revision = {
    id,
    timestamp: toIso(index.at, new Date().toISOString()),
    note: text(index.note) || 'Snapshot Revisi',
    grandTotal: finite(index.grandTotal),
    subtotal: finite(index.subtotal),
    filledItemsCount: Math.round(finite(index.filledItemsCount)),
    stateSnapshot: payload?.boq ? docToState(payload.boq) : null,
  };
  if (index.auto) revision.auto = true;
  if (index.by) revision.by = text(index.by);
  const schedule = docToSchedule(payload?.schedule);
  if (schedule) revision.scheduleSnapshot = schedule;
  return revision;
}

/** Isi dokumen lengkap (boq + jadwal + kalkulator) sebagai string JSON untuk sampah/duplikasi. */
export function encodeDocBundle(bundle) {
  return JSON.stringify({
    boq: bundle?.boq || null,
    schedule: bundle?.schedule || null,
    calc: bundle?.calc || null,
  });
}

export function decodeDocBundle(json) {
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : null;
    return {
      boq: sanitizeTree(parsed?.boq),
      schedule: sanitizeTree(parsed?.schedule),
      calc: sanitizeTree(parsed?.calc),
    };
  } catch {
    return { boq: undefined, schedule: undefined, calc: undefined };
  }
}
