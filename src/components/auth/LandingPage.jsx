import React, { useState } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  ShieldCheck, 
  Smartphone, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  Building2, 
  Calculator, 
  Layers, 
  FileSpreadsheet, 
  Cloud, 
  Check, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  HardHat,
  Cpu,
  BookmarkPlus
} from 'lucide-react';
import { FIXED_MASTER_CODE, FIXED_MASTER_EMAIL } from '../../services/cloudLibraryService';

export function LandingPage() {
  const { selectSessionRole, showToast } = useBoQ();

  const [selectedRole, setSelectedRole] = useState(null); // 'master' | 'client' | null
  const [masterPin, setMasterPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSelectClient = () => {
    selectSessionRole('client');
    showToast('Selamat datang! Anda masuk dalam Mode Klien & Tim Lapangan (Read-Only).', 'info');
  };

  const handleVerifyMaster = (e) => {
    if (e) e.preventDefault();
    setPinError('');

    if (!masterPin || !masterPin.trim()) {
      setPinError('Masukkan Master Code untuk otorisasi.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      if (masterPin.trim() === FIXED_MASTER_CODE) {
        selectSessionRole('master');
        showToast('Otorisasi Berhasil! Selamat datang Master Admin.', 'success');
      } else {
        setPinError('Master Code salah. Akses ditolak.');
        showToast('Master Code salah!', 'error');
      }
      setIsVerifying(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blueprint-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Background Architectural Grid Accent */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
          backgroundSize: '32px 32px' 
        }} 
      />

      {/* Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blueprint-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
        
        {/* Brand Header */}
        <div className="text-center space-y-4 mb-8 sm:mb-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 p-2.5 border border-white/20 shadow-2xl backdrop-blur-md flex items-center justify-center transform hover:scale-105 transition-transform">
            <img src="/icon.png" alt="SR Studio Logo" className="w-full h-full object-contain" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-amber-300 text-[11px] font-mono tracking-wider uppercase shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>SR Studio Architecture & Engineering Suite</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
            Portal Estimator & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">BoQ Tools</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-sans leading-relaxed">
            Platform kalkulasi volume konstruksi, perumusan Rencana Anggaran Biaya (RAB), dan sinkronisasi Cloud Database 24/7.
          </p>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          
          {/* Card 1: Master Admin */}
          <div className={`relative rounded-3xl p-6 sm:p-8 transition-all duration-300 border backdrop-blur-xl flex flex-col justify-between ${
            selectedRole === 'master'
              ? 'bg-slate-900/90 border-amber-500 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 shadow-xl'
          }`}>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/50">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Akses Penuh
                </span>
              </div>

              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">
                  👑 Master Studio
                </h2>
                <p className="text-xs text-amber-200/80 font-mono mt-0.5">
                  PC Utama / Arsitek / Administrator (Kode: 20022019)
                </p>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Otoritas mutlak untuk mengelola database harga, menyunting seluruh library proyek, membuat kode OTP untuk klien, dan kontrol penuh seluruh fitur.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Akses penuh seluruh BoQ, Kurva S, & 11+ Kalkulator</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Koreksi & input harga satuan BoQ tanpa batas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Manajemen & Generator Kode OTP 1x pakai untuk Klien</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Kontrol penuh Database Cloud Firebase 24/7</span>
                </div>
              </div>
            </div>

            {/* Master Action Section */}
            <div className="pt-6 mt-4 border-t border-slate-800/80">
              {selectedRole !== 'master' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('master');
                    setPinError('');
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-bold text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk sebagai Master</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <form onSubmit={handleVerifyMaster} className="space-y-3 animate-fadeIn">
                  <div className="relative">
                    <input
                      type="password"
                      autoFocus
                      required
                      value={masterPin}
                      onChange={e => {
                        setMasterPin(e.target.value);
                        setPinError('');
                      }}
                      placeholder="Masukkan Master Code..."
                      className="w-full py-3 px-4 text-xs font-mono rounded-xl border border-amber-500/50 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {pinError && (
                    <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole(null)}
                      className="py-2.5 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <span>Memverifikasi...</span>
                      ) : (
                        <>
                          <span>Otorisasi & Masuk</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Card 2: Client & Field Team */}
          <div className="relative rounded-3xl p-6 sm:p-8 transition-all duration-300 border border-slate-800 bg-slate-900/60 hover:bg-slate-900/80 hover:border-emerald-500/50 shadow-xl backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-950/50">
                  <Smartphone className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Akses Terproteksi OTP
                </span>
              </div>

              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">
                  📱 Klien & Tim Lapangan
                </h2>
                <p className="text-xs text-emerald-200/80 font-mono mt-0.5">
                  Mobile / Tablet / Tamu
                </p>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Akses bebas Dashboard, Kurva S, dan Library. Fitur BoQ & Kalkulator Teknis wajib menggunakan Kode OTP dari Master.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Akses bebas Dashboard, Kurva S (Jadwal), & Library RAB</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Akses BoQ & 11+ Kalkulator (Wajib OTP dari Master)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Simpan & Duplikat Proyek ke Cloud (Wajib OTP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ekspor RAB & Analisa ke file Excel (.xlsx)</span>
                </div>
              </div>
            </div>

            {/* Client Action Section */}
            <div className="pt-6 mt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleSelectClient}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Masuk sebagai Klien (Instan 1-Klik)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Feature Highlights Footer Bar */}
        <div className="mt-10 sm:mt-14 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <Calculator className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-200">7+ Kalkulator</p>
            <p className="text-[10px] text-slate-400">Beton, Besi, MEP, Dinding</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <Cloud className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-200">Firebase Cloud</p>
            <p className="text-[10px] text-slate-400">Sinkronisasi 24/7 Multi-Device</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <Lock className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-200">Single-Use OTP</p>
            <p className="text-[10px] text-slate-400">Anti Benturan Data</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <FileSpreadsheet className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-200">Export Excel</p>
            <p className="text-[10px] text-slate-400">Standar Format Tender</p>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/60 font-mono">
        SR Studio BoQ Suite © 2026 • Master Account: {FIXED_MASTER_EMAIL}
      </footer>

    </div>
  );
}
