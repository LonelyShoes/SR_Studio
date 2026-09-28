import React, { useState } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  History, 
  X, 
  Camera, 
  RotateCcw, 
  Download, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  FileText, 
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldCheck
} from 'lucide-react';
import { formatRp, formatNumber } from '../../utils/formatters';

export function ProjectRevisionModal({ project, isOpen, onClose }) {
  const { 
    library, 
    restoreProjectRevision, 
    createProjectSnapshot, 
    deleteProjectRevision,
    loadFromLibrary,
    setActiveTab
  } = useBoQ();

  const [newSnapshotNote, setNewSnapshotNote] = useState('');
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [comparedRevId, setComparedRevId] = useState(null);

  if (!isOpen || !project) return null;

  // Temukan objek proyek terbaru dari state library
  const currentProject = library.find(p => p.id === project.id) || project;
  const revisions = Array.isArray(currentProject.revisions) ? currentProject.revisions : [];

  const handleTakeSnapshot = (e) => {
    e.preventDefault();
    createProjectSnapshot(currentProject.id, newSnapshotNote.trim() || null);
    setNewSnapshotNote('');
    setIsTakingSnapshot(false);
  };

  const handleRollback = (rev) => {
    const revDate = new Date(rev.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (window.confirm(`Yakin ingin memulihkan (rollback) proyek "${currentProject.name}" ke snapshot tanggal ${revDate}?\n\nVersi aktif saat ini akan otomatis dicadangkan sebagai snapshot pengaman.`)) {
      restoreProjectRevision(currentProject.id, rev.id);
      onClose();
      setActiveTab('boq');
    }
  };

  const handleDownloadSnapshotJSON = (rev) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rev.stateSnapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    const safeTitle = (currentProject.name || "Proyek").trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
    const dateStr = new Date(rev.timestamp).toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${safeTitle}_Snapshot_${dateStr}_${rev.id.slice(-4)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDelete = (revId) => {
    if (window.confirm("Hapus snapshot cadangan ini dari riwayat versi?")) {
      deleteProjectRevision(currentProject.id, revId);
      if (comparedRevId === revId) setComparedRevId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-300 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 animate-scaleUp"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base sm:text-lg font-bold tracking-wide">
                  Riwayat Versi & Snapshot Cadangan
                </h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-md">
                  Maks 5 Versi
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-md">
                {currentProject.name} &bull; Total Saat Ini: <strong className="text-amber-300">{formatRp(currentProject.grandTotal || 0)}</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Sub-Bar */}
        <div className="p-3 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Setiap pembaruan proyek di Library otomatis mencadangkan versi sebelumnya ke riwayat ini.</span>
          </div>

          {!isTakingSnapshot ? (
            <button
              type="button"
              onClick={() => setIsTakingSnapshot(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold font-display shadow-xs transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ambil Snapshot Sekarang</span>
            </button>
          ) : (
            <form onSubmit={handleTakeSnapshot} className="flex items-center gap-2 w-full sm:w-auto animate-fadeIn">
              <input
                type="text"
                value={newSnapshotNote}
                onChange={e => setNewSnapshotNote(e.target.value)}
                placeholder="Catatan snapshot (mis. Sebelum revisi spek atap)..."
                autoFocus
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => { setIsTakingSnapshot(false); setNewSnapshotNote(''); }}
                className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs hover:bg-slate-300"
              >
                Batal
              </button>
            </form>
          )}
        </div>

        {/* Timeline List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* 1. VERSI AKTIF SAAT INI */}
          <div className="rounded-2xl border-2 border-indigo-500/40 bg-indigo-50/40 p-4 relative overflow-hidden shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Versi Aktif Saat Ini
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Terakhir disimpan: {new Date(currentProject.updatedAt || currentProject.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  {currentProject.name}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {currentProject.filledItemsCount || 0} item terisi di {currentProject.categoriesCount || 0} divisi pekerjaan
                </p>
              </div>

              <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-200">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Total RAB Aktif:</span>
                <span className="font-heading text-lg font-bold text-slate-950 block">
                  {formatRp(currentProject.grandTotal || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. DAFTAR SNAPSHOT CADANGAN */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-mono uppercase tracking-wider font-bold">
                Snapshot Riwayat Cadangan ({revisions.length} Tersimpan)
              </span>
              <span className="text-[11px]">
                {revisions.length >= 5 ? 'Kapasitas 5 snapshot penuh (otomatis rotasi terlama)' : `${5 - revisions.length} slot tersisa`}
              </span>
            </div>

            {revisions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500">
                <History className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-sm">Belum ada snapshot cadangan tersimpan.</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setiap kali Anda mengedit proyek ini di BoQ dan menyimpannya ke Library, versi sebelumnya akan dicatat di sini.
                </p>
                <button
                  type="button"
                  onClick={() => setIsTakingSnapshot(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ambil Snapshot Cadangan Pertama</span>
                </button>
              </div>
            ) : (
              revisions.map((rev, idx) => {
                const isComparing = comparedRevId === rev.id;
                const diff = (rev.grandTotal || 0) - (currentProject.grandTotal || 0);
                const revDateStr = new Date(rev.timestamp).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={rev.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isComparing 
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                              Revisi #{revisions.length - idx}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {revDateStr}
                            </span>
                            {idx === 0 && (
                              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                                Snapshot Terbaru
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-medium text-slate-800">
                            {rev.note || 'Pembaruan data RAB'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {rev.filledItemsCount || 0} item terisi
                          </p>
                        </div>

                        {/* Total & Selisih Biaya */}
                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <span className="font-heading text-base font-bold text-slate-900 block">
                            {formatRp(rev.grandTotal || 0)}
                          </span>
                          <div className="flex items-center sm:justify-end gap-1 text-[11px] font-mono">
                            {diff === 0 ? (
                              <span className="text-slate-500 flex items-center gap-0.5">
                                <Minus className="w-3 h-3" /> Sama dengan versi aktif
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                +{formatRp(diff)} vs Aktif
                              </span>
                            ) : (
                              <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3 text-rose-600" />
                                -{formatRp(Math.abs(diff))} vs Aktif
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* Toggle Compare */}
                          <button
                            type="button"
                            onClick={() => setComparedRevId(isComparing ? null : rev.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              isComparing 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{isComparing ? 'Tutup Perbandingan' : 'Bandingkan'}</span>
                            {isComparing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {/* Download JSON Snapshot */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSnapshotJSON(rev)}
                            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Unduh file backup JSON snapshot ini"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Snapshot */}
                          <button
                            type="button"
                            onClick={() => handleDelete(rev.id)}
                            className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
                            title="Hapus snapshot ini dari riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Rollback Button */}
                        <button
                          type="button"
                          onClick={() => handleRollback(rev)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-display shadow-xs flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan (Rollback) ke BoQ</span>
                        </button>
                      </div>
                    </div>

                    {/* ==================== INLINE COMPARISON ACCORDION ==================== */}
                    {isComparing && rev.stateSnapshot && (
                      <div className="p-4 bg-slate-50 border-t border-indigo-200 animate-fadeIn">
                        <h5 className="font-heading font-bold text-xs uppercase tracking-wider text-indigo-950 mb-2 flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-indigo-600" />
                          Komparasi Selisih: Snapshot Revisi #{revisions.length - idx} vs Versi Aktif
                        </h5>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3">Divisi Pekerjaan</th>
                                <th className="py-2 px-3 text-right">Biaya Snapshot</th>
                                <th className="py-2 px-3 text-right">Biaya Versi Aktif</th>
                                <th className="py-2 px-3 text-right">Selisih (+/-)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {(Array.isArray(currentProject?.stateSnapshot?.categories) ? currentProject.stateSnapshot.categories : []).map(cat => {
                                const activeCatTotal = (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0);
                                const snapCats = Array.isArray(rev?.stateSnapshot?.categories) ? rev.stateSnapshot.categories : [];
                                const snapCat = snapCats.find(c => c?.id === cat?.id);
                                const snapCatTotal = (Array.isArray(snapCat?.items) ? snapCat.items : []).reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0);
                                const catDiff = snapCatTotal - activeCatTotal;

                                if (activeCatTotal === 0 && snapCatTotal === 0) return null;

                                return (
                                  <tr key={cat?.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                                      {cat?.name || 'Kategori'}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {formatRp(snapCatTotal)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-600">
                                      {formatRp(activeCatTotal)}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-bold ${
                                      catDiff === 0 
                                        ? 'text-slate-400' 
                                        : catDiff > 0 
                                          ? 'text-emerald-700' 
                                          : 'text-rose-700'
                                    }`}>
                                      {catDiff === 0 ? '-' : (catDiff > 0 ? `+${formatRp(catDiff)}` : `-${formatRp(Math.abs(catDiff))}`)}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-indigo-50/70 font-bold border-t-2 border-slate-300">
                                <td className="py-2.5 px-3 uppercase text-xs text-indigo-950">
                                  Total Grand RAB:
                                </td>
                                <td className="py-2.5 px-3 text-right text-indigo-950">
                                  {formatRp(rev.grandTotal || 0)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-700">
                                  {formatRp(currentProject.grandTotal || 0)}
                                </td>
                                <td className={`py-2.5 px-3 text-right ${
                                  diff === 0 
                                    ? 'text-slate-400' 
                                    : diff > 0 
                                      ? 'text-emerald-700' 
                                      : 'text-rose-700'
                                }`}>
                                  {diff === 0 ? 'Sama' : (diff > 0 ? `+${formatRp(diff)}` : `-${formatRp(Math.abs(diff))}`)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Sistem mencatat riwayat versi lokal dan menyinkronkannya otomatis ke Cloud.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
