import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  FileSpreadsheet, 
  Printer, 
  FolderArchive, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Hammer, 
  Boxes, 
  Coins, 
  Building2, 
  MapPin, 
  User, 
  Calendar,
  Layers
} from 'lucide-react';
import { formatRp, formatNumber, toRoman } from '../../utils/formatters';
import { exportBoQToExcel } from '../../utils/exportExcel';

// Palet warna arsitektural untuk slice chart & legend
const PALETTE = [
  { bg: '#2563eb', stroke: '#1d4ed8', text: 'text-blue-600', fill: '#3b82f6', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { bg: '#059669', stroke: '#047857', text: 'text-emerald-600', fill: '#10b981', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { bg: '#d97706', stroke: '#b45309', text: 'text-amber-600', fill: '#f59e0b', light: 'bg-amber-50 text-amber-700 border-amber-200' },
  { bg: '#e11d48', stroke: '#be123c', text: 'text-rose-600', fill: '#f43f5e', light: 'bg-rose-50 text-rose-700 border-rose-200' },
  { bg: '#7c3aed', stroke: '#6d28d9', text: 'text-purple-600', fill: '#8b5cf6', light: 'bg-purple-50 text-purple-700 border-purple-200' },
  { bg: '#0891b2', stroke: '#0e7490', text: 'text-cyan-600', fill: '#06b6d4', light: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { bg: '#ea580c', stroke: '#c2410c', text: 'text-orange-600', fill: '#f97316', light: 'bg-orange-50 text-orange-700 border-orange-200' },
  { bg: '#4f46e5', stroke: '#4338ca', text: 'text-indigo-600', fill: '#6366f1', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { bg: '#0d9488', stroke: '#0f766e', text: 'text-teal-600', fill: '#14b8a6', light: 'bg-teal-50 text-teal-700 border-teal-200' },
  { bg: '#c026d3', stroke: '#a21caf', text: 'text-fuchsia-600', fill: '#d946ef', light: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
];

export function DashboardView() {
  const { 
    state, 
    setActiveTab, 
    subtotal, 
    ppnAmount, 
    grandTotal, 
    filledItemsCount,
    scheduleConfig,
    setDocumentModalOpen 
  } = useBoQ();

  const [hoveredCatId, setHoveredCatId] = useState(null);

  // 1. Data per Kategori
  const categoryStats = useMemo(() => {
    const cats = Array.isArray(state?.categories) ? state.categories : [];
    return cats.map((cat, idx) => {
      const items = Array.isArray(cat?.items) ? cat.items : [];
      const catSubtotal = items.reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0);
      const filledCount = items.filter(it => (Number(it?.volume) || 0) > 0).length;
      const weight = subtotal > 0 ? (catSubtotal / subtotal) * 100 : 0;
      const color = PALETTE[idx % PALETTE.length];

      return {
        id: cat?.id || `cat-${idx}`,
        name: cat?.name || `Kategori ${idx + 1}`,
        subtotal: catSubtotal,
        weight,
        filledCount,
        totalItems: items.length,
        color,
        index: idx
      };
    });
  }, [state?.categories, subtotal]);

  // Hanya kategori yang memiliki nilai biaya
  const activeCategories = useMemo(() => {
    return categoryStats
      .filter(c => c.subtotal > 0)
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [categoryStats]);

  // Kategori dengan biaya terbesar
  const dominantCategory = activeCategories.length > 0 ? activeCategories[0] : null;

  // 2. Top 7 Item Termahal (Pareto Analysis)
  const topItems = useMemo(() => {
    const all = [];
    const cats = Array.isArray(state?.categories) ? state.categories : [];
    cats.forEach(cat => {
      const items = Array.isArray(cat?.items) ? cat.items : [];
      items.forEach(it => {
        const total = (Number(it?.harga) || 0) * (Number(it?.volume) || 0);
        if (total > 0) {
          all.push({
            uraian: it?.uraian || '-',
            satuan: it?.satuan || 'ls',
            volume: it?.volume || 0,
            harga: it?.harga || 0,
            total,
            categoryName: cat?.name || 'Kategori',
            categoryCode: cat?.id || '',
            weight: subtotal > 0 ? (total / subtotal) * 100 : 0
          });
        }
      });
    });
    return all.sort((a, b) => b.total - a.total).slice(0, 7);
  }, [state?.categories, subtotal]);

  // 3. Rasio Material vs Upah Tenaga Kerja
  const { materialCost, labourCost, materialPercent, labourPercent } = useMemo(() => {
    let mCost = 0;
    let lCost = 0;
    const cats = Array.isArray(state?.categories) ? state.categories : [];

    cats.forEach(cat => {
      const items = Array.isArray(cat?.items) ? cat.items : [];
      items.forEach(it => {
        const total = (Number(it?.harga) || 0) * (Number(it?.volume) || 0);
        if (total > 0) {
          const code = (it?.code || '').toUpperCase();
          const desc = (it?.uraian || '').toLowerCase();
          const isLabour = code.startsWith('L') || 
            desc.includes('pekerja') || 
            desc.includes('tukang') || 
            desc.includes('mandor') || 
            desc.includes('ongkos') || 
            desc.includes('upah');

          if (isLabour) {
            lCost += total;
          } else {
            mCost += total;
          }
        }
      });
    });

    const totalCalculated = mCost + lCost;
    const mPercent = totalCalculated > 0 ? (mCost / totalCalculated) * 100 : 0;
    const lPercent = totalCalculated > 0 ? (lCost / totalCalculated) * 100 : 0;

    return {
      materialCost: mCost,
      labourCost: lCost,
      materialPercent: mPercent,
      labourPercent: lPercent
    };
  }, [state?.categories]);

  // SVG Donut Chart Paths calculation
  const donutPaths = useMemo(() => {
    if (activeCategories.length === 0 || subtotal <= 0) return [];

    let cumulativeAngle = 0;
    const cx = 110;
    const cy = 110;
    const outerR = 95;
    const innerR = 60;

    return activeCategories.map(cat => {
      const sliceAngle = (cat.subtotal / subtotal) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle = endAngle;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = cx + outerR * Math.cos(startRad);
      const y1 = cy + outerR * Math.sin(startRad);
      const x2 = cx + outerR * Math.cos(endRad);
      const y2 = cy + outerR * Math.sin(endRad);

      const ix1 = cx + innerR * Math.cos(endRad);
      const iy1 = cy + innerR * Math.sin(endRad);
      const ix2 = cx + innerR * Math.cos(startRad);
      const iy2 = cy + innerR * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z'
      ].join(' ');

      return {
        ...cat,
        d,
        startAngle,
        endAngle
      };
    });
  }, [activeCategories, subtotal]);

  const activeHoveredCat = useMemo(() => {
    if (!hoveredCatId) return null;
    return activeCategories.find(c => c.id === hoveredCatId);
  }, [hoveredCatId, activeCategories]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28">

      {/* ==================== TOP HERO BANNER ==================== */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-blueprint-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-white/10 overflow-hidden mb-8">
        
        {/* Background Architectural Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
            backgroundSize: '24px 24px' 
          }} 
        />
        
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blueprint-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Brand & Project Info */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <img 
                src="/icon.png" 
                alt="SR Studio" 
                className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1.5 border border-white/20 shadow-inner backdrop-blur-md"
              />
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
                  Executive Dashboard TA 2026
                </span>
                <p className="text-xs text-slate-300 font-sans">
                  SR Studio Architecture, Engineering & Construction Cost Intelligence
                </p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-heading font-black tracking-tight text-white">
              {state.project.name || 'Ringkasan Anggaran Biaya Proyek'}
            </h1>

            {/* Project Metadata Tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-slate-300 pt-1">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Klien: <strong className="text-white">{state.project.client || 'Belum Ditentukan'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-blueprint-300" />
                <span>Lokasi: <strong className="text-white">{state.project.location || 'Semarang, Jawa Tengah'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tanggal: <strong className="text-white">{state.project.date || '-'}</strong></span>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDocumentModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-sans shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Printer className="w-4 h-4" />
              Cetak SPH / PDF Berkop
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold font-sans border border-white/15 backdrop-blur-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-blueprint-300" />
              Kelola Rincian BoQ
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 text-xs font-semibold font-sans border border-emerald-500/30 backdrop-blur-sm transition-all"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Kurva S & Jadwal Proyek
            </button>

            <button
              type="button"
              onClick={() => exportBoQToExcel(state, { scheduleConfig })}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium font-sans border border-white/10 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              Export ke Excel (.xlsx)
            </button>
          </div>

        </div>
      </div>

      {/* ==================== EXECUTIVE KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* KPI 1: Grand Total */}
        <div className="rounded-2xl bg-white border border-paper-300 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between text-paper-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-paper-600">Total Nilai Proyek</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-black text-paper-900 tracking-tight">
            {formatRp(grandTotal)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-paper-500 pt-2 border-t border-paper-100">
            <span>Subtotal: {formatRp(subtotal)}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${state.ppn ? 'bg-emerald-100 text-emerald-700' : 'bg-paper-100 text-paper-600'}`}>
              {state.ppn ? '+ PPN 11%' : 'Tanpa PPN'}
            </span>
          </div>
        </div>

        {/* KPI 2: Kategori Dominan */}
        <div className="rounded-2xl bg-white border border-paper-300 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between text-paper-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-paper-600">Divisi Dominan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-xl font-bold text-paper-900 truncate" title={dominantCategory?.name || '-'}>
            {dominantCategory ? dominantCategory.name : 'Belum Ada Data'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-paper-500 pt-2 border-t border-paper-100">
            <span>Alokasi Anggaran:</span>
            <strong className="text-blue-600 font-mono font-bold">
              {dominantCategory ? `${dominantCategory.weight.toFixed(1)}%` : '0%'}
            </strong>
          </div>
        </div>

        {/* KPI 3: Item Terisi */}
        <div className="rounded-2xl bg-white border border-paper-300 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between text-paper-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-paper-600">Kelengkapan RAB</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading text-2xl font-black text-paper-900 tracking-tight">
            {filledItemsCount} <span className="text-sm font-normal text-paper-500">Item Pekerjaan</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-paper-500 pt-2 border-t border-paper-100">
            <span>Kategori Aktif:</span>
            <strong className="text-emerald-700 font-mono font-bold">{activeCategories.length} Divisi</strong>
          </div>
        </div>

        {/* KPI 4: Rasio Belanja Bahan vs Upah */}
        <div className="rounded-2xl bg-white border border-paper-300 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between text-paper-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-paper-600">Bahan vs Tenaga Kerja</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-paper-900 mt-1">
            <span className="text-blue-600">Mat: {materialPercent.toFixed(0)}%</span>
            <span className="text-paper-300">/</span>
            <span className="text-amber-600">Upah: {labourPercent.toFixed(0)}%</span>
          </div>
          {/* Mini progress ratio */}
          <div className="w-full h-2 rounded-full bg-paper-200 mt-2 overflow-hidden flex">
            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${materialPercent}%` }} />
            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${labourPercent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-paper-500 pt-1">
            <span>Est. Bahan: {formatRp(materialCost)}</span>
          </div>
        </div>

      </div>

      {/* ==================== CHARTS SECTION ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Left Card: Interactive Donut Chart (Divisi Pekerjaan) */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-paper-300 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-heading font-bold text-paper-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blueprint-600" />
                  Proporsi Anggaran per Divisi
                </h2>
                <p className="text-xs text-paper-500">
                  Visualisasi sebaran alokasi biaya seluruh kategori pekerjaan
                </p>
              </div>
              <span className="text-[11px] font-mono text-paper-400 font-medium">
                {activeCategories.length} Divisi Aktif
              </span>
            </div>

            {/* Donut Chart Display */}
            {activeCategories.length === 0 ? (
              <div className="py-16 text-center text-paper-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Belum ada item dengan volume terisi di BoQ.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('boq')}
                  className="mt-3 text-xs font-bold text-blueprint-600 hover:underline"
                >
                  Mulai isi volume di BoQ &rarr;
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
                
                {/* SVG Donut */}
                <div className="relative w-56 h-56 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 220 220" className="w-full h-full transform -rotate-90">
                    {donutPaths.map((slice) => {
                      const isHovered = hoveredCatId === slice.id;
                      return (
                        <path
                          key={slice.id}
                          d={slice.d}
                          fill={slice.color.bg}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-200 cursor-pointer hover:opacity-85 hover:scale-105 transform origin-center"
                          onMouseEnter={() => setHoveredCatId(slice.id)}
                          onMouseLeave={() => setHoveredCatId(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                    {activeHoveredCat ? (
                      <>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-paper-500 line-clamp-1 max-w-[110px]">
                          {activeHoveredCat.name}
                        </span>
                        <span className="font-heading text-lg font-black text-paper-900 leading-tight">
                          {activeHoveredCat.weight.toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-mono text-paper-600 font-semibold mt-0.5">
                          {formatRp(activeHoveredCat.subtotal)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-paper-500">
                          Total Proyek
                        </span>
                        <span className="font-heading text-base font-black text-paper-900 leading-tight">
                          {formatRp(subtotal)}
                        </span>
                        <span className="text-[10px] text-paper-400 font-sans mt-0.5">
                          Hover segmen
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend List */}
                <div className="w-full space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                  {activeCategories.map((cat) => {
                    const isHovered = hoveredCatId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onMouseEnter={() => setHoveredCatId(cat.id)}
                        onMouseLeave={() => setHoveredCatId(null)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                          isHovered ? 'bg-paper-100 ring-1 ring-paper-300' : 'hover:bg-paper-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span 
                            className="w-3 h-3 rounded-md shrink-0" 
                            style={{ backgroundColor: cat.color.bg }}
                          />
                          <span className="font-medium text-paper-800 truncate" title={cat.name}>
                            {cat.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-paper-900 block">
                            {cat.weight.toFixed(1)}%
                          </span>
                          <span className="text-[10px] font-mono text-paper-500">
                            {formatRp(cat.subtotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-paper-200 text-xs text-paper-500 flex items-center justify-between">
            <span>Standar Analisa: Perwali Semarang TA 2026</span>
            <span className="font-mono font-bold text-paper-700">Subtotal: {formatRp(subtotal)}</span>
          </div>
        </div>

        {/* Right Card: Top 7 Item Termahal (Pareto Analysis) */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-paper-300 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-heading font-bold text-paper-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  Top 7 Item Pekerjaan Termahal
                </h2>
                <p className="text-xs text-paper-500">
                  Analisis Pareto 80/20 untuk evaluasi efisiensi biaya (*Value Engineering*)
                </p>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                Prioritas Biaya
              </span>
            </div>

            {topItems.length === 0 ? (
              <div className="py-16 text-center text-paper-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Belum ada item dengan nilai terisi.</p>
              </div>
            ) : (
              <div className="space-y-3.5 my-2">
                {topItems.map((it, idx) => {
                  const maxItemCost = topItems[0]?.total || 1;
                  const barWidth = Math.max(5, (it.total / maxItemCost) * 100);

                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0 pr-3">
                          <span className="w-5 h-5 rounded-md bg-paper-100 group-hover:bg-amber-100 text-paper-700 group-hover:text-amber-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-paper-800 truncate" title={it.uraian}>
                            {it.uraian}
                          </span>
                          <span className="text-[10px] text-paper-400 shrink-0 font-mono">
                            ({it.volume} {it.satuan})
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-paper-900">
                            {formatRp(it.total)}
                          </span>
                          <span className="text-[10px] font-mono text-amber-600 font-semibold ml-1.5">
                            ({it.weight.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full bg-paper-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 group-hover:from-amber-400 group-hover:to-amber-500 transition-all duration-500" 
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-paper-200 text-xs text-paper-500 flex items-center justify-between">
            <span>Item pekerjaan dengan penyerapan anggaran terbesar</span>
            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="text-xs font-semibold text-blueprint-600 hover:text-blueprint-800 flex items-center gap-1"
            >
              Lihat di BoQ <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ==================== REKAPITULASI DIVISI TABLE ==================== */}
      <div className="rounded-3xl bg-white border border-paper-300 p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-paper-200">
          <div>
            <h2 className="text-base font-heading font-bold text-paper-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blueprint-600" />
              Tabel Rekapitulasi Divisi Proyek
            </h2>
            <p className="text-xs text-paper-500">
              Rincian bobot dan akumulasi subtotal per kelompok pekerjaan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDocumentModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Format SPH Resmi
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-paper-300 text-paper-500 font-mono uppercase text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Uraian Divisi Pekerjaan</th>
                <th className="py-2.5 px-3 text-center">Item Terisi</th>
                <th className="py-2.5 px-3 w-32">Visual Bobot</th>
                <th className="py-2.5 px-3 text-right">Bobot (%)</th>
                <th className="py-2.5 px-3 text-right">Sub Total Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-100 font-sans">
              {categoryStats.map((cat, idx) => {
                return (
                  <tr key={cat.id} className="hover:bg-paper-50 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-bold text-paper-600">
                      {toRoman(idx + 1)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-paper-900">{cat.name}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-paper-600 font-mono">
                      {cat.filledCount} / {cat.totalItems}
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-full h-2 rounded-full bg-paper-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, Math.max(0, cat.weight))}%`,
                            backgroundColor: cat.color.bg
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-paper-700">
                      {cat.weight.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-paper-900">
                      {formatRp(cat.subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-paper-400 bg-paper-50 font-bold font-mono">
                <td colSpan={4} className="py-3 px-3 text-right text-paper-700 uppercase">
                  Sub Total Proyek :
                </td>
                <td className="py-3 px-3 text-right text-blueprint-700">
                  100.00%
                </td>
                <td className="py-3 px-3 text-right text-paper-900 text-sm">
                  {formatRp(subtotal)}
                </td>
              </tr>
              {state.ppn && (
                <tr className="bg-paper-50 font-bold font-mono border-t border-paper-200">
                  <td colSpan={5} className="py-2.5 px-3 text-right text-emerald-700 uppercase">
                    PPN 11% :
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">
                    {formatRp(ppnAmount)}
                  </td>
                </tr>
              )}
              <tr className="bg-blueprint-50 font-bold font-mono border-t-2 border-blueprint-600 text-blueprint-900 text-sm">
                <td colSpan={5} className="py-3.5 px-3 text-right uppercase tracking-wider">
                  Grand Total Final :
                </td>
                <td className="py-3.5 px-3 text-right text-base text-blueprint-700">
                  {formatRp(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
