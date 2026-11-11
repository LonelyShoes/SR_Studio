/**
 * Utilitas pohon JSON murni untuk sinkronisasi realtime.
 *
 * "Pohon" = nilai yang aman disimpan di Firebase Realtime Database:
 * objek polos, string, angka terhingga, atau boolean. Tidak ada array, `undefined`,
 * `null`, NaN, maupun objek kosong (RTDB tidak menyimpan node kosong).
 *
 * Tiga operasi inti:
 *  - diffTree(base, next)   → patch multi-path minimal ({ 'a/b': nilai | null })
 *  - applyPatch(tree, patch)→ pohon baru hasil penerapan patch
 *  - mergeRemote(base, local, remote) → 3-way merge: perubahan lokal yang belum
 *    terkirim dipertahankan di atas data terbaru dari server.
 */

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Menormalkan nilai sembarang menjadi pohon valid. Mengembalikan `undefined` bila kosong. */
export function sanitizeTree(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    // RTDB bisa mengembalikan array untuk kunci numerik rapat → jadikan objek berindeks.
    const out = {};
    value.forEach((item, index) => {
      const clean = sanitizeTree(item);
      if (clean !== undefined) out[index] = clean;
    });
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      const clean = sanitizeTree(value[key]);
      if (clean !== undefined) out[key] = clean;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

export function treeEqual(a, b) {
  if (a === b) return true;
  const aObj = isPlainObject(a);
  const bObj = isPlainObject(b);
  if (aObj !== bObj) return false;
  if (!aObj) return (a ?? null) === (b ?? null);
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!treeEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Patch minimal dari `base` ke `next`. Tidak pernah menghasilkan path yang saling
 * menjadi leluhur (syarat multi-path update RTDB).
 */
export function diffTree(base, next, prefix = '', out = {}) {
  const baseObj = isPlainObject(base);
  const nextObj = isPlainObject(next);

  if (baseObj && nextObj) {
    for (const key of Object.keys(base)) {
      if (!Object.prototype.hasOwnProperty.call(next, key)) out[prefix + key] = null;
    }
    for (const key of Object.keys(next)) {
      const path = prefix + key;
      if (!Object.prototype.hasOwnProperty.call(base, key)) out[path] = next[key];
      else diffTree(base[key], next[key], `${path}/`, out);
    }
    return out;
  }

  if (prefix === '') {
    // Akar: tidak ada path kosong di multi-path update → pecah per kunci tingkat atas.
    if (nextObj) {
      for (const key of Object.keys(next)) out[key] = next[key];
    } else if (baseObj) {
      for (const key of Object.keys(base)) out[key] = null;
    }
    return out;
  }

  if (!treeEqual(base, next)) out[prefix.slice(0, -1)] = next === undefined ? null : next;
  return out;
}

export const isEmptyPatch = (patch) => !patch || Object.keys(patch).length === 0;

/** Menerapkan patch multi-path. Tidak memutasi `tree`; cabang yang tidak berubah dipakai ulang. */
export function applyPatch(tree, patch) {
  if (isEmptyPatch(patch)) return tree;
  let root = isPlainObject(tree) ? { ...tree } : {};
  const cloned = new WeakSet([root]);

  for (const path of Object.keys(patch)) {
    const value = patch[path];
    const segments = path.split('/');
    const lastIndex = segments.length - 1;
    const trail = [root];
    let node = root;
    let missing = false;

    for (let i = 0; i < lastIndex; i++) {
      const key = segments[i];
      let child = node[key];
      if (!isPlainObject(child)) {
        if (value === null || value === undefined) {
          missing = true; // menghapus sesuatu yang memang tidak ada
          break;
        }
        child = {};
        cloned.add(child);
        node[key] = child;
      } else if (!cloned.has(child)) {
        child = { ...child };
        cloned.add(child);
        node[key] = child;
      }
      node = child;
      trail.push(node);
    }
    if (missing) continue;

    const leaf = segments[lastIndex];
    if (value === null || value === undefined) {
      delete node[leaf];
      // Pangkas induk yang menjadi kosong (meniru perilaku RTDB).
      for (let i = trail.length - 1; i > 0; i--) {
        if (Object.keys(trail[i]).length > 0) break;
        delete trail[i - 1][segments[i - 1]];
      }
    } else {
      node[leaf] = value;
    }
  }

  return Object.keys(root).length ? root : undefined;
}

/**
 * 3-way merge: `remote` adalah data terbaru server, `base` adalah titik sinkron terakhir,
 * `local` adalah keadaan lokal. Perubahan lokal (base→local) menang pada path yang sama,
 * selebihnya mengikuti server.
 */
export function mergeRemote(base, local, remote) {
  return applyPatch(remote, diffTree(base, local));
}

/** Mengawali setiap path patch dengan `prefix` (untuk update dari akar workspace). */
export function prefixPatch(patch, prefix) {
  const out = {};
  for (const path of Object.keys(patch)) out[`${prefix}/${path}`] = patch[path];
  return out;
}

/** Hanya mempertahankan kunci tingkat atas `tree` yang juga ada di `reference`. */
export function pickKeys(tree, reference) {
  if (!isPlainObject(tree) || !isPlainObject(reference)) return undefined;
  const out = {};
  for (const key of Object.keys(tree)) {
    if (Object.prototype.hasOwnProperty.call(reference, key)) out[key] = tree[key];
  }
  return Object.keys(out).length ? out : undefined;
}
