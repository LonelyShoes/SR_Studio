import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum, calcRebarWeightPerM } from '../../utils/formatters';
import { 
  ArrowLeft, 
  Send, 
  Plus, 
  Trash2, 
  Layers, 
  Info,
  Check,
  Scissors,
  DollarSign,
  Boxes,
  HelpCircle,
  Sliders,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square
} from 'lucide-react';

import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';

/**
 * First-Fit Decreasing (FFD) Cutting Stock Algorithm
 * Packs pieces (<= 12m) into 12m standard bars to minimize waste
 */
export function calculateFFD(cuts, standardLength = 12, lapFactor = 40) {
  if (!cuts || cuts.length === 0) return { totalLonjor: 0, bins: [], patterns: [] };

  // Expand cuts list: array of individual piece objects with role & metadata
  const expanded = [];
  cuts.forEach(cut => {
    const qty = parseInt(cut.qty, 10) || 0;
    const len = Number(cut.length) || 0;
    if (len > 0 && qty > 0) {
      for (let i = 0; i < qty; i++) {
        expanded.push({
          length: len,
          role: cut.role || 'Tulangan',
          type: cut.type,
          diameter: cut.diameter
        });
      }
    }
  });

  if (expanded.length === 0) return { totalLonjor: 0, bins: [], patterns: [] };

  // Sort descending by length so longer pieces (tulangan pokok) are placed first
  expanded.sort((a, b) => b.length - a.length);

  const bins = []; // Each bin represents remaining capacity in a 12m bar

  // Batang > 12 m: disambung dengan sambungan lewatan (default 40D, SNI 2847).
  // n-1 lonjor utuh 12 m + 1 potongan sisa yang ikut dipacking FFD normal,
  // sehingga panjang lewatan terhitung dan sisa potongan tidak terbuang.
  const packable = [];
  expanded.forEach(piece => {
    const len = piece.length;
    if (len <= standardLength) { packable.push(piece); return; }
    const lap = Math.min(standardLength / 2, (lapFactor * (Number(piece.diameter) || 0)) / 1000);
    const effective = standardLength - lap;
    const fullBars = Math.ceil((len - standardLength) / effective);
    for (let i = 0; i < fullBars; i++) {
      bins.push({ capacity: 0, pieces: [{ ...piece, length: standardLength, spliced: true }] });
    }
    const last = +(len - fullBars * effective).toFixed(4);
    if (last > 0) packable.push({ ...piece, length: last, spliced: true });
  });
  packable.sort((a, b) => b.length - a.length);

  packable.forEach(piece => {
    const len = piece.length;

    // Find first bin that fits
    let placed = false;
    for (let i = 0; i < bins.length; i++) {
      if (bins[i].capacity >= len - 0.001) {
        bins[i].capacity = Math.max(0, +(bins[i].capacity - len).toFixed(4));
        bins[i].pieces.push(piece);
        placed = true;
        break;
      }
    }

    // If no bin fits, open new 12m bin
    if (!placed) {
      bins.push({
        capacity: Math.max(0, +(standardLength - len).toFixed(4)),
        pieces: [piece]
      });
    }
  });

  // Group bins into distinct repetitive cutting patterns
  const patternMap = {};
  bins.forEach(bin => {
    const pieceKeys = bin.pieces.map(p => `${p.length.toFixed(2)}m-${p.role}`).sort().join('|');
    if (!patternMap[pieceKeys]) {
      const usedLength = bin.pieces.reduce((s, p) => s + p.length, 0);
      const wasteLength = Math.max(0, +(standardLength - usedLength).toFixed(2));
      const wastePct = Math.max(0, +((wasteLength / standardLength) * 100).toFixed(1));
      patternMap[pieceKeys] = {
        key: pieceKeys,
        count: 0,
        pieces: bin.pieces,
        usedLength,
        wasteLength,
        wastePct
      };
    }
    patternMap[pieceKeys].count++;
  });

  const patterns = Object.values(patternMap).sort((a, b) => b.count - a.count);

  return {
    totalLonjor: bins.length,
    bins,
    patterns
  };
}

