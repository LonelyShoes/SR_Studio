import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Memisahkan pustaka pihak ketiga yang besar agar cache browser tetap berlaku antar rilis. */
function vendorChunk(id) {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
  if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'vendor-firebase';
  return undefined;
}

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: true,
  },
  preview: {
    port: 4173,
    open: false,
  },
  build: {
    // xlsx (~430 kB) hanya dimuat saat ekspor Excel, jadi tidak perlu peringatan ukuran untuknya.
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
