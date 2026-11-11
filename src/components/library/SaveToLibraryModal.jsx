import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkCheck, Cloud, X } from 'lucide-react';
import { useBoQ } from '../../context/BoQContext';
import { formatRp } from '../../utils/formatters';

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/**
 * Simpan ke Library.
 *
 * Input sudah tersinkron otomatis ke cloud, sehingga "Simpan" berarti:
 *  - draf / area kerja baru  → menjadikannya proyek resmi di Library
 *                              (atau memperbarui proyek tersimpan yang bernama sama);
 *  - proyek tersimpan        → membuat titik versi (bisa di-rollback) atau salinan baru.
 */
export function SaveToLibraryModal() {
  const {
    state,
    library,
    activeLibraryId,
    activeProject,
    saveModalOpen,
    setSaveModalOpen,
    saveToLibrary,
    grandTotal,
    filledItemsCount,
    isMaster,
  } = useBoQ();

  const [projectName, setProjectName] = useState('');
  const [asNewProject, setAsNewProject] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');

  useEffect(() => {
    if (!saveModalOpen) return;
    setProjectName(state?.project?.name || 'Proyek RAB Baru');
    setAsNewProject(false);
    setRevisionNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveModalOpen]);

  const isSavedProject = Boolean(activeProject && activeProject.status !== 'draft');
  /** Proyek tersimpan lain yang namanya sama dengan nama yang diketik (kandidat untuk diperbarui). */
  const twin = useMemo(
    () =>
      isSavedProject
        ? null
        : library.find((entry) => entry.status !== 'draft' && entry.id !== activeLibraryId && sameName(entry.name, projectName)) || null,
    [isSavedProject, library, activeLibraryId, projectName]
  );

  if (!saveModalOpen) return null;

  const close = () => setSaveModalOpen(false);
  const handleSave = (event) => {
    event.preventDefault();
    saveToLibrary(projectName, asNewProject, revisionNote.trim() || null);
  };

  const hasChoice = isSavedProject || Boolean(twin);
  const primaryLabel = isSavedProject
    ? 'Simpan versi (titik pemulihan)'
    : `Perbarui proyek "${twin?.name}"`;
  const primaryHint = isSavedProject
    ? 'Mencatat keadaan saat ini ke Riwayat Versi agar bisa dipulihkan kapan saja. Isi proyek sudah tersinkron otomatis.'
    : 'Isi proyek tersebut diganti dengan pekerjaan ini. Versi sebelumnya otomatis dicadangkan ke Riwayat Versi.';
  const submitLabel = hasChoice && !asNewProject ? (isSavedProject ? 'Simpan Versi' : 'Perbarui di Library') : 'Simpan ke Library';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blueprint-950/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-paper-400 max-w-md w-full overflow-hidden animate-scaleUp text-paper-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-library-title"
      >
        <div className="bg-blueprint-900 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 id="save-library-title" className="font-heading text-lg font-bold tracking-wide">
                Simpan ke Library RAB
              </h3>
              <p className="text-xs text-blueprint-200">Arsip resmi proyek yang terbaca semua pengguna.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-blueprint-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="p-5 space-y-4 bg-paper-50">
            <div>
              <label htmlFor="save-project-name" className="block text-[11px] font-mono font-bold uppercase text-paper-700 mb-1">
                Nama Proyek RAB
              </label>
              <input
                id="save-project-name"
                type="text"
                required
                maxLength={120}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="mis. Renovasi Rumah 2 Lantai - Bpk. Hendra"
                className="w-full p-2.5 text-xs font-semibold rounded-xl border border-paper-300 bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-500 shadow-sm"
              />
            </div>

            <dl className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-paper-300 text-xs font-mono">
              <div>
                <dt className="text-[10px] text-paper-500 uppercase">Klien / Pemilik</dt>
                <dd className="font-semibold text-paper-800 truncate">{state.project.client || '-'}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-paper-500 uppercase">Total Anggaran</dt>
                <dd className="font-bold text-amber-800 truncate">{formatRp(grandTotal)}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-paper-500 uppercase">Lokasi</dt>
                <dd className="font-medium text-paper-700 truncate">{state.project.location || '-'}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-paper-500 uppercase">Item Terisi</dt>
                <dd className="font-medium text-paper-700">{filledItemsCount} item</dd>
              </div>
            </dl>

            {hasChoice && (
              <fieldset className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-2.5">
                <legend className="sr-only">Mode penyimpanan</legend>
                <label className="flex items-start gap-2.5 cursor-pointer text-paper-800">
                  <input
                    type="radio"
                    name="saveMode"
                    checked={!asNewProject}
                    onChange={() => setAsNewProject(false)}
                    className="mt-0.5 text-blueprint-600 focus:ring-blueprint-500"
                  />
                  <span>
                    <span className="font-bold text-xs text-paper-900 block">{primaryLabel} (Rekomendasi)</span>
                    <span className="text-[10px] text-paper-600">{primaryHint}</span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-paper-800">
                  <input
                    type="radio"
                    name="saveMode"
                    checked={asNewProject}
                    onChange={() => setAsNewProject(true)}
                    className="mt-0.5 text-blueprint-600 focus:ring-blueprint-500"
                  />
                  <span>
                    <span className="font-bold text-xs text-paper-900 block">
                      {isSavedProject ? 'Simpan sebagai salinan / proyek baru' : 'Simpan sebagai proyek baru'}
                    </span>
                    <span className="text-[10px] text-paper-600">
                      {isSavedProject
                        ? 'Membuat proyek baru berisi keadaan saat ini, lalu melanjutkan pekerjaan di salinan tersebut.'
                        : 'Membuat rekaman baru di Library tanpa mengubah proyek yang sudah ada.'}
                    </span>
                  </span>
                </label>

                {!asNewProject && (
                  <div className="pt-2 border-t border-blue-200">
                    <label htmlFor="save-revision-note" className="block text-[10px] font-mono font-bold uppercase text-blue-950 mb-1">
                      Catatan versi (opsional)
                    </label>
                    <input
                      id="save-revision-note"
                      type="text"
                      maxLength={140}
                      value={revisionNote}
                      onChange={(event) => setRevisionNote(event.target.value)}
                      placeholder="mis. Penyesuaian volume cor beton & dinding lantai 2"
                      className="w-full p-2 text-xs rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blueprint-500 text-slate-800"
                    />
                  </div>
                )}
              </fieldset>
            )}

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] flex items-start gap-2.5">
              <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
              <p className="leading-snug">
                Setiap input tersimpan & tersinkron otomatis ke semua perangkat. Untuk bereksperimen tanpa mengubah proyek
                asli, simpan dulu sebagai salinan.
              </p>
            </div>

            {!isMaster && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] leading-snug">
                <strong>Mode Klien:</strong> setelah menekan tombol simpan Anda akan diminta Kode OTP 6-digit dari Master.
              </div>
            )}
          </div>

          <div className="p-4 bg-paper-100 border-t border-paper-300 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-xl border border-paper-400 bg-white hover:bg-paper-50 text-paper-700 text-xs font-semibold font-display transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold font-display shadow-md shadow-amber-950/20 transition-all"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
