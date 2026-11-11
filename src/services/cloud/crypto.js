/**
 * Primitif kripto kecil: SHA-256, HMAC, PBKDF2, dan angka acak.
 *
 * Memakai WebCrypto bila tersedia (HTTPS/localhost). Pada konteks tidak aman
 * (mis. `http://192.168.x.x` saat uji di jaringan lokal) `crypto.subtle` tidak ada,
 * sehingga disediakan implementasi JavaScript murni dengan hasil identik.
 */

const encoder = new TextEncoder();
const toBytes = (input) => (typeof input === 'string' ? encoder.encode(input) : input);

export const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]);

/** SHA-256 JavaScript murni. @returns {Uint8Array} 32 byte */
export function sha256Sync(input) {
  const message = toBytes(input);
  const bitLength = message.length * 8;
  const paddedLength = (((message.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (hh + s1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

function hmacSha256Sync(keyBytes, message) {
  let key = keyBytes;
  if (key.length > 64) key = sha256Sync(key);
  const inner = new Uint8Array(64 + message.length);
  const outer = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    const byte = key[i] || 0;
    inner[i] = byte ^ 0x36;
    outer[i] = byte ^ 0x5c;
  }
  inner.set(message, 64);
  outer.set(sha256Sync(inner), 64);
  return sha256Sync(outer);
}

/** PBKDF2-HMAC-SHA256 JavaScript murni (satu blok, 32 byte). */
export function pbkdf2Sync(password, salt, iterations) {
  const key = toBytes(password);
  const saltBytes = toBytes(salt);
  const first = new Uint8Array(saltBytes.length + 4);
  first.set(saltBytes);
  first[saltBytes.length + 3] = 1;
  let u = hmacSha256Sync(key, first);
  const out = Uint8Array.from(u);
  for (let i = 1; i < iterations; i++) {
    u = hmacSha256Sync(key, u);
    for (let j = 0; j < 32; j++) out[j] ^= u[j];
  }
  return out;
}

const subtle = () => globalThis.crypto?.subtle;

/** @returns {Promise<string>} hex 64 karakter */
export async function sha256Hex(input) {
  const api = subtle();
  if (api) return toHex(new Uint8Array(await api.digest('SHA-256', toBytes(input))));
  return toHex(sha256Sync(input));
}

/** @returns {Promise<string>} hex 64 karakter */
export async function pbkdf2Hex(password, salt, iterations) {
  const api = subtle();
  if (api) {
    const key = await api.importKey('raw', toBytes(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await api.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: toBytes(salt), iterations },
      key,
      256
    );
    return toHex(new Uint8Array(bits));
  }
  return toHex(pbkdf2Sync(password, salt, iterations));
}

/** Perbandingan string tanpa bocor waktu (panjang sama dibandingkan penuh). */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

export const randomHex = (byteLength = 8) => toHex(randomBytes(byteLength));

/** Deretan digit acak tanpa bias modulo. */
export function randomDigits(length = 6) {
  let digits = '';
  while (digits.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 250 && digits.length < length) digits += String(byte % 10);
    }
  }
  return digits;
}
