import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { WALL_DEFAULTS } from '../../data/calculatorConstants';
import { formatNumber, parseNum } from '../../utils/formatters';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';
import { 
  ArrowLeft, 
  SquareAsterisk, 
  Send, 
  Settings2, 
  RotateCcw, 
  Info, 
  Check, 
  ChevronDown,
  Layers,
  Paintbrush,
  DollarSign,
  Sparkles
} from 'lucide-react';

// Helper converter kg to sak 40kg
const sak = (kg) => Math.ceil((kg || 0) / 40);

export function WallCalculator() {
  const { 
    setActiveTab, 
    queueCalculatedItems, 
    showToast, 
    clusterUnits, 
    updateClusterUnits, 
    clusterTypology, 
    clusterRowUnits 
  } = useBoQ();

  const [luas, setLuas] = usePersistentState('sr_calc_wall_luas', '');
  const [luasPartyWall, setLuasPartyWall] = usePersistentState('sr_calc_wall_luas_party', '');
  const [jenisBata, setJenisBata] = usePersistentState('sr_calc_wall_jenis_bata', 'merah'); // 'merah' | 'ringan'
  const [koef, setKoef] = usePersistentState('sr_calc_wall_koef', { ...WALL_DEFAULTS });
  const [showSettings, setShowSettings] = useState(false);
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_wall_cluster_mode', 'multiplied');

  // Optional custom unit prices (Rp) - default 0
  const [hargaBata, setHargaBata] = usePersistentState('sr_calc_wall_harga_bata', '');
  const [hargaMortarSak, setHargaMortarSak] = usePersistentState('sr_calc_wall_harga_mortar_sak', '');
  const [hargaSemenSak, setHargaSemenSak] = usePersistentState('sr_calc_wall_harga_semen_sak', '');
  const [hargaPasirM3, setHargaPasirM3] = usePersistentState('sr_calc_wall_harga_pasir_m3', '');
  const [hargaCatLiter, setHargaCatLiter] = usePersistentState('sr_calc_wall_harga_cat', '');

  // Checkbox selection for BoQ dispatch
  const [sendBataPcs, setSendBataPcs] = usePersistentState('sr_calc_wall_send_bata_pcs', true);
  const [sendBataVol, setSendBataVol] = usePersistentState('sr_calc_wall_send_bata_vol', false);
  const [sendMortarBata, setSendMortarBata] = usePersistentState('sr_calc_wall_send_mortar_kg', false);
  const [sendMortarBataSak, setSendMortarBataSak] = usePersistentState('sr_calc_wall_send_mortar_sak', false);

  // 1 Sisi vs 2 Sisi Semen options
  const [sendSemen1Kg, setSendSemen1Kg] = usePersistentState('sr_calc_wall_send_semen1_kg', false);
  const [sendSemen1Sak, setSendSemen1Sak] = usePersistentState('sr_calc_wall_send_semen1_sak', false);
  const [sendSemen2Kg, setSendSemen2Kg] = usePersistentState('sr_calc_wall_send_semen2_kg', false);
  const [sendSemen2Sak, setSendSemen2Sak] = usePersistentState('sr_calc_wall_send_semen2_sak', true);

  // 1 Sisi vs 2 Sisi Pasir options
  const [sendPasir1, setSendPasir1] = usePersistentState('sr_calc_wall_send_pasir1', false);
  const [sendPasir2, setSendPasir2] = usePersistentState('sr_calc_wall_send_pasir2', true);

  // 1 Sisi vs 2 Sisi Cat options
  const [sendCat1Liter, setSendCat1Liter] = usePersistentState('sr_calc_wall_send_cat1_liter', false);
  const [sendCat1Kg, setSendCat1Kg] = usePersistentState('sr_calc_wall_send_cat1_kg', false);
  const [sendCat2Liter, setSendCat2Liter] = usePersistentState('sr_calc_wall_send_cat2_liter', false);
  const [sendCat2Kg, setSendCat2Kg] = usePersistentState('sr_calc_wall_send_cat2_kg', false);
  const [sendCatPail, setSendCatPail] = usePersistentState('sr_calc_wall_send_cat_pail', true);
  const [sendCatGalon, setSendCatGalon] = usePersistentState('sr_calc_wall_send_cat_galon', false);

  // Multiplier Factor & Shared Wall Calculation Logic
  const effectiveMultiplier = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
  const baseLuas = parseNum(luas);
  const partyWallVal = parseNum(luasPartyWall);
  const rowN = Math.max(2, clusterRowUnits || 4);
  const sharedWallRatio = (rowN + 1) / (2 * rowN); // e.g. row 4 -> 5/8 = 0.625

  let luasVal = baseLuas * effectiveMultiplier;
  let luasHematBata = 0;

  if (clusterTypology === 'shared' && effectiveMultiplier > 1 && partyWallVal > 0) {
    const internalLuasUnit = Math.max(0, baseLuas - partyWallVal);
    const partyWallTotalShared = partyWallVal * effectiveMultiplier * sharedWallRatio;
    const internalTotal = internalLuasUnit * effectiveMultiplier;
    luasVal = internalTotal + partyWallTotalShared;
    luasHematBata = (partyWallVal * effectiveMultiplier) - partyWallTotalShared;
  }

  // Mathematical calculations (exact preservation of formulas)
  const calc = useMemo(() => {
    const l = luasVal;
    let r = {};

    if (jenisBata === 'merah') {
      r.bataMerahJumlah = l * koef.bataMerahJumlah;
      r.semenSpesi = l * koef.bataMerahSemenSpesi;
      r.pasirSpesi = l * koef.bataMerahPasirSpesi;
      r.bataRinganVolume = 0;
      r.bataRinganJumlah = 0;
      r.mortarInstan = 0;
      r.bataVolume = r.bataMerahJumlah * 0.05 * 0.11 * 0.22;
    } else {
      r.bataRinganVolume = l * koef.bataRinganVolume;
      r.bataRinganJumlah = l * koef.bataRinganJumlah;
      r.mortarInstan = l * koef.bataRinganMortar;
      r.semenSpesi = 0;
      r.pasirSpesi = 0;
      r.bataMerahJumlah = 0;
      r.bataVolume = r.bataRinganVolume;
    }

    r.semenPlester1 = l * koef.plesterSemen;
    r.semenPlester2 = r.semenPlester1 * 2;
    r.pasirPlester1 = l * koef.plesterPasir;
    r.pasirPlester2 = r.pasirPlester1 * 2;

    r.semenAcian1 = l * koef.acianSemen;
    r.semenAcian2 = r.semenAcian1 * 2;

    const catPerSisiL = (l * koef.catLapis) / koef.catDayaSebar;
    r.catLiter1 = catPerSisiL;
    r.catLiter2 = catPerSisiL * 2;
    r.catKg1 = r.catLiter1 * koef.catKgPerLiter;
    r.catKg2 = r.catLiter2 * koef.catKgPerLiter;

    r.totalSemen1 = r.semenSpesi + r.semenPlester1 + r.semenAcian1;
    r.totalSemen2 = r.semenSpesi + r.semenPlester2 + r.semenAcian2;
    r.totalPasir1 = r.pasirSpesi + r.pasirPlester1;
    r.totalPasir2 = r.pasirSpesi + r.pasirPlester2;

    return r;
  }, [luasVal, jenisBata, koef]);

  const sak = (kg) => {
    if (!isFinite(kg) || kg <= 0) return 0;
    return Math.ceil(kg / koef.sakKg);
  };

  const handleResetKoef = () => {
    setKoef({ ...WALL_DEFAULTS });
  };

  const handleSendToBoQ = () => {
    if (luasVal <= 0) {
      showToast("Masukkan luas atau dimensi dinding (> 0 m²) terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }

    const pBata = parseNum(hargaBata);
    const pMortarSak = parseNum(hargaMortarSak);
    const pSemenSak = parseNum(hargaSemenSak);
    const pPasirM3 = parseNum(hargaPasirM3);
    const pCatLiter = parseNum(hargaCatLiter);
    const clusterSuffix = effectiveMultiplier > 1
      ? (clusterTypology === 'shared'
          ? ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Bersama]`
          : ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Ganda]`)
      : '';

    const itemsToSend = [];

    // Bata Pcs & Volume
    if (sendBataPcs) {
      if (jenisBata === 'merah') {
        const pcs = Math.ceil(calc.bataMerahJumlah);
        itemsToSend.push({
          category: 'dinding',
          label: `Bata Merah Standar${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: pcs,
          harga: parseNum(hargaBata) || 950,
          source: 'Kalkulator Dinding'
        });
      } else {
        const pcs = Math.ceil(calc.bataRinganJumlah);
        itemsToSend.push({
          category: 'dinding',
          label: `Bata Ringan Hebel (~10cm)${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: pcs,
          harga: parseNum(hargaBata) || 10500,
          source: 'Kalkulator Dinding'
        });
      }
    }

    if (sendBataVol && calc.bataVolume > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `${jenisBata === 'merah' ? 'Bata Merah (Volume)' : 'Bata Ringan Hebel (Volume)'}${clusterSuffix}`,
        satuan: 'm³',
        jumlah: +calc.bataVolume.toFixed(3),
        harga: parseNum(hargaBata) || (jenisBata === 'merah' ? 650000 : 750000),
        source: 'Kalkulator Dinding'
      });
    }

    // Mortar Perekat Bata Ringan
    if (jenisBata === 'ringan') {
      if (sendMortarBata && calc.mortarInstan > 0) {
        itemsToSend.push({
          category: 'dinding',
          label: `Mortar Perekat Bata Ringan${clusterSuffix}`,
          satuan: 'Kg',
          jumlah: Math.round(calc.mortarInstan),
          harga: pMortarSak > 0 ? Math.round(pMortarSak / 40) : 0,
          source: 'Kalkulator Dinding'
        });
      }
      if (sendMortarBataSak && calc.mortarInstan > 0) {
        itemsToSend.push({
          category: 'dinding',
          label: `Mortar Perekat Bata Ringan${clusterSuffix}`,
          satuan: 'Sak',
          jumlah: sak(calc.mortarInstan),
          harga: pMortarSak,
          source: 'Kalkulator Dinding'
        });
      }
    }

    // Semen 1 Sisi vs 2 Sisi
    if (sendSemen1Kg && calc.totalSemen1 > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `Semen Portland (plester+acian, 1 sisi)${clusterSuffix}`,
        satuan: 'Kg',
        jumlah: Math.round(calc.totalSemen1),
        harga: pSemenSak > 0 ? Math.round(pSemenSak / 40) : 0,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendSemen1Sak && calc.totalSemen1 > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `Semen Portland (plester+acian, 1 sisi)${clusterSuffix}`,
        satuan: 'Sak',
        jumlah: sak(calc.totalSemen1),
        harga: pSemenSak,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendSemen2Kg && calc.totalSemen2 > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `Semen Portland (plester+acian, 2 sisi)${clusterSuffix}`,
        satuan: 'Kg',
        jumlah: Math.round(calc.totalSemen2),
        harga: pSemenSak > 0 ? Math.round(pSemenSak / 40) : 0,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendSemen2Sak && calc.totalSemen2 > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `Semen Portland (plester+acian, 2 sisi)${clusterSuffix}`,
        satuan: 'Sak',
        jumlah: sak(calc.totalSemen2),
        harga: pSemenSak,
        source: 'Kalkulator Dinding'
      });
    }

    // Pasir 1 Sisi vs 2 Sisi
    if (sendPasir1 && calc.totalPasir1 > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `Pasir Pasang (plester, 1 sisi)${clusterSuffix}`,
        satuan: 'm³',
        jumlah: +calc.totalPasir1.toFixed(3),
        harga: pPasirM3,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendPasir2 && calc.totalPasir2 > 0) {
      itemsToSend.push({
        category: 'dinding',
        label: `Pasir Pasang (plester, 2 sisi)${clusterSuffix}`,
        satuan: 'm³',
        jumlah: +calc.totalPasir2.toFixed(3),
        harga: pPasirM3,
        source: 'Kalkulator Dinding'
      });
    }

    // Cat 1 Sisi vs 2 Sisi
    if (sendCat1Liter && calc.catLiter1 > 0) {
      itemsToSend.push({
        category: 'finishing',
        label: `Cat Tembok (1 sisi)${clusterSuffix}`,
        satuan: 'Liter',
        jumlah: Math.round(calc.catLiter1),
        harga: pCatLiter,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendCat1Kg && calc.catKg1 > 0) {
      itemsToSend.push({
        category: 'finishing',
        label: `Cat Tembok (1 sisi)${clusterSuffix}`,
        satuan: 'Kg',
        jumlah: Math.round(calc.catKg1),
        harga: pCatLiter > 0 ? Math.round(pCatLiter / 1.3) : 0,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendCat2Liter && calc.catLiter2 > 0) {
      itemsToSend.push({
        category: 'finishing',
        label: `Cat Tembok (2 sisi)${clusterSuffix}`,
        satuan: 'Liter',
        jumlah: Math.round(calc.catLiter2),
        harga: pCatLiter,
        source: 'Kalkulator Dinding'
      });
    }
    if (sendCat2Kg && calc.catKg2 > 0) {
      itemsToSend.push({
        category: 'finishing',
        label: `Cat Tembok (2 sisi)${clusterSuffix}`,
        satuan: 'Kg',
        jumlah: Math.round(calc.catKg2),
        harga: pCatLiter > 0 ? Math.round(pCatLiter / 1.3) : 0,
        source: 'Kalkulator Dinding'
      });
    }

    // Cat Kemasan Toko (Pail @20kg & Galon @5kg)
    if (sendCatPail && calc.catKg2 > 0) {
      const pailCount = Math.ceil(calc.catKg2 / 20);
      itemsToSend.push({
        category: 'finishing',
        label: `Cat Tembok Dinding 2 Sisi (Pail @20kg)${clusterSuffix}`,
        satuan: 'Pail',
        jumlah: pailCount,
        harga: parseNum(hargaCatLiter) || 650000,
        source: 'Kalkulator Dinding (Kemasan Pail 20kg)'
      });
    }

    if (sendCatGalon && calc.catKg2 > 0) {
      const galonCount = Math.ceil(calc.catKg2 / 5);
      itemsToSend.push({
        category: 'finishing',
        label: `Cat Tembok Dinding 2 Sisi (Galon @5kg)${clusterSuffix}`,
        satuan: 'Galon',
        jumlah: galonCount,
        harga: parseNum(hargaCatLiter) || 175000,
        source: 'Kalkulator Dinding (Kemasan Galon 5kg)'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu bahan dinding dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      setLuas('');
    });
  };

  return (
    <div className="space-y-6 pb-28 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-4 sm:p-7 border border-slate-800 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">WALL & MASONRY STRUCTURE</span>
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
              Kalkulator Material Dinding & Plesteran
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Kebutuhan semen spesi, pasir pasang, bata merah/hebel, mortar instan, plesteran, acian, dan cat tembok (1 sisi & 2 sisi).
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
        unitLabel="Unit Dinding / Kavling"
      />

      {/* 01. INPUT LUAS & PILIH JENIS BATA */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Input Luas & Pasangan Bata
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Luas Dinding */}
          <div>
            <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1.5">
              Luas Bidang Dinding
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                step="0.01"
                min="0"
                value={luas}
                onChange={e => setLuas(e.target.value)}
                placeholder="mis. 45"
                className="w-full p-3 text-lg font-mono font-bold rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-terracotta-500 bg-paper-50 focus:bg-white text-paper-900"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-paper-500">m²</span>
            </div>
          </div>

          {/* Segmented Jenis Bata */}
          <div>
            <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1.5">
              Pilih Material Pasangan
            </label>
            <div className="inline-flex p-1 rounded-xl bg-paper-100 border border-paper-300">
              <button
                type="button"
                onClick={() => setJenisBata('merah')}
                className={`px-4 py-2 rounded-lg text-xs font-display font-bold transition-all ${
                  jenisBata === 'merah'
                    ? 'bg-terracotta-600 text-white shadow-sm'
                    : 'text-paper-700 hover:text-paper-900'
                }`}
              >
                🧱 Bata Merah (5×11×22)
              </button>
              <button
                type="button"
                onClick={() => setJenisBata('ringan')}
                className={`px-4 py-2 rounded-lg text-xs font-display font-bold transition-all ${
                  jenisBata === 'ringan'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-paper-700 hover:text-paper-900'
                }`}
              >
                🏢 Bata Ringan / Hebel (10cm)
              </button>
            </div>
          </div>
        </div>

        {/* Sub-panel Dinding Bersama / Shared Wall */}
        {clusterTypology === 'shared' && effectiveMultiplier > 1 && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">🤝</span>
                <span className="text-xs font-heading font-bold text-emerald-950 uppercase tracking-wide">
                  Parameter Dinding Pembatas Bersama (Shared / Party Wall)
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 font-bold">
                Deret: {rowN} Unit / Blok · Rasio Batas: {(sharedWallRatio * 100).toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-emerald-900 font-mono mb-1">
                  Luas Dinding Pembatas Samping per Unit (m²)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={luasPartyWall}
                    onChange={e => setLuasPartyWall(e.target.value)}
                    placeholder="mis. 40 (dinding batas kiri & kanan)"
                    className="w-full p-2.5 text-sm font-mono font-bold rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-950"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-600">m²/unit</span>
                </div>
                <p className="text-[10.5px] text-emerald-700 mt-1 leading-snug">
                  Dinding batas antar-unit hanya dibangun 1 bidang di as kavling (bukan rangkap 2 dinding).
                </p>
              </div>

              <div className="sm:col-span-6 bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-xs space-y-1 text-xs">
                <div className="flex justify-between font-mono text-paper-600 text-[11px]">
                  <span>Total Bata Dinding Ganda:</span>
                  <span className="font-bold">{(baseLuas * effectiveMultiplier).toFixed(1)} m²</span>
                </div>
                <div className="flex justify-between font-mono text-emerald-800 font-bold">
                  <span>Total Bata Dinding Bersama:</span>
                  <span className="text-emerald-700 font-bold">{luasVal.toFixed(1)} m²</span>
                </div>
                {luasHematBata > 0 && (
                  <div className="flex justify-between font-mono text-emerald-700 font-bold pt-1 border-t border-emerald-100 text-[11.5px]">
                    <span>🎉 Penghematan Pasangan Bata:</span>
                    <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-black">
                      - {luasHematBata.toFixed(1)} m² ({((luasHematBata / (baseLuas * effectiveMultiplier)) * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live SVG Brick Pattern Visualizer */}
        <div className="mt-5 pt-4 border-t border-paper-200">
          <div className="flex items-center justify-between text-xs font-mono text-paper-600 mb-2">
            <span className="font-semibold uppercase tracking-wider">Pratinjau Pola Pasangan:</span>
            <span>{jenisBata === 'merah' ? 'Ukuran Standar 5×11×22 cm' : 'Ukuran Standar 60×20×10 cm'}</span>
          </div>
          
          <div className="h-16 rounded-xl overflow-hidden border border-paper-300 bg-paper-200">
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <pattern 
                id="brick-pattern" 
                width={jenisBata === 'merah' ? "48" : "96"} 
                height={jenisBata === 'merah' ? "20" : "32"} 
                patternUnits="userSpaceOnUse"
              >
                {/* Row 1 */}
                <rect 
                  x="1" y="1" 
                  width={jenisBata === 'merah' ? "46" : "94"} 
                  height={jenisBata === 'merah' ? "8" : "14"} 
                  rx="1" 
                  fill={jenisBata === 'merah' ? "#B5451B" : "#64748B"} 
                />
                {/* Row 2 (offset) */}
                <rect 
                  x={jenisBata === 'merah' ? "-22" : "-46"} 
                  y={jenisBata === 'merah' ? "11" : "17"} 
                  width={jenisBata === 'merah' ? "46" : "94"} 
                  height={jenisBata === 'merah' ? "8" : "14"} 
                  rx="1" 
                  fill={jenisBata === 'merah' ? "#9A3B18" : "#566477"} 
                />
                <rect 
                  x={jenisBata === 'merah' ? "26" : "50"} 
                  y={jenisBata === 'merah' ? "11" : "17"} 
                  width={jenisBata === 'merah' ? "46" : "94"} 
                  height={jenisBata === 'merah' ? "8" : "14"} 
                  rx="1" 
                  fill={jenisBata === 'merah' ? "#9A3B18" : "#566477"} 
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#brick-pattern)" />
            </svg>
          </div>
        </div>
      </div>

      {/* 02. STATS PASANGAN BATA & SPESI */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            {jenisBata === 'merah' ? 'Bata Merah & Spesi Pasangan' : 'Bata Ringan & Mortar Perekat'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {jenisBata === 'merah' ? (
            <>
              <div className="p-4 rounded-xl bg-terracotta-50 border border-terracotta-300 text-terracotta-950">
                <span className="text-[10px] font-mono uppercase font-bold text-terracotta-700">Jumlah Bata Merah</span>
                <span className="font-heading text-2xl font-bold block my-1 text-terracotta-900">
                  {luasVal > 0 ? formatNumber(Math.ceil(calc.bataMerahJumlah)) : '–'} <span className="text-sm font-sans font-medium text-terracotta-700">buah</span>
                </span>
                <span className="text-[10px] text-terracotta-700 font-mono">Ukuran 5×11×22 cm (70 bh/m²)</span>
              </div>

              <div className="p-4 rounded-xl bg-paper-900 text-white">
                <span className="text-[10px] font-mono uppercase font-bold text-paper-300">Semen Spesi Pasangan</span>
                <span className="font-heading text-2xl font-bold block my-1">
                  {luasVal > 0 ? formatNumber(calc.semenSpesi) : '–'} <span className="text-sm font-sans font-medium text-paper-300">kg</span>
                </span>
                <span className="text-[10px] text-paper-300 font-mono">≈ {sak(calc.semenSpesi)} sak @ 40 kg</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-700">Pasir Spesi Pasangan</span>
                <span className="font-heading text-2xl font-bold block my-1 text-amber-900">
                  {luasVal > 0 ? formatNumber(calc.pasirSpesi, 3) : '–'} <span className="text-sm font-sans font-medium text-amber-700">m³</span>
                </span>
                <span className="text-[10px] text-amber-700 font-mono">Campuran 1PC : 4PP</span>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-900">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-600">Volume Bata Ringan</span>
                <span className="font-heading text-2xl font-bold block my-1 text-slate-900">
                  {luasVal > 0 ? formatNumber(calc.bataRinganVolume, 3) : '–'} <span className="text-sm font-sans font-medium text-slate-600">m³</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Asumsi tebal 10 cm</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-900">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-600">Jumlah Bata Ringan</span>
                <span className="font-heading text-2xl font-bold block my-1 text-slate-900">
                  {luasVal > 0 ? formatNumber(Math.ceil(calc.bataRinganJumlah)) : '–'} <span className="text-sm font-sans font-medium text-slate-600">buah</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ukuran 60×20×10 cm</span>
              </div>

              <div className="p-4 rounded-xl bg-paper-900 text-white">
                <span className="text-[10px] font-mono uppercase font-bold text-paper-300">Mortar Instan Perekat</span>
                <span className="font-heading text-2xl font-bold block my-1">
                  {luasVal > 0 ? formatNumber(calc.mortarInstan) : '–'} <span className="text-sm font-sans font-medium text-paper-300">kg</span>
                </span>
                <span className="text-[10px] text-paper-300 font-mono">≈ {sak(calc.mortarInstan)} sak @ 40 kg</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 03. PLESTERAN, ACIAN, & CAT */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Plesteran, Acian, dan Pengecatan (1 Sisi & 2 Sisi)
          </h2>
        </div>

        {/* Plesteran */}
        <div className="p-4 rounded-xl bg-paper-50 border border-paper-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase text-paper-800 tracking-wider">
              Plesteran Dinding (1PC : 5PP, Tebal 15 mm)
            </span>
          </div>
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-paper-300 text-paper-500 text-[10.5px]">
                <th className="py-1.5 font-sans">Komponen</th>
                <th className="py-1.5 text-right">1 Sisi</th>
                <th className="py-1.5 text-right font-bold text-blueprint-800">2 Sisi (Luar & Dalam)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              <tr>
                <td className="py-2 font-sans font-semibold text-paper-900">Semen Plester</td>
                <td className="py-2 text-right">{luasVal > 0 ? formatNumber(calc.semenPlester1) + ' kg' : '–'}</td>
                <td className="py-2 text-right font-bold text-blueprint-800">{luasVal > 0 ? formatNumber(calc.semenPlester2) + ' kg' : '–'}</td>
              </tr>
              <tr>
                <td className="py-2 font-sans font-semibold text-paper-900">Pasir Plester</td>
                <td className="py-2 text-right">{luasVal > 0 ? formatNumber(calc.pasirPlester1, 3) + ' m³' : '–'}</td>
                <td className="py-2 text-right font-bold text-blueprint-800">{luasVal > 0 ? formatNumber(calc.pasirPlester2, 3) + ' m³' : '–'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Acian & Cat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Acian */}
          <div className="p-4 rounded-xl bg-paper-50 border border-paper-200">
            <span className="text-xs font-mono font-bold uppercase text-paper-800 tracking-wider block mb-2">
              Acian Semen
            </span>
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-paper-300 text-paper-500 text-[10.5px]">
                  <th className="py-1.5 font-sans">Komponen</th>
                  <th className="py-1.5 text-right">1 Sisi</th>
                  <th className="py-1.5 text-right font-bold text-blueprint-800">2 Sisi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-sans font-semibold text-paper-900">Semen Acian</td>
                  <td className="py-2 text-right">{luasVal > 0 ? formatNumber(calc.semenAcian1) + ' kg' : '–'}</td>
                  <td className="py-2 text-right font-bold text-blueprint-800">{luasVal > 0 ? formatNumber(calc.semenAcian2) + ' kg' : '–'}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-paper-500 font-sans mt-2">
              Acian murni hanya semen dan air tanpa pasir.
            </p>
          </div>

          {/* Cat Tembok */}
          <div className="p-4 rounded-xl bg-paper-50 border border-paper-200">
            <span className="text-xs font-mono font-bold uppercase text-paper-800 tracking-wider block mb-2 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-terracotta-600" /> Cat Tembok (2 Lapis)
            </span>
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-paper-300 text-paper-500 text-[10.5px]">
                  <th className="py-1.5 font-sans">Kebutuhan</th>
                  <th className="py-1.5 text-right">1 Sisi</th>
                  <th className="py-1.5 text-right font-bold text-terracotta-800">2 Sisi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-sans font-semibold text-paper-900">Volume Cat</td>
                  <td className="py-2 text-right">{luasVal > 0 ? formatNumber(calc.catLiter1) + ' L' : '–'}</td>
                  <td className="py-2 text-right font-bold text-terracotta-800">{luasVal > 0 ? formatNumber(calc.catLiter2) + ' L' : '–'}</td>
                </tr>
                <tr>
                  <td className="py-1 text-paper-500 font-sans">Berat Setara</td>
                  <td className="py-1 text-right text-paper-600">{luasVal > 0 ? '≈ ' + formatNumber(calc.catKg1) + ' kg' : '–'}</td>
                  <td className="py-1 text-right text-paper-600">{luasVal > 0 ? '≈ ' + formatNumber(calc.catKg2) + ' kg' : '–'}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Ringkasan Total Semen & Pasir */}
        <div className="pt-4 border-t border-paper-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blueprint-900 text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest text-blueprint-300 font-bold block mb-1">
              Total Semen (Spesi + Plester + Acian)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-xs text-blueprint-300 block font-mono">1 Sisi:</span>
                <span className="font-mono text-base font-bold">{luasVal > 0 ? formatNumber(calc.totalSemen1) + ' kg' : '–'}</span>
                <span className="text-[10px] text-blueprint-300 font-mono block">({sak(calc.totalSemen1)} sak)</span>
              </div>
              <div className="text-right border-l border-blueprint-700 pl-4">
                <span className="text-xs text-amber-300 block font-mono font-bold">2 Sisi:</span>
                <span className="font-mono text-xl font-bold text-white">{luasVal > 0 ? formatNumber(calc.totalSemen2) + ' kg' : '–'}</span>
                <span className="text-[11px] text-amber-300 font-mono font-semibold block">({sak(calc.totalSemen2)} sak)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-bold block mb-1">
              Total Pasir (Spesi + Plester)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-xs text-amber-700 block font-mono">1 Sisi:</span>
                <span className="font-mono text-base font-bold text-amber-950">{luasVal > 0 ? formatNumber(calc.totalPasir1, 3) + ' m³' : '–'}</span>
              </div>
              <div className="text-right border-l border-amber-300 pl-4">
                <span className="text-xs text-amber-800 block font-mono font-bold">2 Sisi:</span>
                <span className="font-mono text-xl font-bold text-amber-950">{luasVal > 0 ? formatNumber(calc.totalPasir2, 3) + ' m³' : '–'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 04. HARGA SATUAN BAHAN */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
            <span>Harga Satuan Bahan</span>
            <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
              opsional untuk diisi (default 0)
            </span>
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Isi harga satuan bahan di bawah ini jika ingin langsung menghitung nilai anggaran dan diteruskan ke BoQ.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              {sendBataVol 
                ? (jenisBata === 'merah' ? 'Bata Merah (Rp/m³)' : 'Bata Ringan (Rp/m³)')
                : (jenisBata === 'merah' ? 'Bata Merah (Rp/Buah)' : 'Bata Ringan (Rp/Buah)')}
            </label>
            <input
              type="number"
              min="0"
              value={hargaBata}
              onChange={e => setHargaBata(e.target.value)}
              placeholder={sendBataVol
                ? (jenisBata === 'merah' ? "mis. 650000" : "mis. 750000")
                : (jenisBata === 'merah' ? "mis. 950" : "mis. 10500")}
              className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {jenisBata === 'ringan' && (
            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Mortar (Rp/sak 40kg)</label>
              <input
                type="number"
                min="0"
                value={hargaMortarSak}
                onChange={e => setHargaMortarSak(e.target.value)}
                placeholder="mis. 85000"
                className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Semen (Rp/sak 40kg)</label>
            <input
              type="number"
              min="0"
              value={hargaSemenSak}
              onChange={e => setHargaSemenSak(e.target.value)}
              placeholder="mis. 65000"
              className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Pasir Pasang (Rp/m³)</label>
            <input
              type="number"
              min="0"
              value={hargaPasirM3}
              onChange={e => setHargaPasirM3(e.target.value)}
              placeholder="mis. 380000"
              className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              {sendCatPail ? 'Cat Tembok (Rp/Pail @20kg)' : (sendCatGalon ? 'Cat Tembok (Rp/Galon @5kg)' : 'Cat Tembok (Rp/L)')}
            </label>
            <input
              type="number"
              min="0"
              value={hargaCatLiter}
              onChange={e => setHargaCatLiter(e.target.value)}
              placeholder={sendCatPail ? 'mis. 650000' : (sendCatGalon ? 'mis. 175000' : 'mis. 45000')}
              className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 05. PENGATURAN KOEFISIEN (SNI STANDAR) */}
      <div className="rounded-3xl bg-white border border-paper-300 shadow-sm mb-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSettings(prev => !prev)}
          className="w-full p-4 text-left flex items-center justify-between bg-paper-50 hover:bg-paper-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-paper-700" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-paper-800">
              Pengaturan Koefisien Analisa (SNI Standar)
            </span>
          </div>
          <div className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4 text-paper-600" />
          </div>
        </button>

        {showSettings && (
          <div className="p-5 border-t border-paper-200 space-y-4 animate-fadeIn">
            <p className="text-xs text-paper-600 leading-relaxed">
              Nilai di bawah ini adalah koefisien standar per m² (SNI 2837:2008 untuk plesteran/acian, SNI 6897:2008 untuk pasangan bata merah, dan data AHSP teknis). Anda dapat menyesuaikan bila memiliki spesifikasi khusus.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Jumlah Bata Merah (bh/m²)</label>
                <input
                  type="number"
                  value={koef.bataMerahJumlah}
                  onChange={e => setKoef(prev => ({ ...prev, bataMerahJumlah: parseNum(e.target.value) }))}
                  className="w-full p-2 font-mono rounded-lg border border-paper-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Semen Spesi Bata (kg/m²)</label>
                <input
                  type="number"
                  value={koef.bataMerahSemenSpesi}
                  onChange={e => setKoef(prev => ({ ...prev, bataMerahSemenSpesi: parseNum(e.target.value) }))}
                  className="w-full p-2 font-mono rounded-lg border border-paper-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Pasir Spesi Bata (m³/m²)</label>
                <input
                  type="number"
                  value={koef.bataMerahPasirSpesi}
                  onChange={e => setKoef(prev => ({ ...prev, bataMerahPasirSpesi: parseNum(e.target.value) }))}
                  className="w-full p-2 font-mono rounded-lg border border-paper-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Mortar Bata Ringan (kg/m²)</label>
                <input
                  type="number"
                  value={koef.bataRinganMortar}
                  onChange={e => setKoef(prev => ({ ...prev, bataRinganMortar: parseNum(e.target.value) }))}
                  className="w-full p-2 font-mono rounded-lg border border-paper-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Semen Plester / sisi (kg/m²)</label>
                <input
                  type="number"
                  value={koef.plesterSemen}
                  onChange={e => setKoef(prev => ({ ...prev, plesterSemen: parseNum(e.target.value) }))}
                  className="w-full p-2 font-mono rounded-lg border border-paper-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Semen Acian / sisi (kg/m²)</label>
                <input
                  type="number"
                  value={koef.acianSemen}
                  onChange={e => setKoef(prev => ({ ...prev, acianSemen: parseNum(e.target.value) }))}
                  className="w-full p-2 font-mono rounded-lg border border-paper-300"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetKoef}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-400 text-paper-700 hover:bg-paper-100 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Kembalikan ke Default SNI
            </button>
          </div>
        )}
      </div>

      {/* 06. KIRIM KE BOQ DENGAN OPSI LENGKAP 1 SISI & 2 SISI */}
      <div className="rounded-2xl bg-gradient-to-br from-terracotta-50 to-orange-50 border-2 border-dashed border-terracotta-400 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-terracotta-700 text-white font-mono text-xs font-bold flex items-center justify-center">06</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-terracotta-900">
            Kirim Hasil ke BoQ Tools (Pilih 1 Sisi atau 2 Sisi)
          </h2>
        </div>
        <p className="text-xs text-terracotta-800/80 mb-4 ml-8.5">
          Centang item yang ingin dimasukkan sebagai usulan volume ke dalam proyek BoQ Anda. Harga satuan yang Anda isi di langkah 04 akan otomatis terbawa ke BoQ.
        </p>

        <div className="space-y-4 mb-5">
          
          {/* Kelompok Bata */}
          <div className="bg-white p-3.5 rounded-xl border border-terracotta-200">
            <span className="text-[11px] font-mono font-bold uppercase text-terracotta-800 block mb-2">
              1. Material Pasangan Bata
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendBataPcs}
                  onChange={e => setSendBataPcs(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>
                  {jenisBata === 'merah' ? 'Bata Merah (Buah)' : 'Bata Ringan (Buah)'} — <b className="font-mono text-terracotta-900">
                    {luasVal > 0 ? formatNumber(Math.ceil(jenisBata === 'merah' ? calc.bataMerahJumlah : calc.bataRinganJumlah)) : 0} bh
                  </b>
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendBataVol}
                  onChange={e => setSendBataVol(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Bata (Volume m³) — <b className="font-mono text-terracotta-900">{formatNumber(calc.bataVolume, 3)} m³</b></span>
              </label>

              {jenisBata === 'ringan' && (
                <>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                    <input
                      type="checkbox"
                      checked={sendMortarBata}
                      onChange={e => setSendMortarBata(e.target.checked)}
                      className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                    />
                    <span>Mortar Perekat Bata Ringan (Kg) — <b className="font-mono text-terracotta-900">{formatNumber(calc.mortarInstan)} kg</b></span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                    <input
                      type="checkbox"
                      checked={sendMortarBataSak}
                      onChange={e => setSendMortarBataSak(e.target.checked)}
                      className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                    />
                    <span>Mortar Perekat Bata Ringan (Sak) — <b className="font-mono text-terracotta-900">{sak(calc.mortarInstan)} sak</b></span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Kelompok Semen (1 Sisi vs 2 Sisi) */}
          <div className="bg-white p-3.5 rounded-xl border border-terracotta-200">
            <span className="text-[11px] font-mono font-bold uppercase text-terracotta-800 block mb-2">
              2. Kebutuhan Semen (Spesi + Plester + Acian)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendSemen1Sak}
                  onChange={e => setSendSemen1Sak(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Semen — <b>1 Sisi</b> (Sak) — <b className="font-mono text-terracotta-900">{sak(calc.totalSemen1)} sak</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendSemen2Sak}
                  onChange={e => setSendSemen2Sak(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Semen — <b>2 Sisi</b> (Sak) — <b className="font-mono text-terracotta-900">{sak(calc.totalSemen2)} sak</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-700">
                <input
                  type="checkbox"
                  checked={sendSemen1Kg}
                  onChange={e => setSendSemen1Kg(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Semen — 1 Sisi (Kg) — <b className="font-mono">{formatNumber(calc.totalSemen1)} kg</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-700">
                <input
                  type="checkbox"
                  checked={sendSemen2Kg}
                  onChange={e => setSendSemen2Kg(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Semen — 2 Sisi (Kg) — <b className="font-mono">{formatNumber(calc.totalSemen2)} kg</b></span>
              </label>
            </div>
          </div>

          {/* Kelompok Pasir (1 Sisi vs 2 Sisi) */}
          <div className="bg-white p-3.5 rounded-xl border border-terracotta-200">
            <span className="text-[11px] font-mono font-bold uppercase text-terracotta-800 block mb-2">
              3. Kebutuhan Pasir Pasang (Spesi + Plester)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendPasir1}
                  onChange={e => setSendPasir1(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Pasir — <b>1 Sisi</b> (m³) — <b className="font-mono text-terracotta-900">{formatNumber(calc.totalPasir1, 3)} m³</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendPasir2}
                  onChange={e => setSendPasir2(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Pasir — <b>2 Sisi</b> (m³) — <b className="font-mono text-terracotta-900">{formatNumber(calc.totalPasir2, 3)} m³</b></span>
              </label>
            </div>
          </div>

          {/* Kelompok Cat Tembok (1 Sisi vs 2 Sisi) */}
          <div className="bg-white p-3.5 rounded-xl border border-terracotta-200">
            <span className="text-[11px] font-mono font-bold uppercase text-terracotta-800 block mb-2">
              4. Kebutuhan Cat Tembok (2 Lapis)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendCat1Liter}
                  onChange={e => setSendCat1Liter(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Cat Tembok — <b>1 Sisi</b> (Liter) — <b className="font-mono text-terracotta-900">{formatNumber(calc.catLiter1)} L</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendCat2Liter}
                  onChange={e => setSendCat2Liter(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Cat Tembok — <b>2 Sisi</b> (Liter) — <b className="font-mono text-terracotta-900">{formatNumber(calc.catLiter2)} L</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-700">
                <input
                  type="checkbox"
                  checked={sendCat1Kg}
                  onChange={e => setSendCat1Kg(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Cat Tembok — 1 Sisi (Kg) — <b className="font-mono">{formatNumber(calc.catKg1)} kg</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-700">
                <input
                  type="checkbox"
                  checked={sendCat2Kg}
                  onChange={e => setSendCat2Kg(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Cat Tembok — 2 Sisi (Kg) — <b className="font-mono">{formatNumber(calc.catKg2)} kg</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-terracotta-900 bg-terracotta-50/70 p-2 rounded-lg border border-terracotta-200">
                <input
                  type="checkbox"
                  checked={sendCatPail}
                  onChange={e => setSendCatPail(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Kemasan Toko: <b>Pail (@20kg)</b> — <b className="font-mono text-terracotta-900">{Math.ceil((calc.catKg2 || calc.catKg1) / 20)} Pail</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-terracotta-900 bg-terracotta-50/70 p-2 rounded-lg border border-terracotta-200">
                <input
                  type="checkbox"
                  checked={sendCatGalon}
                  onChange={e => setSendCatGalon(e.target.checked)}
                  className="w-4 h-4 rounded text-terracotta-600 focus:ring-terracotta-500 accent-terracotta-600 cursor-pointer"
                />
                <span>Kemasan Toko: <b>Galon (@5kg)</b> — <b className="font-mono text-terracotta-900">{Math.ceil((calc.catKg2 || calc.catKg1) / 5)} Galon</b></span>
              </label>
            </div>
          </div>

        </div>

        <button
          type="button"
          onClick={handleSendToBoQ}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-display font-semibold text-xs shadow-md shadow-terracotta-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Kirim yang Dicentang ke BoQ
        </button>
      </div>

    </div>
  );
}

