import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeftRight, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Building2, 
  Home, 
  Layers, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  Scale, 
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatRp, formatNumber, parseNum } from '../../utils/formatters';

export function ProjectComparisonModal({ 
  isOpen, 
  onClose, 
  projectA: initialProjA, 
  projectB: initialProjB, 
  libraryList = [],
  onLoadProject
}) {
  const [selectedIdA, setSelectedIdA] = useState(initialProjA?.id);
  const [selectedIdB, setSelectedIdB] = useState(initialProjB?.id);
  const [expandedCatId, setExpandedCatId] = useState(null);

  // Sync state when props change
  React.useEffect(() => {
    if (initialProjA?.id) setSelectedIdA(initialProjA.id);
    if (initialProjB?.id) setSelectedIdB(initialProjB.id);
  }, [initialProjA, initialProjB]);

  const projA = useMemo(() => {
    return libraryList.find(p => p.id === selectedIdA) || initialProjA;
  }, [libraryList, selectedIdA, initialProjA]);

  const projB = useMemo(() => {
    return libraryList.find(p => p.id === selectedIdB) || initialProjB;
  }, [libraryList, selectedIdB, initialProjB]);

  const handleSwap = () => {
    const temp = selectedIdA;
    setSelectedIdA(selectedIdB);
    setSelectedIdB(temp);
  };

  // Kalkulasi Metrik Eksekutif
  const metrics = useMemo(() => {
    if (!projA || !projB) return null;

    const snapA = projA.stateSnapshot || {};
    const snapB = projB.stateSnapshot || {};

    const totalA = projA.grandTotal || 0;
    const totalB = projB.grandTotal || 0;
    const diffTotal = totalB - totalA;
    const pctTotal = totalA > 0 ? (diffTotal / totalA) * 100 : 0;

    // Unit & Area
    const unitsA = Math.max(1, parseNum(snapA.project?.clusterUnits) || 1);
    const unitsB = Math.max(1, parseNum(snapB.project?.clusterUnits) || 1);

    const costPerUnitA = totalA / unitsA;
    const costPerUnitB = totalB / unitsB;
    const diffCostPerUnit = costPerUnitB - costPerUnitA;

    const areaA = parseNum(snapA.project?.buildingArea) || 0;
    const areaB = parseNum(snapB.project?.buildingArea) || 0;
    const totalAreaA = unitsA * areaA;
    const totalAreaB = unitsB * areaB;

    const costPerM2A = totalAreaA > 0 ? totalA / totalAreaA : 0;
    const costPerM2B = totalAreaB > 0 ? totalB / totalAreaB : 0;
    const diffCostPerM2 = costPerM2B - costPerM2A;

    // Tipologi
    const typoA = snapA.project?.clusterTypology || 'ganda';
    const typoB = snapB.project?.clusterTypology || 'ganda';

    return {
      totalA,
      totalB,
      diffTotal,
      pctTotal,
      unitsA,
      unitsB,
      costPerUnitA,
      costPerUnitB,
      diffCostPerUnit,
      areaA,
      areaB,
      costPerM2A,
      costPerM2B,
      diffCostPerM2,
      typoA,
      typoB
    };
  }, [projA, projB]);

  // Perbandingan Kategori
  const categoryComparison = useMemo(() => {
    if (!projA || !projB) return [];

    const rawCatsA = projA?.stateSnapshot?.categories;
    const catsA = Array.isArray(rawCatsA) ? rawCatsA : (rawCatsA && typeof rawCatsA === 'object' ? Object.values(rawCatsA) : []);
    const rawCatsB = projB?.stateSnapshot?.categories;
    const catsB = Array.isArray(rawCatsB) ? rawCatsB : (rawCatsB && typeof rawCatsB === 'object' ? Object.values(rawCatsB) : []);

    // Himpunan semua id kategori
    const catMap = new Map();

    catsA.forEach(c => {
      if (!c) return;
      const itemsA = Array.isArray(c?.items) ? c.items : [];
      catMap.set(c.id, {
        id: c.id,
        name: c.name || 'Kategori',
        subtotalA: itemsA.reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0),
        subtotalB: 0,
        itemsA,
        itemsB: []
      });
    });

    catsB.forEach(c => {
      if (!c) return;
      const existing = catMap.get(c.id);
      const itemsB = Array.isArray(c?.items) ? c.items : [];
      const subB = itemsB.reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0);
      if (existing) {
        existing.subtotalB = subB;
        existing.itemsB = itemsB;
      } else {
        catMap.set(c.id, {
          id: c.id,
          name: c.name || 'Kategori',
          subtotalA: 0,
          subtotalB: subB,
          itemsA: [],
          itemsB
        });
      }
    });

    return Array.from(catMap.values()).map(cat => {
      const diff = cat.subtotalB - cat.subtotalA;
      const pct = cat.subtotalA > 0 ? (diff / cat.subtotalA) * 100 : (cat.subtotalB > 0 ? 100 : 0);

      // Detail item differences inside this category
      const itemDiffs = [];
      const itemMap = new Map();

      cat.itemsA.forEach(it => {
        itemMap.set(it.uraian, {
          uraian: it.uraian,
          satuan: it.satuan,
          volA: it.volume || 0,
          hargaA: it.harga || 0,
          volB: 0,
          hargaB: 0
        });
      });

      cat.itemsB.forEach(it => {
        const exist = itemMap.get(it.uraian);
        if (exist) {
          exist.volB = it.volume || 0;
          exist.hargaB = it.harga || 0;
        } else {
          itemMap.set(it.uraian, {
            uraian: it.uraian,
            satuan: it.satuan,
            volA: 0,
            hargaA: 0,
            volB: it.volume || 0,
            hargaB: it.harga || 0
          });
        }
      });

      Array.from(itemMap.values()).forEach(item => {
        const subItemA = item.volA * item.hargaA;
        const subItemB = item.volB * item.hargaB;
        const subDiff = subItemB - subItemA;
        const volDiff = item.volB - item.volA;

        if (volDiff !== 0 || subDiff !== 0) {
          itemDiffs.push({
            ...item,
            subItemA,
            subItemB,
            subDiff,
            volDiff
          });
        }
      });

      return {
        ...cat,
        diff,
        pct,
        itemDiffs
      };
    });
  }, [projA, projB]);

  if (!isOpen || !projA || !projB) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-paper-300 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col font-sans">
        
        {/* ==================== MODAL HEADER ==================== */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 shadow-inner">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base sm:text-lg uppercase tracking-wide text-white">
                Komparasi Versi Proyek (Revision Diff)
              </h2>
              <p className="text-xs text-slate-400">
                Analisis perbandingan biaya, HPP per kavling, dan variansi pekerjaan secara berdampingan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================== SELECTOR PROYEK (SIDE-BY-SIDE PICKER) ==================== */}
        <div className="bg-slate-50 border-b border-paper-200 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          
          {/* Proyek A (Baseline) */}
          <div className="md:col-span-5 bg-white p-3 rounded-2xl border border-paper-300 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                🔵 Proyek A (Baseline / Referensi)
              </span>
              <span className="text-[10px] font-mono text-slate-400">{projA.date}</span>
            </div>
            <select
              value={selectedIdA}
              onChange={e => setSelectedIdA(e.target.value)}
              className="w-full p-2 text-xs font-heading font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            >
              {libraryList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ({formatRp(p.grandTotal)})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2 rounded-xl bg-white border border-paper-300 hover:bg-slate-100 text-slate-700 shadow-sm transition-all transform hover:rotate-180 duration-200"
              title="Tukar Posisi Proyek A dan B"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Proyek B (Comparison) */}
          <div className="md:col-span-5 bg-white p-3 rounded-2xl border border-paper-300 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-700">
                🟢 Proyek B (Revisi / Alternatif)
              </span>
              <span className="text-[10px] font-mono text-slate-400">{projB.date}</span>
            </div>
            <select
              value={selectedIdB}
              onChange={e => setSelectedIdB(e.target.value)}
              className="w-full p-2 text-xs font-heading font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            >
              {libraryList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ({formatRp(p.grandTotal)})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* ==================== MODAL BODY ==================== */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-paper-100/60">

          {/* 1. EXECUTIVE KPI COMPARISON CARDS */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Card 1: Total Anggaran */}
              <div className="p-4 rounded-2xl bg-white border border-paper-300 shadow-sm flex flex-col justify-between">
                <span className="text-[10.5px] font-mono uppercase font-bold text-slate-500">
                  1. Total Anggaran Proyek
                </span>
                
                <div className="my-2 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">A: {formatRp(metrics.totalA)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-bold text-slate-900">B: {formatRp(metrics.totalB)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-paper-200 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">Selisih:</span>
                  <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
                    metrics.diffTotal < 0 
                      ? 'text-emerald-700' 
                      : metrics.diffTotal > 0 
                        ? 'text-rose-700' 
                        : 'text-slate-700'
                  }`}>
                    {metrics.diffTotal < 0 && <TrendingDown className="w-3.5 h-3.5" />}
                    {metrics.diffTotal > 0 && <TrendingUp className="w-3.5 h-3.5" />}
                    {metrics.diffTotal === 0 && <Minus className="w-3.5 h-3.5" />}
                    <span>{metrics.diffTotal < 0 ? '-' : metrics.diffTotal > 0 ? '+' : ''}{formatRp(Math.abs(metrics.diffTotal))}</span>
                    <span className="text-[10px]">({metrics.pctTotal.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>

              {/* Card 2: HPP per Unit Rumah */}
              <div className="p-4 rounded-2xl bg-white border border-paper-300 shadow-sm flex flex-col justify-between">
                <span className="text-[10.5px] font-mono uppercase font-bold text-slate-500">
                  2. HPP per Unit Rumah
                </span>
                
                <div className="my-2 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">A ({metrics.unitsA} unit):</span>
                    <span className="text-slate-700">{formatRp(metrics.costPerUnitA)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">B ({metrics.unitsB} unit):</span>
                    <span className="font-bold text-amber-800">{formatRp(metrics.costPerUnitB)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-paper-200 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">Selisih / Pintu:</span>
                  <span className={`text-xs font-mono font-bold ${
                    metrics.diffCostPerUnit < 0 ? 'text-emerald-700' : metrics.diffCostPerUnit > 0 ? 'text-rose-700' : 'text-slate-700'
                  }`}>
                    {metrics.diffCostPerUnit < 0 ? '-' : metrics.diffCostPerUnit > 0 ? '+' : ''}{formatRp(Math.abs(metrics.diffCostPerUnit))}
                  </span>
                </div>
              </div>

              {/* Card 3: Biaya Konstruksi per m2 */}
              <div className="p-4 rounded-2xl bg-white border border-paper-300 shadow-sm flex flex-col justify-between">
                <span className="text-[10.5px] font-mono uppercase font-bold text-slate-500">
                  3. Biaya Konstruksi / m²
                </span>
                
                <div className="my-2 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">A ({metrics.areaA} m²):</span>
                    <span className="text-slate-700">{formatRp(metrics.costPerM2A)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">B ({metrics.areaB} m²):</span>
                    <span className="font-bold text-cyan-800">{formatRp(metrics.costPerM2B)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-paper-200 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">Selisih / m²:</span>
                  <span className={`text-xs font-mono font-bold ${
                    metrics.diffCostPerM2 < 0 ? 'text-emerald-700' : metrics.diffCostPerM2 > 0 ? 'text-rose-700' : 'text-slate-700'
                  }`}>
                    {metrics.diffCostPerM2 < 0 ? '-' : metrics.diffCostPerM2 > 0 ? '+' : ''}{formatRp(Math.abs(metrics.diffCostPerM2))}
                  </span>
                </div>
              </div>

              {/* Card 4: Tipologi & Efisiensi Dinding */}
              <div className="p-4 rounded-2xl bg-white border border-paper-300 shadow-sm flex flex-col justify-between">
                <span className="text-[10.5px] font-mono uppercase font-bold text-slate-500">
                  4. Tipologi Dinding Cluster
                </span>
                
                <div className="my-2 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Proyek A:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      metrics.typoA === 'bersama' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {metrics.typoA === 'bersama' ? '🤝 Dinding Bersama' : '🧱 Dinding Ganda'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Proyek B:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      metrics.typoB === 'bersama' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {metrics.typoB === 'bersama' ? '🤝 Dinding Bersama' : '🧱 Dinding Ganda'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-paper-200 text-[10.5px] font-mono text-slate-500">
                  {metrics.typoA === metrics.typoB 
                    ? 'Tipologi dinding identik' 
                    : metrics.typoB === 'bersama'
                      ? '✨ Proyek B menerapkan efisiensi party-wall'
                      : 'ℹ️ Proyek B menggunakan spesifikasi dinding ganda penuh'}
                </div>
              </div>

            </div>
          )}

          {/* 2. CATEGORY BREAKDOWN VARIANCE TABLE */}
          <div className="bg-white rounded-3xl border border-paper-300 shadow-sm overflow-hidden">
            
            <div className="p-4 border-b border-paper-200 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-sm uppercase tracking-wide text-slate-900">
                  Variansi Anggaran per Divisi Pekerjaan
                </h3>
                <p className="text-xs text-slate-500">
                  Klik pada baris kategori untuk melihat rincian item material yang mengalami perubahan.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {categoryComparison.length} Divisi Pekerjaan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono text-[10.5px] uppercase tracking-wider">
                    <th className="p-3 w-8 text-center">#</th>
                    <th className="p-3">Divisi Pekerjaan</th>
                    <th className="p-3 text-right">Proyek A</th>
                    <th className="p-3 text-right">Proyek B</th>
                    <th className="p-3 text-right">Selisih (B - A)</th>
                    <th className="p-3 text-center w-24">Variansi (%)</th>
                    <th className="p-3 w-10 text-center">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200 font-mono">
                  {categoryComparison.map((cat, idx) => {
                    const isExpanded = expandedCatId === cat.id;
                    const isSaving = cat.diff < 0;
                    const isIncrease = cat.diff > 0;

                    return (
                      <React.Fragment key={cat.id}>
                        <tr 
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="p-3 font-sans font-bold text-slate-900">
                            {cat.name}
                            {cat.itemDiffs.length > 0 && (
                              <span className="ml-2 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-slate-100 text-slate-600 border border-slate-300">
                                {cat.itemDiffs.length} item berubah
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatRp(cat.subtotalA)}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatRp(cat.subtotalB)}
                          </td>
                          <td className={`p-3 text-right font-bold ${
                            isSaving ? 'text-emerald-700' : isIncrease ? 'text-rose-700' : 'text-slate-500'
                          }`}>
                            {isSaving ? '-' : isIncrease ? '+' : ''}{formatRp(Math.abs(cat.diff))}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSaving 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : isIncrease 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {cat.pct > 0 ? `+${cat.pct.toFixed(1)}%` : `${cat.pct.toFixed(1)}%`}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            <ChevronDown className={`w-4 h-4 mx-auto transition-transform ${isExpanded ? 'rotate-180 text-amber-700' : ''}`} />
                          </td>
                        </tr>

                        {/* EXPANDED ITEM-LEVEL DIFF */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-y border-amber-200">
                            <td colSpan={7} className="p-4">
                              <div className="bg-white rounded-2xl border border-paper-300 p-3 shadow-xs space-y-2">
                                <h4 className="text-[11px] font-heading font-black uppercase text-slate-700 tracking-wide flex items-center justify-between">
                                  <span>Perbedaan Rincian Item Pekerjaan ({cat.name}):</span>
                                  <span className="text-[10px] font-mono text-slate-500 font-normal">
                                    {cat.itemDiffs.length} item mengalami perubahan volume/harga
                                  </span>
                                </h4>

                                {cat.itemDiffs.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    Tidak ada perbedaan item pekerjaan pada divisi ini (identik).
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead>
                                        <tr className="border-b border-paper-200 text-[10px] font-mono text-slate-500 uppercase">
                                          <th className="pb-1">Uraian Bahan / Pekerjaan</th>
                                          <th className="pb-1 text-right">Vol A</th>
                                          <th className="pb-1 text-right">Vol B</th>
                                          <th className="pb-1 text-right">Δ Volume</th>
                                          <th className="pb-1 text-right">Biaya A</th>
                                          <th className="pb-1 text-right">Biaya B</th>
                                          <th className="pb-1 text-right">Δ Biaya</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-paper-100 font-mono text-[11px]">
                                        {cat.itemDiffs.map((it, itemIdx) => {
                                          const isItemSaving = it.subDiff < 0;
                                          return (
                                            <tr key={itemIdx} className="hover:bg-slate-50">
                                              <td className="py-1.5 font-sans font-medium text-slate-800">
                                                {it.uraian}
                                              </td>
                                              <td className="py-1.5 text-right text-slate-500">
                                                {formatNumber(it.volA)} {it.satuan}
                                              </td>
                                              <td className="py-1.5 text-right font-bold text-slate-900">
                                                {formatNumber(it.volB)} {it.satuan}
                                              </td>
                                              <td className={`py-1.5 text-right font-bold ${
                                                it.volDiff < 0 ? 'text-emerald-700' : 'text-rose-700'
                                              }`}>
                                                {it.volDiff > 0 ? `+${formatNumber(it.volDiff)}` : formatNumber(it.volDiff)} {it.satuan}
                                              </td>
                                              <td className="py-1.5 text-right text-slate-500">
                                                {formatRp(it.subItemA)}
                                              </td>
                                              <td className="py-1.5 text-right text-slate-900 font-medium">
                                                {formatRp(it.subItemB)}
                                              </td>
                                              <td className={`py-1.5 text-right font-bold ${
                                                isItemSaving ? 'text-emerald-700' : 'text-rose-700'
                                              }`}>
                                                {isItemSaving ? '-' : '+'}{formatRp(Math.abs(it.subDiff))}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* ==================== MODAL FOOTER ==================== */}
        <div className="p-4 bg-white border-t border-paper-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-sans">
            Membandingkan <b>{projA.name}</b> dengan <b>{projB.name}</b>
          </div>

          <div className="flex items-center gap-2">
            {onLoadProject && (
              <>
                <button
                  type="button"
                  onClick={() => { onLoadProject(projA.id); onClose(); }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-700" />
                  <span>Buka Proyek A di BoQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => { onLoadProject(projB.id); onClose(); }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Buka Proyek B di BoQ</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
