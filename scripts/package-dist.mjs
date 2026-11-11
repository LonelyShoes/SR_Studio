#!/usr/bin/env node
/**
 * Mengemas folder `dist/` menjadi `sr-studio-vercel-dist.zip` (untuk deploy drag & drop).
 * Penulis ZIP kecil berbasis `node:zlib` — tanpa dependensi dan tanpa alat sistem, sehingga
 * hasilnya sama di Windows, macOS, maupun Linux.
 *
 *   npm run package
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const output = resolve(root, 'sr-studio-vercel-dist.zip');

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('Folder dist/ belum ada. Jalankan `npm run build` terlebih dahulu.');
  process.exit(1);
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => (entry.isDirectory() ? listFiles(join(directory, entry.name)) : [join(directory, entry.name)]));
}

/** Waktu & tanggal dalam format MS-DOS yang dipakai ZIP. */
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

const localParts = [];
const centralParts = [];
let offset = 0;
const files = listFiles(dist);

for (const file of files) {
  const name = Buffer.from(relative(dist, file).split('\\').join('/'), 'utf8');
  const data = readFileSync(file);
  const compressed = deflateRawSync(data, { level: 9 });
  const { time, day } = dosDateTime(statSync(file).mtime);
  const checksum = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); // local file header
  local.writeUInt16LE(20, 4); // versi minimum
  local.writeUInt16LE(0x0800, 6); // nama berkas UTF-8
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(day, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); // central directory header
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(day, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42); // posisi local header

  localParts.push(local, name, compressed);
  centralParts.push(central, name);
  offset += local.length + name.length + compressed.length;
}

const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); // end of central directory
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(output, Buffer.concat([...localParts, ...centralParts, end]));
console.log(`Arsip siap: ${output} — ${files.length} berkas, ${(statSync(output).size / 1024).toFixed(0)} kB`);
