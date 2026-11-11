import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  Calendar,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  Download,
  FolderArchive,
  FolderOpen,
  History,
  KeyRound,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useBoQ } from '../../context/BoQContext';
import { describeSyncPhase, useCloud } from '../../context/cloudStore';
import { ProjectComparisonModal } from './ProjectComparisonModal';
import { ProjectRevisionModal } from './ProjectRevisionModal';
import { formatRp } from '../../utils/formatters';
import { formatRelativeTime, initialsOf } from '../../utils/activity';
import { exportBoQToExcel } from '../../utils/exportExcel';

const SORTERS = {
  updatedAt: (a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0),
  name: (a, b) => (a.name || '').localeCompare(b.name || '', 'id'),
  grandTotal: (a, b) => (b.grandTotal || 0) - (a.grandTotal || 0),
};

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

function ProjectCard({ project, isActive, isMaster, viewers, isSelectedForCompare, onOpen, onRevisions, onDuplicate, onExport, onDelete, onToggleCompare, exporting }) {
  const isDraft = project.status === 'draft';
  return (
    <article
      className={`rounded-2xl bg-white border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
        isActive ? 'border-2 border-blueprint-600 ring-2 ring-blueprint-500/20' : 'border-paper-300 hover:border-paper-400'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isActive && (
                <span className="px-2 py-0.5 rounded-md bg-blueprint-100 text-blueprint-800 text-[10px] font-mono font-bold uppercase border border-blueprint-300">
                  Sedang Dibuka
                </span>
              )}
              {isDraft && (
                <span
                  className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-mono font-bold uppercase border border-amber-300"
                  title="Draf: sudah tersinkron realtime, tetapi belum disimpan sebagai proyek resmi di Library"
                >
                  Draf{project.owner?.name ? ` • ${project.owner.name}` : ''}
                </span>
              )}
              <span className="text-[11px] font-mono text-paper-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-paper-400" />
                {project.date}
              </span>
              <button
                type="button"
                onClick={onRevisions}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border flex items-center gap-1 transition-all ${
                  project.revisionCount > 0
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-paper-100 hover:bg-paper-200 text-paper-600 border-paper-300'
                }`}
                title="Buka riwayat versi & snapshot cadangan proyek ini"
              >
                <History className="w-3 h-3 text-indigo-500" />
                <span>{project.revisionCount > 0 ? `${project.revisionCount} Versi` : 'Riwayat'}</span>
              </button>
              <button
                type="button"
                onClick={onToggleCompare}
                aria-pressed={isSelectedForCompare}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border flex items-center gap-1 transition-all ${
                  isSelectedForCompare
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-paper-100 hover:bg-paper-200 text-paper-700 border-paper-300'
                }`}
                title="Pilih proyek ini untuk dikomparasikan"
              >
                <Scale className="w-3 h-3" />
                <span>{isSelectedForCompare ? 'Terpilih' : 'Bandingkan'}</span>
              </button>
            </div>
            <h3 className="font-heading font-bold text-base text-paper-900 truncate leading-snug" title={project.name}>
              {project.name}
            </h3>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono uppercase text-paper-500 block">Total RAB</span>
            <span className="font-heading text-lg font-bold text-amber-700 block">{formatRp(project.grandTotal || 0)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-xl bg-paper-50 border border-paper-200 mb-3">
          <div className="flex items-center gap-1.5 text-paper-700 truncate">
            <User className="w-3.5 h-3.5 text-paper-400 shrink-0" />
            <span className="truncate">{project.client || '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-paper-700 truncate">
            <MapPin className="w-3.5 h-3.5 text-paper-400 shrink-0" />
            <span className="truncate">{project.location || '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-paper-700">
            <Layers className="w-3.5 h-3.5 text-paper-400 shrink-0" />
            <span>{project.filledItemsCount || 0} item terisi</span>
          </div>
          <div className="flex items-center gap-1.5 text-paper-600 text-[10px]" title={formatDateTime(project.updatedAt)}>
            <Clock className="w-3 h-3 text-paper-400 shrink-0" />
            <span className="truncate">
              {formatRelativeTime(project.updatedAt)}
              {project.updatedBy?.name ? ` • ${project.updatedBy.name}` : ''}
            </span>
          </div>
        </div>

        {viewers.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] text-paper-600" title={viewers.map((viewer) => viewer.name).join(', ')}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="flex -space-x-1.5">
              {viewers.slice(0, 4).map((viewer) => (
                <span
                  key={viewer.sessionId}
                  className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold ${
                    viewer.role === 'master' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {initialsOf(viewer.name)}
                </span>
              ))}
            </span>
            <span className="truncate">
              {viewers.length === 1 ? `${viewers[0].name} sedang membuka` : `${viewers.length} pengguna sedang membuka`}
            </span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-paper-200 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blueprint-600 hover:bg-blueprint-700 text-white font-display font-semibold text-xs shadow-sm transition-all"
        >
          <FolderOpen className="w-4 h-4" />
          <span>{isActive ? 'Lanjutkan di BoQ' : 'Buka & Revisi di BoQ'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRevisions}
            className="p-2 rounded-lg border border-paper-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-colors"
            title="Riwayat Versi & Snapshot Cadangan"
            aria-label="Riwayat versi"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-2 rounded-lg border border-paper-300 hover:border-paper-400 hover:bg-paper-100 text-paper-700 transition-colors"
            title="Duplikat proyek ini"
            aria-label="Duplikat proyek"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="p-2 rounded-lg border border-paper-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 transition-colors disabled:opacity-50"
            title="Download Excel proyek ini"
            aria-label="Download Excel"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!isMaster}
            className="p-2 rounded-lg border border-paper-300 hover:border-red-400 hover:bg-red-50 text-paper-500 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-paper-500"
            title={isMaster ? 'Pindahkan ke Sampah' : 'Menghapus proyek hanya dapat dilakukan Master'}
            aria-label="Hapus proyek"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function TrashPanel({ trash, onRestore, onPurge }) {
  const [open, setOpen] = useState(false);
  if (trash.length === 0) return null;
  return (
    <section className="mt-8 rounded-2xl border border-paper-300 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-paper-800">
          <Trash2 className="w-4 h-4 text-paper-500" />
          Sampah ({trash.length}) — proyek terhapus dapat dipulihkan selama 30 hari
        </span>
        <span className="text-[11px] font-mono text-blueprint-700">{open ? 'Sembunyikan' : 'Tampilkan'}</span>
      </button>
      {open && (
        <ul className="border-t border-paper-200 divide-y divide-paper-200">
          {trash.map((item) => (
            <li key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-paper-900 truncate">{item.name}</p>
                <p className="text-[11px] text-paper-500 font-mono">
                  {formatRp(item.grandTotal)} • {item.filledItemsCount} item • dihapus {formatRelativeTime(item.deletedAt)}
                  {item.deletedBy ? ` oleh ${item.deletedBy}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRestore(item.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pulihkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Hapus PERMANEN "${item.name}" beserta riwayat versinya? Tindakan ini tidak dapat dibatalkan.`)) {
                      onPurge(item.id);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold"
                >
                  Hapus permanen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
    isMaster,
    canEdit,
    setCloudModalOpen,
    exportLibraryBackup,
    importLibraryFromJson,
    ensureProjectSnapshot,
    restoreTrashedProject,
    purgeTrashedProject,
    showToast,
  } = useBoQ();

  const phase = useCloud((snapshot) => snapshot.phase);
  const pending = useCloud((snapshot) => snapshot.pending);
  const online = useCloud((snapshot) => snapshot.online);
  const libraryReady = useCloud((snapshot) => snapshot.libraryReady);
  const presence = useCloud((snapshot) => snapshot.presence);
  const trash = useCloud((snapshot) => snapshot.trash);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [revisionProjectId, setRevisionProjectId] = useState(null);
  const [exportingId, setExportingId] = useState(null);

  const status = describeSyncPhase(phase, pending);

  const viewersByProject = useMemo(() => {
    const map = new Map();
    for (const session of presence) {
      if (!session.docId || session.role === 'guest') continue;
      if (!map.has(session.docId)) map.set(session.docId, []);
      map.get(session.docId).push(session);
    }
    return map;
  }, [presence]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = query
      ? library.filter((project) =>
          [project.name, project.client, project.location].some((field) => (field || '').toLowerCase().includes(query))
        )
      : [...library];
    return list.sort(SORTERS[sortBy] || SORTERS.updatedAt);
  }, [library, searchQuery, sortBy]);

  const savedCount = library.filter((project) => project.status !== 'draft').length;
  const draftCount = library.length - savedCount;

  const toggleCompareSelection = (id) =>
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return prev.length >= 2 ? [prev[0], id] : [...prev, id];
    });

  const openCompare = (ids) => {
    ids.forEach((id) => ensureProjectSnapshot(id));
    setIsCompareModalOpen(true);
  };

  const handleOpenCompare = () => {
    if (selectedForCompare.length === 2) {
      openCompare(selectedForCompare);
    } else if (library.length >= 2) {
      const ids = [library[0].id, library[1].id];
      setSelectedForCompare(ids);
      openCompare(ids);
    } else {
      showToast('Minimal harus ada 2 proyek di Library untuk melakukan komparasi.', 'info');
    }
  };

  const handleExportProject = async (project) => {
    setExportingId(project.id);
    try {
      const record = project.id === activeLibraryId ? null : await ensureProjectSnapshot(project.id);
      const snapshot = record?.stateSnapshot || project.stateSnapshot;
      if (!snapshot) {
        showToast('Data proyek belum tersedia di perangkat ini. Sambungkan internet lalu coba lagi.', 'warning');
        return;
      }
      await exportBoQToExcel(snapshot, { scheduleConfig: record?.scheduleSnapshot || project.scheduleSnapshot || undefined });
    } catch (error) {
      showToast(`Gagal mengekspor Excel: ${error?.message || error}`, 'error');
    } finally {
      setExportingId(null);
    }
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importLibraryFromJson(reader.result);
    reader.onerror = () => showToast('File backup tidak dapat dibaca.', 'error');
    reader.readAsText(file);
  };

  const handleStartNewProject = () => {
    if (window.confirm('Mulai proyek RAB baru? Area kerja dikosongkan; proyek yang ada di Library tetap aman.')) {
      resetProject();
      setActiveTab('boq');
    }
  };

  const handleDelete = (project) => {
    if (window.confirm(`Pindahkan proyek "${project.name}" ke Sampah? Proyek bisa dipulihkan Master dalam 30 hari.`)) {
      deleteFromLibrary(project.id);
      setSelectedForCompare((prev) => prev.filter((id) => id !== project.id));
    }
  };

  const compareA = library.find((project) => project.id === selectedForCompare[0]) || library[0];
  const compareB = library.find((project) => project.id === selectedForCompare[1]) || library[1];
  const revisionProject = revisionProjectId ? library.find((project) => project.id === revisionProjectId) : null;
  const isLoadingLibrary = !libraryReady && library.length === 0 && phase !== 'offline' && phase !== 'error';

  return (
    <div className="pb-32 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Navigasi & alat */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('boq')}
          className="inline-flex items-center gap-2 text-xs font-semibold font-display text-blueprint-700 hover:text-blueprint-900 bg-white hover:bg-blueprint-50 px-3.5 py-2 rounded-xl border border-paper-300 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke BoQ / RAB
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportLibraryBackup}
            className="inline-flex items-center gap-1.5 text-xs font-semibold font-display text-paper-700 hover:text-paper-900 bg-white hover:bg-paper-50 px-3 py-2 rounded-xl border border-paper-300 shadow-sm transition-all"
            title="Unduh file backup seluruh proyek Library (.json)"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Backup JSON</span>
          </button>

          <label
            className="inline-flex items-center gap-1.5 text-xs font-semibold font-display text-paper-700 hover:text-paper-900 bg-white hover:bg-paper-50 px-3 py-2 rounded-xl border border-paper-300 shadow-sm transition-all cursor-pointer"
            title="Impor file backup Library (.json)"
          >
            <Upload className="w-3.5 h-3.5 text-blueprint-600" />
            <span className="hidden sm:inline">Import JSON</span>
            <input type="file" accept=".json,application/json" className="sr-only" onChange={handleImportFile} />
          </label>
        </div>
      </div>

      {/* Status cloud */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
              isMaster ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            {isMaster ? <ShieldCheck className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-sm tracking-wide text-white">
                {isMaster ? 'Master Studio' : 'Klien & Tim Lapangan'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                  isMaster || canEdit
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {isMaster ? 'Akses Penuh' : canEdit ? 'Izin Edit Aktif' : 'Lihat Realtime'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
              {online ? <Cloud className="w-3.5 h-3.5 text-emerald-400" /> : <CloudOff className="w-3.5 h-3.5 text-amber-400" />}
              <span>
                <strong className="text-white">{status.label}</strong> — {status.detail}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCloudModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-display font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-300" />
          <span>{isMaster ? 'Pusat Sinkronisasi & OTP' : 'Pusat Sinkronisasi'}</span>
        </button>
      </div>

      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4 p-6 rounded-2xl bg-slate-900 text-white shadow-blueprint mb-6">
        <div>
          <span className="inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 mb-2 font-semibold">
            Arsip & Manajemen Proyek • {savedCount} proyek{draftCount > 0 ? ` • ${draftCount} draf` : ''}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-tight flex items-center gap-2.5">
            <FolderArchive className="w-7 h-7 text-amber-400" />
            Library Hasil RAB
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Semua proyek tersimpan di cloud dan terbarui langsung di setiap perangkat. Buka kapan saja untuk merevisi;
            setiap perubahan otomatis tersinkron.
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

      {/* Cari & urutkan */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-paper-300 shadow-sm mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-paper-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari berdasarkan nama proyek, klien, atau lokasi..."
            aria-label="Cari proyek"
            className="w-full pl-10 pr-4 py-2.5 text-xs font-sans rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={handleOpenCompare}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-display border transition-all ${
              selectedForCompare.length === 2
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-md'
                : 'bg-paper-50 hover:bg-white text-paper-800 border-paper-300 shadow-xs'
            }`}
            title="Bandingkan 2 proyek secara berdampingan"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Bandingkan ({selectedForCompare.length}/2)</span>
          </button>

          <label htmlFor="library-sort" className="text-paper-600 text-[11px] font-sans ml-1">
            Urutkan:
          </label>
          <select
            id="library-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="p-2 rounded-xl border border-paper-300 bg-paper-50 text-paper-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blueprint-500 text-xs"
          >
            <option value="updatedAt">Terbaru Diperbarui</option>
            <option value="name">Nama Proyek (A-Z)</option>
            <option value="grandTotal">Nilai RAB Terbesar</option>
          </select>
        </div>
      </div>

      {/* Daftar proyek */}
      {isLoadingLibrary ? (
        <div className="rounded-2xl border border-paper-300 bg-white p-10 text-center text-sm text-paper-600 flex items-center justify-center gap-3" role="status">
          <Loader2 className="w-5 h-5 animate-spin text-blueprint-600" />
          Memuat Library dari cloud…
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-paper-300 bg-white p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-paper-900 uppercase">
              {searchQuery ? 'Tidak Ada Proyek yang Cocok' : 'Library RAB Masih Kosong'}
            </h3>
            <p className="text-xs text-paper-600 max-w-md mx-auto mt-1">
              {searchQuery
                ? 'Coba gunakan kata kunci pencarian yang lain.'
                : online
                  ? 'Simpan proyek RAB Anda ke Library agar tercatat rapi dan terbaca semua perangkat secara realtime.'
                  : 'Perangkat sedang offline dan belum punya salinan Library. Sambungkan internet untuk memuat proyek.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold font-display shadow-md transition-all"
            >
              <BookmarkCheck className="w-4 h-4" />
              Simpan Proyek Aktif ({formatRp(currentGrandTotal)}) ke Library
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === activeLibraryId}
              isMaster={isMaster}
              viewers={viewersByProject.get(project.id) || []}
              isSelectedForCompare={selectedForCompare.includes(project.id)}
              exporting={exportingId === project.id}
              onOpen={() => loadFromLibrary(project.id)}
              onRevisions={() => setRevisionProjectId(project.id)}
              onDuplicate={() => duplicateLibraryProject(project.id)}
              onExport={() => handleExportProject(project)}
              onDelete={() => handleDelete(project)}
              onToggleCompare={() => toggleCompareSelection(project.id)}
            />
          ))}
        </div>
      )}

      {isMaster && <TrashPanel trash={trash} onRestore={restoreTrashedProject} onPurge={purgeTrashedProject} />}

      {/* Bar komparasi */}
      {selectedForCompare.length === 2 && !isCompareModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>
              <b>2 Proyek</b> siap dikomparasikan
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCompare(selectedForCompare)}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              Buka Analisis Komparasi
            </button>
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Batalkan pilihan"
              aria-label="Batalkan pilihan komparasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isCompareModalOpen && compareA && compareB && (
        <ProjectComparisonModal
          isOpen
          onClose={() => setIsCompareModalOpen(false)}
          projectA={compareA}
          projectB={compareB}
          libraryList={library}
          onLoadProject={loadFromLibrary}
          onSelectProject={ensureProjectSnapshot}
        />
      )}

      {revisionProject && <ProjectRevisionModal project={revisionProject} isOpen onClose={() => setRevisionProjectId(null)} />}
    </div>
  );
}
