import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBoQ } from '../../context/BoQContext';
import { BookmarkCheck, FolderPlus, X, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { formatRp } from '../../utils/formatters';

export function SaveToLibraryModal() {
  const { 
    state, 
    library, 
    activeLibraryId, 
    saveModalOpen, 
    setSaveModalOpen, 
    saveToLibrary,
    grandTotal,
    filledItemsCount,
    cloudConfig,
    isOtpAuthorized
  } = useBoQ();

  const [projectName, setProjectName] = useState('');
  const [isNewRevision, setIsNewRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');

  // Multi-tier detection agar proyek yang sedang diedit selalu terdeteksi
  const activeId = activeLibraryId 
    || state?.project?.libraryId 
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('sr_studio_active_library_id_v2') : null);

  const safeLibrary = Array.isArray(library) ? library : [];
  const existingProject = safeLibrary.find(p => p?.id === activeId)
    || safeLibrary.find(p => p?.name && p.name.trim().toLowerCase() === (state?.project?.name || '').trim().toLowerCase());

  useEffect(() => {
    if (saveModalOpen) {
      setProjectName(state?.project?.name || 'Proyek RAB Baru');
      // Jika proyek terdaftar di library, default ke 'Perbarui Proyek Saat Ini' (false)
      setIsNewRevision(false);
      setRevisionNote('');
    }
  }, [saveModalOpen, state?.project?.name]);

  if (!saveModalOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setSaveModalOpen(false);
    saveToLibrary(projectName, isNewRevision, revisionNote);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blueprint-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-paper-400 max-w-md w-full overflow-hidden transform transition-all animate-scaleUp text-paper-900"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-blueprint-900 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold tracking-wide">
                Simpan ke Library RAB
              </h3>
              <p className="text-xs text-blueprint-200">
                Arsipkan proyek saat ini agar dapat dibuka dan direvisi kapan saja.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSaveModalOpen(false)}
            className="text-blueprint-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="p-5 space-y-4 bg-paper-50">
            
            {/* Project Name Field */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-paper-700 mb-1">
                Nama Proyek RAB
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="mis. Renovasi Rumah 2 Lantai - Bpk. Hendra"
                className="w-full p-2.5 text-xs font-semibold rounded-xl border border-paper-300 bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-500 shadow-sm"
              />
            </div>

            {/* Quick Summary Info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-paper-300 text-xs font-mono">
              <div>
                <span className="text-[10px] text-paper-500 uppercase block">Klien / Pemilik:</span>
                <span className="font-semibold text-paper-800 truncate block">
                  {state.project.client || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-paper-500 uppercase block">Total Anggaran:</span>
                <span className="font-bold text-amber-800 truncate block">
                  {formatRp(grandTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-paper-500 uppercase block">Lokasi:</span>
                <span className="font-medium text-paper-700 truncate block">
                  {state.project.location || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-paper-500 uppercase block">Item Terisi:</span>
                <span className="font-medium text-paper-700 block">
                  {filledItemsCount} item
                </span>
              </div>
            </div>

            {/* Save Mode Selector (Jika Proyek terdaftar di Library) */}
            {existingProject && (
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-2.5">
                <span className="text-[11px] font-mono font-bold text-blue-900 flex items-center justify-between">
                  <span>Pilihan Mode Penyimpanan:</span>
                  <span className="text-[10px] font-normal text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                    Terdeteksi di Library
                  </span>
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer text-paper-800 hover:text-blue-900 transition-colors">
                  <input
                    type="radio"
                    name="saveMode"
                    checked={!isNewRevision}
                    onChange={() => setIsNewRevision(false)}
                    className="mt-0.5 text-blueprint-600 focus:ring-blueprint-500"
                  />
                  <div>
                    <p className="font-bold text-xs text-paper-900">Perbarui Proyek Saat Ini (Rekomendasi)</p>
                    <p className="text-[10px] text-paper-600">
                      Menimpa & memperbarui data proyek "{existingProject.name}" yang sedang diedit di Library.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-paper-800 hover:text-blue-900 transition-colors">
                  <input
                    type="radio"
                    name="saveMode"
                    checked={isNewRevision}
                    onChange={() => setIsNewRevision(true)}
                    className="mt-0.5 text-blueprint-600 focus:ring-blueprint-500"
                  />
                  <div>
                    <p className="font-bold text-xs text-paper-900">Simpan Sebagai Salinan / Proyek Baru</p>
                    <p className="text-[10px] text-paper-600">
                      Membuat rekaman baru di library tanpa mengubah atau menimpa proyek sebelumnya.
                    </p>
                  </div>
                </label>

                {/* Input Catatan Log Perubahan Snapshot */}
                {!isNewRevision && (
                  <div className="pt-2 border-t border-blue-200">
                    <label className="block text-[10px] font-mono font-bold uppercase text-blue-950 mb-1">
                      Catatan Log Revisi (Opsional):
                    </label>
                    <input
                      type="text"
                      value={revisionNote}
                      onChange={e => setRevisionNote(e.target.value)}
                      placeholder="mis. Penyesuaian volume cor beton & dinding lantai 2"
                      className="w-full p-2 text-xs rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blueprint-500 text-slate-800"
                    />
                    <p className="text-[10px] text-blue-700 mt-1">
                      🛡️ Versi sebelum pembaruan ini otomatis dicadangkan ke Riwayat Snapshot Proyek.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Client Notice saat menyimpan proyek baru */}
            {!cloudConfig.isMasterDevice && !existingProject && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2.5 shadow-sm">
                <span className="text-base">📌</span>
                <div>
                  <p className="font-bold text-[11px] text-emerald-900">Mode Klien: Arsip Proyek Baru</p>
                  <p className="text-[10px] text-emerald-800 leading-snug mt-0.5">
                    Proyek ini akan diarsipkan sebagai <strong>rekaman baru</strong> di Library & Database Cloud menggunakan izin Kode OTP 1x pakai dari Master.
                  </p>
                </div>
              </div>
            )}

            {/* Cloud Client Security Warning Notice */}
            {cloudConfig.isCloudEnabled && !cloudConfig.isMasterDevice && !isOtpAuthorized && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <span className="text-base">🔒</span>
                <div>
                  <p className="font-bold text-[11px]">Memerlukan Izin OTP dari PC Utama</p>
                  <p className="text-[10px] text-amber-800 leading-snug mt-0.5">
                    Setelah menekan tombol simpan, Anda akan diminta memasukkan 6-digit Kode OTP yang tertera di PC Utama ({cloudConfig.masterEmail}).
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-paper-100 border-t border-paper-300 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setSaveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-paper-400 bg-white hover:bg-paper-50 text-paper-700 text-xs font-semibold font-display transition-all"
            >
              Batal
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold font-display shadow-md shadow-amber-950/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{existingProject && !isNewRevision ? 'Perbarui di Library' : 'Simpan ke Library'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
