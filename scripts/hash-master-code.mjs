/**
 * Membuat hash untuk Master Code baru.
 *
 *   npm run hash:master -- <kode-baru>
 *
 * Salin hasilnya ke environment variable VITE_MASTER_CODE_HASH (Vercel → Settings →
 * Environment Variables, atau `.env.local`), lalu build/deploy ulang. Kode aslinya tidak
 * pernah perlu disimpan di repositori.
 */
import { pbkdf2Sync } from 'node:crypto';
import { MASTER_CODE_ITERATIONS, MASTER_CODE_SALT } from '../src/services/cloud/config.js';

const code = (process.argv[2] || '').trim();

if (code.length < 8) {
  console.error('Pemakaian: npm run hash:master -- <kode-baru>   (minimal 8 karakter; disarankan gabungan huruf & angka)');
  process.exit(1);
}

const hash = pbkdf2Sync(code, MASTER_CODE_SALT, MASTER_CODE_ITERATIONS, 32, 'sha256').toString('hex');
console.log('\nVITE_MASTER_CODE_HASH=' + hash);
console.log('\nSet nilai di atas sebagai environment variable, lalu jalankan build/deploy ulang.');
