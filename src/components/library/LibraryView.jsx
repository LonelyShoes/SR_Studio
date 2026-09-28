import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  FolderArchive, 
  Search, 
  Plus, 
  FolderOpen, 
  Copy, 
  Trash2, 
  Download, 
  Calendar, 
  MapPin, 
  User, 
  Building, 
  Layers, 
  ArrowLeft,
  BookmarkCheck,
  Clock,
  Sparkles,
  Cloud,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Lock,
  KeyRound,
  Scale,
  X,
  History
} from 'lucide-react';
import { ProjectComparisonModal } from './ProjectComparisonModal';
import { ProjectRevisionModal } from './ProjectRevisionModal';
import { formatRp, formatNumber } from '../../utils/formatters';
import { exportBoQToExcel } from '../../utils/exportExcel';

export function LibraryView() {
  const { 
    library, 
    activeLibraryId, 
    loadFromLibrary, 
    deleteFromLibrary, 
    duplicateLibraryProject, 
    setSaveModalOpen,
    setActiveTab,
    resetProject,
    grandTotal: currentGrandTotal,
    state: currentState,
    cloudConfig,
    syncCloudLibrary,
    isCloudSyncing,
    setCloudModalOpen,
    isOtpAuthorized,
    exportLibraryBackup,
    importLibraryFromJson
  } = useBoQ();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt' | 'name' | 'grandTotal'
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [revisionModalProject, setRevisionModalProject] = useState(null);

  const toggleCompareSelection = (id) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[0], id];
      }
      return [...prev, id];
    });
  };

  const handleOpenCompare = () => {
    if (selectedForCompare.length < 2) {
      if (library.length >= 2) {
        setSelectedForCompare([library[0].id, library[1].id]);
        setIsCompareModalOpen(true);
      } else {
        alert("Minimal harus ada 2 proyek di Library untuk melakukan komparasi.");
      }
    } else {
      setIsCompareModalOpen(true);
    }
  };

  // Filtered & Sorted projects
  const filteredProjects = useMemo(() => {
    let list = Array.isArray(library) ? [...library] : [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p?.name && p.name.toLowerCase().includes(q)) ||
        (p?.client && p.client.toLowerCase().includes(q)) ||
        (p?.location && p.location.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'updatedAt') {
        return new Date(b?.updatedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.createdAt || 0);
      }
      if (sortBy === 'name') {
        return (a?.name || '').localeCompare(b?.name || '');
      }
      if (sortBy === 'grandTotal') {
        return (b?.grandTotal || 0) - (a?.grandTotal || 0);
      }
      return 0;
    });

    return list;
  }, [library, searchQuery, sortBy]);

  const handleExportProject = (project) => {
    if (project?.stateSnapshot) {
      exportBoQToExcel(project.stateSnapshot);
    }
  };

  const handleStartNewProject = () => {
    if (window.confirm("Mulai proyek RAB baru? Proyek yang belum disimpan di library dapat tertimpa.")) {
      resetProject();
      setActiveTab('boq');
    }
  };

  return (
    <div className="pb-32 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

      {/* Top Action & Navigation */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('boq')}
          className="inline-flex items-center gap-2 text-xs font-semibold font-display text-blueprint-700 hover:text-blueprint-900 bg-white hover:bg-blueprint-50 px-3.5 py-2 rounded-xl border border-paper-300 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke BoQ / RAB
        </button>

        {/* Cloud Sync Quick Trigger & Backup Actions */}
        <div className="flex items-center gap-2">
          {/* Export Backup JSON */}
          <button
            type="button"
            onClick={exportLibraryBackup}
            className="inline-flex items-center gap-1.5 text-xs font-semibold font-display text-paper-700 hover:text-paper-900 bg-white hover:bg-paper-50 px-3 py-2 rounded-xl border border-paper-300 shadow-sm transition-all"
            title="Download file backup semua proyek Library (.json)"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Backup JSON</span>
          </button>

          {/* Import Backup JSON */}
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold font-display text-paper-700 hover:text-paper-900 bg-white hover:bg-paper-50 px-3 py-2 rounded-xl border border-paper-300 shadow-sm transition-all cursor-pointer">
            <Plus className="w-3.5 h-3.5 text-blueprint-600" />
            <span className="hidden sm:inline">Import JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    importLibraryFromJson(event.target.result);
                  };
                  reader.readAsText(file);
                }
                e.target.value = '';
              }}
            />
          </label>

          {/* Cloud Sync Quick Trigger */}
          <button
            type="button"
            onClick={() => syncCloudLibrary(false)}
            disabled={isCloudSyncing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold font-display text-paper-700 hover:text-paper-900 bg-white hover:bg-paper-50 px-3 py-2 rounded-xl border border-paper-300 shadow-sm transition-all disabled:opacity-50"
            title="Tarik data terbaru dari Cloud Storage"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin text-blueprint-600' : 'text-paper-500'}`} />
            <span>{isCloudSyncing ? 'Menyinkronkan...' : 'Sinkronkan Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Cloud Status Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            cloudConfig.isCloudEnabled 
              ? cloudConfig.isMasterDevice 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {cloudConfig.isCloudEnabled ? (
              cloudConfig.isMasterDevice ? <ShieldCheck className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />
            ) : (
              <Cloud className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm tracking-wide text-white">
                {cloudConfig.isCloudEnabled
                  ? cloudConfig.isMasterDevice
                    ? '👑 PC Utama (Master Storage)'
                    : '📱 HP / Device Klien (Mode Baca 24/7)'
                  : 'Cloud Sync Multi-Device Belum Aktif'}
              </span>
              {cloudConfig.isCloudEnabled && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  cloudConfig.isMasterDevice 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : isOtpAuthorized
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {cloudConfig.isMasterDevice 
                    ? 'Akses Penuh' 
                    : isOtpAuthorized 
                      ? 'Izin OTP Aktif' 
                      : 'Read-Only (Terkunci OTP)'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Firebase Database: <strong className="text-amber-300 font-mono">sr-tool-94937</strong> • Sinkronisasi Realtime 24 Jam Nonstop.
            </p>
          </div>
        </div>

        {cloudConfig.isMasterDevice && (
          <button
            type="button"
            onClick={() => setCloudModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-display font-semibold text-xs border border-amber-500/40 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-300" />
            <span>👑 Kelola Master & OTP</span>
          </button>
        )}
      </div>

      {/* Hero Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 p-6 rounded-2xl bg-slate-900 text-white shadow-blueprint mb-6">
        <div>
          <span className="inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 mb-2 font-semibold">
            Arsip & Manajemen Proyek
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-tight flex items-center gap-2.5">
            <FolderArchive className="w-7 h-7 text-amber-400" />
            Library Hasil RAB
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Simpan, buka kembali, dan kelola semua riwayat proyek RAB Anda. Buka kapan saja untuk merevisi tanpa harus mengulang dari awal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-display font-semibold text-xs shadow-md transition-all"
          >
            <BookmarkCheck className="w-4 h-4" />
            Simpan Proyek Aktif
          </button>

          <button
            type="button"
            onClick={handleStartNewProject}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-display font-semibold text-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            Proyek Baru
          </button>
        </div>
      </div>

      {/* Search & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-paper-300 shadow-sm mb-6">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-paper-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama proyek, klien, atau lokasi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-sans rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-500"
          />
        </div>

        {/* Sort selector & Compare Button */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={handleOpenCompare}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-display border transition-all ${
              selectedForCompare.length === 2
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-md'
                : 'bg-paper-50 hover:bg-white text-paper-800 border-paper-300 shadow-xs'
            }`}
            title="Bandingkan 2 versi proyek secara berdampingan"
          >
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>Bandingkan Versi ({selectedForCompare.length}/2)</span>
          </button>

          <span className="text-paper-600 text-[11px] font-sans ml-1">Urutkan:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="p-2 rounded-xl border border-paper-300 bg-paper-50 text-paper-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blueprint-500 text-xs"
          >
            <option value="updatedAt">Terbaru Diperbarui</option>
            <option value="name">Nama Proyek (A-Z)</option>
            <option value="grandTotal">Nilai RAB Terbesar</option>
          </select>
        </div>

      </div>

      {/* Project Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-paper-300 bg-white p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-paper-900 uppercase">
              {searchQuery ? "Tidak Ada Proyek yang Cocok" : "Library RAB Masih Kosong"}
            </h3>
            <p className="text-xs text-paper-600 max-w-md mx-auto mt-1">
              {searchQuery 
                ? "Coba gunakan kata kunci pencarian yang lain."
                : cloudConfig.isMasterDevice
                  ? "Simpan proyek RAB Anda saat ini ke dalam library agar tersimpan rapi dan otomatis tersinkron ke Cloud."
                  : "Belum ada proyek di perangkat ini. Klik tombol di bawah untuk menarik riwayat proyek dari PC Utama via Cloud."}
            </p>
          </div>

          {!searchQuery && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!cloudConfig.isMasterDevice && (
                <button
                  type="button"
                  onClick={() => syncCloudLibrary(false)}
                  disabled={isCloudSyncing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold font-display shadow-md transition-all disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'Mengambil Data Cloud...' : 'Tarik Data dari PC Utama (Cloud Sync)'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSaveModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold font-display shadow-md transition-all"
              >
                <BookmarkCheck className="w-4 h-4" />
                Simpan Proyek Aktif ({formatRp(currentGrandTotal)}) ke Library
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((proj) => {
            const isCurrentlyActive = proj.id === activeLibraryId;
            const updatedDate = proj.updatedAt 
              ? new Date(proj.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '-';

            return (
              <div 
                key={proj.id}
                className={`rounded-2xl bg-white border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  isCurrentlyActive 
                    ? 'border-2 border-blueprint-600 ring-2 ring-blueprint-500/20' 
                    : 'border-paper-300 hover:border-paper-400'
                }`}
              >
                <div>
                  
                  {/* Card Header & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isCurrentlyActive && (
                          <span className="px-2 py-0.5 rounded-md bg-blueprint-100 text-blueprint-800 text-[10px] font-mono font-bold uppercase border border-blueprint-300">
                            Sedang Dibuka
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-paper-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-paper-400" />
                          {proj.date}
                        </span>

                        {/* Revision History Snapshot Badge / Button */}
                        <button
                          type="button"
                          onClick={() => setRevisionModalProject(proj)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border flex items-center gap-1 transition-all ${
                            proj.revisions && proj.revisions.length > 0
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'bg-paper-100 hover:bg-paper-200 text-paper-600 border-paper-300'
                          }`}
                          title="Buka riwayat versi & snapshot cadangan proyek ini"
                        >
                          <History className="w-3 h-3 text-indigo-500" />
                          <span>{proj.revisions && proj.revisions.length > 0 ? `${proj.revisions.length} Snapshot` : 'Riwayat'}</span>
                        </button>

                        {/* Compare Selector Chip */}
                        <button
                          type="button"
                          onClick={() => toggleCompareSelection(proj.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border flex items-center gap-1 transition-all ${
                            selectedForCompare.includes(proj.id)
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                              : 'bg-paper-100 hover:bg-paper-200 text-paper-700 border-paper-300'
                          }`}
                          title="Pilih proyek ini untuk dikomparasikan"
                        >
                          <Scale className="w-3 h-3" />
                          <span>{selectedForCompare.includes(proj.id) ? 'Terpilih Komparasi' : 'Pilih Komparasi'}</span>
                        </button>
                      </div>
                      <h3 className="font-heading font-bold text-base text-paper-900 truncate leading-snug" title={proj.name}>
                        {proj.name}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono uppercase text-paper-500 block">Total RAB</span>
                      <span className="font-heading text-lg font-bold text-amber-700 block">
                        {formatRp(proj.grandTotal || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-xl bg-paper-50 border border-paper-200 mb-4">
                    <div className="flex items-center gap-1.5 text-paper-700 truncate">
                      <User className="w-3.5 h-3.5 text-paper-400 shrink-0" />
                      <span className="truncate">{proj.client || '-'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-paper-700 truncate">
                      <MapPin className="w-3.5 h-3.5 text-paper-400 shrink-0" />
                      <span className="truncate">{proj.location || '-'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-paper-700">
                      <Layers className="w-3.5 h-3.5 text-paper-400 shrink-0" />
                      <span>{proj.filledItemsCount || 0} item terisi</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-paper-600 text-[10px]">
                      <Clock className="w-3 h-3 text-paper-400 shrink-0" />
                      <span className="truncate">{updatedDate}</span>
                    </div>
                  </div>

                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-paper-200 flex flex-wrap items-center justify-between gap-2">
                  
                  {/* Open & Revise in BoQ */}
                  <button
                    type="button"
                    onClick={() => loadFromLibrary(proj.id)}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blueprint-600 hover:bg-blueprint-700 text-white font-display font-semibold text-xs shadow-sm transition-all"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Buka & Revisi di BoQ</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Riwayat Versi / Snapshot */}
                    <button
                      type="button"
                      onClick={() => setRevisionModalProject(proj)}
                      className="p-2 rounded-lg border border-paper-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-colors"
                      title="Riwayat Versi & Snapshot Cadangan Proyek"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => duplicateLibraryProject(proj.id)}
                      className="p-2 rounded-lg border border-paper-300 hover:border-paper-400 hover:bg-paper-100 text-paper-700 transition-colors"
                      title="Duplikat Proyek ini"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Export Excel Directly */}
                    <button
                      type="button"
                      onClick={() => handleExportProject(proj)}
                      className="p-2 rounded-lg border border-paper-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 transition-colors"
                      title="Download Excel Proyek ini"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button (Master Only) */}
                    {cloudConfig.isMasterDevice ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus proyek "${proj.name}" dari library? Tindakan ini tidak dapat dibatalkan.`)) {
                            deleteFromLibrary(proj.id);
                          }
                        }}
                        className="p-2 rounded-lg border border-paper-300 hover:border-red-400 hover:bg-red-50 text-paper-500 hover:text-red-600 transition-colors"
                        title="Hapus dari Library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deleteFromLibrary(proj.id)}
                        className="p-2 rounded-lg border border-paper-200 bg-paper-100/60 text-paper-400 cursor-not-allowed opacity-50 hover:bg-red-50 hover:text-red-400 transition-colors"
                        title="Hapus Terkunci (Khusus Master)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Bar when 2 projects are selected */}
      {selectedForCompare.length === 2 && !isCompareModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs">
            <Scale className="w-4 h-4 text-amber-400" />
            <span><b>2 Proyek</b> siap dikomparasikan</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              Buka Analisis Komparasi (Diff)
            </button>
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Batalkan pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Project Comparison Modal */}
      {isCompareModalOpen && (
        <ProjectComparisonModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          projectA={library.find(p => p.id === selectedForCompare[0]) || library[0]}
          projectB={library.find(p => p.id === selectedForCompare[1]) || library[1]}
          libraryList={library}
          onLoadProject={loadFromLibrary}
        />
      )}

      {/* Project Revision & Snapshot Modal */}
      {revisionModalProject && (
        <ProjectRevisionModal
          project={revisionModalProject}
          isOpen={!!revisionModalProject}
          onClose={() => setRevisionModalProject(null)}
        />
      )}

    </div>
  );
}
