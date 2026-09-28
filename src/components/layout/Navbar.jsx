import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBoQ } from '../../context/BoQContext';
import { 
  FileSpreadsheet, 
  Layers, 
  LayoutGrid, 
  SquareAsterisk, 
  Building2,
  RotateCcw,
  Download,
  Sparkles,
  Inbox,
  Boxes,
  Briefcase,
  BookmarkPlus,
  FolderArchive,
  PanelTop,
  Zap,
  Droplets,
  LogOut,
  LayoutDashboard,
  Printer,
  TrendingUp,
  Home,
  DoorOpen,
  Trees,
  MoreVertical,
  ChevronDown,
  Smartphone,
  Check,
  X,
  Menu,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Command,
  Package,
  Lock
} from 'lucide-react';
import { formatRp, formatNumber } from '../../utils/formatters';
import { exportBoQToExcel } from '../../utils/exportExcel';

export function Navbar() {
  const { 
    state, 
    activeTab, 
    setActiveTab, 
    grandTotal, 
    filledItemsCount,
    resetProject,
    library,
    setSaveModalOpen,
    setDocumentModalOpen,
    setMaterialTakeoffModalOpen,
    scheduleConfig,
    cloudConfig,
    isCloudSyncing,
    setCloudModalOpen,
    sessionRole,
    logoutToLandingPage,
    isTabLockedForClient
  } = useBoQ();

  // State menu popup & drawer
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const moduleListRef = useRef(null);

  useEffect(() => {
    if (moduleDrawerOpen) {
      setModuleFilter('all');
      setTimeout(() => {
        if (moduleListRef.current) {
          moduleListRef.current.scrollTop = 0;
        }
      }, 10);
    }
  }, [moduleDrawerOpen]);

  // Dropdown kategori pada desktop ('structure' | 'architecture' | 'mep_infra' | null)
  const [openDropdown, setOpenDropdown] = useState(null);

  // Mode tampilan desktop: 'grouped' (ringkas & bersih) atau 'all' (semua 15 tab dibentang)
  const [desktopNavMode, setDesktopNavMode] = useState(() => {
    try {
      return localStorage.getItem('SR_DESKTOP_NAV_MODE') || 'grouped';
    } catch (e) {
      return 'grouped';
    }
  });

  const toggleDesktopNavMode = () => {
    const nextMode = desktopNavMode === 'grouped' ? 'all' : 'grouped';
    setDesktopNavMode(nextMode);
    try {
      localStorage.setItem('SR_DESKTOP_NAV_MODE', nextMode);
    } catch (e) {}
  };

  // Keyboard shortcut Ctrl+K / Cmd+K untuk pencarian cepat modul
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setMoreMenuOpen(false);
        setOpenDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      desc: 'Analitik & Finansial Visual',
      group: 'main',
      icon: LayoutDashboard, 
      activeColor: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40',
      hoverColor: 'hover:bg-blue-950/70 hover:text-blue-200'
    },
    { 
      id: 'boq', 
      label: 'BoQ / RAB', 
      desc: 'Master WBS & Anggaran Biaya',
      group: 'main',
      icon: FileSpreadsheet, 
      badge: filledItemsCount > 0 ? `${filledItemsCount}` : null,
      activeColor: 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40',
      hoverColor: 'hover:bg-blue-950/70 hover:text-blue-200'
    },
    { 
      id: 'schedule', 
      label: 'Kurva S', 
      desc: 'Time Schedule & Progres Proyek',
      group: 'main',
      icon: TrendingUp, 
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40',
      hoverColor: 'hover:bg-emerald-950/70 hover:text-emerald-200'
    },
    { 
      id: 'library', 
      label: 'Library RAB', 
      desc: 'Arsip & Riwayat Proyek',
      group: 'main',
      icon: FolderArchive, 
      badge: library.length > 0 ? `${library.length}` : null,
      activeColor: 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/40',
      hoverColor: 'hover:bg-amber-950/70 hover:text-amber-200'
    },
    { 
      id: 'foundation', 
      label: 'Pondasi', 
      desc: 'Batu Kali, Footplat & Galian',
      group: 'structure',
      icon: Building2, 
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40',
      hoverColor: 'hover:bg-emerald-950/70 hover:text-emerald-200'
    },
    { 
      id: 'concrete', 
      label: 'Cor Beton', 
      desc: 'Sloof, Kolom, Balok & Plat',
      group: 'structure',
      icon: Layers, 
      activeColor: 'bg-cyan-700 text-white shadow-md shadow-cyan-900/40 ring-1 ring-cyan-400/40',
      hoverColor: 'hover:bg-cyan-950/70 hover:text-cyan-200'
    },
    { 
      id: 'rebar', 
      label: 'Tulangan Besi', 
      desc: 'Besi Pokok & Sengkang Begel',
      group: 'structure',
      icon: Boxes, 
      activeColor: 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 ring-1 ring-indigo-400/40',
      hoverColor: 'hover:bg-indigo-950/70 hover:text-indigo-200'
    },
    { 
      id: 'roof', 
      label: 'Rangka Atap', 
      desc: 'Baja Ringan, Genteng & Nok',
      group: 'structure',
      icon: Home, 
      activeColor: 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/40',
      hoverColor: 'hover:bg-amber-950/70 hover:text-amber-200'
    },
    { 
      id: 'wall', 
      label: 'Dinding & Plester', 
      desc: 'Bata Merah/Hebel & Acian',
      group: 'architecture',
      icon: SquareAsterisk, 
      activeColor: 'bg-terracotta-600 text-white shadow-md shadow-terracotta-900/40 ring-1 ring-terracotta-400/40',
      hoverColor: 'hover:bg-terracotta-950/70 hover:text-terracotta-200'
    },
    { 
      id: 'floor', 
      label: 'Lantai Keramik', 
      desc: 'Keramik, Plint & Waterproofing',
      group: 'architecture',
      icon: LayoutGrid, 
      activeColor: 'bg-amber-700 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/40',
      hoverColor: 'hover:bg-amber-950/70 hover:text-amber-200'
    },
    { 
      id: 'plafond', 
      label: 'Plafond & Lis', 
      desc: 'Gypsum, Rangka Hollow & Lis',
      group: 'architecture',
      icon: PanelTop, 
      activeColor: 'bg-teal-700 text-white shadow-md shadow-teal-900/40 ring-1 ring-teal-400/40',
      hoverColor: 'hover:bg-teal-950/70 hover:text-teal-200'
    },
    { 
      id: 'doors', 
      label: 'Kusen & Pintu', 
      desc: 'Aluminium/Kayu, Kaca & Kunci',
      group: 'architecture',
      icon: DoorOpen, 
      activeColor: 'bg-sky-600 text-white shadow-md shadow-sky-900/40 ring-1 ring-sky-400/40',
      hoverColor: 'hover:bg-sky-950/70 hover:text-sky-200'
    },
    { 
      id: 'mep', 
      label: 'Elektrikal', 
      desc: 'Kabel, Titik Lampu & Saklar',
      group: 'mep_infra',
      icon: Zap, 
      activeColor: 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/40',
      hoverColor: 'hover:bg-amber-950/70 hover:text-amber-200'
    },
    { 
      id: 'sanitasi', 
      label: 'Sanitasi', 
      desc: 'Pipa Air Bersih/Kotor & Kloset',
      group: 'mep_infra',
      icon: Droplets, 
      activeColor: 'bg-sky-700 text-white shadow-md shadow-sky-900/40 ring-1 ring-sky-400/40',
      hoverColor: 'hover:bg-sky-950/70 hover:text-sky-200'
    },
    { 
      id: 'infrastructure', 
      label: 'Infrastruktur', 
      desc: 'Paving Jalan, U-Ditch & Pagar',
      group: 'mep_infra',
      icon: Trees, 
      activeColor: 'bg-emerald-700 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40',
      hoverColor: 'hover:bg-emerald-950/70 hover:text-emerald-200'
    }
  ];

  const handleExport = () => {
    exportBoQToExcel(state, { scheduleConfig });
    setMoreMenuOpen(false);
  };

  const handleReset = () => {
    setMoreMenuOpen(false);
    if (window.confirm("Mulai proyek baru? Semua data saat ini (termasuk kategori dan item kustom) akan direset ke kondisi awal.")) {
      resetProject();
    }
  };

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setOpenDropdown(null);
    setModuleDrawerOpen(false);
    setSearchModalOpen(false);
  };

  const pendingCount = state.pendingQueue?.length || 0;
  const projectName = state.project?.name?.trim() || 'Proyek Konstruksi Baru';

  // Format ringkas angka untuk mobile (misal: Rp 1,47 M atau Rp 850 Jt)
  const formatCompactRp = (val) => {
    if (!val || val <= 0) return 'Rp 0';
    if (val >= 1000000000) {
      return `Rp ${(val / 1000000000).toFixed(2).replace('.', ',')} M`;
    }
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toFixed(1).replace('.', ',')} Jt`;
    }
    return formatRp(val);
  };

  // Group metadata untuk mode grouped desktop
  const categoryGroups = [
    {
      key: 'structure',
      label: 'Struktur',
      icon: Building2,
      ids: ['foundation', 'concrete', 'rebar', 'roof']
    },
    {
      key: 'architecture',
      label: 'Arsitektur',
      icon: LayoutGrid,
      ids: ['wall', 'floor', 'plafond', 'doors']
    },
    {
      key: 'mep_infra',
      label: 'MEP & Fasum',
      icon: Zap,
      ids: ['mep', 'sanitasi', 'infrastructure']
    }
  ];

  // Modul yang difilter untuk Command Palette
  const filteredSearchItems = navItems.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
  });

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 backdrop-blur-lg border-b border-slate-800/80 shadow-2xl text-white no-print">
      
      {/* ==================== TIER 1: EXECUTIVE COMMAND & ACTION BAR ==================== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="flex items-center justify-between h-14 sm:h-15 gap-2 sm:gap-4">
          
          {/* Logo & Project Identity */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group min-w-0" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 p-1 shadow-md flex items-center justify-center ring-2 ring-amber-400/40 group-hover:ring-amber-300 transition-all shrink-0 border border-white/15">
              <img src="/icon.png" alt="SR Studio" className="w-6 h-6 object-contain" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-xs sm:text-sm md:text-base tracking-wider text-white truncate">
                  SR STUDIO
                </span>
                <span className="text-[8.5px] sm:text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                  TA 2026
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-sans truncate">
                <Briefcase className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate max-w-[110px] xs:max-w-[150px] sm:max-w-xs md:max-w-md font-medium text-slate-300">
                  {projectName}
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar (Clean & Balanced for Desktop & Mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Grand Total Preview Pill (Click to open BoQ) */}
            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono transition-all group"
              title="Klik untuk membuka Rincian WBS BoQ / RAB"
            >
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-sans hidden md:inline">TOTAL RAB:</span>
              <span className="font-bold text-amber-300 text-xs hidden sm:inline">
                {formatRp(grandTotal)}
              </span>
              <span className="font-bold text-amber-300 text-xs sm:hidden">
                {formatCompactRp(grandTotal)}
              </span>
            </button>

            {/* Simpan ke Library Button */}
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-semibold font-display shadow-md shadow-amber-950/40 border border-amber-300/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Simpan atau Perbarui Proyek RAB ke Library"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-slate-950" />
              <span className="font-bold">Simpan</span>
            </button>

            {/* Cetak SPH / PDF Button */}
            <button
              type="button"
              onClick={() => setDocumentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold font-display shadow-md shadow-blue-950/40 border border-blue-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Cetak Surat Penawaran Harga (SPH) & Format Dokumen Resmi"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="font-bold hidden xs:inline">Cetak SPH</span>
              <span className="font-bold xs:hidden text-[11px]">SPH</span>
            </button>

            {/* Rekap Material BOM Button (Desktop) */}
            <button
              type="button"
              onClick={() => setMaterialTakeoffModalOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-semibold font-display shadow-md shadow-teal-950/40 border border-teal-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Rekap Belanja Kebutuhan Logistik & Material Bangunan (BOM)"
            >
              <Package className="w-3.5 h-3.5 text-teal-200" />
              <span>BOM</span>
            </button>

            {/* Export Excel Button (Desktop) */}
            <button
              type="button"
              onClick={handleExport}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold font-display shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Download File RAB Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* Pending Queue Indicator (if any) */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('boq')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-mono font-semibold transition-all animate-pulse"
                title={`${pendingCount} usulan dari kalkulator siap dimasukkan ke BoQ`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Antrian:</span>
                <b>{pendingCount}</b>
              </button>
            )}

            {/* Device & User Actions Popover Menu (...) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(prev => !prev)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-300 hover:text-white border transition-all flex items-center gap-1.5 text-xs font-mono ${
                  moreMenuOpen ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                }`}
                title="Menu Pengaturan & Perangkat"
              >
                {cloudConfig.isMasterDevice ? (
                  <span className="hidden lg:inline text-amber-400 font-semibold">👑 Master</span>
                ) : (
                  <span className="hidden lg:inline text-emerald-400 font-semibold">📱 Klien</span>
                )}
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Floating Dropdown Card */}
              {moreMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                    onClick={() => setMoreMenuOpen(false)}
                  />

                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 z-50 text-xs space-y-1 animate-fadeIn font-sans">
                    
                    <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 mb-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                        <span>Status Perangkat:</span>
                        {cloudConfig.isMasterDevice ? (
                          <span className="text-amber-400 font-mono flex items-center gap-1">👑 Master PC</span>
                        ) : (
                          <span className="text-emerald-400 font-mono flex items-center gap-1">📱 Klien Device</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {cloudConfig.isMasterDevice 
                          ? 'Memiliki izin penuh simpan & kelola sinkronisasi cloud.' 
                          : 'Mode peninjau / klien terhubung secara aman.'}
                      </p>
                    </div>

                    {/* Simpan & Excel for mobile where hidden in top bar */}
                    <button
                      type="button"
                      onClick={() => { setSaveModalOpen(true); setMoreMenuOpen(false); }}
                      className="w-full sm:hidden flex items-center gap-2.5 p-2 rounded-xl text-amber-300 hover:bg-amber-500/20 font-semibold transition-colors"
                    >
                      <BookmarkPlus className="w-4 h-4 text-amber-400" />
                      <span>Simpan ke Library Proyek</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExport}
                      className="w-full md:hidden flex items-center gap-2.5 p-2 rounded-xl text-emerald-300 hover:bg-emerald-500/20 font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Download File Excel (.xlsx)</span>
                    </button>

                    {/* BOM Rekap Material for menu popup */}
                    <button
                      type="button"
                      onClick={() => { setMaterialTakeoffModalOpen(true); setMoreMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-teal-300 hover:bg-teal-500/20 font-semibold transition-colors"
                    >
                      <Package className="w-4 h-4 text-teal-400" />
                      <span>Rekap Belanja Material (BOM)</span>
                    </button>

                    {/* Master Cloud Settings */}
                    {cloudConfig.isMasterDevice && (
                      <button
                        type="button"
                        onClick={() => { setCloudModalOpen(true); setMoreMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Kelola Sinkronisasi Cloud (OTP)</span>
                      </button>
                    )}

                    {/* Ganti Peran */}
                    <button
                      type="button"
                      onClick={() => { logoutToLandingPage(); setMoreMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-slate-400" />
                      <span>Ganti Peran / Ke Portal Utama</span>
                    </button>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 font-semibold transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Reset Proyek (Mulai Baru)</span>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* ==================== TIER 2: DESKTOP CLEAN GROUPED NAVIGATION ==================== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5">
        
        {/* MOBILE VIEW NAVIGATION */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModuleDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shrink-0 shadow-sm"
          >
            <Menu className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">Modul ({navItems.length})</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Quick horizontal scroll of main tabs */}
          <nav className="flex-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 scroll-smooth">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isLocked = isTabLockedForClient(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive ? item.activeColor : 'text-slate-300 bg-slate-900/80 border border-slate-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {isLocked && (
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" title="Wajib OTP dari Master" />
                  )}
                  {item.badge && !isLocked && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-mono bg-emerald-500 text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* DESKTOP VIEW NAVIGATION (CLEAN & GROUPED OR FULL RIBBON) */}
        <div className="hidden lg:flex items-center justify-between gap-3">
          
          {/* DESKTOP MODE 1: CLEAN GROUPED (Only 7 clean buttons!) */}
          {desktopNavMode === 'grouped' ? (
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* 4 Pinned Core Tabs */}
              {navItems.filter(i => i.group === 'main').map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isLocked = isTabLockedForClient(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    title={`${item.label} — ${item.desc}${isLocked ? ' (Wajib OTP dari Master)' : ''}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-display transition-all ${
                      isActive 
                        ? item.activeColor 
                        : 'text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="font-bold">{item.label}</span>
                    {isLocked && (
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                    {item.badge && !isLocked && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-white font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Vertical Divider */}
              <div className="h-5 w-px bg-slate-800 mx-1" />

              {/* 3 Categorized Dropdowns */}
              {categoryGroups.map(group => {
                const GroupIcon = group.icon;
                const activeInGroup = group.ids.includes(activeTab);
                const activeItem = navItems.find(i => i.id === activeTab && group.ids.includes(i.id));
                const isOpen = openDropdown === group.key;

                return (
                  <div key={group.key} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(prev => prev === group.key ? null : group.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-display transition-all border ${
                        activeInGroup
                          ? 'bg-gradient-to-r from-slate-800 to-slate-800/90 text-white border-amber-400/50 shadow-sm ring-1 ring-amber-400/30'
                          : 'text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 border-slate-800/80 hover:text-white'
                      }`}
                    >
                      <GroupIcon className={`w-3.5 h-3.5 ${activeInGroup ? 'text-amber-400' : 'text-slate-400'}`} />
                      
                      <span className="font-bold">
                        {activeInGroup && activeItem ? (
                          <span>{group.label}: <b className="text-amber-300">{activeItem.label}</b></span>
                        ) : (
                          <span>{group.label}</span>
                        )}
                      </span>

                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {group.ids.length}
                      </span>

                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-white' : ''}`} />
                    </button>

                    {/* Dropdown Menu Flyout */}
                    {isOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setOpenDropdown(null)}
                        />

                        <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                          <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-slate-400 border-b border-slate-800 mb-1">
                            Pilih Kalkulator {group.label}:
                          </div>

                          {group.ids.map(id => {
                            const item = navItems.find(i => i.id === id);
                            if (!item) return null;
                            const ItemIcon = item.icon;
                            const isCurrent = activeTab === id;
                            const isLocked = isTabLockedForClient(item.id);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectTab(item.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                                  isCurrent
                                    ? `${item.activeColor} font-bold`
                                    : 'text-slate-200 hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <p className="font-bold text-xs leading-tight">{item.label}</p>
                                      {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                                    </div>
                                    <p className={`text-[10px] leading-tight truncate ${isCurrent ? 'text-white/80' : 'text-slate-400'}`}>
                                      {item.desc}
                                    </p>
                                  </div>
                                </div>
                                {isCurrent ? <Check className="w-3.5 h-3.5 shrink-0" /> : isLocked ? <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">OTP</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

            </div>
          ) : (
            /* DESKTOP MODE 2: FULL RIBBON (All 15 tabs side-by-side) */
            <nav className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 scroll-smooth flex-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isLocked = isTabLockedForClient(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                      isActive ? item.activeColor : 'text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {isLocked && (
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" title="Wajib OTP dari Master" />
                    )}
                    {item.badge && !isLocked && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-white font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Desktop Right Controls: Quick Search + View Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Quick Search Shortcut (Ctrl+K) */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all shadow-xs"
              title="Cari Cepat Modul (Shortcut: Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xl:inline text-[11px] font-sans">Cari Modul...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9.5px] text-slate-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Desktop View Switcher (Grouped vs Full Ribbon) */}
            <button
              type="button"
              onClick={toggleDesktopNavMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-all"
              title={desktopNavMode === 'grouped' ? 'Tampilkan Semua 15 Tab Memanjang' : 'Kembalikan ke Mode Kategori Ringkas'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px] font-sans font-medium hidden xl:inline">
                {desktopNavMode === 'grouped' ? 'Mode Ringkas' : 'Semua Tab'}
              </span>
            </button>

          </div>

        </div>

      </div>

      {/* ==================== COMMAND PALETTE / QUICK SEARCH MODAL (CTRL + K) ==================== */}
      {searchModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-12 sm:pt-20 p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-scaleUp max-h-[85vh] flex flex-col my-auto sm:my-0">
            
            {/* Search Input */}
            <div className="p-3.5 border-b border-slate-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik nama modul (misal: Atap, Pondasi, BoQ, Paving)..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar space-y-1">
              {filteredSearchItems.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500 italic">
                  Tidak ada modul yang cocok dengan "{searchQuery}".
                </p>
              ) : (
                filteredSearchItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isLocked = isTabLockedForClient(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white font-bold' 
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold">{item.label}</p>
                            {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                          <p className={`text-[10.5px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Tip */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[10.5px] text-slate-500 flex justify-between font-mono">
              <span>Tekan Esc untuk menutup</span>
              <span>15 Modul Tersedia</span>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ==================== MODULE CATALOG MODAL (CENTERED & FILTERABLE VIA PORTAL) ==================== */}
      {moduleDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModuleDrawerOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm text-white uppercase tracking-wide">
                    Pilih Modul Pekerjaan
                  </h3>
                  <p className="text-[10.5px] text-slate-400">15 modul perhitungan & manajemen konstruksi terstandar.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModuleDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setModuleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  moduleFilter === 'all' 
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Semua (15)
              </button>
              <button
                type="button"
                onClick={() => setModuleFilter('main')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  moduleFilter === 'main' 
                    ? 'bg-blue-600 text-white font-bold shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📋 Manajemen (4)
              </button>
              <button
                type="button"
                onClick={() => setModuleFilter('structure')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  moduleFilter === 'structure' 
                    ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏗️ Struktur (4)
              </button>
              <button
                type="button"
                onClick={() => setModuleFilter('architecture')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  moduleFilter === 'architecture' 
                    ? 'bg-amber-600 text-white font-bold shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🎨 Arsitektur (4)
              </button>
              <button
                type="button"
                onClick={() => setModuleFilter('mep_infra')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  moduleFilter === 'mep_infra' 
                    ? 'bg-sky-600 text-white font-bold shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ⚡ MEP & Fasum (3)
              </button>
            </div>

            {/* Modal Body with Internal Scrolling */}
            <div 
              ref={moduleListRef}
              className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs flex-1 min-h-0 bg-slate-900"
            >
              
              {/* Group 1: Modul Utama */}
              {(moduleFilter === 'all' || moduleFilter === 'main') && (
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    📋 1. Manajemen RAB & Proyek
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {navItems.filter(i => i.group === 'main').map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const isLocked = isTabLockedForClient(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                            isActive 
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md font-bold' 
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs truncate">{item.label}</p>
                              {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            </div>
                            <p className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 2: Struktur & Pondasi */}
              {(moduleFilter === 'all' || moduleFilter === 'structure') && (
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    🏗️ 2. Substruktur & Struktur Beton / Baja
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {navItems.filter(i => i.group === 'structure').map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const isLocked = isTabLockedForClient(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                            isActive 
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold' 
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs truncate">{item.label}</p>
                              {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            </div>
                            <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 3: Arsitektur */}
              {(moduleFilter === 'all' || moduleFilter === 'architecture') && (
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    🎨 3. Arsitektur & Interior
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {navItems.filter(i => i.group === 'architecture').map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const isLocked = isTabLockedForClient(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                            isActive 
                              ? 'bg-amber-600 text-white border-amber-400 shadow-md font-bold' 
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs truncate">{item.label}</p>
                              {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            </div>
                            <p className={`text-[10px] truncate ${isActive ? 'text-amber-100' : 'text-slate-400'}`}>{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 4: MEP & Infrastruktur */}
              {(moduleFilter === 'all' || moduleFilter === 'mep_infra') && (
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    ⚡ 4. MEP, Sanitasi & Fasum Kawasan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {navItems.filter(i => i.group === 'mep_infra').map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const isLocked = isTabLockedForClient(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                            isActive 
                              ? 'bg-sky-600 text-white border-sky-400 shadow-md font-bold' 
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs truncate">{item.label}</p>
                              {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            </div>
                            <p className={`text-[10px] truncate ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>,
        document.body
      )}

    </header>
  );
}
