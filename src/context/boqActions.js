/**
 * Transisi state BoQ/RAB murni: (state, ...argumen) → state baru.
 *
 * Tidak ada React, storage, maupun efek samping di sini. Provider hanya memanggil fungsi-fungsi
 * ini lewat `setState`, sehingga logikanya mudah diuji dan aman dipanggil ganda (StrictMode).
 */

import { parseNum } from '../utils/formatters';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const mapCategory = (state, catId, mapper) => ({
  ...state,
  categories: state.categories.map((cat) => (cat.id === catId ? mapper(cat) : cat)),
});

const mapItem = (state, catId, itemKey, mapper) =>
  mapCategory(state, catId, (cat) => ({
    ...cat,
    items: cat.items.map((item) => (item.key === itemKey ? mapper(item) : item)),
  }));

/* ------------------------------------------------------------------ Proyek */

export const setProjectField = (state, field, value) => ({
  ...state,
  project: { ...state.project, [field]: value },
});

export const togglePpn = (state) => ({ ...state, ppn: !state.ppn });

/* ------------------------------------------------------------------ Kategori */

export const toggleCategoryExpand = (state, catId) =>
  mapCategory(state, catId, (cat) => ({ ...cat, expanded: !cat.expanded }));

export const expandAllCategories = (state, expanded = true) => ({
  ...state,
  categories: state.categories.map((cat) => ({ ...cat, expanded })),
});

export const renameCategory = (state, catId, name) => mapCategory(state, catId, (cat) => ({ ...cat, name }));

export function addCategory(state, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return state;
  return {
    ...state,
    categories: [...state.categories, { id: uid('custom'), name: trimmed, custom: true, expanded: true, items: [] }],
  };
}

export const removeCategory = (state, catId) => ({
  ...state,
  categories: state.categories.filter((cat) => cat.id !== catId),
});

/* ------------------------------------------------------------------ Item */

/**
 * Menerima bentuk lama `(uraian, satuan, harga, volume)` maupun objek
 * `{ uraian|label, satuan, harga|hargaDefault, volume|jumlah, source, code }`.
 */
export function normalizeCustomItemInput(uraianOrObject, satuan, harga, volume = 0) {
  const isObject = uraianOrObject !== null && typeof uraianOrObject === 'object';
  const source = isObject ? uraianOrObject : { uraian: uraianOrObject, satuan, harga, volume };
  const price = parseNum(source.harga ?? source.hargaDefault ?? 0);
  return {
    code: (isObject && source.code) || 'CUST',
    uraian: String(source.uraian || source.label || '').trim(),
    satuan: String(source.satuan || 'ls').trim(),
    hargaDefault: price,
    harga: price,
    source: (isObject && source.source) || 'Custom Manual',
    volume: parseNum(source.volume ?? source.jumlah ?? 0),
    custom: true,
  };
}

export function addCustomItem(state, catId, input) {
  if (!input.uraian) return state;
  return mapCategory(state, catId, (cat) => ({ ...cat, items: [...cat.items, { ...input, key: uid('cust') }] }));
}

export const setItemVolume = (state, catId, itemKey, value) =>
  mapItem(state, catId, itemKey, (item) => ({ ...item, volume: Math.max(0, parseNum(value)) }));

export const setItemPrice = (state, catId, itemKey, value) =>
  mapItem(state, catId, itemKey, (item) => ({ ...item, harga: Math.max(0, parseNum(value)) }));

const fieldText = (value, key) =>
  value !== null && typeof value === 'object' ? String(value[key] || '') : String(value ?? '');

/** Memperbarui uraian/satuan/harga item. Field yang `undefined` tidak diubah. */
export function updateCustomItem(state, catId, itemKey, uraianOrObject, maybeSatuan, maybeHarga) {
  const isObject = uraianOrObject !== null && typeof uraianOrObject === 'object';
  const next = isObject
    ? { uraian: uraianOrObject.uraian, satuan: uraianOrObject.satuan, harga: uraianOrObject.harga }
    : { uraian: uraianOrObject, satuan: maybeSatuan, harga: maybeHarga };
  return mapItem(state, catId, itemKey, (item) => ({
    ...item,
    uraian: next.uraian !== undefined ? fieldText(next.uraian, 'uraian') : item.uraian,
    satuan: next.satuan !== undefined ? fieldText(next.satuan, 'satuan') : item.satuan,
    harga: next.harga !== undefined ? parseNum(next.harga) : item.harga,
  }));
}