export function RebarCalculator() {
  const { 
    setActiveTab, 
    queueCalculatedItems, 
    showToast, 
    clusterUnits, 
    updateClusterUnits, 
    clusterTypology, 
    clusterRowUnits 
  } = useBoQ();
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_rb_cluster_mode', 'multiplied');

  // Elements list (each element has pokok, sengkang, and optional anchor)
  const [elements, setElements] = usePersistentState('sr_calc_rb_elements', []);

  // Form input states for new Element
  const [kode, setKode] = usePersistentState('sr_calc_rb_kode', '');
  const [tipeStruktur, setTipeStruktur] = usePersistentState('sr_calc_rb_tipe_struktur', 'kolom'); // 'kolom' | 'balok' | 'sloof' | 'lainnya'
  const [jmlElemen, setJmlElemen] = usePersistentState('sr_calc_rb_jml_elemen', '1');
  const [panjangElemen, setPanjangElemen] = usePersistentState('sr_calc_rb_panjang_elemen', ''); // meter
  const [inIsBoundary, setInIsBoundary] = usePersistentState('sr_calc_rb_is_boundary', false);

  // Tulangan Pokok
  const [pokokQty, setPokokQty] = usePersistentState('sr_calc_rb_pokok_qty', '4');
  const [pokokDia, setPokokDia] = usePersistentState('sr_calc_rb_pokok_dia', '13');
  const [pokokTipe, setPokokTipe] = usePersistentState('sr_calc_rb_pokok_tipe', 'ulir'); // 'polos' | 'ulir'
  const [pokokKait, setPokokKait] = usePersistentState('sr_calc_rb_pokok_kait', '0.4'); // meter (2 x kait / overlap)

  // Sengkang / Begel
  const [hasSengkang, setHasSengkang] = usePersistentState('sr_calc_rb_has_sengkang', true);
  const [sengkangP, setSengkangP] = usePersistentState('sr_calc_rb_sengkang_p', '15'); // cm
  const [sengkangL, setSengkangL] = usePersistentState('sr_calc_rb_sengkang_l', '20'); // cm
  const [sengkangJarak, setSengkangJarak] = usePersistentState('sr_calc_rb_sengkang_jarak', '15'); // cm
  const [sengkangDia, setSengkangDia] = usePersistentState('sr_calc_rb_sengkang_dia', '8'); // mm
  const [sengkangTipe, setSengkangTipe] = usePersistentState('sr_calc_rb_sengkang_tipe', 'polos'); // 'polos' | 'ulir'

  // Anchor / Stek Sloof-Kolom
  const [hasAnchor, setHasAnchor] = usePersistentState('sr_calc_rb_has_anchor', true);
  const [anchorFaktorTanam, setAnchorFaktorTanam] = usePersistentState('sr_calc_rb_anchor_tanam', '40'); // x D
  const [anchorFaktorLewatan, setAnchorFaktorLewatan] = usePersistentState('sr_calc_rb_anchor_lewatan', '40'); // x D

  // Optional Material Prices (Rp/kg)
  const [hargaPolos, setHargaPolos] = usePersistentState('sr_calc_rb_harga_polos', '');
  const [hargaUlir, setHargaUlir] = usePersistentState('sr_calc_rb_harga_ulir', '');
  const [hargaBendrat, setHargaBendrat] = usePersistentState('sr_calc_rb_harga_bendrat', '');
  const [koefBendrat, setKoefBendrat] = usePersistentState('sr_calc_rb_koef_bendrat', '0.015'); // 1.5% SNI 7394:2008

  // BoQ dispatch mode: 'kg' | 'lonjor'
  const [dispatchUnit, setDispatchUnit] = usePersistentState('sr_calc_rb_dispatch_unit', 'kg');
  const [bendratDispatchUnit, setBendratDispatchUnit] = usePersistentState('sr_calc_rb_bendrat_unit', 'kg'); // 'kg' | 'roll'
  const [sendBendrat, setSendBendrat] = usePersistentState('sr_calc_rb_send_bendrat', true);

  // Toggle Khusus: Gabungkan Sisa Potongan Lonjor 12m Pokok untuk Sengkang (jika diameter sama)
  const [combineMainAndStirrupWaste, setCombineMainAndStirrupWaste] = usePersistentState('sr_calc_rb_combine_waste', false);
  const [selectedGroups, setSelectedGroups] = usePersistentState('sr_calc_rb_selected_groups', {});
  const [expandedPatternGroups, setExpandedPatternGroups] = useState({});

  // Add Element Handler
  const handleAddElement = (e) => {
    e.preventDefault();
    const pElemen = parseNum(panjangElemen);
    const nElemen = parseInt(jmlElemen, 10) || 1;
    const nPokok = parseInt(pokokQty, 10) || 1;
    const dPokok = parseNum(pokokDia);
    const kPokok = parseNum(pokokKait);

    if (pElemen <= 0 || dPokok <= 0) {
      alert("Masukkan panjang struktur dan diameter tulangan pokok dengan benar.");
      return;
    }

    const elementId = Date.now();
    const cutPieces = [];

    // 1. Tulangan Pokok pieces
    const lenPokokSingle = pElemen + kPokok;
    const totalQtyPokok = nElemen * nPokok;
    cutPieces.push({
      id: `${elementId}-pokok`,
      role: 'Tulangan Pokok',
      type: pokokTipe,
      diameter: dPokok,
      length: lenPokokSingle,
      qty: totalQtyPokok
    });

    // 2. Sengkang pieces
    if (hasSengkang) {
      const sp = parseNum(sengkangP) / 100; // m
      const sl = parseNum(sengkangL) / 100; // m
      const sJarak = parseNum(sengkangJarak) / 100; // m
      const sDia = parseNum(sengkangDia);

      if (sp > 0 && sl > 0 && sJarak > 0 && sDia > 0) {
        const kaitSengkang = 2 * (10 * sDia / 1000); // 2 x 10D
        const lenSengkangSingle = (2 * (sp + sl)) + kaitSengkang;
        const nSengkangPerElemen = Math.floor(pElemen / sJarak) + 1;
        const totalQtySengkang = nSengkangPerElemen * nElemen;

        cutPieces.push({
          id: `${elementId}-sengkang`,
          role: 'Sengkang / Begel',
          type: sengkangTipe,
          diameter: sDia,
          length: lenSengkangSingle,
          qty: totalQtySengkang
        });
      }
    }

    // 3. Anchor / Stek Sloof-Kolom
    if (hasAnchor && tipeStruktur === 'kolom') {
      const fTanam = parseNum(anchorFaktorTanam) || 40;
      const fLewat = parseNum(anchorFaktorLewatan) || 40;
      const lenAnchorSingle = ((fTanam * dPokok) / 1000) + ((fLewat * dPokok) / 1000);
      const totalQtyAnchor = totalQtyPokok; // 1 anchor per tulangan pokok

      cutPieces.push({
        id: `${elementId}-anchor`,
        role: 'Stek / Anchor',
        type: pokokTipe,
        diameter: dPokok,
        length: lenAnchorSingle,
        qty: totalQtyAnchor
      });
    }

    const newElement = {
      id: elementId,
      kode: kode.trim() || `${tipeStruktur.toUpperCase()}-${elements.length + 1}`,
      tipeStruktur,
      jmlElemen: nElemen,
      panjangElemen: pElemen,
      isSharedBoundary: inIsBoundary,
      pokok: {
        qty: nPokok,
        diameter: dPokok,
        type: pokokTipe,
        lenSingle: lenPokokSingle
      },
      hasSengkang,
      hasAnchor: hasAnchor && tipeStruktur === 'kolom',
      cutPieces
    };

    setElements(prev => [...prev, newElement]);
    setKode('');
    setPanjangElemen('');
    setInIsBoundary(false);
  };

  const handleDeleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  const effectiveMultiplier = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
  const rowN = Math.max(2, clusterRowUnits || 4);
  const sharedRatio = (rowN + 1) / (2 * rowN);

  // Deteksi apakah ada elemen yang memiliki diameter tulangan pokok sama dengan sengkang
  const hasSameDiameterMainAndStirrup = useMemo(() => {
    return elements.some(el => {
      const pokok = el.cutPieces.find(p => p.role === 'Tulangan Pokok');
      const sengkang = el.cutPieces.find(p => p.role === 'Sengkang / Begel');
      return pokok && sengkang && pokok.diameter === sengkang.diameter && pokok.type === sengkang.type;
    });
  }, [elements]);

  // Grouping and Cutting Stock Calculations (scaled by cluster & shared wall ratio)
  const groupSummaries = useMemo(() => {
    const allCuts = [];
    elements.forEach(el => {
      const elMult = (clusterApplyMode === 'multiplied' && clusterTypology === 'shared' && el.isSharedBoundary)
        ? effectiveMultiplier * sharedRatio
        : effectiveMultiplier;

      el.cutPieces.forEach(p => {
        const scaledQty = Math.max(1, Math.round(p.qty * elMult));
        allCuts.push({
          ...p,
          qty: scaledQty
        });
      });
    });

    // Group by key:
    // Jika combineMainAndStirrupWaste AKTIF dan diameter sama: satukan dalam 1 grup FFD `${cut.type}::${cut.diameter}`
    // Jika NON-AKTIF: pisahkan tulangan pokok dan sengkang `${cut.type}::${cut.diameter}::${isStirrup ? 'sengkang' : 'pokok'}`
    const groups = {};

    allCuts.forEach(cut => {
      const isStirrup = cut.role && cut.role.includes('Sengkang');
      const key = combineMainAndStirrupWaste
        ? `${cut.type}::${cut.diameter}`
        : `${cut.type}::${cut.diameter}::${isStirrup ? 'sengkang' : 'pokok'}`;

      if (!groups[key]) {
        let labelName = '';
        if (combineMainAndStirrupWaste) {
          labelName = cut.type === 'ulir' 
            ? `D${cut.diameter} Ulir (Pokok + Sengkang)` 
            : `Ø${cut.diameter} Polos (Pokok + Sengkang)`;
        } else {
          const roleLabel = isStirrup ? 'Sengkang' : 'Tulangan Pokok';
          labelName = cut.type === 'ulir' 
            ? `D${cut.diameter} Ulir (${roleLabel})` 
            : `Ø${cut.diameter} Polos (${roleLabel})`;
        }

        groups[key] = {
          key,
          type: cut.type,
          diameter: cut.diameter,
          isCombined: combineMainAndStirrupWaste,
          roleGroup: isStirrup ? 'sengkang' : 'pokok',
          labelName,
          cuts: [],
          totalPanjang: 0,
          totalBerat: 0
        };
      }

      groups[key].cuts.push(cut);
      const pieceTotalM = cut.length * cut.qty;
      const weightPerM = calcRebarWeightPerM(cut.diameter);
      groups[key].totalPanjang += pieceTotalM;
      groups[key].totalBerat += pieceTotalM * weightPerM;
    });

    // Run FFD for each group
    const result = Object.values(groups).map(g => {
      const ffd = calculateFFD(g.cuts, 12);
      const theoreticalLonjor = g.totalPanjang / 12;
      const actualLonjor = ffd.totalLonjor;
      const totalWeightLonjor = actualLonjor * 12 * calcRebarWeightPerM(g.diameter);
      const wastePct = actualLonjor > 0 
        ? Math.max(0, ((actualLonjor * 12 - g.totalPanjang) / (actualLonjor * 12)) * 100)
        : 0;

      return {
        ...g,
        totalLonjor: actualLonjor,
        theoreticalLonjor,
        totalWeightLonjor,
        wastePct,
        bins: ffd.bins,
        patterns: ffd.patterns || []
      };
    });

    // Sort: Ulir first (desc dia), then Polos (desc dia)
    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'ulir' ? -1 : 1;
      return b.diameter - a.diameter;
    });

    return result;
  }, [elements, effectiveMultiplier, clusterApplyMode, clusterTypology, sharedRatio, combineMainAndStirrupWaste]);

  // Handle Send to BoQ
  const handleSendToBoQ = () => {
    if (groupSummaries.length === 0) {
      showToast("Tambahkan elemen struktur tulangan terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }

    const pPolos = parseNum(hargaPolos);
    const pUlir = parseNum(hargaUlir);
    const pBendrat = parseNum(hargaBendrat);

    const mult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
    const clusterSuffix = mult > 1 
      ? (clusterTypology === 'shared'
          ? ` [Total ${mult} Unit Cluster · Dinding Bersama]`
          : ` [Total ${mult} Unit Cluster · Dinding Ganda]`)
      : '';
    const itemsToSend = [];

    groupSummaries.forEach(g => {
      const isSelected = selectedGroups[g.key] !== false; // default true
      if (!isSelected) return;

      const unitPrice = g.type === 'ulir' ? pUlir : pPolos;
      const typeLabel = g.labelName || (g.type === 'ulir' ? `D${g.diameter} Ulir (BJTD)` : `Ø${g.diameter} Polos (BJTP)`);

      if (dispatchUnit === 'kg') {
        itemsToSend.push({
          category: 'struktur',
          label: `Besi Tulangan ${typeLabel}${clusterSuffix}`,
          satuan: 'Kg',
          jumlah: Math.round(g.totalBerat),
          harga: unitPrice,
          source: 'Kalkulator Tulangan Besi'
        });
      } else {
        // Lonjor / Batang 12m
        const pricePerBatang = unitPrice > 0 
          ? Math.round(unitPrice * (12 * calcRebarWeightPerM(g.diameter)))
          : 0;

        itemsToSend.push({
          category: 'struktur',
          label: `Besi Tulangan ${typeLabel} (Lonjor 12m)${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: g.totalLonjor,
          harga: pricePerBatang,
          source: 'Kalkulator Tulangan Besi (FFD 12m)'
        });
      }
    });

    // Kawat Bendrat
    if (sendBendrat && totalBendratKg > 0) {
      if (bendratDispatchUnit === 'roll') {
        const rollCount = Math.ceil(totalBendratKg / 20);
        itemsToSend.push({
          category: 'struktur',
          label: `Kawat Bendrat / Kawat Ikat Beton (Roll @20kg)${clusterSuffix}`,
          satuan: 'Roll',
          jumlah: rollCount,
          harga: pBendrat > 0 ? pBendrat * 20 : 500000,
          source: 'Kalkulator Tulangan Besi (Kemasan Roll Toko)'
        });
      } else {
        itemsToSend.push({
          category: 'struktur',
          label: `Kawat Bendrat / Kawat Ikat Beton${clusterSuffix}`,
          satuan: 'Kg',
          jumlah: +totalBendratKg.toFixed(2),
          harga: pBendrat,
          source: 'Kalkulator Tulangan Besi'
        });
      }
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu item tulangan / kawat bendrat dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      setElements([]);
    });
  };

  // Grand totals
  const grandTotalWeight = useMemo(() => {
    return groupSummaries.reduce((acc, g) => acc + g.totalBerat, 0);
  }, [groupSummaries]);

  const grandTotalLonjor = useMemo(() => {
    return groupSummaries.reduce((acc, g) => acc + g.totalLonjor, 0);
  }, [groupSummaries]);

  const totalBendratKg = useMemo(() => {
    const k = parseNum(koefBendrat) || 0.015;
    return grandTotalWeight * k;
  }, [grandTotalWeight, koefBendrat]);

  const totalBendratCost = useMemo(() => {
    const pBendrat = parseNum(hargaBendrat);
    return totalBendratKg * pBendrat;
  }, [totalBendratKg, hargaBendrat]);

  const grandTotalCost = useMemo(() => {
    const pPolos = parseNum(hargaPolos);
    const pUlir = parseNum(hargaUlir);
    const rebarCost = groupSummaries.reduce((acc, g) => {
      const price = g.type === 'ulir' ? pUlir : pPolos;
      return acc + (g.totalBerat * price);
    }, 0);
    return rebarCost + totalBendratCost;
  }, [groupSummaries, hargaPolos, hargaUlir, totalBendratCost]);

  const rebarHematShared = useMemo(() => {
    if (clusterTypology !== 'shared' || clusterApplyMode !== 'multiplied' || effectiveMultiplier <= 1) return 0;
    let doubleTotalWeight = 0;
    elements.forEach(el => {
      el.cutPieces.forEach(p => {
        const dblQty = p.qty * effectiveMultiplier;
        const pieceTotalM = p.length * dblQty;
        doubleTotalWeight += pieceTotalM * calcRebarWeightPerM(p.diameter);
      });
    });
    return Math.max(0, doubleTotalWeight - grandTotalWeight);
  }, [elements, clusterTypology, clusterApplyMode, effectiveMultiplier, grandTotalWeight]);

  return (
    <div className="space-y-6 pb-28 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-4 sm:p-7 border border-slate-800 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <Scissors className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">REINFORCING REBAR & CUTTING-STOCK</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all shadow-sm shrink-0 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke BoQ</span>
            </button>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-black tracking-tight text-white">
              Kalkulator Kebutuhan Tulangan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Hitung tulangan pokok, sengkang/begel, stek/anchor, dan kawat bendrat lengkap dengan optimasi pemotongan (Cutting-Stock FFD 12m).
            </p>
          </div>
        </div>
      </div>

      {/* REUSABLE CLUSTER MULTIPLIER TOOLBAR */}
      <ClusterMultiplierBar 
        multiplier={clusterUnits}
        onChange={updateClusterUnits}
        applyMode={clusterApplyMode}
        onToggleApplyMode={setClusterApplyMode}
        unitLabel="Unit Pembesian / Kavling"
      />

      {/* 01. INPUT ELEMEN STRUKTUR */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Tambah Elemen Struktur Tulangan
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Masukkan parameter struktur untuk menghitung tulangan pokok, sengkang, dan anchor sekaligus.
        </p>

        <form onSubmit={handleAddElement} className="space-y-4">
          
          {/* Main Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-xl bg-paper-50 border border-paper-200">
            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase font-mono mb-1">Kode / Label</label>
              <input
                type="text"
                value={kode}
                onChange={e => setKode(e.target.value)}
                placeholder="mis. K1 / B1"
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase font-mono mb-1">Tipe Struktur</label>
              <select
                value={tipeStruktur}
                onChange={e => setTipeStruktur(e.target.value)}
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 bg-white"
              >
                <option value="kolom">Kolom (dengan Stek/Anchor)</option>
                <option value="balok">Balok</option>
                <option value="sloof">Sloof</option>
                <option value="lainnya">Lainnya / Praktis</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase font-mono mb-1">Panjang Struktur (m)</label>
              <input
                type="number"
                step="0.01"
                value={panjangElemen}
                onChange={e => setPanjangElemen(e.target.value)}
                placeholder="mis. 4"
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase font-mono mb-1">Jumlah Elemen (Qty)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={jmlElemen}
                onChange={e => setJmlElemen(e.target.value)}
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 bg-white"
              />
            </div>
          </div>

          {/* Pilihan Posisi Tulangan Struktur: Mandiri vs Berhimpitan Batas Kavling */}
          <div className="p-3.5 rounded-2xl bg-paper-50 border border-paper-300 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-[11px] font-semibold text-paper-700 uppercase font-mono">
                Posisi Struktur Pembesian (Peruntukan):
              </label>
              {clusterTypology === 'shared' && (
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 self-start sm:self-auto">
                  Mode 1 Dinding Bersama Aktif
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setInIsBoundary(false)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  !inIsBoundary
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/50 shadow-sm'
                    : 'border-paper-200 bg-white hover:bg-paper-100 text-paper-700'
                }`}
              >
                <span className="text-xl leading-none mt-0.5">🏠</span>
                <div>
                  <div className="text-xs font-bold font-display text-paper-900">
                    Tulangan Struktur Dalam / Fasad
                  </div>
                  <p className="text-[11px] text-paper-600 mt-0.5 leading-snug">
                    Kolom praktis dalam, balok lantai, atau sloof interior. Dihitung 100% per unit untuk seluruh {effectiveMultiplier} unit cluster.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInIsBoundary(true)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  inIsBoundary
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/50 shadow-sm'
                    : 'border-paper-200 bg-white hover:bg-paper-100 text-paper-700'
                }`}
              >
                <span className="text-xl leading-none mt-0.5">🤝</span>
                <div>
                  <div className="text-xs font-bold font-display text-emerald-950 flex items-center gap-1.5">
                    <span>Tulangan Batas Kavling (Berhimpitan)</span>
                    {clusterTypology === 'shared' && (
                      <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                        Hemat {(((2 * rowN - (rowN + 1)) / (2 * rowN)) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                    Besi sloof atau kolom di as dinding pembatas samping yang menempel dengan rumah tetangga (berbagi struktur).
                  </p>
                </div>
              </button>
            </div>

            {/* Keterangan Gamblang & Contoh Angka Riil */}
            {inIsBoundary && (
              <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>💡 Mengapa jumlah besi elemen batas ini berkurang di Dinding Bersama?</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-emerald-800">
                  Karena dinding batas dibangun <strong>1 bidang bersama di as tengah</strong>, maka jalur sloof dan kolom praktis perbatasan tidak dibangun rangkap dua. Kebutuhan besi tulangan pokok dan begel untuk elemen ini otomatis dihemat hingga <strong>{(((2 * rowN - (rowN + 1)) / (2 * rowN)) * 100).toFixed(0)}%</strong> se-cluster.
                </p>
              </div>
            )}
          </div>

          {/* SECTION A: TULANGAN POKOK */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
            <span className="text-xs font-mono font-bold uppercase text-indigo-900 block mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> A. Tulangan Pokok (Utama)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Jumlah Tulangan Pokok</label>
                <input
                  type="number"
                  min="1"
                  value={pokokQty}
                  onChange={e => setPokokQty(e.target.value)}
                  placeholder="mis. 4"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Diameter (D mm)</label>
                <input
                  type="number"
                  step="1"
                  value={pokokDia}
                  onChange={e => setPokokDia(e.target.value)}
                  placeholder="mis. 13"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Tipe Besi</label>
                <select
                  value={pokokTipe}
                  onChange={e => setPokokTipe(e.target.value)}
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                >
                  <option value="ulir">Ulir (Deformed / BJTD)</option>
                  <option value="polos">Polos (Plain / BJTP)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kait / Penjangkaran (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={pokokKait}
                  onChange={e => setPokokKait(e.target.value)}
                  placeholder="0.4"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: SENGKANG / BEGEL */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="flex items-center justify-between mb-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono font-bold uppercase text-amber-900">
                <input
                  type="checkbox"
                  checked={hasSengkang}
                  onChange={e => setHasSengkang(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>B. Sengkang / Begel (Beugel)</span>
              </label>
            </div>

            {hasSengkang && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono animate-fadeIn">
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Panjang (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sengkangP}
                    onChange={e => setSengkangP(e.target.value)}
                    placeholder="mis. 15"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Lebar (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sengkangL}
                    onChange={e => setSengkangL(e.target.value)}
                    placeholder="mis. 20"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Jarak Sengkang (cm)</label>
                  <input
                    type="number"
                    step="1"
                    value={sengkangJarak}
                    onChange={e => setSengkangJarak(e.target.value)}
                    placeholder="mis. 15"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Diameter (Ø mm)</label>
                  <input
                    type="number"
                    step="1"
                    value={sengkangDia}
                    onChange={e => setSengkangDia(e.target.value)}
                    placeholder="mis. 8"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Tipe Besi</label>
                  <select
                    value={sengkangTipe}
                    onChange={e => setSengkangTipe(e.target.value)}
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  >
                    <option value="polos">Polos (BJTP)</option>
                    <option value="ulir">Ulir (BJTD)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: ANCHOR / STEK */}
          {tipeStruktur === 'kolom' && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono font-bold uppercase text-emerald-900 mb-2.5">
                <input
                  type="checkbox"
                  checked={hasAnchor}
                  onChange={e => setHasAnchor(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <span>C. Anchor / Stek Sloof–Kolom (Otomatis menyesuaikan Ø Pokok: D{pokokDia})</span>
              </label>

              {hasAnchor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono animate-fadeIn">
                  <div>
                    <label className="block text-[10px] text-paper-600 uppercase mb-1">Faktor Tanam ke Sloof (×D)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={anchorFaktorTanam}
                        onChange={e => setAnchorFaktorTanam(e.target.value)}
                        placeholder="40"
                        className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                      />
                      <span className="text-[11px] text-paper-500 whitespace-nowrap">
                        = {formatNumber((parseNum(anchorFaktorTanam) * parseNum(pokokDia)) / 1000, 2)} m
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 uppercase mb-1">Faktor Lewatan ke Kolom (×D)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={anchorFaktorLewatan}
                        onChange={e => setAnchorFaktorLewatan(e.target.value)}
                        placeholder="40"
                        className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                      />
                      <span className="text-[11px] text-paper-500 whitespace-nowrap">
                        = {formatNumber((parseNum(anchorFaktorLewatan) * parseNum(pokokDia)) / 1000, 2)} m
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-paper-900 hover:bg-paper-800 text-white font-display font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Elemen ke Daftar
          </button>
        </form>

        {/* Elements Table */}
        <div className="mt-5 border-t border-paper-200 pt-4 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-paper-300 text-paper-600 text-[11px] uppercase">
                <th className="py-2 px-3 font-sans">Kode / Tipe</th>
                <th className="py-2 px-3">Panjang & Qty</th>
                <th className="py-2 px-3">Tulangan Pokok</th>
                <th className="py-2 px-3">Sengkang</th>
                <th className="py-2 px-3">Stek/Anchor</th>
                <th className="py-2 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {elements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-paper-500 font-sans">
                    Belum ada elemen tulangan ditambahkan.
                  </td>
                </tr>
              ) : (
                elements.map(el => (
                  <tr key={el.id} className="hover:bg-paper-50">
                    <td className="py-2.5 px-3 font-sans font-bold text-paper-900">
                      {el.kode} <span className="text-[10px] font-normal text-paper-500 font-mono">({el.tipeStruktur})</span>
                      {el.isSharedBoundary && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🤝 As Bersama
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-paper-700">
                      {el.panjangElemen} m × {el.jmlElemen} unit
                    </td>
                    <td className="py-2.5 px-3 text-indigo-900 font-semibold">
                      {el.pokok.qty}× {el.pokok.type === 'ulir' ? 'D' : 'Ø'}{el.pokok.diameter} ({formatNumber(el.pokok.lenSingle, 2)} m)
                    </td>
                    <td className="py-2.5 px-3 text-amber-900">
                      {el.hasSengkang ? 'Ya (Aktif)' : '–'}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-900">
                      {el.hasAnchor ? 'Ya (Aktif)' : '–'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteElement(el.id)}
                        className="p-1 text-paper-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 02. REKAPITULASI KEBUTUHAN BESI (FFD & BERAT) */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
            <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
              Rekapitulasi Kebutuhan Besi Tulangan
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-800 px-2 py-1 rounded border border-indigo-200">
            Standard Bar = 12.00 m
          </span>
        </div>

        {groupSummaries.length === 0 ? (
          <p className="text-xs text-paper-500 font-sans italic py-4 text-center">
            Tambahkan minimal satu elemen struktur di atas untuk melihat rekapitulasi kebutuhan besi.
          </p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-paper-300 text-paper-600 text-[11px] uppercase bg-paper-50">
                  <th className="py-2.5 px-3">Tipe & Diameter</th>
                  <th className="py-2.5 px-3 text-right">Berat / Meter</th>
                  <th className="py-2.5 px-3 text-right">Total Panjang</th>
                  <th className="py-2.5 px-3 text-right">Total Berat</th>
                  <th className="py-2.5 px-3 text-right">Kebutuhan Lonjor (12m)</th>
                  <th className="py-2.5 px-3 text-right">Waste / Sisa Potong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {groupSummaries.map(g => {
                  const weightPerM = calcRebarWeightPerM(g.diameter);
                  const isUlir = g.type === 'ulir';

                  return (
                    <tr key={g.key} className="hover:bg-paper-50">
                      <td className="py-3 px-3 font-sans font-bold text-paper-900 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isUlir ? 'bg-indigo-600' : 'bg-amber-500'}`} />
                        <span>{isUlir ? `Besi Ulir D${g.diameter}` : `Besi Polos Ø${g.diameter}`}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-paper-600">{formatNumber(weightPerM, 3)} kg/m</td>
                      <td className="py-3 px-3 text-right text-paper-800 font-semibold">{formatNumber(g.totalPanjang, 2)} m</td>
                      <td className="py-3 px-3 text-right font-bold text-paper-900">{formatNumber(g.totalBerat, 2)} kg</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40">
                        {g.totalLonjor} <span className="text-[10px] font-normal text-emerald-600">btg</span>
                      </td>
                      <td className="py-3 px-3 text-right text-paper-600">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-paper-100 text-[10px] font-semibold">
                          {formatNumber(g.wastePct, 1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-paper-900 font-bold text-paper-900 bg-paper-50">
                  <td className="py-3 px-3 font-heading uppercase text-xs">
                    Total Pembesian {effectiveMultiplier > 1 && `(x${effectiveMultiplier} Unit Cluster)`}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right text-indigo-900 text-sm">{formatNumber(grandTotalWeight, 2)} kg</td>
                  <td className="py-3 px-3 text-right text-emerald-800 text-sm">{formatNumber(grandTotalLonjor)} batang</td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>

            {rebarHematShared > 0 && (
              <div className="mt-3 text-right text-xs font-mono text-emerald-700 font-bold">
                🎉 Penghematan Besi Dinding Bersama: -{formatNumber(rebarHematShared, 1)} kg tulangan
              </div>
            )}

            {/* Kawat Bendrat Summary Card */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-paper-900 uppercase">
                      Kebutuhan Kawat Bendrat (Kawat Ikat Beton)
                    </h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      SNI 7394:2008 (1.5%)
                    </span>
                  </div>
                  <p className="text-xs text-paper-600 font-sans mt-0.5">
                    Dihitung 1.5% dari total berat pembesian ({formatNumber(grandTotalWeight, 2)} kg).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right font-mono">
                <div>
                  <span className="text-[10px] uppercase text-paper-500 block">Kebutuhan Netto</span>
                  <span className="font-heading text-xl font-bold text-amber-900 block">
                    {formatNumber(totalBendratKg, 2)} <span className="text-xs font-sans font-normal text-paper-600">kg</span>
                  </span>
                </div>
                <div className="pl-4 border-l border-amber-300">
                  <span className="text-[10px] uppercase text-paper-500 block">Estimasi Roll (@20kg)</span>
                  <span className="font-mono text-sm font-bold text-paper-800 block">
                    ≈ {formatNumber(totalBendratKg / 20, 2)} roll
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ==================== TOGGLE & SMART REBAR CUT-LIST OPTIMIZER ==================== */}
      {groupSummaries.length > 0 && (
        <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6 space-y-5">
          
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-paper-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-900/20">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading font-black text-base sm:text-lg uppercase tracking-wide text-paper-900 flex items-center gap-2">
                  <span>Smart Rebar Cut-List Optimizer (12m)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    Panduan Mandor Besi
                  </span>
                </h2>
                <p className="text-xs text-paper-600">
                  Diagram pola pemotongan lonjor 12m untuk meminimalkan limbah potongan pendek (*waste*) di lapangan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper-100 hover:bg-paper-200 text-paper-800 text-xs font-semibold border border-paper-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Instruksi Mandor</span>
            </button>
          </div>

          {/* SAKLAR TOGGLE KHUSUS: PENGGABUNGAN SISA LONJOR UNTUK SENGKANG */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/60 border border-indigo-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 uppercase">
                    Optimasi Gabungan: Potong Sengkang dari Sisa Tulangan Utama
                  </span>
                  {hasSameDiameterMainAndStirrup ? (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Ukuran Sama Terdeteksi
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                      Diameter Pokok & Sengkang Berbeda
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gunakan sisa potongan lonjor 12m tulangan pokok untuk memotong sengkang/begel. 
                  <strong className="text-slate-900"> Hanya berlaku bila ukuran diameter besi sengkang sama dengan tulangan pokok</strong> (contoh: sama-sama Ø8mm atau Ø10mm).
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  disabled={!hasSameDiameterMainAndStirrup}
                  onClick={() => setCombineMainAndStirrupWaste(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                    combineMainAndStirrupWaste && hasSameDiameterMainAndStirrup ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={!hasSameDiameterMainAndStirrup ? 'Aktif hanya jika diameter besi sengkang sama dengan tulangan utama' : 'Klik untuk mengaktifkan'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      combineMainAndStirrupWaste && hasSameDiameterMainAndStirrup ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {combineMainAndStirrupWaste && hasSameDiameterMainAndStirrup ? 'Aktif (Digabung)' : 'Terpisah'}
                </span>
              </div>
            </div>

            {/* Keterangan Edukatif */}
            {!hasSameDiameterMainAndStirrup && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Informasi Teknis:</strong> Tulangan pokok dan sengkang saat ini menggunakan diameter berbeda (misal D10/D13 vs Ø8). Sisa potongan pokok tidak dapat dijadikan sengkang karena beda ukuran besi. Pemotongan otomatis dioptimalkan terpisah per masing-masing diameter.
                </span>
              </div>
            )}

            {hasSameDiameterMainAndStirrup && combineMainAndStirrupWaste && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Efisiensi Maksimal Aktif:</strong> Potongan sengkang otomatis disisipkan ke dalam sisa potongan lonjor 12m tulangan pokok. Sisa potongan terbuang ditekan hingga batas terendah (&lt; 2%)!
                </span>
              </div>
            )}
          </div>

          {/* VISUAL CUT-LIST DIAGRAM PER GRUP BESI */}
          <div className="space-y-4 pt-2">
            {groupSummaries.map((g, gIdx) => {
              const isUlir = g.type === 'ulir';
              const isExpanded = expandedPatternGroups[g.key] !== false; // default true

              return (
                <div 
                  key={g.key} 
                  className="rounded-2xl border border-paper-300 bg-paper-50/50 overflow-hidden"
                >
                  {/* Group Header */}
                  <div 
                    onClick={() => setExpandedPatternGroups(prev => ({ ...prev, [g.key]: !isExpanded }))}
                    className="p-3.5 sm:p-4 bg-white hover:bg-paper-100/80 cursor-pointer flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${isUlir ? 'bg-indigo-600' : 'bg-amber-500'}`} />
                      <div>
                        <h3 className="font-heading font-bold text-sm text-paper-900 flex items-center gap-2">
                          <span>{g.labelName}</span>
                          <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-paper-100 text-paper-700 border border-paper-200">
                            {g.totalLonjor} Lonjor 12m
                          </span>
                        </h3>
                        <p className="text-[11px] text-paper-600 font-mono">
                          Total Panjang Efektif: {formatNumber(g.totalPanjang, 2)}m &bull; Total Berat: {formatNumber(g.totalBerat, 2)} kg
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <span className="text-paper-500 text-[10px] uppercase block">Tingkat Limbah (Waste)</span>
                        <span className={`font-bold ${g.wastePct <= 3 ? 'text-emerald-700' : g.wastePct <= 8 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {formatNumber(g.wastePct, 1)}% ({formatNumber((g.totalLonjor * 12) - g.totalPanjang, 2)}m sisa)
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-paper-400" /> : <ChevronDown className="w-4 h-4 text-paper-400" />}
                    </div>
                  </div>

                  {/* Patterns Detail */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white">
                      {g.patterns && g.patterns.length > 0 ? (
                        g.patterns.map((pat, pIdx) => {
                          return (
                            <div key={pat.key || pIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              
                              {/* Pattern Title & Bar Summary */}
                              <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                                    Pola #{pIdx + 1}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    Gunakan untuk {pat.count} Lonjor 12m
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-600">
                                  Terpakai: <strong>{formatNumber(pat.usedLength, 2)}m</strong> &bull; Sisa Potongan: <strong className="text-amber-800">{formatNumber(pat.wasteLength, 2)}m ({pat.wastePct}%)</strong>
                                </span>
                              </div>

                              {/* Visual 12-Meter Segmented Bar */}
                              <div className="w-full h-8 rounded-xl bg-slate-200/90 border border-slate-300 overflow-hidden flex shadow-inner">
                                {pat.pieces.map((pc, pcIdx) => {
                                  const widthPct = (pc.length / 12) * 100;
                                  const isStirrup = pc.role && pc.role.includes('Sengkang');
                                  const isAnchor = pc.role && pc.role.includes('Stek');

                                  return (
                                    <div
                                      key={pcIdx}
                                      style={{ width: `${widthPct}%` }}
                                      className={`h-full border-r border-white/70 flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all hover:opacity-90 relative ${
                                        isStirrup 
                                          ? 'bg-emerald-600' 
                                          : isAnchor 
                                            ? 'bg-purple-600' 
                                            : 'bg-blue-600'
                                      }`}
                                      title={`${pc.role}: ${formatNumber(pc.length, 2)}m`}
                                    >
                                      <span className="truncate px-1">
                                        {formatNumber(pc.length, 2)}m
                                      </span>
                                    </div>
                                  );
                                })}

                                {/* Sisa Potongan (Limbah / Waste) */}
                                {pat.wasteLength > 0 && (
                                  <div
                                    style={{ width: `${(pat.wasteLength / 12) * 100}%` }}
                                    className="h-full bg-slate-300 text-slate-600 flex items-center justify-center text-[9px] font-mono italic"
                                    title={`Sisa potongan limbah: ${formatNumber(pat.wasteLength, 2)}m`}
                                  >
                                    <span className="truncate px-0.5">
                                      {pat.wasteLength >= 0.4 ? `Sisa ${formatNumber(pat.wasteLength, 2)}m` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Detail Instruksi Kerja Potong */}
                              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-700 pt-0.5">
                                <span className="font-semibold text-slate-500 font-mono text-[10px] uppercase">
                                  Instruksi Potong per Lonjor:
                                </span>
                                {Object.entries(
                                  pat.pieces.reduce((acc, p) => {
                                    const k = `${formatNumber(p.length, 2)}m (${p.role})`;
                                    acc[k] = (acc[k] || 0) + 1;
                                    return acc;
                                  }, {})
                                ).map(([label, count]) => (
                                  <span 
                                    key={label} 
                                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-800 shadow-2xs"
                                  >
                                    {count}x {label}
                                  </span>
                                ))}
                                {pat.wasteLength > 0 && (
                                  <span className="text-slate-500 font-mono text-[10px] italic">
                                    (sisa {formatNumber(pat.wasteLength, 2)}m)
                                  </span>
                                )}
                              </div>

                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada pola potongan untuk ditampilkan.</p>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 03. OPSIONAL: HARGA BAHAN YANG AKAN DIBELI */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
            <span>Harga Bahan yang Akan Dibeli</span>
            <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
              opsional untuk diisi (default 0)
            </span>
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Isi estimasi harga per kg untuk langsung menghitung anggaran dan memangkas waktu pengisian di BoQ.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Harga Besi Polos BJTP (Rp / kg)
            </label>
            <input
              type="number"
              min="0"
              value={hargaPolos}
              onChange={e => setHargaPolos(e.target.value)}
              placeholder="mis. 13800"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Harga Besi Ulir BJTD (Rp / kg)
            </label>
            <input
              type="number"
              min="0"
              value={hargaUlir}
              onChange={e => setHargaUlir(e.target.value)}
              placeholder="mis. 14500"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Harga Kawat Bendrat (Rp / kg)
            </label>
            <input
              type="number"
              min="0"
              value={hargaBendrat}
              onChange={e => setHargaBendrat(e.target.value)}
              placeholder="mis. 25000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {grandTotalCost > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-mono">
            <span className="text-xs font-semibold text-emerald-900 font-sans">Estimasi Total Biaya Pembelian Besi & Bendrat:</span>
            <span className="font-heading text-lg font-bold text-emerald-800">
              Rp {formatNumber(grandTotalCost, 0)}
            </span>
          </div>
        )}
      </div>

      {/* 04. KIRIM HASIL KE BOQ TOOLS */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-dashed border-indigo-400 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-indigo-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-indigo-900">
            Kirim Hasil ke BoQ Tools
          </h2>
        </div>
        <p className="text-xs text-indigo-900/80 mb-4 ml-8.5">
          Pilih format pengiriman satuan (Kg atau Lonjor 12m) dan centang kelompok tulangan / kawat bendrat yang ingin dimasukkan ke dalam antrian BoQ.
        </p>

        {/* Dispatch unit toggle */}
        <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-indigo-200 max-w-sm">
          <span className="text-xs font-semibold text-paper-700 font-sans">Satuan Pengiriman Besi:</span>
          <div className="flex gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setDispatchUnit('kg')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dispatchUnit === 'kg'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-paper-100 text-paper-700 hover:bg-paper-200'
              }`}
            >
              Kilogram (Kg)
            </button>
            <button
              type="button"
              onClick={() => setDispatchUnit('lonjor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dispatchUnit === 'lonjor'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-paper-100 text-paper-700 hover:bg-paper-200'
              }`}
            >
              Batang (12m)
            </button>
          </div>
        </div>

        {/* Checkbox list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-3.5 rounded-xl border border-indigo-200">
          {groupSummaries.length === 0 ? (
            <p className="text-xs text-paper-500 font-sans italic col-span-2">Belum ada item tulangan.</p>
          ) : (
            <>
              {groupSummaries.map(g => {
                const isUlir = g.type === 'ulir';
                const isChecked = selectedGroups[g.key] !== false;
                const valText = dispatchUnit === 'kg' 
                  ? `${formatNumber(g.totalBerat, 1)} kg` 
                  : `${g.totalLonjor} batang`;

                return (
                  <label key={g.key} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => setSelectedGroups(prev => ({ ...prev, [g.key]: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <span>
                      {isUlir ? `Besi Ulir D${g.diameter}` : `Besi Polos Ø${g.diameter}`} — <b className="font-mono text-indigo-900">{valText}</b>
                    </span>
                  </label>
                );
              })}

              {/* Kawat Bendrat Checkbox */}
              {totalBendratKg > 0 && (
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800 col-span-1 sm:col-span-2 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    checked={sendBendrat}
                    onChange={e => setSendBendrat(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      Kawat Bendrat — <b className="font-mono text-amber-900">{formatNumber(totalBendratKg, 2)} kg</b> ({Math.ceil(totalBendratKg / 20)} Roll)
                      <span className="inline-flex rounded bg-white p-0.5 border border-amber-300 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setBendratDispatchUnit('kg')}
                          className={`px-1.5 py-0.5 rounded font-bold ${bendratDispatchUnit === 'kg' ? 'bg-amber-600 text-white' : 'text-amber-900'}`}
                        >
                          Kg
                        </button>
                        <button
                          type="button"
                          onClick={() => setBendratDispatchUnit('roll')}
                          className={`px-1.5 py-0.5 rounded font-bold ${bendratDispatchUnit === 'roll' ? 'bg-amber-600 text-white' : 'text-amber-900'}`}
                        >
                          Roll (@20kg)
                        </button>
                      </span>
                    </span>
                    {parseNum(hargaBendrat) > 0 && (
                      <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        @{formatNumber(parseNum(hargaBendrat))} /kg
                      </span>
                    )}
                  </div>
                </label>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleSendToBoQ}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-display font-semibold text-xs shadow-md shadow-indigo-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Kirim yang Dicentang ke BoQ
        </button>
      </div>

    </div>
  );
}

