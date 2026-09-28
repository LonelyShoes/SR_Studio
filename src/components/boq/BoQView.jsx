import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { PendingQueuePanel } from './PendingQueuePanel';
import { 
  Building, 
  MapPin, 
  Calendar, 
  User, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  RotateCcw, 
  Trash2, 
  FileSpreadsheet, 
  Layers, 
  Grid, 
  SquareAsterisk, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Eye,
  Percent,
  Download,
  Info,
  Sparkles,
  BookmarkPlus,
  FolderArchive,
  PanelTop,
  Zap,
  Droplets,
  Printer,
  Trees,
  Home,
  DoorOpen,
  Package,
  HardHat,
  Lock,
  ShieldCheck,
  Smartphone,
  ArrowUpRight,
  Boxes
} from 'lucide-react';
import { formatRp, formatNumber, toRoman, parseNum } from '../../utils/formatters';
import { exportBoQToExcel } from '../../utils/exportExcel';
import { ApplySharedWallModal } from './ApplySharedWallModal';
import LaborGeneratorModal from './LaborGeneratorModal';

const AUX_CALCULATORS = [
  // 1. STRUKTUR & PONDASI
  {
    id: 'foundation',
    label: 'Pondasi Bangunan',
    sublabel: 'Batu Kali, Footplat & Galian',
    category: 'structure',
    categoryName: 'Struktur',
    icon: Building2,
    bgBadge: 'bg-emerald-600',
    cardBg: 'bg-emerald-50/70 hover:bg-emerald-100/90',
    border: 'border-emerald-200/80 hover:border-emerald-400',
    textColor: 'text-emerald-950',
    subtextColor: 'text-emerald-700'
  },
  {
    id: 'concrete',
    label: 'Cor Beton Bertulang',
    sublabel: 'Sloof, Kolom, Balok & Plat',
    category: 'structure',
    categoryName: 'Struktur',
    icon: Layers,
    bgBadge: 'bg-cyan-700',
    cardBg: 'bg-cyan-50/70 hover:bg-cyan-100/90',
    border: 'border-cyan-200/80 hover:border-cyan-400',
    textColor: 'text-cyan-950',
    subtextColor: 'text-cyan-700'
  },
  {
    id: 'rebar',
    label: 'Tulangan Besi',
    sublabel: 'Besi Pokok & Sengkang Begel',
    category: 'structure',
    categoryName: 'Struktur',
    icon: Boxes,
    bgBadge: 'bg-indigo-600',
    cardBg: 'bg-indigo-50/70 hover:bg-indigo-100/90',
    border: 'border-indigo-200/80 hover:border-indigo-400',
    textColor: 'text-indigo-950',
    subtextColor: 'text-indigo-700'
  },
  {
    id: 'roof',
    label: 'Rangka Atap & Nok',
    sublabel: 'Baja Ringan, Genteng & Talang',
    category: 'structure',
    categoryName: 'Struktur',
    icon: Home,
    bgBadge: 'bg-amber-600',
    cardBg: 'bg-amber-50/70 hover:bg-amber-100/90',
    border: 'border-amber-200/80 hover:border-amber-400',
    textColor: 'text-amber-950',
    subtextColor: 'text-amber-700'
  },

  // 2. ARSITEKTUR & FINISHING
  {
    id: 'wall',
    label: 'Dinding & Plester',
    sublabel: 'Bata Merah, Hebel & Acian',
    category: 'architecture',
    categoryName: 'Arsitektur',
    icon: SquareAsterisk,
    bgBadge: 'bg-terracotta-600',
    cardBg: 'bg-terracotta-50/70 hover:bg-terracotta-100/90',
    border: 'border-terracotta-200/80 hover:border-terracotta-400',
    textColor: 'text-terracotta-950',
    subtextColor: 'text-terracotta-700'
  },
  {
    id: 'floor',
    label: 'Lantai & Keramik',
    sublabel: 'Keramik, Granit & Step Nosing',
    category: 'architecture',
    categoryName: 'Arsitektur',
    icon: Grid,
    bgBadge: 'bg-amber-700',
    cardBg: 'bg-amber-50/70 hover:bg-amber-100/90',
    border: 'border-amber-300/80 hover:border-amber-500',
    textColor: 'text-amber-950',
    subtextColor: 'text-amber-800'
  },
  {
    id: 'plafond',
    label: 'Plafond & Partisi',
    sublabel: 'Gypsum, Rangka Hollow & Lis',
    category: 'architecture',
    categoryName: 'Arsitektur',
    icon: PanelTop,
    bgBadge: 'bg-teal-700',
    cardBg: 'bg-teal-50/70 hover:bg-teal-100/90',
    border: 'border-teal-200/80 hover:border-teal-400',
    textColor: 'text-teal-950',
    subtextColor: 'text-teal-700'
  },
  {
    id: 'doors',
    label: 'Kusen, Pintu & Kaca',
    sublabel: 'Aluminium, Kayu & Aksesoris',
    category: 'architecture',
    categoryName: 'Arsitektur',
    icon: DoorOpen,
    bgBadge: 'bg-sky-600',
    cardBg: 'bg-sky-50/70 hover:bg-sky-100/90',
    border: 'border-sky-200/80 hover:border-sky-400',
    textColor: 'text-sky-950',
    subtextColor: 'text-sky-700'
  },

  // 3. MEP & INFRASTRUKTUR
  {
    id: 'mep',
    label: 'Instalasi Elektrikal',
    sublabel: 'Kabel NYM, Saklar & Lampu',
    category: 'mep',
    categoryName: 'MEP & Kawasan',
    icon: Zap,
    bgBadge: 'bg-orange-600',
    cardBg: 'bg-orange-50/70 hover:bg-orange-100/90',
    border: 'border-orange-200/80 hover:border-orange-400',
    textColor: 'text-orange-950',
    subtextColor: 'text-orange-700'
  },
  {
    id: 'sanitasi',
    label: 'Plumbing & Sanitasi',
    sublabel: 'Pipa Air Bersih/Kotor & Kloset',
    category: 'mep',
    categoryName: 'MEP & Kawasan',
    icon: Droplets,
    bgBadge: 'bg-sky-700',
    cardBg: 'bg-sky-50/70 hover:bg-sky-100/90',
    border: 'border-sky-300/80 hover:border-sky-500',
    textColor: 'text-sky-950',
    subtextColor: 'text-sky-800'
  },
  {
    id: 'infrastructure',
    label: 'Infrastruktur Kawasan',
    sublabel: 'Paving Jalan, U-Ditch & Pagar',
    category: 'mep',
    categoryName: 'MEP & Kawasan',
    icon: Trees,
    bgBadge: 'bg-emerald-700',
    cardBg: 'bg-emerald-50/70 hover:bg-emerald-100/90',
    border: 'border-emerald-200/80 hover:border-emerald-400',
    textColor: 'text-emerald-950',
    subtextColor: 'text-emerald-700'
  }
];

