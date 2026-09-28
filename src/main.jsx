import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Crash Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '3rem auto', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#b91c1c', fontSize: '1.5rem', marginBottom: '1rem' }}>Terjadi Kendala Memuat Aplikasi</h2>
          <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'Terjadi kesalahan internal pada peramban web.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('sr_studio_boq_state_v2');
                  localStorage.removeItem('sr_studio_active_library_id_v2');
                } catch (e) {}
                window.location.reload();
              }}
              style={{ padding: '0.625rem 1.25rem', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Reset Cache & Muat Ulang
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.625rem 1.25rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// PWA: service worker hanya di build produksi (agar tidak mengganggu HMR saat `npm run dev`)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('[SR Studio] Registrasi service worker gagal:', err);
    });
  });
}

// Minta browser agar localStorage tidak dihapus otomatis saat ruang disk menipis
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
