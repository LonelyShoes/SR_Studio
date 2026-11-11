/**
 * Parameter turunan kunci (PBKDF2-HMAC-SHA256) untuk Master Code.
 * Dipisah dari `config.js` agar bisa diimpor skrip Node biasa (`npm run hash:master`)
 * tanpa bergantung pada `import.meta.env` milik Vite.
 * Mengubah nilai di sini membuat semua hash Master Code lama tidak berlaku.
 */
export const MASTER_CODE_SALT = 'sr-studio:master:v1';
export const MASTER_CODE_ITERATIONS = 100000;