/** Item kustom dihapus; item standar dikembalikan ke volume 0 & harga bawaan. */
export function deleteOrResetItem(state, catId, itemKey) {
  return mapCategory(state, catId, (cat) => {
    const item = cat.items.find((it) => it.key === itemKey);
    if (!item) return cat;
    if (item.custom) return { ...cat, items: cat.items.filter((it) => it.key !== itemKey) };
    return {
      ...cat,
      items: cat.items.map((it) => (it.key === itemKey ? { ...it, volume: 0, harga: it.hargaDefault } : it)),
    };
  });
}

/* ------------------------------------------------------------------ Tenaga kerja (HOK) */

/** Menerapkan alokasi HOK tenaga kerja ke kategori upah (dibuat bila belum ada). */
export function applyLaborTakeoff(state, laborItems, targetCategoryId = 'upah_tenaga') {
  if (!Array.isArray(laborItems) || laborItems.length === 0) return state;
  const categories = state.categories.some((cat) => cat.id === targetCategoryId)
    ? state.categories
    : [...state.categories, { id: targetCategoryId, name: 'Upah & Tenaga Kerja (HOK SNI)', custom: false, expanded: true, items: [] }];

  return {
    ...state,
    categories: categories.map((cat) => {
      if (cat.id !== targetCategoryId) return cat;
      const items = [...cat.items];
      for (const labor of laborItems) {
        const quantity = Math.round((parseFloat(labor.quantity) || 0) * 100) / 100;
        const price = parseFloat(labor.priceDefault || labor.harga || 145000);
        const name = String(labor.name || '').trim();
        if (quantity <= 0 || !name) continue;
        const index = items.findIndex((item) => item.uraian.toLowerCase().trim() === name.toLowerCase());
        if (index >= 0) {
          items[index] = {
            ...items[index],
            volume: quantity,
            harga: price > 0 ? price : items[index].harga,
            source: 'HOK Otomatis SNI',
          };
        } else {
          items.push({
            code: 'HOK',
            uraian: name,
            satuan: 'OH',
            hargaDefault: price,
            harga: price,
            source: 'HOK Otomatis SNI',
            volume: quantity,
            custom: true,
            key: uid('hok'),
          });
        }
      }
      return { ...cat, items, expanded: true };
    }),
  };
}

/* ------------------------------------------------------------------ Dinding bersama */

/** @returns {{ state: object, count: number }} */
export function applySharedWallReduction(state, itemKeyMap, reductionPercent = 25) {
  const factor = (100 - reductionPercent) / 100;
  let count = 0;
  const categories = state.categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => {
      if (!itemKeyMap[item.key]) return item;
      count += 1;
      const originalVolume = item.originalVolume !== undefined ? item.originalVolume : item.volume || 0;
      return {
        ...item,
        originalVolume,
        volume: +(originalVolume * factor).toFixed(2),
        sharedWallReduced: true,
        sharedWallPercent: reductionPercent,
      };
    }),
  }));
  return { state: { ...state, categories }, count };
}

/** @returns {{ state: object, count: number }} */
export function revertSharedWallReduction(state, itemKeys = null) {
  let count = 0;
  const categories = state.categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => {
      if (!item.sharedWallReduced || (itemKeys && !itemKeys.includes(item.key))) return item;
      count += 1;
      const { originalVolume, ...rest } = item;
      delete rest.sharedWallPercent;
      return { ...rest, volume: originalVolume !== undefined ? originalVolume : item.volume, sharedWallReduced: false };
    }),
  }));
  return { state: { ...state, categories }, count };
}

/* ------------------------------------------------------------------ Antrian kalkulator */