export function BoQView() {
  const {
    state,
    setActiveTab,
    updateProjectField,
    updateClusterUnits,
    updateClusterTypology,
    updateClusterRowUnits,
    togglePpn,
    toggleCategoryExpand,
    expandAllCategories,
    updateCategoryName,
    addCustomCategory,
    deleteCategory,
    addCustomItem,
    updateItemVolume,
    updateItemPrice,
    updateCustomItem,
    deleteOrResetItem,
    resetProject,
    subtotal,
    ppnAmount,
    grandTotal,
    filledItemsCount,
    setSaveModalOpen,
    setDocumentModalOpen,
    materialTakeoffModalOpen,
    setMaterialTakeoffModalOpen,
    scheduleConfig,
    activeLibraryId,
    applySharedWallReduction,
    revertSharedWallReduction,
    cloudConfig,
    sessionRole
  } = useBoQ();

  const isMaster = Boolean(cloudConfig?.isMasterDevice);

  const [globalSearch, setGlobalSearch] = useState('');
  const [onlyFilled, setOnlyFilled] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [sharedWallModalOpen, setSharedWallModalOpen] = useState(false);
  const [laborModalOpen, setLaborModalOpen] = useState(false);

  // Per category search state: key = catId, value = query
  const [catSearch, setCatSearch] = useState({});

  // Per category inline new item state: key = catId, value = text
  const [catNewItemText, setCatNewItemText] = useState({});

  // Filter kategori Kalkulator Bantu Cepat ('all' | 'structure' | 'architecture' | 'mep')
  const [calcCategoryFilter, setCalcCategoryFilter] = useState('all');

  const displayedCalculators = useMemo(() => {
    if (calcCategoryFilter === 'all') return AUX_CALCULATORS;
    return AUX_CALCULATORS.filter(c => c.category === calcCategoryFilter);
  }, [calcCategoryFilter]);

  const handleGlobalSearchChange = (q) => {
    setGlobalSearch(q);
    if (q.trim()) {
      expandAllCategories(true);
    }
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCustomCategory(newCatName.trim());
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const handleAddInlineItem = (catId) => {
    const text = catNewItemText[catId]?.trim();
    if (!text) return;
    addCustomItem(catId, { uraian: text, satuan: 'ls', harga: 0, volume: 0 });
    setCatNewItemText(prev => ({ ...prev, [catId]: '' }));
  };

  // Financial & Multi-Unit Metrics
  const unitsCount = Math.max(1, state.project.clusterUnits || 1);
  const costPerUnit = grandTotal / unitsCount;
  const areaPerUnit = parseNum(state.project.buildingAreaPerUnit) || 36;
  const totalBuildingArea = areaPerUnit * unitsCount;
  const costPerM2 = totalBuildingArea > 0 ? (grandTotal / totalBuildingArea) : 0;

  // Analisa Penghematan Dinding Bersama vs Dinding Ganda
  const sharedWallItems = useMemo(() => {
    const items = [];
    const cats = Array.isArray(state?.categories) ? state.categories : [];
    cats.forEach(cat => {
      const itms = Array.isArray(cat?.items) ? cat.items : [];
      itms.forEach(it => {
        if (it?.volume > 0 && it?.uraian && it.uraian.includes('Dinding Bersama')) {
          items.push({
            ...it,
            catName: cat?.name || 'Kategori',
            totalHarga: (Number(it.volume) || 0) * (Number(it.harga) || 0)
          });
        }
      });
    });
    return items;
  }, [state?.categories]);

  const totalSharedWallCost = useMemo(() => {
    return (sharedWallItems || []).reduce((acc, it) => acc + (Number(it?.totalHarga) || 0), 0);
  }, [sharedWallItems]);

  const rowUnits = Math.max(2, state?.project?.clusterRowUnits || 4);
  const boundarySavingsPercent = ((rowUnits - 1) / (2 * rowUnits)) * 100;
  const estimatedRupiahSaved = totalSharedWallCost > 0
    ? Math.round(totalSharedWallCost * ((rowUnits - 1) / (rowUnits + 1)))
    : 0;

  // Cek apakah BoQ sudah memuat item yang dihitung langsung dari kalkulator cluster
  const hasClusterCalculatorItems = useMemo(() => {
    const cats = Array.isArray(state?.categories) ? state.categories : [];
    return cats.some(cat => 
      (Array.isArray(cat?.items) ? cat.items : []).some(it => {
        const txt = (it?.uraian || '').toLowerCase();
        return txt.includes('dinding bersama') || txt.includes('party wall');
      })
    );
  }, [state?.categories]);

  // Jumlah item yang telah direduksi efisiensi dinding bersama
  const reducedItemsCount = useMemo(() => {
    const cats = Array.isArray(state?.categories) ? state.categories : [];
    return cats.reduce((acc, cat) => {
      return acc + (Array.isArray(cat?.items) ? cat.items : []).filter(it => it?.sharedWallReduced).length;
    }, 0);
  }, [state?.categories]);

  return (
    <div className="pb-32 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

      {/* Client Mode Status Alert Banner */}
      {!isMaster && (
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-700/60 shadow-lg text-white flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-bold text-sm text-white">
                  📱 Mode Klien & Tim Lapangan
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                  Database Harga Terkunci
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                  Simpan Wajib OTP
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Harga satuan standar diproteksi oleh <strong>Master Studio</strong>. Anda bebas mengisi volume, memakai seluruh 7+ Kalkulator, export Excel, dan menyimpan RAB baru dengan izin OTP 1x pakai.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TITLE BLOCK ==================== */}
      <div className="rounded-2xl border-2 border-paper-900 bg-white shadow-blueprint overflow-hidden mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x-2 divide-paper-900">
          
          {/* Brand Block */}
          <div className="md:col-span-5 bg-gradient-to-br from-blueprint-700 via-blueprint-800 to-blueprint-900 p-6 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
              <FileSpreadsheet className="w-48 h-48 text-white" />
            </div>
            
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-blueprint-600/80 text-blueprint-100 border border-blueprint-400/30 mb-2 font-semibold">
                Made With Love by SR Studio
              </span>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white uppercase">
                BoQ & RAB Tools
              </h1>
              <p className="text-xs text-blueprint-200 mt-1 max-w-sm leading-relaxed">
                Work Breakdown Structure & Rencana Anggaran Biaya dengan Analisa Standarisasi Resmi.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-blueprint-600/40 flex items-center justify-between text-[11px] font-mono text-blueprint-300">
              <span>TAHUN ANGGARAN 2026</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
              </span>
            </div>
          </div>

          {/* Project Fields Block */}
          <div className="md:col-span-7 p-5 bg-paper-50/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-paper-300 shadow-sm focus-within:ring-2 focus-within:ring-blueprint-600">
              <label className="text-[10px] font-mono uppercase tracking-wider text-paper-600 font-bold flex items-center gap-1.5 mb-0.5">
                <Building className="w-3 h-3 text-blueprint-600" />
                Nama Proyek
              </label>
              <input
                type="text"
                value={state.project.name}
                onChange={(e) => updateProjectField('name', e.target.value)}
                placeholder="mis. Cluster Harmoni"
                className="w-full bg-transparent text-xs font-semibold text-paper-900 placeholder:text-paper-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-paper-300 shadow-sm focus-within:ring-2 focus-within:ring-blueprint-600">
              <label className="text-[10px] font-mono uppercase tracking-wider text-paper-600 font-bold flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3 h-3 text-blueprint-600" />
                Lokasi
              </label>
              <input
                type="text"
                value={state.project.location}
                onChange={(e) => updateProjectField('location', e.target.value)}
                placeholder="mis. Semarang Barat"
                className="w-full bg-transparent text-xs font-semibold text-paper-900 placeholder:text-paper-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-paper-300 shadow-sm focus-within:ring-2 focus-within:ring-blueprint-600">
              <label className="text-[10px] font-mono uppercase tracking-wider text-paper-600 font-bold flex items-center gap-1.5 mb-0.5">
                <User className="w-3 h-3 text-blueprint-600" />
                Pemilik / Klien
              </label>
              <input
                type="text"
                value={state.project.client}
                onChange={(e) => updateProjectField('client', e.target.value)}
                placeholder="mis. PT. Cipta Properti"
                className="w-full bg-transparent text-xs font-semibold text-paper-900 placeholder:text-paper-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-paper-300 shadow-sm focus-within:ring-2 focus-within:ring-blueprint-600">
              <label className="text-[10px] font-mono uppercase tracking-wider text-paper-600 font-bold flex items-center gap-1.5 mb-0.5">
                <Calendar className="w-3 h-3 text-blueprint-600" />
                Tanggal RAB
              </label>
              <input
                type="date"
                value={state.project.date}
                onChange={(e) => updateProjectField('date', e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-paper-900 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-paper-300 shadow-sm focus-within:ring-2 focus-within:ring-blueprint-600">
              <label className="text-[10px] font-mono uppercase tracking-wider text-paper-600 font-bold flex items-center gap-1.5 mb-0.5">
                <Building2 className="w-3 h-3 text-blueprint-600" />
                Jumlah Unit Kavling
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={state.project.clusterUnits || 1}
                onChange={(e) => updateClusterUnits(e.target.value)}
                className="w-full bg-transparent text-xs font-mono font-bold text-blueprint-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-paper-300 shadow-sm focus-within:ring-2 focus-within:ring-blueprint-600">
              <label className="text-[10px] font-mono uppercase tracking-wider text-paper-600 font-bold flex items-center gap-1.5 mb-0.5">
                <Layers className="w-3 h-3 text-blueprint-600" />
                Tipe Luas Bangunan
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={state.project.buildingAreaPerUnit || 36}
                  onChange={(e) => updateProjectField('buildingAreaPerUnit', e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-amber-700 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-mono">m²</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ==================== DISCLAIMER BANNER ==================== */}
      <div className="mb-6 p-4 rounded-xl bg-terracotta-50 border-l-4 border-terracotta-500 border border-terracotta-200 text-xs leading-relaxed text-paper-700 flex items-start gap-3 shadow-sm">
        <Info className="w-4 h-4 text-terracotta-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-terracotta-700 font-semibold">Sumber Acuan Harga: </strong>
          Perwali Kota Semarang No. 30 Tahun 2025 tentang Standarisasi Harga Satuan Bahan Bangunan, Upah dan Analisa Pekerjaan (harga satuan dasar TA 2026, ditetapkan 4 Juli 2025). Sebagian harga pekerjaan gabungan bersifat estimasi umum. 
          <span className="font-semibold text-paper-800"> Verifikasi ulang</span> terhadap survei harga pasar terkini sebelum dipakai untuk RAB final atau penawaran resmi.
        </div>
      </div>

      {/* ==================== FINANCIAL DASHBOARD / HPP CARD ==================== */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blueprint-950 p-5 sm:p-6 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
              💰
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-heading font-black text-white uppercase tracking-wide flex items-center gap-2">
                <span>Analisa Finansial & HPP per Unit Rumah</span>
                {unitsCount > 1 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Proyek Multi-Unit ({unitsCount} Kavling)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Metrik Harga Pokok Produksi (HPP) untuk acuan harga jual developer, penawaran borongan, dan analisa kelayakan biaya per m².
              </p>
            </div>
          </div>

          {/* Typology Toggle Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => updateClusterTypology('double')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${state.project.clusterTypology !== 'shared' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🧱 Dinding Ganda
              </button>
              <button
                type="button"
                onClick={() => updateClusterTypology('shared')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${state.project.clusterTypology === 'shared' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🤝 Dinding Bersama
              </button>
            </div>
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Anggaran RAB Proyek */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              1. Total Anggaran Proyek ({unitsCount} Unit)
            </span>
            <div className="my-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight">
                {formatRp(grandTotal)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {state.ppn ? 'Sudah termasuk PPN 11%' : 'Tanpa PPN (Biaya Konstruksi)'}
              </p>
            </div>
            <span className="text-[10.5px] text-slate-500 font-mono">Total WBS seluruh kategori</span>
          </div>

          {/* Card 2: HPP per Pintu / Unit Rumah */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center justify-between">
              <span>2. HPP per Unit Rumah</span>
              <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded text-[9px]">Modal/Pintu</span>
            </span>
            <div className="my-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                {formatRp(costPerUnit)}
              </span>
              <p className="text-[11px] text-amber-200/80 mt-0.5 font-mono">
                Alokasi rata-rata per kavling
              </p>
            </div>
            <span className="text-[10.5px] text-amber-300/70 font-mono">Modal dasar sebelum margin & tanah</span>
          </div>

          {/* Card 3: Biaya Konstruksi per m2 */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              3. Biaya Konstruksi / m² Bangunan
            </span>
            <div className="my-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-cyan-300 tracking-tight">
                {formatRp(costPerM2)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Total Luas: {(areaPerUnit * unitsCount).toFixed(0)} m² ({unitsCount} × {areaPerUnit}m²)
              </p>
            </div>
            <span className="text-[10.5px] text-slate-500 font-mono">Indikator efisiensi spesifikasi</span>
          </div>

          {/* Card 4: Status Tipologi Dinding & Penghematan */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>4. Sistem Tipologi Dinding</span>
              {state.project.clusterTypology === 'shared' ? (
                <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded text-[9px] font-bold">1 Dinding</span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded text-[9px] font-bold">2 Dinding</span>
              )}
            </span>
            <div className="my-2">
              <span className="font-heading text-base sm:text-lg font-bold text-white block">
                {state.project.clusterTypology === 'shared' ? '🤝 Dinding Bersama' : '🧱 Dinding Ganda'}
              </span>
              <p className="text-[11px] text-emerald-400 mt-0.5 font-mono leading-tight">
                {state.project.clusterTypology === 'shared'
                  ? `Deret ${rowUnits} unit · Hemat batas ~${boundarySavingsPercent.toFixed(0)}%`
                  : 'Setiap unit mandiri dengan dinding & struktur sendiri'}
              </p>
            </div>
            {estimatedRupiahSaved > 0 ? (
              <span className="text-[10.5px] text-emerald-300 font-mono font-bold block">
                Hemat ± {formatRp(estimatedRupiahSaved)}
              </span>
            ) : (
              <span className="text-[10.5px] text-slate-400 font-mono block">
                {state.project.clusterTypology === 'shared' ? 'Kirim item dari kalkulator cluster' : 'Tanpa penghematan batas kavling'}
              </span>
            )}

            {/* Sistem Proteksi: Tampilkan banner jika sudah dihitung di kalkulator */}
            {state.project.clusterTypology === 'shared' && hasClusterCalculatorItems && (
              <div className="mt-2 p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[10px] leading-tight">
                  <b className="text-emerald-300 font-bold block">✓ Dihitung di Kalkulator Cluster</b>
                  <span className="text-emerald-400/80">Item dinding sudah akurat. Tidak perlu reduksi manual di BoQ.</span>
                </div>
              </div>
            )}

            {/* Tombol Terapkan Reduksi ke BoQ */}
            {state.project.clusterTypology === 'shared' && (
              <div className="pt-2 mt-2 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setSharedWallModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm transition-all"
                  title="Reduksi cepat untuk item yang diinput manual tanpa kalkulator"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{hasClusterCalculatorItems ? 'Reduksi Item Manual' : 'Terapkan ke BoQ'}</span>
                </button>

                {reducedItemsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => revertSharedWallReduction()}
                    className="inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-400 hover:text-rose-300 underline transition-colors"
                    title="Batalkan reduksi dan kembalikan ke volume penuh Dinding Ganda"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Kembalikan ({reducedItemsCount})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== AUXILIARY CALCULATORS LAUNCHER ==================== */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-white border border-paper-300 shadow-sm transition-all">
        {/* Header with Title & Category Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-paper-200/80">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blueprint-50 text-blueprint-600 flex items-center justify-center border border-blueprint-200 shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 text-blueprint-600" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wide text-slate-900">
                  Kalkulator Bantu Cepat
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blueprint-100/80 text-blueprint-800 border border-blueprint-200/60">
                  11 Modul Siap Pakai
                </span>
              </div>
              <p className="text-[11px] text-paper-600">
                Hitung volume material otomatis &amp; kirim langsung ke antrian BoQ
              </p>
            </div>
          </div>

          {/* Quick Category Filter Switcher */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-paper-100/90 border border-paper-300/80 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setCalcCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                calcCategoryFilter === 'all'
                  ? 'bg-white text-blueprint-800 shadow-sm border border-paper-300'
                  : 'text-paper-600 hover:text-paper-900'
              }`}
            >
              Semua (11)
            </button>
            <button
              type="button"
              onClick={() => setCalcCategoryFilter('structure')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                calcCategoryFilter === 'structure'
                  ? 'bg-white text-emerald-800 shadow-sm border border-paper-300'
                  : 'text-paper-600 hover:text-paper-900'
              }`}
            >
              <span>🏗️ Struktur</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${calcCategoryFilter === 'structure' ? 'bg-emerald-100 text-emerald-800' : 'bg-paper-200 text-paper-700'}`}>4</span>
            </button>
            <button
              type="button"
              onClick={() => setCalcCategoryFilter('architecture')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                calcCategoryFilter === 'architecture'
                  ? 'bg-white text-terracotta-800 shadow-sm border border-paper-300'
                  : 'text-paper-600 hover:text-paper-900'
              }`}
            >
              <span>🎨 Arsitektur</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${calcCategoryFilter === 'architecture' ? 'bg-terracotta-100 text-terracotta-800' : 'bg-paper-200 text-paper-700'}`}>4</span>
            </button>
            <button
              type="button"
              onClick={() => setCalcCategoryFilter('mep')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                calcCategoryFilter === 'mep'
                  ? 'bg-white text-amber-800 shadow-sm border border-paper-300'
                  : 'text-paper-600 hover:text-paper-900'
              }`}
            >
              <span>⚡ MEP &amp; Kawasan</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${calcCategoryFilter === 'mep' ? 'bg-amber-100 text-amber-800' : 'bg-paper-200 text-paper-700'}`}>3</span>
            </button>
          </div>
        </div>

        {/* Responsive Grid with Roomy Uncut Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {displayedCalculators.map(calc => {
            const IconComponent = calc.icon;
            return (
              <button
                key={calc.id}
                type="button"
                onClick={() => setActiveTab(calc.id)}
                className={`flex items-start gap-2.5 p-3 rounded-2xl ${calc.cardBg} border ${calc.border} text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 group relative`}
                title={`Buka Kalkulator ${calc.label} (${calc.sublabel})`}
              >
                <div className={`w-8 h-8 rounded-xl ${calc.bgBadge} text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform mt-0.5`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono uppercase font-bold text-slate-500 tracking-wider">
                      {calc.categoryName}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 -translate-y-0.5 transition-all shrink-0" />
                  </div>
                  <p className={`font-heading font-bold text-xs ${calc.textColor} leading-tight mt-0.5 whitespace-normal`}>
                    {calc.label}
                  </p>
                  <p className={`text-[10px] sm:text-[10.5px] ${calc.subtextColor} font-sans leading-snug mt-1 whitespace-normal`}>
                    {calc.sublabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== PENDING QUEUE PANEL ==================== */}
      <PendingQueuePanel />

      {/* ==================== CONTROLS & FILTER TOOLBAR ==================== */}
      <div className="mb-6 p-4 rounded-2xl bg-white border border-paper-300 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Global Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-paper-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
              placeholder="Cari item di seluruh kategori WBS (mis. Semen, Pasir, Kabel, Bata)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-600 transition-all font-sans"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setOnlyFilled(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-display border transition-all ${
                onlyFilled
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-paper-100 text-paper-700 border-paper-300 hover:bg-paper-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Hanya Terisi ({filledItemsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => expandAllCategories(true)}
              className="px-2.5 py-2 rounded-xl text-xs font-medium bg-paper-100 hover:bg-paper-200 border border-paper-300 text-paper-700"
            >
              Buka Semua
            </button>

            <button
              type="button"
              onClick={() => expandAllCategories(false)}
              className="px-2.5 py-2 rounded-xl text-xs font-medium bg-paper-100 hover:bg-paper-200 border border-paper-300 text-paper-700"
            >
              Tutup Semua
            </button>
          </div>

        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-paper-200">
          
          <div className="flex items-center gap-2 flex-wrap">
            {!isAddingCategory ? (
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blueprint-50 hover:bg-blueprint-100 text-blueprint-700 border border-blueprint-300 text-xs font-semibold font-display transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Kategori Kustom
              </button>
            ) : (
              <form onSubmit={handleCreateCategory} className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nama kategori baru..."
                  autoFocus
                  className="px-3 py-1.5 text-xs rounded-lg border border-blueprint-400 focus:outline-none focus:ring-2 focus:ring-blueprint-500 font-sans"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blueprint-600 text-white rounded-lg text-xs font-semibold hover:bg-blueprint-700"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingCategory(false); setNewCatName(''); }}
                  className="px-2.5 py-1.5 bg-paper-200 text-paper-700 rounded-lg text-xs hover:bg-paper-300"
                >
                  Batal
                </button>
              </form>
            )}

            {/* Tombol Rekap Bahan BOM */}
            <button
              type="button"
              onClick={() => setMaterialTakeoffModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-semibold font-display shadow-sm shadow-emerald-950/20 border border-emerald-400/40 transition-all transform hover:-translate-y-0.5"
              title="Rekap Belanja Kebutuhan Logistik & Bahan Material Bangunan"
            >
              <Package className="w-4 h-4 text-emerald-200" />
              <span>Rekap Bahan (BOM)</span>
            </button>

            {/* Tombol Alokasi Upah Tenaga Kerja HOK */}
            <button
              type="button"
              onClick={() => setLaborModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold font-display shadow-sm shadow-amber-950/20 border border-amber-400/40 transition-all transform hover:-translate-y-0.5"
              title="Alokasi & Hitung Otomatis Upah Tenaga Kerja (Pekerja, Tukang, Mandor) Standar HOK SNI"
            >
              <HardHat className="w-4 h-4 text-slate-950" />
              <span>Alokasi Upah Tenaga (HOK)</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold font-display text-paper-800">
              <input
                type="checkbox"
                checked={state.ppn}
                onChange={togglePpn}
                className="w-4 h-4 rounded text-blueprint-600 focus:ring-blueprint-500 border-paper-400 accent-blueprint-600 cursor-pointer"
              />
              <span>Sertakan PPN 11%</span>
            </label>

            <button
              type="button"
              onClick={() => exportBoQToExcel(state, { scheduleConfig })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold font-display shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel
            </button>
          </div>

        </div>
      </div>

      {/* ==================== CATEGORIES ACCORDION ==================== */}
      <main className="space-y-3.5">
        {(state?.categories || []).map((cat, idx) => {
          const isExpanded = !!cat?.expanded;
          const searchQ = (catSearch[cat?.id] || globalSearch).trim().toLowerCase();
          const items = Array.isArray(cat?.items) ? cat.items : [];
          
          // Filtered items
          const visibleItems = items.filter(it => {
            if (onlyFilled && (Number(it?.volume) || 0) <= 0) return false;
            if (searchQ) {
              const uText = typeof it?.uraian === 'string' ? it.uraian : (it?.uraian?.uraian || String(it?.uraian || ''));
              const uMatch = uText.toLowerCase().includes(searchQ);
              const cMatch = (it?.code || '').toLowerCase().includes(searchQ);
              return uMatch || cMatch;
            }
            return true;
          });

          const catSubtotal = items.reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0);
          const catFilledCount = items.filter(it => (Number(it?.volume) || 0) > 0).length;
          const totalItems = items.length;
          const progressPct = totalItems > 0 ? (catFilledCount / totalItems) * 100 : 0;

          return (
            <div 
              key={cat.id} 
              className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-sm ${
                isExpanded ? 'border-blueprint-500/80 ring-1 ring-blueprint-400/20' : 'border-paper-300 hover:border-paper-400'
              }`}
            >
              {/* Category Header */}
              <div 
                onClick={() => toggleCategoryExpand(cat.id)}
                className="flex items-center justify-between p-4 cursor-pointer select-none bg-paper-50/60 hover:bg-paper-100/80 transition-colors gap-3"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Roman Numeral */}
                  <span className="w-9 h-9 rounded-xl bg-blueprint-100 text-blueprint-800 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-blueprint-300/60">
                    {toRoman(idx + 1)}
                  </span>

                  {/* Title & Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isMaster || cat.custom ? (
                        <input
                          type="text"
                          value={cat.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                          className="font-display font-bold text-sm sm:text-base text-paper-900 bg-transparent border-b border-transparent hover:border-paper-400 focus:border-blueprint-600 focus:bg-white focus:outline-none px-1 rounded transition-colors w-full max-w-md truncate"
                        />
                      ) : (
                        <span className="font-display font-bold text-sm sm:text-base text-paper-900 px-1 truncate max-w-md">
                          {cat.name}
                        </span>
                      )}
                      {cat.custom && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold border border-purple-200 shrink-0">
                          Kustom
                        </span>
                      )}
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 bg-paper-200 h-1.5 rounded-full overflow-hidden shrink-0">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-paper-600">
                        <b>{catFilledCount}</b> / {totalItems} item terisi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtotal & Controls */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-xs sm:text-sm text-paper-900">
                    {formatRp(catSubtotal)}
                  </span>

                  {cat.custom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus kategori kustom "${cat.name}" beserta seluruh item di dalamnya?`)) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="p-1.5 text-paper-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus kategori kustom"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className={`p-1 text-paper-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Category Body / Item Table */}
              {isExpanded && (
                <div className="border-t border-paper-200 animate-fadeIn">
                  
                  {/* Category local search */}
                  <div className="p-3 bg-paper-100/60 border-b border-paper-200 flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-paper-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={catSearch[cat.id] || ''}
                        onChange={(e) => setCatSearch(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder={`Cari dalam ${cat.name}...`}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-paper-300 bg-white focus:outline-none focus:ring-2 focus:ring-blueprint-500 font-sans"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-paper-600 hidden sm:inline">
                      Menampilkan {visibleItems.length} dari {totalItems} item
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-paper-100 border-b border-paper-300 text-paper-600 font-mono text-[10.5px] uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3 w-20">Kode</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Uraian Pekerjaan</th>
                          <th className="py-2.5 px-3 w-16 text-center">Satuan</th>
                          <th className="py-2.5 px-3 w-32 text-right">Harga Satuan (Rp)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Volume</th>
                          <th className="py-2.5 px-3 w-32 text-right">Jumlah (Rp)</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-200">
                        {visibleItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-paper-500 text-xs font-sans">
                              Tidak ada item yang cocok dengan pencarian atau filter.
                            </td>
                          </tr>
                        ) : (
                          visibleItems.map((it, iIdx) => {
                            const isFilled = it.volume > 0;
                            const itemTotal = (it.harga || 0) * (it.volume || 0);

                            return (
                              <tr 
                                key={it.key}
                                className={`transition-colors hover:bg-blueprint-50/50 ${
                                  isFilled ? 'bg-emerald-50/60 font-medium' : ''
                                }`}
                              >
                                {/* No */}
                                <td className="py-2 px-3 text-center font-mono text-paper-500">
                                  {iIdx + 1}
                                </td>

                                {/* Kode */}
                                <td className="py-2 px-3 font-mono text-[11px] text-paper-600 whitespace-nowrap">
                                  {it.code || "—"}
                                </td>

                                {/* Uraian */}
                                <td className="py-2 px-3 text-paper-900">
                                  {it.custom ? (
                                    <input
                                      type="text"
                                      value={typeof it.uraian === 'string' ? it.uraian : (it.uraian?.uraian || String(it.uraian || ''))}
                                      onChange={(e) => updateCustomItem(cat.id, it.key, e.target.value)}
                                      className="w-full bg-transparent border-b border-paper-300 focus:border-blueprint-600 focus:outline-none text-xs font-sans"
                                    />
                                  ) : (
                                    <div className="flex items-center flex-wrap gap-1.5">
                                      <span>{typeof it.uraian === 'string' ? it.uraian : (it.uraian?.uraian || String(it.uraian || ''))}</span>
                                      {it.sharedWallReduced && (
                                        <span 
                                          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9.5px] font-mono font-bold"
                                          title={`Volume asli: ${it.originalVolume} ${it.satuan} (Tereduksi efisiensi dinding bersama -${it.sharedWallPercent}%)`}
                                        >
                                          🤝 Bersama -{it.sharedWallPercent}%
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Satuan */}
                                <td className="py-2 px-3 text-center font-mono text-paper-600">
                                  {it.custom ? (
                                    <input
                                      type="text"
                                      value={typeof it.satuan === 'string' ? it.satuan : (it.satuan?.satuan || String(it.satuan || ''))}
                                      onChange={(e) => updateCustomItem(cat.id, it.key, it.uraian, e.target.value)}
                                      className="w-14 text-center bg-white px-1 py-1 rounded border border-paper-300 text-xs focus:ring-1 focus:ring-blueprint-500 focus:outline-none"
                                      placeholder="satuan"
                                    />
                                  ) : (
                                    <span>{typeof it.satuan === 'string' ? it.satuan : (it.satuan?.satuan || String(it.satuan || ''))}</span>
                                  )}
                                </td>

                                {/* Harga Satuan */}
                                <td className="py-2 px-3 text-right">
                                  {isMaster || it.custom ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={it.harga || ''}
                                      onChange={(e) => updateItemPrice(cat.id, it.key, e.target.value)}
                                      placeholder="0"
                                      className="w-28 text-right font-mono bg-transparent hover:bg-white focus:bg-white px-2 py-1 rounded border border-transparent hover:border-paper-300 focus:border-blueprint-500 focus:outline-none text-xs transition-colors"
                                    />
                                  ) : (
                                    <div 
                                      className="inline-flex items-center justify-end gap-1 px-2 py-1 text-xs font-mono text-paper-700 select-none bg-paper-100/50 rounded border border-transparent hover:border-paper-300 transition-colors"
                                      title="Harga satuan standar terproteksi oleh Master Studio (Hanya Master yang dapat mengubah database harga)"
                                    >
                                      <Lock className="w-3 h-3 text-paper-400 shrink-0" />
                                      <span>{formatNumber(it.harga || 0)}</span>
                                    </div>
                                  )}
                                </td>

                                {/* Volume */}
                                <td className="py-2 px-3 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={it.volume || ''}
                                    onChange={(e) => updateItemVolume(cat.id, it.key, e.target.value)}
                                    placeholder="0"
                                    className={`w-24 text-right font-mono px-2 py-1 rounded border text-xs transition-all ${
                                      isFilled 
                                        ? 'bg-emerald-100/90 border-emerald-400 font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500' 
                                        : 'bg-paper-100/80 border-paper-300 hover:border-paper-400 focus:bg-white focus:border-blueprint-500'
                                    }`}
                                  />
                                </td>

                                {/* Jumlah Subtotal */}
                                <td className="py-2 px-3 text-right font-mono font-semibold text-paper-900 whitespace-nowrap">
                                  {formatRp(itemTotal)}
                                </td>

                                {/* Reset / Clear Button */}
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => deleteOrResetItem(cat.id, it.key)}
                                    className="p-1 rounded text-paper-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title={it.custom ? "Hapus item kustom" : "Kosongkan volume & reset harga default"}
                                  >
                                    {it.custom ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Inline Add Item Input */}
                  <div className="p-3 bg-paper-50 border-t border-paper-200 flex items-center gap-2">
                    <input
                      type="text"
                      value={catNewItemText[cat.id] || ''}
                      onChange={(e) => setCatNewItemText(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddInlineItem(cat.id); }}
                      placeholder="+ Tambah item kustom: ketik nama pekerjaan, lalu tekan Enter"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-dashed border-paper-400 bg-white hover:border-blueprint-500 focus:border-solid focus:border-blueprint-600 focus:outline-none font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddInlineItem(cat.id)}
                      className="px-3 py-1.5 bg-paper-200 hover:bg-blueprint-600 hover:text-white text-paper-800 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Tambah
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* ==================== FIXED SUMMARY BAR / HUD ==================== */}
      <div className="fixed left-0 right-0 bottom-0 z-30 bg-blueprint-950/95 backdrop-blur-md border-t border-blueprint-800 text-white shadow-2xl no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Quick status */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-blueprint-300">
            <span className="font-mono">
              Total Item: <b>{filledItemsCount}</b> terisi
            </span>
            <span className="text-blueprint-600">•</span>
            <span className="truncate max-w-xs text-blueprint-200 font-medium">
              {state.project.name || "Tanpa Nama Proyek"}
            </span>
          </div>

          {/* Totals & Action */}
          <div className="flex items-center gap-4 sm:gap-6 ml-auto">
            
            {/* Rekap Belanja Bahan Quick Button */}
            <button
              type="button"
              onClick={() => setMaterialTakeoffModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold font-display shadow-md shadow-emerald-950/30 border border-emerald-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Rekap Belanja Kebutuhan Logistik & Material Proyek (BOM)"
            >
              <Package className="w-4 h-4 text-emerald-200" />
              <span className="font-bold hidden sm:inline">Rekap Material</span>
            </button>

            {/* Simpan ke Library Quick Button */}
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold font-display shadow-md shadow-amber-950/40 border border-amber-300/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Simpan atau Perbarui Proyek ini di Library"
            >
              <BookmarkPlus className="w-4 h-4 text-slate-950" />
              <span className="font-bold">Simpan ke Library</span>
            </button>

            {/* Cetak SPH / PDF Quick Button */}
            <button
              type="button"
              onClick={() => setDocumentModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold font-display shadow-md border border-blue-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Cetak Format Surat Penawaran Harga (SPH) & Dokumen Berkop Resmi"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span className="font-bold hidden sm:inline">Cetak SPH</span>
            </button>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase tracking-widest text-blueprint-300">Subtotal</span>
              <span className="text-sm font-mono font-semibold text-white">
                {formatRp(subtotal)}
              </span>
            </div>

            {state.ppn && (
              <div className="flex flex-col items-end animate-fadeIn">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blueprint-300">PPN 11%</span>
                <span className="text-sm font-mono font-semibold text-blueprint-200">
                  {formatRp(ppnAmount)}
                </span>
              </div>
            )}

            <div className="flex flex-col items-end pl-3 border-l border-blueprint-800">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">Total RAB</span>
              <span className="text-base sm:text-xl font-mono font-extrabold text-white tracking-tight">
                {formatRp(grandTotal)}
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* Shared Wall Reduction Modal */}
      {sharedWallModalOpen && (
        <ApplySharedWallModal
          isOpen={sharedWallModalOpen}
          onClose={() => setSharedWallModalOpen(false)}
        />
      )}

      {/* Labor HOK Generator Modal */}
      {laborModalOpen && (
        <LaborGeneratorModal
          isOpen={laborModalOpen}
          onClose={() => setLaborModalOpen(false)}
        />
      )}

    </div>
  );
}
