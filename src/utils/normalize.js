import { ITEM_DATABASE } from '../data/itemDatabase';
import { parseNum } from './formatters';

/**
 * Normalisasi & perhitungan murni untuk state RAB/BoQ.
 * Tidak ada React di sini → mudah di-test dan dipakai ulang (context, cloud codec, ekspor).
 */

export const PPN_RATE = 0.11;
export const DEFAULT_SCHEDULE_WEEKS = 12;

const todayIso = () => new Date().toISOString().slice(0, 10);
const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};
const toInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};
const isOrder = (value) => typeof value === 'number' && Number.isFinite(value);

/** Mengembalikan `key` bila belum dipakai; jika bentrok diberi akhiran `__2`, `__3`, … */
function uniqueKey(key, seen) {
  let candidate = key;
  for (let n = 2; seen.has(candidate); n++) candidate = `${key}__${n}`;
  seen.add(candidate);
  return candidate;
}

/** Jadwal bawaan per kategori (proporsi terhadap durasi proyek). */
const SCHEDULE_PRESETS = {
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

export function getDefaultCategorySchedules(durationWeeks = DEFAULT_SCHEDULE_WEEKS, categories = []) {
  const scheduleMap = {};
  const cats = categories.length > 0 ? categories : ITEM_DATABASE.categories;
  cats.forEach((cat, idx) => {
    const key = cat.id || `cat-${idx}`;
    const preset = SCHEDULE_PRESETS[key] || {
      startRel: Math.min(0.85, (idx / cats.length) * 0.7),
      endRel: Math.min(1.0, ((idx + 2) / cats.length) * 0.9 + 0.1),
    };
    const startWeek = Math.max(1, Math.round(preset.startRel * (durationWeeks - 1)) + 1);
    const endWeek = Math.min(durationWeeks, Math.max(startWeek, Math.round(preset.endRel * durationWeeks)));
    scheduleMap[key] = { startWeek, endWeek };
  });
  return scheduleMap;
}

export function defaultSchedule(categories = [], today = todayIso()) {
  return {
    durationWeeks: DEFAULT_SCHEDULE_WEEKS,
    startDate: today,
    categorySchedules: getDefaultCategorySchedules(DEFAULT_SCHEDULE_WEEKS, categories),
    actualProgress: {},
  };
}

/** Menormalkan konfigurasi jadwal; mengembalikan `null` bila tidak valid. */
export function normalizeSchedule(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const durationWeeks = Math.max(2, Math.min(52, toInt(raw.durationWeeks) || 0));
  if (!durationWeeks) return null;

  const categorySchedules = {};
  const rawCats = raw.categorySchedules && typeof raw.categorySchedules === 'object' ? raw.categorySchedules : {};
  for (const catId of Object.keys(rawCats)) {
    const entry = rawCats[catId];
    if (!entry || typeof entry !== 'object') continue;
    const startWeek = Math.max(1, Math.min(durationWeeks, toInt(entry.startWeek) || 1));
    const endWeek = Math.max(startWeek, Math.min(durationWeeks, toInt(entry.endWeek) || startWeek));
    categorySchedules[catId] = { startWeek, endWeek };
  }

  const actualProgress = {};
  const rawActual = raw.actualProgress && typeof raw.actualProgress === 'object' ? raw.actualProgress : {};
  for (const week of Object.keys(rawActual)) {
    const value = parseFloat(rawActual[week]);
    if (Number.isFinite(value)) actualProgress[week] = Math.max(0, Math.min(100, value));
  }

  return {
    durationWeeks,
    startDate: typeof raw.startDate === 'string' && raw.startDate ? raw.startDate : todayIso(),
    categorySchedules,
    actualProgress,
  };
}

function databaseCategories() {
  return ITEM_DATABASE.categories.map((cat, cIdx) => ({
    id: cat.id,
    name: cat.name,
    custom: false,
    expanded: false,
    order: cIdx,
    items: cat.items.map((it, idx) => ({
      code: it[0],
      uraian: it[1],
      satuan: it[2],
      hargaDefault: it[3],
      harga: it[3],
      source: it[4],
      volume: 0,
      custom: false,
      key: `${cat.id}-${idx}`,
      order: idx,
    })),
  }));
}

export function blankState(today = todayIso()) {
  return {
    project: {
      name: '',
      location: '',
      date: today,
      client: '',
      clusterUnits: 1,
      clusterTypology: 'double',
      clusterRowUnits: 4,
      libraryId: null,
    },
    ppn: false,
    categories: databaseCategories(),
    pendingQueue: [],
  };
}

/**
 * Memberi nomor urut stabil (`order`) pada daftar. Urutan array dipertahankan:
 * elemen tanpa `order` (atau yang urutannya tidak naik) mendapat nilai setelah elemen sebelumnya.
 * Mengembalikan array yang sama bila tidak ada yang berubah.
 */
function withStableOrder(list) {
  let previous = -1;
  let changed = false;
  const next = list.map((entry) => {
    if (isOrder(entry.order) && entry.order > previous) {
      previous = entry.order;
      return entry;
    }
    previous += 1;
    changed = true;
    return { ...entry, order: previous };
  });
  return changed ? next : list;
}

/**
 * Menjamin setiap kategori, item, dan antrian punya `order` stabil.
 * Dipanggil setelah setiap mutasi state sehingga sinkronisasi cloud tidak pernah
 * menomori ulang elemen lama (yang akan memicu konflik antar pengguna).
 */
export function ensureOrder(state) {
  if (!state || !Array.isArray(state.categories)) return state;
  let changed = false;
  let categories = state.categories.map((cat) => {
    const items = withStableOrder(Array.isArray(cat.items) ? cat.items : []);
    if (items === cat.items) return cat;
    changed = true;
    return { ...cat, items };
  });
  const ordered = withStableOrder(categories);
  if (ordered !== categories) {
    categories = ordered;
    changed = true;
  }
  const queue = Array.isArray(state.pendingQueue) ? state.pendingQueue : [];
  const pendingQueue = withStableOrder(queue);
  if (pendingQueue !== state.pendingQueue) changed = true;
  return changed ? { ...state, categories, pendingQueue } : state;
}

function normalizeItem(raw, fallbackKey) {
  if (!raw || typeof raw !== 'object') return null;
  let uraian = raw.uraian;
  if (uraian && typeof uraian === 'object') uraian = uraian.uraian || uraian.name || uraian.label || '';
  let satuan = raw.satuan;
  if (satuan && typeof satuan === 'object') satuan = satuan.satuan || satuan.unit || '';

  const item = {
    code: typeof raw.code === 'string' ? raw.code : '',
    uraian: typeof uraian === 'string' ? uraian : String(uraian || ''),
    satuan: typeof satuan === 'string' ? satuan : String(satuan || ''),
    hargaDefault: typeof raw.hargaDefault === 'number' ? raw.hargaDefault : parseNum(raw.hargaDefault),
    harga: typeof raw.harga === 'number' ? raw.harga : parseNum(raw.harga),
    source: typeof raw.source === 'string' ? raw.source : '',
    volume: typeof raw.volume === 'number' ? raw.volume : parseNum(raw.volume),
    custom: !!raw.custom,
    key: raw.key ? String(raw.key) : fallbackKey,
    originalVolume: raw.originalVolume !== undefined ? Number(raw.originalVolume) : undefined,
    sharedWallReduced: !!raw.sharedWallReduced,
    sharedWallPercent: raw.sharedWallPercent !== undefined ? Number(raw.sharedWallPercent) : undefined,
  };
  if (!Number.isFinite(item.hargaDefault)) item.hargaDefault = 0;
  if (!Number.isFinite(item.harga)) item.harga = 0;
  if (!Number.isFinite(item.volume)) item.volume = 0;
  if (isOrder(raw.order)) item.order = raw.order;
  return item;
}

function normalizeQueueItem(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const label = String(raw.label || raw.uraian || 'Material Kalkulator');
  const amount = Number(raw.jumlah !== undefined ? raw.jumlah : raw.volume) || 0;
  const entry = {
    id: raw.id ? String(raw.id) : `queue_legacy_${index}`,
    category: String(raw.category || 'struktur'),
    label,
    uraian: label,
    satuan: String(raw.satuan || 'ls'),
    jumlah: amount,
    volume: amount,
    harga: Number(raw.harga) || 0,
    source: String(raw.source || 'Kalkulator'),
  };
  if (isOrder(raw.order)) entry.order = raw.order;
  return entry;
}

export function normalizeProject(rawProject, today = todayIso()) {
  const raw = rawProject && typeof rawProject === 'object' ? rawProject : {};
  const clusterUnits = Math.max(1, toInt(raw.clusterUnits) || 1);
  const project = {
    name: typeof raw.name === 'string' ? raw.name : '',
    location: typeof raw.location === 'string' ? raw.location : '',
    date: typeof raw.date === 'string' && raw.date ? raw.date : today,
    client: typeof raw.client === 'string' ? raw.client : '',
    clusterUnits,
    clusterTypology: raw.clusterTypology === 'shared' ? 'shared' : 'double',
    clusterRowUnits: Math.max(2, toInt(raw.clusterRowUnits) || toInt(raw.clusterUnits) || 4),
    libraryId: raw.libraryId || null,
  };
  // Luas bangunan per unit (m²) dipakai untuk biaya/m². Sebelumnya terbuang saat normalisasi.
  const area = parseNum(raw.buildingAreaPerUnit ?? raw.buildingArea);
  if (area > 0) project.buildingAreaPerUnit = area;
  return project;
}

/**
 * @param {object} rawState
 * @param {{ allowEmptyCategories?: boolean }} [options] `allowEmptyCategories` dipakai untuk
 *   dokumen cloud, di mana daftar kategori kosong adalah keadaan sah (bukan data rusak).
 */
export function normalizeState(rawState, options = {}) {
  const today = todayIso();
  if (!rawState || typeof rawState !== 'object') return blankState(today);

  const rawCategories = asArray(rawState.categories);
  const useDatabase = rawCategories.length === 0 && !options.allowEmptyCategories;
  const seenCategoryIds = new Set();
  const categories = useDatabase
    ? databaseCategories()
    : rawCategories
        .map((cat, cIdx) => {
          if (!cat || typeof cat !== 'object') return null;
          // Id kategori & key item wajib unik: di cloud keduanya menjadi kunci path.
          const id = uniqueKey(cat.id ? String(cat.id) : `cat-${cIdx}`, seenCategoryIds);
          const seenItemKeys = new Set();
          const items = asArray(cat.items)
            .map((it, iIdx) => {
              const item = normalizeItem(it, `${id}-${iIdx}`);
              if (item) item.key = uniqueKey(item.key, seenItemKeys);
              return item;
            })
            .filter(Boolean);
          const category = {
            id,
            name: typeof cat.name === 'string' ? cat.name : `Kategori ${cIdx + 1}`,
            custom: !!cat.custom,
            expanded: !!cat.expanded,
            items,
          };
          if (isOrder(cat.order)) category.order = cat.order;
          return category;
        })
        .filter(Boolean);

  const fallbackToDatabase = categories.length === 0 && !options.allowEmptyCategories;
  return ensureOrder({
    project: normalizeProject(rawState.project, today),
    ppn: !!rawState.ppn,
    categories: fallbackToDatabase ? databaseCategories() : categories,
    pendingQueue: asArray(rawState.pendingQueue).map(normalizeQueueItem).filter(Boolean),
  });
}

export function calcTotals(state) {
  const categories = Array.isArray(state?.categories) ? state.categories : [];
  let subtotal = 0;
  let filledItemsCount = 0;
  for (const cat of categories) {
    for (const it of Array.isArray(cat?.items) ? cat.items : []) {
      if (!it) continue;
      const volume = Number(it.volume) || 0;
      subtotal += (Number(it.harga) || 0) * volume;
      if (volume > 0) filledItemsCount += 1;
    }
  }
  const ppnAmount = state?.ppn ? subtotal * PPN_RATE : 0;
  return { subtotal, ppnAmount, grandTotal: subtotal + ppnAmount, filledItemsCount };
}

/**
 * True bila state berisi sesuatu yang layak disimpan: identitas proyek, volume terisi,
 * item/kategori kustom, antrian kalkulator, atau PPN aktif.
 */
export function isMeaningfulState(state) {
  if (!state) return false;
  const project = state.project || {};
  if ((project.name || '').trim() || (project.client || '').trim() || (project.location || '').trim()) return true;
  if (state.ppn) return true;
  if (Array.isArray(state.pendingQueue) && state.pendingQueue.length > 0) return true;
  for (const cat of Array.isArray(state.categories) ? state.categories : []) {
    if (cat.custom) return true;
    for (const it of cat.items || []) {
      if (it.custom || (Number(it.volume) || 0) > 0 || it.harga !== it.hargaDefault) return true;
    }
  }
  return false;
}

function normalizeRevision(rev, now) {
  if (!rev || typeof rev !== 'object') return null;
  const revision = {
    id: rev.id || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: rev.timestamp || now,
    note: rev.note || 'Snapshot Revisi',
    grandTotal: typeof rev.grandTotal === 'number' ? rev.grandTotal : 0,
    subtotal: typeof rev.subtotal === 'number' ? rev.subtotal : 0,
    filledItemsCount: typeof rev.filledItemsCount === 'number' ? rev.filledItemsCount : 0,
    stateSnapshot: rev.stateSnapshot ? normalizeState(rev.stateSnapshot) : null,
  };
  if (rev.auto) revision.auto = true;
  if (rev.by) revision.by = String(rev.by);
  const schedule = normalizeSchedule(rev.scheduleSnapshot);
  if (schedule) revision.scheduleSnapshot = schedule;
  return revision;
}

export function normalizeLibraryProject(proj) {
  if (!proj || typeof proj !== 'object') return null;
  const now = new Date().toISOString();
  const stateSnapshot = proj.stateSnapshot ? normalizeState(proj.stateSnapshot) : null;
  const revisions = asArray(proj.revisions).map((rev) => normalizeRevision(rev, now)).filter(Boolean);

  let subtotal = typeof proj.subtotal === 'number' ? proj.subtotal : 0;
  let filledItemsCount = typeof proj.filledItemsCount === 'number' ? proj.filledItemsCount : 0;
  if (stateSnapshot) ({ subtotal, filledItemsCount } = calcTotals(stateSnapshot));

  const ppn = stateSnapshot ? stateSnapshot.ppn : !!proj.ppn;
  const ppnAmount = ppn ? subtotal * PPN_RATE : 0;
  // Dengan snapshot, total selalu dihitung ulang agar tidak pernah menampilkan angka basi.
  const grandTotal = stateSnapshot
    ? subtotal + ppnAmount
    : typeof proj.grandTotal === 'number' && proj.grandTotal > 0
      ? proj.grandTotal
      : subtotal + ppnAmount;

  const entry = {
    id: proj.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: proj.name || stateSnapshot?.project?.name || 'Proyek Tanpa Nama',
    client: proj.client || stateSnapshot?.project?.client || '-',
    location: proj.location || stateSnapshot?.project?.location || '-',
    date: proj.date || stateSnapshot?.project?.date || now.slice(0, 10),
    grandTotal,
    subtotal,
    ppn,
    ppnAmount,
    filledItemsCount,
    categoriesCount: stateSnapshot?.categories?.length || (Array.isArray(proj.categories) ? proj.categories.length : 0),
    createdAt: proj.createdAt || now,
    updatedAt: proj.updatedAt || proj.createdAt || now,
    stateSnapshot,
    revisions,
  };
  const schedule = normalizeSchedule(proj.scheduleSnapshot);
  if (schedule) entry.scheduleSnapshot = schedule;
  if (proj.calcSnapshot && typeof proj.calcSnapshot === 'object') entry.calcSnapshot = proj.calcSnapshot;
  return entry;
}

export function normalizeLibrary(list) {
  return asArray(list).map(normalizeLibraryProject).filter(Boolean);
}