const CATEGORY_ALIASES = {
  arsitektur: 'dinding',
  sanitasi: 'mep',
  pondasi: 'tanah_pondasi',
  beton: 'struktur',
  besi: 'struktur',
  tulangan: 'struktur',
  kusen: 'pintu_jendela',
  pintu: 'pintu_jendela',
  jendela: 'pintu_jendela',
  kusen_pintu_jendela: 'pintu_jendela',
  keramik: 'lantai',
  cat: 'dinding',
  plester: 'dinding',
  finishing: 'dinding',
  finishing_cat: 'dinding',
  plafon: 'plafond',
  gypsum: 'plafond',
  kuda_kuda: 'atap',
  genteng: 'atap',
  spandek: 'atap',
};

/** Memetakan kategori usulan kalkulator ke kategori BoQ yang tersedia. */
export function resolveCategory(catId, categories) {
  if (!categories || categories.length === 0) return null;
  const raw = String(catId || '').toLowerCase();
  const targetId = CATEGORY_ALIASES[raw] || raw;
  return (
    categories.find((cat) => cat.id === targetId) ||
    categories.find((cat) => cat.name.toLowerCase().includes(targetId) || targetId.includes(cat.id)) ||
    categories.find((cat) => cat.id === 'struktur') ||
    categories[0]
  );
}

export function formatQueueItems(items) {
  return items.map((item) => {
    const amount = item.jumlah !== undefined ? Number(item.jumlah) : Number(item.volume) || 0;
    const label = item.label || item.uraian || 'Material Kalkulator';
    let category = item.category || 'struktur';
    if (category === 'arsitektur') category = 'plafond';
    if (category === 'sanitasi') category = 'mep';
    return {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category,
      label,
      uraian: label,
      satuan: item.satuan || 'ls',
      jumlah: Number.isFinite(amount) ? amount : 0,
      volume: Number.isFinite(amount) ? amount : 0,
      harga: Number(item.harga) || 0,
      source: item.source || 'Kalkulator',
    };
  });
}

export const enqueueItems = (state, queueItems) => ({
  ...state,
  pendingQueue: [...(state.pendingQueue || []), ...queueItems],
});

/** Menerapkan satu usulan ke daftar kategori (immutabel). `target` = '__new__' atau 'catId::itemKey'. */
function applyQueueItem(categories, queueItem, target) {
  const quantity = queueItem.jumlah !== undefined ? queueItem.jumlah : queueItem.volume || 0;
  const price = queueItem.harga || 0;

  if (target && target !== '__new__') {
    const [targetCatId, targetItemKey] = target.split('::');
    return categories.map((cat) =>
      cat.id !== targetCatId
        ? cat
        : {
            ...cat,
            items: cat.items.map((item) =>
              item.key !== targetItemKey
                ? item
                : { ...item, volume: (item.volume || 0) + quantity, harga: price > 0 && !item.harga ? price : item.harga }
            ),
          }
    );
  }

  const destination = resolveCategory(queueItem.category, categories);
  if (!destination) return categories;
  const newItem = {
    code: 'CALC',
    uraian: queueItem.label || queueItem.uraian || 'Material Kalkulator',
    satuan: queueItem.satuan || 'ls',
    hargaDefault: price,
    harga: price,
    source: queueItem.source || 'Kalkulator',
    volume: quantity,
    custom: true,
    key: uid('calc'),
  };
  return categories.map((cat) => (cat.id === destination.id ? { ...cat, items: [...cat.items, newItem] } : cat));
}

export function applyPendingItem(state, queueId, target = '__new__') {
  const queue = state.pendingQueue || [];
  const queueItem = queue.find((entry) => entry.id === queueId);
  if (!queueItem) return state;
  return {
    ...state,
    categories: applyQueueItem(state.categories, queueItem, target),
    pendingQueue: queue.filter((entry) => entry.id !== queueId),
  };
}

export function applyAllPendingItems(state, targetMap = {}) {
  const queue = state.pendingQueue || [];
  if (queue.length === 0) return state;
  const categories = queue.reduce(
    (acc, queueItem) => applyQueueItem(acc, queueItem, targetMap[queueItem.id] || '__new__'),
    state.categories
  );
  return { ...state, categories, pendingQueue: [] };
}

export const dismissPendingItem = (state, queueId) => ({
  ...state,
  pendingQueue: (state.pendingQueue || []).filter((entry) => entry.id !== queueId),
});

export const clearPendingItems = (state) => ({ ...state, pendingQueue: [] });
