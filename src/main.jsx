import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { STORAGE_KEYS } from './services/cloud/config.js';

const RELOAD_GUARD_KEY = 'sr_studio_chunk_reload_at';

/**
 * Setelah deploy baru, tab yang masih terbuka bisa meminta potongan kode (chunk) versi lama
 * yang sudah tidak ada. Muat ulang satu kali agar pengguna langsung mendapat versi terbaru.
 */
function reloadOnceForStaleChunk() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
    if (Date.now() - last < 60000) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SR Studio] Aplikasi berhenti karena error:', error, errorInfo);
    if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(error?.message))) {
      reloadOnceForStaleChunk();
    }
  }

  resetWorkspaceAndReload = () => {
    // Hanya area kerja perangkat ini yang dikosongkan; proyek di cloud & Library tidak tersentuh.
    try {
      localStorage.removeItem(STORAGE_KEYS.boqState);
      localStorage.removeItem(STORAGE_KEYS.activeDocId);
      localStorage.removeItem(STORAGE_KEYS.syncBase);
    } catch {
      // Storage tidak tersedia → cukup muat ulang.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{ padding: '2rem', maxWidth: '600px', margin: '3rem auto', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
      >
        <h2 style={{ color: '#b91c1c', fontSize: '1.5rem', marginBottom: '1rem' }}>Terjadi Kendala Memuat Aplikasi</h2>
        <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          {this.state.error?.message || 'Terjadi kesalahan internal pada peramban web.'}
        </p>
        <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
          Proyek Anda aman di cloud. &ldquo;Kosongkan Area Kerja&rdquo; hanya mereset tampilan kerja di perangkat ini.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Muat Ulang
          </button>
          <button
            type="button"
            onClick={this.resetWorkspaceAndReload}
            style={{ padding: '0.625rem 1.25rem', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Kosongkan Area Kerja & Muat Ulang
          </button>
        </div>
      </div>
    );
  }
}

// PWA: service worker hanya di build produksi (agar tidak mengganggu HMR saat `npm run dev`).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('[SR Studio] Registrasi service worker gagal:', error);
    });
  });

  // Versi baru aktif → terapkan saat tab disembunyikan, supaya tidak memotong orang yang sedang mengetik.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    const applyUpdate = () => {
      if (document.visibilityState === 'hidden') setTimeout(() => window.location.reload(), 0);
    };
    document.addEventListener('visibilitychange', applyUpdate);
  });
}

// Minta browser agar penyimpanan lokal tidak dihapus otomatis saat ruang disk menipis.
navigator.storage?.persist?.().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
