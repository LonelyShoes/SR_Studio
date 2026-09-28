import React, { useState, useEffect } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  Cloud, 
  ShieldCheck, 
  Smartphone, 
  KeyRound, 
  Mail, 
  Copy, 
  Check, 
  RefreshCw, 
  X, 
  Lock, 
  AlertCircle, 
  LogOut, 
  Info,
  Sparkles,
  ShieldAlert,
  Flame,
  QrCode
} from 'lucide-react';
import { 
  FIXED_MASTER_EMAIL,
  generateCurrentOtp, 
  verifyMasterPin, 
  logoutMasterDevice,
  getCloudSyncQrUrl
} from '../../services/cloudLibraryService';

export function CloudSyncModal() {
  const { 
    cloudModalOpen, 
    setCloudModalOpen, 
    cloudConfig, 
    updateCloudSettings, 
    firebaseConfig,
    updateFirebaseSettings,
    testFirebaseConnection,
    syncCloudLibrary, 
    isCloudSyncing,
    showToast,
    library,
    selectSessionRole
  } = useBoQ();

  const [copiedOtp, setCopiedOtp] = useState(false);
  const [currentOtpData, setCurrentOtpData] = useState({ otp: '------', generatedAt: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);

  // Firebase Form States
  const [fbUrlInput, setFbUrlInput] = useState('');
  const [fbTokenInput, setFbTokenInput] = useState('');
  const [fbTesting, setFbTesting] = useState(false);
  const [fbTestResult, setFbTestResult] = useState(null); // { success, message }

  // Master Login / Code Unlock states for non-master devices
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [loginCodeInput, setLoginCodeInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (cloudModalOpen) {
      setShowMasterLogin(false);
      setShowQrCode(false);
      setLoginCodeInput('');
      setLoginError('');
      setFbUrlInput(firebaseConfig?.dbUrl || '');
      setFbTokenInput(firebaseConfig?.authToken || '');
      setFbTestResult(null);

      // Refresh / load current OTP if master
      const otpInfo = generateCurrentOtp(false);
      setCurrentOtpData(otpInfo);
    }
  }, [cloudModalOpen, cloudConfig, firebaseConfig]);

  if (!cloudModalOpen) return null;

  const handleRefreshOtp = () => {
    const otpInfo = generateCurrentOtp(true); // Force generate new unburned OTP
    setCurrentOtpData(otpInfo);
    showToast('Kode OTP 1x Pakai berhasil diperbarui!', 'info');
  };

  const handleCopyOtp = () => {
    if (currentOtpData.otp) {
      navigator.clipboard.writeText(currentOtpData.otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
      showToast('Kode OTP disalin ke clipboard!', 'success');
    }
  };

  const handleSaveAndTestFirebase = async (e) => {
    if (e) e.preventDefault();
    setFbTesting(true);
    setFbTestResult(null);

    const testRes = await testFirebaseConnection(fbUrlInput, fbTokenInput);
    setFbTestResult(testRes);

    if (testRes.success) {
      updateFirebaseSettings({
        dbUrl: fbUrlInput.trim(),
        authToken: fbTokenInput.trim()
      });
      showToast('Konfigurasi Firebase berhasil disimpan & terverifikasi!', 'success');
    } else {
      showToast(testRes.message, 'error');
    }
    setFbTesting(false);
  };

  const handleManualSync = async () => {
    setIsSaving(true);
    try {
      await syncCloudLibrary(cloudConfig.isMasterDevice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Client Device: Unlock Master Mode with Master Code (20022019)
  const handleUnlockMaster = (e) => {
    e.preventDefault();
    setLoginError('');
    
    const result = verifyMasterPin(loginCodeInput);
    if (result.success) {
      selectSessionRole('master');
      setShowMasterLogin(false);
      setLoginCodeInput('');
      showToast('Otorisasi Master Berhasil! Perangkat ini sekarang adalah PC Utama.', 'success');
    } else {
      setLoginError(result.message);
      showToast(result.message, 'error');
    }
  };

  // Master Device: Logout to Client Mode
  const handleLogoutMaster = () => {
    if (window.confirm('Keluar dari mode Master di browser ini? Perangkat ini akan kembali menjadi mode Klien (Read-Only).')) {
      selectSessionRole('client');
      showToast('Perangkat dialihkan ke Mode Klien (Read-Only).', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-paper-300 max-w-lg w-full overflow-hidden animate-scaleUp text-paper-900 flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-blueprint-900 to-indigo-950 p-6 text-white relative">
          <button 
            type="button"
            onClick={() => setCloudModalOpen(false)}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${
              cloudConfig.isMasterDevice 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
            }`}>
              {cloudConfig.isMasterDevice ? <ShieldCheck className="w-6 h-6" /> : <Cloud className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800">
                Single Master Cloud 24/7
              </span>
              <h3 className="font-heading text-xl font-bold tracking-wide mt-0.5">
                Sinkronisasi Library Cloud
              </h3>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 text-[11px]">Akun Master Tunggal:</span>
              <strong className="font-mono text-amber-300 text-xs">{FIXED_MASTER_EMAIL}</strong>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-300 uppercase font-bold">
              Locked
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans">

          {/* ========================================================================= */}
          {/* JIKA PERANGKAT INI ADALAH PC UTAMA (MASTER DEVICE) */}
          {/* ========================================================================= */}
          {cloudConfig.isMasterDevice ? (
            <div className="space-y-5">
              
              {/* Master Role Badge */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 text-amber-950 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs">Status: PC UTAMA (Master Admin)</p>
                      <span className="text-[9px] font-mono uppercase bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                        Akses Penuh
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug mt-1">
                      Anda memiliki hak penuh untuk membuat, merevisi, dan menghapus Library. Semua perubahan otomatis tersinkron ke Cloud 24/7.
                    </p>
                  </div>
                </div>
              </div>

              {/* Firebase Realtime Database Setup Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-xs block">Firebase Realtime Database</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {firebaseConfig?.isConfigured ? '🟢 Terhubung ke Database Anda' : '🟡 Belum disetel (Gunakan Relay/Input URL)'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFirebaseSetup(!showFirebaseSetup)}
                    className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                  >
                    {showFirebaseSetup ? 'Tutup' : '⚙️ Atur Firebase'}
                  </button>
                </div>

                {showFirebaseSetup && (
                  <form onSubmit={handleSaveAndTestFirebase} className="pt-2 space-y-3 border-t border-slate-800 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-amber-300 mb-1">
                        Firebase Realtime Database URL
                      </label>
                      <input
                        type="url"
                        required
                        value={fbUrlInput}
                        onChange={e => setFbUrlInput(e.target.value)}
                        placeholder="https://nama-proyek-default-rtdb.asia-southeast1.firebasedatabase.app"
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Database Secret / Auth Token <span className="text-slate-500">(Opsional jika Rules Public)</span>
                      </label>
                      <input
                        type="password"
                        value={fbTokenInput}
                        onChange={e => setFbTokenInput(e.target.value)}
                        placeholder="Masukkan token jika rules diproteksi..."
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    {/* Test result alert */}
                    {fbTestResult && (
                      <div className={`p-3 rounded-xl text-[11px] flex items-start gap-2 border ${
                        fbTestResult.success 
                          ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300' 
                          : 'bg-red-950/60 border-red-700/60 text-red-300'
                      }`}>
                        {fbTestResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        <span>{fbTestResult.message}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={fbTesting}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${fbTesting ? 'animate-spin' : ''}`} />
                        <span>{fbTesting ? 'Menguji Koneksi...' : 'Tes & Simpan Firebase'}</span>
                      </button>
                    </div>

                    {/* Step-by-step Quick Guide */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 space-y-1.5 leading-relaxed">
                      <p className="font-bold text-amber-300 font-mono">📖 3 Langkah Setup Firebase Gratis (2 Menit):</p>
                      <p>1. Buka <strong className="text-white">console.firebase.google.com</strong> & buat proyek baru gratis.</p>
                      <p>2. Pilih menu <strong className="text-white">Build &rarr; Realtime Database</strong> & klik <strong className="text-white">Create Database</strong> (Region Singapore/US).</p>
                      <p>3. Di tab <strong className="text-white">Rules</strong>, ubah menjadi:</p>
                      <pre className="bg-slate-900 p-2 rounded text-emerald-400 font-mono text-[9px] overflow-x-auto">
{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}
                      </pre>
                      <p>Lalu klik <strong className="text-white">Publish</strong> dan salin URL database di atas ke kotak input ini!</p>
                    </div>
                  </form>
                )}
              </div>

              {/* Single-Use OTP Generator Box */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Kode OTP 1x Pakai (Izin Simpan Klien)
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshOtp}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Buat Kode OTP Baru"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="font-mono text-3xl font-black tracking-widest text-amber-300 block">
                      {currentOtpData.otp}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Kode OTP 1x Pakai • Dibuat {currentOtpData.generatedAt}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOtp}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                  >
                    {copiedOtp ? <Check className="w-4 h-4 text-green-950" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedOtp ? 'Tersalin' : 'Salin OTP'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  ⚡ <strong>Aturan 1x Pakai:</strong> Berikan kode 6-digit di atas jika HP/perangkat lain meminta izin simpan. Begitu digunakan, kode ini akan <strong>langsung hangus</strong> dan otomatis dibuatkan kode baru.
                </p>
              </div>

              {/* QR Direct Sync to Mobile */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs">Scan QR Sync Cepat ke HP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40 transition-colors"
                  >
                    {showQrCode ? 'Tutup QR' : 'Tampilkan QR'}
                  </button>
                </div>

                {showQrCode && (
                  <div className="pt-2 text-center space-y-3 animate-fadeIn">
                    <div className="inline-block p-3 bg-white rounded-2xl shadow-lg">
                      <img 
                        src={getCloudSyncQrUrl(library)} 
                        alt="QR Code Sync" 
                        className="w-48 h-48 mx-auto rounded-lg"
                      />
                    </div>
                    <p className="text-[11px] text-slate-300 max-w-xs mx-auto leading-relaxed">
                      📱 Buka kamera HP Anda dan scan QR code di atas untuk langsung membuka dan mengimpor seluruh {library.length} proyek Library ke HP!
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSaving || isCloudSyncing}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blueprint-600 hover:bg-blueprint-700 text-white font-display font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'Menyinkronkan ke Cloud...' : 'Sinkronkan / Unggah Ulang ke Cloud'}</span>
                </button>
              </div>

              {/* Logout Master on this Device */}
              <div className="pt-2 border-t border-paper-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleLogoutMaster}
                  className="text-paper-500 hover:text-red-600 text-[11px] font-sans flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar dari Mode Master di Browser Ini</span>
                </button>
              </div>

            </div>
          ) : (
            /* ========================================================================= */
            /* JIKA PERANGKAT INI ADALAH PERANGKAT KLIEN (HP / LAPTOP LAIN / TAMU) */
            /* ========================================================================= */
            <div className="space-y-5">
              
              {/* Client Status Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs">Status: Perangkat Klien (HP / Laptop)</p>
                    <span className="text-[9px] font-mono uppercase bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                      Read-Only
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug mt-1">
                    Perangkat ini terhubung otomatis ke Library Cloud resmi <strong>{FIXED_MASTER_EMAIL}</strong> 24 jam nonstop.
                  </p>
                </div>
              </div>

              {/* Feature Permissions Info */}
              <div className="p-4 rounded-2xl bg-paper-50 border border-paper-300 space-y-2.5">
                <span className="text-[11px] font-mono uppercase font-bold text-paper-800 block">
                  Hak Akses Perangkat Ini:
                </span>
                
                <div className="space-y-2 text-[11px] text-paper-700">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Membuka dan melihat semua proyek Library (24 Jam Bebas)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Melakukan kalkulasi & export RAB ke file Excel (.xlsx)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-700 font-medium">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Menyimpan ke Library Cloud <strong>(Wajib Kode OTP 1x Pakai dari Master)</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Menghapus proyek di Library: <strong>Dilarang (Khusus Master)</strong></span>
                  </div>
                </div>
              </div>

              {/* Firebase Database Config (Client) */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-xs block">Firebase Realtime Database</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {firebaseConfig?.isConfigured ? '🟢 Terhubung ke Database' : '🟡 Default Cloud Relay'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFirebaseSetup(!showFirebaseSetup)}
                    className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                  >
                    {showFirebaseSetup ? 'Tutup' : '⚙️ Atur URL'}
                  </button>
                </div>

                {showFirebaseSetup && (
                  <form onSubmit={handleSaveAndTestFirebase} className="pt-2 space-y-3 border-t border-slate-800 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-amber-300 mb-1">
                        Firebase Realtime Database URL
                      </label>
                      <input
                        type="url"
                        required
                        value={fbUrlInput}
                        onChange={e => setFbUrlInput(e.target.value)}
                        placeholder="https://nama-proyek-default-rtdb.asia-southeast1.firebasedatabase.app"
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Database Secret / Auth Token <span className="text-slate-500">(Opsional)</span>
                      </label>
                      <input
                        type="password"
                        value={fbTokenInput}
                        onChange={e => setFbTokenInput(e.target.value)}
                        placeholder="Masukkan token jika diproteksi..."
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    {fbTestResult && (
                      <div className={`p-3 rounded-xl text-[11px] flex items-start gap-2 border ${
                        fbTestResult.success 
                          ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300' 
                          : 'bg-red-950/60 border-red-700/60 text-red-300'
                      }`}>
                        {fbTestResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        <span>{fbTestResult.message}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={fbTesting}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${fbTesting ? 'animate-spin' : ''}`} />
                      <span>{fbTesting ? 'Menguji...' : 'Tes & Simpan URL Firebase'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Sync Button */}
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSaving || isCloudSyncing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Mengambil Data Firebase/Cloud...' : 'Tarik Data Library Terbaru'}</span>
              </button>

              {/* Hidden Master Login Accordion */}
              <div className="pt-3 border-t border-paper-200">
                {!showMasterLogin ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowMasterLogin(true)}
                      className="text-paper-500 hover:text-blueprint-700 text-[11px] font-sans inline-flex items-center gap-1.5 transition-colors underline underline-offset-4"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Masuk sebagai Pemilik Master</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleUnlockMaster} className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        Otorisasi Master Code
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMasterLogin(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      Masukkan Master Code rahasia untuk mengaktifkan mode PC Utama di browser ini:
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        value={loginCodeInput}
                        onChange={e => setLoginCodeInput(e.target.value)}
                        placeholder="Masukkan Master Code..."
                        className="flex-1 p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
                      >
                        Masuk Master
                      </button>
                    </div>

                    {loginError && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1 font-medium bg-red-950/50 p-2 rounded-lg border border-red-800/50">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {loginError}
                      </p>
                    )}
                  </form>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
