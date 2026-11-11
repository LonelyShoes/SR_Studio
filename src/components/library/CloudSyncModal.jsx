import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  PencilLine,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useBoQ } from '../../context/BoQContext';
import { describeSyncPhase, engine, useCloud } from '../../context/cloudStore';
import { MASTER_EMAIL, STORAGE_KEYS, OTP_ATTEMPT_LIMIT, resolveDatabaseUrl } from '../../services/cloud';
import { localStore } from '../../services/storage/localStore';
import { activityKind, describeActivity, formatRelativeTime, initialsOf } from '../../utils/activity';

const TONE_STYLES = {
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  busy: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  error: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
};

const ACTIVITY_STYLES = {
  edit: { Icon: PencilLine, className: 'bg-sky-50 text-sky-700 border-sky-200' },
  project: { Icon: Cloud, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  delete: { Icon: Trash2, className: 'bg-rose-50 text-rose-700 border-rose-200' },
  security: { Icon: KeyRound, className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

/** Jam yang berdetak tiap `intervalMs` — untuk waktu relatif & kedaluwarsa OTP. */
function useNow(intervalMs, enabled) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}

function Section({ icon: Icon, title, aside, children }) {
  return (
    <section className="rounded-2xl border border-paper-300 bg-paper-50 p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-paper-800">
          <Icon className="w-4 h-4 text-blueprint-600" />
          {title}
        </h4>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ Panel OTP (Master) */

function OtpPanel({ ready, online }) {
  const { showToast } = useBoQ();
  const record = useCloud((snapshot) => snapshot.otp);
  const [issued, setIssued] = useState(() => localStore.get(STORAGE_KEYS.masterOtp));
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const failedOnce = useRef(false);
  const replacedForeign = useRef(false);
  const now = useNow(5000, true);

  const status = useMemo(() => {
    if (record === undefined) return 'loading';
    if (!record || !record.hash) return 'none';
    if (record.usedAt) return 'used';
    if (now >= Number(record.expiresAt)) return 'expired';
    if ((Number(record.attempts) || 0) >= OTP_ATTEMPT_LIMIT) return 'locked';
    return issued && issued.hash === record.hash ? 'active' : 'foreign';
  }, [record, issued, now]);

  const issue = useCallback(async () => {
    setIssuing(true);
    try {
      const otp = await engine.issueOtp();
      const next = { code: otp.code, hash: otp.hash, expiresAt: otp.expiresAt };
      localStore.set(STORAGE_KEYS.masterOtp, next);
      setIssued(next);
      failedOnce.current = false;
    } catch (error) {
      failedOnce.current = true;
      showToast(`Gagal membuat Kode OTP: ${error?.message || error}`, 'error');
    } finally {
      setIssuing(false);
    }
  }, [showToast]);

  // Kode baru dibuat otomatis bila belum ada / sudah terpakai / kedaluwarsa / terkunci.
  // Kode aktif buatan perangkat Master lain (isinya tidak terbaca di sini) diganti otomatis
  // SATU kali per pembukaan panel — cukup untuk kasus pindah perangkat, tanpa membuat dua
  // perangkat Master yang sama-sama terbuka saling menimpa kode tanpa henti.
  useEffect(() => {
    if (!ready || !online || issuing || failedOnce.current) return;
    if (status === 'none' || status === 'used' || status === 'expired' || status === 'locked') {
      issue();
    } else if (status === 'foreign' && !replacedForeign.current) {
      replacedForeign.current = true;
      issue();
    }
  }, [ready, online, issuing, status, issue]);

  const copy = async () => {
    if (!issued?.code) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Tidak dapat menyalin otomatis. Salin kode secara manual.', 'warning');
    }
  };

  const minutesLeft = record ? Math.max(0, Math.ceil((Number(record.expiresAt) - now) / 60000)) : 0;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
          <KeyRound className="w-4 h-4" />
          Kode OTP 1x Pakai (izin Klien)
        </span>
        <button
          type="button"
          onClick={issue}
          disabled={issuing || !ready || !online}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
          title="Buat Kode OTP baru (kode lama langsung tidak berlaku)"
          aria-label="Buat Kode OTP baru"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${issuing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!ready || !online ? (
        <p className="text-[11px] text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          Kode OTP dibuat & diverifikasi lewat cloud. Sambungkan internet untuk menerbitkan kode.
        </p>
      ) : status === 'foreign' ? (
        <div className="text-[11px] text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-2">
          <p>
            Ada Kode OTP aktif yang dibuat di perangkat Master lain
            {record?.issuedBy ? <> (<strong>{record.issuedBy}</strong>)</> : null}. Kode hanya terlihat di perangkat pembuatnya.
          </p>
          <button type="button" onClick={issue} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
            Ganti dengan kode baru di perangkat ini
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <span className="font-mono text-3xl font-black tracking-widest text-amber-300 block" aria-live="polite">
              {status === 'active' ? issued.code : '······'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {status === 'active' ? `Berlaku ${minutesLeft} menit lagi • hangus setelah 1x pakai` : 'Menyiapkan kode baru…'}
            </span>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={status !== 'active'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Berikan kode ini saat perangkat Klien meminta izin. Begitu dipakai, kode langsung hangus dan kode baru dibuat
        otomatis. Lima kali salah memasukkan akan memblokir kode.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ QR buka di HP */

function QrPanel() {
  const [dataUrl, setDataUrl] = useState(null);
  const [open, setOpen] = useState(false);
  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  useEffect(() => {
    if (!open || dataUrl) return undefined;
    let cancelled = false;
    import('qrcode-generator')
      .then((module) => {
        const qr = (module.default || module)(0, 'M');
        qr.addData(appUrl);
        qr.make();
        if (!cancelled) setDataUrl(qr.createDataURL(6, 12));
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [open, dataUrl, appUrl]);

  return (
    <Section
      icon={QrCode}
      title="Buka di HP / perangkat lain"
      aside={
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-white border border-paper-300 hover:bg-paper-100 text-paper-800"
        >
          {open ? 'Tutup QR' : 'Tampilkan QR'}
        </button>
      }
    >
      <p className="text-[11px] text-paper-600 leading-relaxed">
        Cukup buka alamat aplikasi di perangkat lain — seluruh Library & perubahan langsung tampil dari cloud, tanpa
        ekspor/impor.
      </p>
      {open && (
        <div className="text-center space-y-2 animate-fadeIn">
          {dataUrl ? (
            <img src={dataUrl} alt="QR alamat aplikasi SR Studio" className="w-44 h-44 mx-auto rounded-xl bg-white p-1 border border-paper-300" />
          ) : dataUrl === '' ? (
            <p className="text-[11px] text-rose-700">QR tidak dapat dibuat. Salin alamat di bawah.</p>
          ) : (
            <Loader2 className="w-5 h-5 mx-auto animate-spin text-blueprint-600" />
          )}
          <p className="font-mono text-[11px] text-blueprint-800 break-all">{appUrl}</p>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ Modal */

export function CloudSyncModal() {
  const { cloudModalOpen, setCloudModalOpen, isMaster, displayName, setDisplayName, selectSessionRole, loginAsMaster, showToast, library } = useBoQ();
  const cloud = useCloud();
  const now = useNow(30000, cloudModalOpen);

  const [nameInput, setNameInput] = useState(displayName);
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const close = useCallback(() => setCloudModalOpen(false), [setCloudModalOpen]);

  useEffect(() => {
    if (!cloudModalOpen) return undefined;
    setNameInput(displayName);
    setShowMasterLogin(false);
    setLoginCode('');
    setLoginError('');
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudModalOpen]);

  const projectNames = useMemo(() => new Map(library.map((entry) => [entry.id, entry.name])), [library]);
  const people = useMemo(() => cloud.presence.filter((session) => session.role !== 'guest'), [cloud.presence]);

  if (!cloudModalOpen) return null;

  const status = describeSyncPhase(cloud.phase, cloud.pending);
  const databaseHost = resolveDatabaseUrl(localStore.raw).replace(/^https:\/\//, '').split('.')[0];

  const handleUnlockMaster = async (event) => {
    event.preventDefault();
    setLoginError('');
    setVerifying(true);
    try {
      if (await loginAsMaster(loginCode)) {
        setShowMasterLogin(false);
        setLoginCode('');
        showToast('Otorisasi Master berhasil. Perangkat ini kini berperan sebagai Master.', 'success');
      } else {
        setLoginError('Master Code salah. Akses ditolak.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleLogoutMaster = () => {
    if (window.confirm('Keluar dari mode Master di browser ini? Perangkat ini kembali menjadi Klien (lihat saja, edit dengan OTP).')) {
      selectSessionRole('client');
      showToast('Perangkat dialihkan ke Mode Klien.', 'info');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-paper-300 max-w-lg w-full overflow-hidden animate-scaleUp text-paper-900 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-center-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blueprint-900 to-indigo-950 p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={close}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${TONE_STYLES[status.tone]}`}>
              {cloud.online ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <h3 id="cloud-center-title" className="font-heading text-xl font-bold tracking-wide">
                Pusat Sinkronisasi Realtime
              </h3>
              <p className="text-xs text-slate-300 truncate">
                <span className="font-semibold text-white">{status.label}</span> — {status.detail}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-mono uppercase tracking-wider">
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 py-2">
              <span className="block text-lg font-black text-white font-sans">{people.length}</span>
              <span className="text-slate-400">Online</span>
            </div>
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 py-2">
              <span className="block text-lg font-black text-white font-sans">{library.length}</span>
              <span className="text-slate-400">Proyek</span>
            </div>
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 py-2">
              <span className="block text-lg font-black text-white font-sans">{cloud.pending}</span>
              <span className="text-slate-400">Antrian kirim</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {cloud.error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Sinkronisasi terkendala: {cloud.error}. Aplikasi mencoba kembali secara otomatis.</span>
            </div>
          )}

          {/* Identitas & peran */}
          <Section
            icon={isMaster ? ShieldCheck : Smartphone}
            title={isMaster ? 'Perangkat ini: Master' : 'Perangkat ini: Klien'}
            aside={
              <span
                className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                  isMaster ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                {isMaster ? 'Akses penuh' : 'Lihat realtime • edit dengan OTP'}
              </span>
            }
          >
            <label htmlFor="cloud-display-name" className="block text-[10px] font-mono uppercase text-paper-600">
              Nama tampilan (terlihat oleh pengguna lain)
            </label>
            <div className="flex gap-2">
              <input
                id="cloud-display-name"
                type="text"
                maxLength={40}
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="flex-1 p-2.5 text-xs rounded-xl border border-paper-300 bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-500"
              />
              <button
                type="button"
                onClick={() => {
                  setDisplayName(nameInput);
                  showToast('Nama tampilan diperbarui.', 'success');
                }}
                disabled={nameInput.trim() === displayName}
                className="px-3 rounded-xl bg-blueprint-600 hover:bg-blueprint-700 text-white font-semibold disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
            <p className="text-[10px] text-paper-500">
              Database: <span className="font-mono">{databaseHost}</span> • Kontak Master: <span className="font-mono">{MASTER_EMAIL}</span>
              {cloud.lastSyncedAt ? <> • Tersinkron {formatRelativeTime(cloud.lastSyncedAt, now)}</> : null}
            </p>
          </Section>

          {isMaster && <OtpPanel ready={cloud.ready} online={cloud.online} />}

          {/* Pengguna online */}
          <Section icon={Users} title={`Sedang online (${people.length})`}>
            {people.length === 0 ? (
              <p className="text-[11px] text-paper-500">{cloud.online ? 'Belum ada pengguna lain yang online.' : 'Tidak terhubung ke cloud.'}</p>
            ) : (
              <ul className="space-y-1.5">
                {people.map((session) => (
                  <li key={session.sessionId} className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-paper-200">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        session.role === 'master' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {initialsOf(session.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-paper-900 truncate">
                        {session.name}
                        {session.sessionId === engine.getIdentity().sessionId && <span className="text-paper-500 font-normal"> (Anda)</span>}
                      </p>
                      <p className="text-[10px] text-paper-500 truncate">
                        {session.role === 'master' ? 'Master' : 'Klien'}
                        {session.docId ? ` • membuka ${projectNames.get(session.docId) || 'sebuah proyek'}` : ' • belum membuka proyek'}
                      </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Aktivitas */}
          <Section icon={Activity} title="Aktivitas terbaru">
            {cloud.activity.length === 0 ? (
              <p className="text-[11px] text-paper-500">Belum ada aktivitas yang tercatat.</p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {cloud.activity.slice(0, 40).map((entry) => {
                  const style = ACTIVITY_STYLES[activityKind(entry.type)];
                  return (
                    <li key={entry.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-paper-200">
                      <span className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${style.className}`}>
                        <style.Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 leading-snug">
                        <p className="text-paper-800">
                          <strong className="text-paper-900">{entry.by.name}</strong> {describeActivity(entry)}
                        </p>
                        <p className="text-[10px] text-paper-500">{formatRelativeTime(entry.at, now)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <QrPanel />

          {/* Ganti peran */}
          <div className="pt-1">
            {isMaster ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleLogoutMaster}
                  className="text-paper-500 hover:text-red-600 text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar dari Mode Master di browser ini</span>
                </button>
              </div>
            ) : !showMasterLogin ? (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowMasterLogin(true)}
                  className="text-paper-500 hover:text-blueprint-700 text-[11px] inline-flex items-center gap-1.5 transition-colors underline underline-offset-4"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Masuk sebagai Master</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleUnlockMaster} className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 animate-fadeIn">
                <label htmlFor="cloud-master-code" className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Master Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="cloud-master-code"
                    type="password"
                    required
                    autoFocus
                    autoComplete="current-password"
                    value={loginCode}
                    onChange={(event) => setLoginCode(event.target.value)}
                    className="flex-1 p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={verifying}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
                  >
                    {verifying ? 'Memeriksa…' : 'Masuk'}
                  </button>
                </div>
                {loginError && (
                  <p className="text-[10px] text-red-300 flex items-center gap-1 bg-red-950/50 p-2 rounded-lg border border-red-800/50" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {loginError}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
