import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { TILE_DATA, FLOOR_BASE_MIX, DENSITIES } from '../../data/calculatorConstants';
import { formatNumber, parseNum } from '../../utils/formatters';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';
import { 
  ArrowLeft, 
  Grid, 
  Send, 
  Box, 
  Package, 
  Layers, 
  Check, 
  Info,
  Sparkles
} from 'lucide-react';

export function FloorCalculator() {
  const { setActiveTab, queueCalculatedItems, showToast, clusterUnits, updateClusterUnits } = useBoQ();

  const [luas, setLuas] = usePersistentState('sr_calc_fl_luas', '');
  const [currentCat, setCurrentCat] = usePersistentState('sr_calc_fl_cat', 'interior');
  const [currentSize, setCurrentSize] = usePersistentState('sr_calc_fl_size', '40x40');
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_fl_cluster_mode', 'multiplied');

  // Checkbox selection for BoQ dispatch
  const [sendKeramikPcs, setSendKeramikPcs] = usePersistentState('sr_calc_fl_send_keramik_pcs', true);
  const [sendKeramikDus, setSendKeramikDus] = usePersistentState('sr_calc_fl_send_keramik_dus', false);
  const [sendSemen, setSendSemen] = usePersistentState('sr_calc_fl_send_semen', false);
  const [sendPasir, setSendPasir] = usePersistentState('sr_calc_fl_send_pasir', false);
  const [sendMortar, setSendMortar] = usePersistentState('sr_calc_fl_send_mortar', false);
  const [sendNat, setSendNat] = usePersistentState('sr_calc_fl_send_nat', false);
  const [mortarUnit, setMortarUnit] = usePersistentState('sr_calc_fl_mortar_unit', 'sak'); // 'sak' | 'kg'
  const [natUnit, setNatUnit] = usePersistentState('sr_calc_fl_nat_unit', 'bungkus'); // 'bungkus' | 'kg'

  // Multi-Storey States: Waterproofing & Step Nosing
  const [inWpArea, setInWpArea] = usePersistentState('sr_calc_fl_wp_area', '');
  const [inNosingSteps, setInNosingSteps] = usePersistentState('sr_calc_fl_nosing_steps', '');
  const [inNosingWidth, setInNosingWidth] = usePersistentState('sr_calc_fl_nosing_width', '1.0');
  const [sendWaterproofing, setSendWaterproofing] = usePersistentState('sr_calc_fl_send_wp', true);
  const [sendNosing, setSendNosing] = usePersistentState('sr_calc_fl_send_nosing', true);
  const [hargaWaterproofing, setHargaWaterproofing] = usePersistentState('sr_calc_fl_harga_wp', '285000'); // Rp/Set 25kg
  const [hargaNosing, setHargaNosing] = usePersistentState('sr_calc_fl_harga_nosing', '45000'); // Rp/m'

  // Plint Lantai (Skirting Tile) States
  const [hitungPlint, setHitungPlint] = usePersistentState('sr_calc_fl_hitung_plint', true);
  const [plintMode, setPlintMode] = usePersistentState('sr_calc_fl_plint_mode', 'auto'); // 'auto' | 'sides' | 'manual'
  const [plintPanjangRuang, setPlintPanjangRuang] = usePersistentState('sr_calc_fl_plint_p', '');
  const [plintLebarRuang, setPlintLebarRuang] = usePersistentState('sr_calc_fl_plint_l', '');
  const [plintSisiDepan, setPlintSisiDepan] = usePersistentState('sr_calc_fl_plint_depan', true);
  const [plintSisiBelakang, setPlintSisiBelakang] = usePersistentState('sr_calc_fl_plint_belakang', true);
  const [plintSisiKiri, setPlintSisiKiri] = usePersistentState('sr_calc_fl_plint_kiri', true);
  const [plintSisiKanan, setPlintSisiKanan] = usePersistentState('sr_calc_fl_plint_kanan', true);
  const [plintBukaanPintu, setPlintBukaanPintu] = usePersistentState('sr_calc_fl_plint_pintu', '0.9'); // meter bukaan pintu
  const [plintManualMeter, setPlintManualMeter] = usePersistentState('sr_calc_fl_plint_manual', '');
  const [sendPlint, setSendPlint] = usePersistentState('sr_calc_fl_send_plint', true);
  const [hargaPlint, setHargaPlint] = usePersistentState('sr_calc_fl_harga_plint', '25000'); // Rp/m'

  const catData = TILE_DATA[currentCat];
  const sizeKeys = Object.keys(catData.sizes);

  // Auto fallback size if category changed
  const activeSize = sizeKeys.includes(currentSize) ? currentSize : sizeKeys[0];
  const tile = catData.sizes[activeSize];

  // Multiplier Factor
  const effectiveMultiplier = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;

  // Calculations
  const baseLuas = parseNum(luas);
  const luasVal = baseLuas * effectiveMultiplier;
  const tileAreaM2 = tile.p * tile.l;

  const pcs = luasVal > 0 ? Math.ceil(luasVal / tileAreaM2) : 0;
  const dus = luasVal > 0 ? Math.ceil(pcs / tile.pcsPerDus) : 0;

  const semenKg = luasVal * FLOOR_BASE_MIX.SEMEN_PER_M2;
  const semenZak = Math.ceil(semenKg / DENSITIES.ZAK_SEMEN);

  const pasirM3 = luasVal * FLOOR_BASE_MIX.PASIR_M3_PER_M2;
  const pasirKg = pasirM3 * DENSITIES.PASIR;

  const mortarKg = luasVal * tile.mortar;
  const mortarZak = Math.ceil(mortarKg / DENSITIES.ZAK_SEMEN);

  const natWidthM = tile.natWidth / 1000;
  const natDepthM = tile.natDepth / 1000;
  const natKg = luasVal > 0 
    ? ((tile.p + tile.l) / (tile.p * tile.l)) * natWidthM * natDepthM * luasVal * DENSITIES.NAT 
    : 0;

  // Multi-Storey Calculations: Waterproofing & Nosing
  const baseWpArea = parseNum(inWpArea);
  const wpAreaVal = baseWpArea * effectiveMultiplier;
  const wpKg = wpAreaVal * 1.5; // 1.5 kg / m2 (2 lapis)
  const wpSets = wpAreaVal > 0 ? Math.ceil(wpKg / 25) : 0; // set 25kg

  const baseNosingSteps = parseInt(inNosingSteps, 10) || 0;
  const nosingWidth = parseNum(inNosingWidth) || 1.0;
  const nosingMeter = baseNosingSteps * nosingWidth * effectiveMultiplier;

  // Kalkulasi Plint Lantai (Skirting)
  const pRuang = parseNum(plintPanjangRuang);
  const lRuang = parseNum(plintLebarRuang);
  const bukaanPintuM = parseNum(plintBukaanPintu) || 0;

  const approxSide = baseLuas > 0 ? Math.sqrt(baseLuas) : 0;
  const pEffRuang = pRuang > 0 ? pRuang : approxSide;
  const lEffRuang = lRuang > 0 ? lRuang : approxSide;

  let basePlintMeter = 0;
  if (hitungPlint) {
    if (plintMode === 'auto') {
      const kelilingRuang = 2 * (pEffRuang + lEffRuang);
      basePlintMeter = Math.max(0, kelilingRuang - bukaanPintuM);
    } else if (plintMode === 'sides') {
      let sum = 0;
      if (plintSisiDepan) sum += pEffRuang;
      if (plintSisiBelakang) sum += pEffRuang;
      if (plintSisiKiri) sum += lEffRuang;
      if (plintSisiKanan) sum += lEffRuang;
      basePlintMeter = Math.max(0, sum - bukaanPintuM);
    } else if (plintMode === 'manual') {
      basePlintMeter = parseNum(plintManualMeter);
    }
  }

  const plintMeterVal = basePlintMeter * effectiveMultiplier;
  const tilePanjangM = tile.p || 0.4;
  const plintPcs = plintMeterVal > 0 ? Math.ceil(plintMeterVal / tilePanjangM) : 0;

  // Visual dus box stack
  const maxIcons = 48;
  const iconCount = Math.min(dus, maxIcons);

  // Optional custom unit prices (Rp) - default 0
  const [hargaKeramik, setHargaKeramik] = usePersistentState('sr_calc_fl_harga_keramik', '');
  const [hargaSemen, setHargaSemen] = usePersistentState('sr_calc_fl_harga_semen', '');
  const [hargaPasir, setHargaPasir] = usePersistentState('sr_calc_fl_harga_pasir', '');
  const [hargaMortar, setHargaMortar] = usePersistentState('sr_calc_fl_harga_mortar', '');
  const [hargaNat, setHargaNat] = usePersistentState('sr_calc_fl_harga_nat', '');

  const handleSendToBoQ = () => {
    if (luasVal <= 0) {
      showToast("Masukkan luas area pemasangan keramik (> 0 m²) terlebih dahulu.", "warning");
      return;
    }

    const pKeramik = parseNum(hargaKeramik);
    const pSemen = parseNum(hargaSemen);
    const pPasir = parseNum(hargaPasir);
    const pMortar = parseNum(hargaMortar);
    const pNat = parseNum(hargaNat);

    const tileLabel = `${catData.label} ${activeSize.replace('x', '×')} cm`;
    const itemsToSend = [];

    if (sendKeramikPcs && pcs > 0) {
      itemsToSend.push({
        category: 'lantai',
        label: `Keramik — ${tileLabel}`,
        satuan: 'Buah',
        jumlah: pcs,
        harga: pKeramik > 0 ? Math.round(pKeramik / tile.pcsPerDus) : 0,
        source: 'Kalkulator Lantai Keramik'
      });
    }
    if (sendKeramikDus && dus > 0) {
      itemsToSend.push({
        category: 'lantai',
        label: `Keramik — ${tileLabel}`,
        satuan: 'Dus',
        jumlah: dus,
        harga: pKeramik,
        source: 'Kalkulator Lantai Keramik'
      });
    }
    if (sendSemen && semenZak > 0) {
      itemsToSend.push({
        category: 'lantai',
        label: 'Semen Portland (adukan dasar lantai)',
        satuan: 'Sak',
        jumlah: semenZak,
        harga: pSemen,
        source: 'Kalkulator Lantai Keramik'
      });
    }
    if (sendPasir && pasirM3 > 0) {
      itemsToSend.push({
        category: 'lantai',
        label: 'Pasir Pasang (adukan dasar lantai)',
        satuan: 'm³',
        jumlah: +pasirM3.toFixed(3),
        harga: pPasir,
        source: 'Kalkulator Lantai Keramik'
      });
    }
    if (sendMortar && mortarKg > 0) {
      if (mortarUnit === 'sak') {
        itemsToSend.push({
          category: 'lantai',
          label: 'Mortar Instan Perekat Keramik (Sak @40kg)',
          satuan: 'Sak',
          jumlah: mortarZak,
          harga: pMortar > 0 ? pMortar : 95000,
          source: 'Kalkulator Lantai Keramik'
        });
      } else {
        itemsToSend.push({
          category: 'lantai',
          label: 'Mortar Instan Perekat Keramik (Thin-Bed)',
          satuan: 'Kg',
          jumlah: Math.round(mortarKg),
          harga: pMortar > 0 ? Math.round(pMortar / 40) : 2375,
          source: 'Kalkulator Lantai Keramik'
        });
      }
    }
    if (sendNat && natKg > 0) {
      if (natUnit === 'bungkus') {
        itemsToSend.push({
          category: 'lantai',
          label: 'Semen Warna Pengisi Nat (Bungkus @1kg)',
          satuan: 'Bungkus',
          jumlah: Math.ceil(natKg),
          harga: pNat > 0 ? pNat : 18000,
          source: 'Kalkulator Lantai Keramik'
        });
      } else {
        itemsToSend.push({
          category: 'lantai',
          label: 'Semen Warna (Pengisi Nat Keramik)',
          satuan: 'Kg',
          jumlah: +natKg.toFixed(1),
          harga: pNat,
          source: 'Kalkulator Lantai Keramik'
        });
      }
    }
    const pWp = parseNum(hargaWaterproofing) || 285000;
    const pNosing = parseNum(hargaNosing) || 45000;
    const pPlint = parseNum(hargaPlint) || 25000;
    const clusterSuffix = effectiveMultiplier > 1 ? ` [x${effectiveMultiplier} Unit Cluster]` : '';

    if (hitungPlint && sendPlint && plintMeterVal > 0) {
      itemsToSend.push({
        category: 'lantai',
        label: `Plint Keramik ${activeSize.replace('x', '×')} cm (Tinggi 10cm)${clusterSuffix}`,
        satuan: "m'",
        jumlah: +plintMeterVal.toFixed(2),
        harga: pPlint,
        source: 'Kalkulator Lantai Keramik'
      });
    }

    if (sendWaterproofing && wpSets > 0) {
      itemsToSend.push({
        category: 'lantai',
        label: `Waterproofing Semen Elastis 2-Komponen (K. Mandi/Balkon Lt. 2)${clusterSuffix}`,
        satuan: 'Set',
        jumlah: wpSets,
        harga: pWp,
        source: 'Kalkulator Lantai Keramik'
      });
    }

    if (sendNosing && nosingMeter > 0) {
      const btgNosing = Math.ceil((nosingMeter * 1.05) / 2.7);
      itemsToSend.push({
        category: 'lantai',
        label: `Step Nosing Profil Anti-Slip Tangga (Batang @2.7m) (${nosingMeter.toFixed(1)} m')${clusterSuffix}`,
        satuan: 'Batang',
        jumlah: btgNosing,
        harga: pNosing > 0 ? Math.round(pNosing * 2.7) : 125000,
        source: 'Kalkulator Lantai (Kemasan Batang Toko 2.7m)'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu bahan keramik / proteksi dengan volume > 0 untuk dikirim.", "warning");
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
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <Grid className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">FLOOR TILE & FINISHING</span>
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
              Kalkulator Lantai Keramik & Granit
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Kebutuhan jumlah keping, dus karton, spesi konvensional, mortar perekat instan, nat semen warna, waterproofing area basah, dan step nosing tangga.
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
        unitLabel="Unit Lantai / Kavling"
      />

      {/* 01. LUAS AREA */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Luas Area Pemasangan
          </h2>
        </div>

        <div className="max-w-xs">
          <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1.5">
            Luas Total Ruangan / Lantai
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              value={luas}
              onChange={e => setLuas(e.target.value)}
              placeholder="mis. 24"
              className="w-full p-3 text-lg font-mono font-bold rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-paper-50 focus:bg-white text-paper-900"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-paper-500">m²</span>
          </div>
        </div>
      </div>

      {/* 02. PILIH JENIS & UKURAN KERAMIK */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Jenis & Ukuran Keramik
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Pilih kategori keramik, kemudian tentukan dimensi yang akan dipasang.
        </p>

        {/* Category selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(TILE_DATA).map(catKey => {
            const c = TILE_DATA[catKey];
            const isActive = currentCat === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => {
                  setCurrentCat(catKey);
                  const firstSize = Object.keys(TILE_DATA[catKey].sizes)[0];
                  setCurrentSize(firstSize);
                }}
                className={`px-4 py-2 rounded-full text-xs font-semibold font-display transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40'
                    : 'bg-paper-100 text-paper-700 hover:bg-paper-200'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Size buttons */}
        <div className="flex flex-wrap gap-2.5 pt-3 border-t border-paper-200">
          {sizeKeys.map(sz => {
            const isActive = activeSize === sz;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => setCurrentSize(sz)}
                className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-paper-900 text-white shadow-md ring-2 ring-amber-500/50'
                    : 'bg-paper-50 hover:bg-paper-100 text-paper-800 border border-paper-300'
                }`}
              >
                {sz.replace('x', ' × ')} cm
              </button>
            );
          })}
        </div>
      </div>

      {/* 03. HASIL KEBUTUHAN MATERIAL */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6 space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Kebutuhan Material Hasil Perhitungan
          </h2>
        </div>

        {/* Keramik section */}
        <div>
          <span className="text-xs font-mono font-bold uppercase text-paper-600 tracking-wider flex items-center gap-2 mb-3">
            <Package className="w-3.5 h-3.5 text-amber-600" /> Keping & Dus Keramik
          </span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-amber-600 text-white shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-100 font-bold">Jumlah Keping</span>
              <div className="my-2">
                <span className="font-heading text-3xl font-bold">{formatNumber(pcs)} pcs</span>
                <p className="text-xs font-mono text-amber-100 mt-0.5">± {formatNumber(tileAreaM2, 3)} m² / keping</p>
              </div>
              <span className="text-[10px] text-amber-200 font-mono">Dibulatkan ke atas</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-900 text-white shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">Jumlah Dus / Karton</span>
              <div className="my-2">
                <span className="font-heading text-3xl font-bold">{formatNumber(dus)} dus</span>
                <p className="text-xs font-mono text-amber-200 mt-0.5">{tile.pcsPerDus} pcs / dus</p>
              </div>
              <span className="text-[10px] text-amber-300 font-mono">Kemasan standar pasaran</span>
            </div>
          </div>

          {/* Dus Box Stack Visualizer */}
          <div className="mt-3.5 p-4 rounded-xl bg-paper-100/70 border border-paper-300">
            <div className="flex items-center justify-between text-xs font-mono mb-2.5">
              <span className="font-bold text-paper-800">Pratinjau Tumpukan Dus:</span>
              <span className="font-bold text-amber-700">{formatNumber(dus)} dus</span>
            </div>
            {dus > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                {Array.from({ length: iconCount }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-5 h-5 rounded bg-amber-600 border border-amber-800/40 shadow-xs flex items-center justify-center text-[8px] text-white font-mono"
                    title={`Dus #${i + 1}`}
                  >
                    📦
                  </div>
                ))}
                {dus > maxIcons && (
                  <span className="text-xs font-mono text-paper-600 self-center pl-1 font-semibold">
                    +{formatNumber(dus - maxIcons)} dus lagi
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-paper-500 font-sans italic">
                Masukkan luas lantai untuk melihat estimasi tumpukan dus.
              </p>
            )}
          </div>
        </div>

        {/* Adukan Konvensional */}
        <div className="pt-4 border-t border-paper-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono font-bold uppercase text-paper-700 tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blueprint-600" /> Semen & Pasir — Adukan Dasar Konvensional (Spesi 1PC : 5PP)
            </span>
          </div>
          <p className="text-[11px] text-paper-500 mb-3">
            Untuk adukan dasar spesi setebal ±3 cm di atas lantai kerja.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-paper-900 text-white shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-paper-300 font-bold">Semen Adukan</span>
              <div className="my-2">
                <span className="font-heading text-2xl font-bold">{formatNumber(semenKg)} kg</span>
                <p className="text-xs font-mono text-paper-300 mt-0.5">≈ {semenZak} zak (40 kg)</p>
              </div>
              <span className="text-[10px] text-paper-400 font-mono">Koefisien ±10 kg/m²</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold">Pasir Pasang</span>
              <div className="my-2">
                <span className="font-heading text-2xl font-bold text-amber-900">{formatNumber(pasirKg)} kg</span>
                <p className="text-xs font-mono text-amber-800 font-semibold mt-0.5">≈ {formatNumber(pasirM3, 3)} m³</p>
              </div>
              <span className="text-[10px] text-amber-700 font-mono">Koefisien ±0,045 m³/m²</span>
            </div>
          </div>
        </div>

        {/* Mortar Instan Thin Bed & Nat */}
        <div className="pt-4 border-t border-paper-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Mortar */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 font-bold block mb-1">
                Alternatif: Mortar Perekat Instan
              </span>
              <span className="font-heading text-2xl font-bold text-slate-900 block my-1">
                {formatNumber(mortarKg)} kg
              </span>
              <p className="text-xs font-mono text-slate-700">≈ {mortarZak} sak (40 kg)</p>
              <p className="text-[10px] text-slate-500 font-sans mt-2">
                Metode thin-bed (daya sebar ±{tile.mortar} kg/m²).
              </p>
            </div>

            {/* Nat / Grout */}
            <div className="p-4 rounded-xl bg-stone-100 border border-stone-300 shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 font-bold block mb-1">
                Pengisi Nat (Grout)
              </span>
              <span className="font-heading text-2xl font-bold text-stone-900 block my-1">
                {formatNumber(natKg, 1)} kg
              </span>
              <p className="text-xs font-mono text-stone-700">Lebar nat standar {tile.natWidth} mm</p>
              <p className="text-[10px] text-stone-500 font-sans mt-2">
                Rumus standar geometri nat + BJ 1.600 kg/m³.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* 03. PLINT LANTAI, AREA BASAH & AKSESORIS BERTINGKAT */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Plint Lantai, Proteksi Area Basah & Aksesoris Tangga
          </h2>
        </div>
        <p className="text-xs text-paper-600 ml-8.5">
          Plint skirting dinding bawah, waterproofing kamar mandi/balkon lantai 2, serta profil step nosing tangga.
        </p>

        {/* Card Plint Lantai (Skirting) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-300/80 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hitungPlint}
                onChange={e => setHitungPlint(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 font-heading">
                📏 Plint Lantai Keramik / Skirting (Tinggi 10 cm)
              </span>
            </label>
            <div className="inline-flex rounded-lg bg-amber-200/70 p-0.5 text-[11px] font-mono self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPlintMode('auto')}
                className={`px-2 py-0.5 rounded transition-all ${plintMode === 'auto' ? 'bg-white text-amber-950 font-bold shadow-xs' : 'text-amber-800'}`}
              >
                Otomatis
              </button>
              <button
                type="button"
                onClick={() => setPlintMode('sides')}
                className={`px-2 py-0.5 rounded transition-all ${plintMode === 'sides' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-amber-800'}`}
              >
                Pilih Sisi
              </button>
              <button
                type="button"
                onClick={() => setPlintMode('manual')}
                className={`px-2 py-0.5 rounded transition-all ${plintMode === 'manual' ? 'bg-white text-amber-950 font-bold shadow-xs' : 'text-amber-800'}`}
              >
                Manual Meter
              </button>
            </div>
          </div>

          {hitungPlint && (
            <div className="space-y-3 pt-2 border-t border-amber-200 text-xs font-mono animate-fadeIn">
              {/* Mode 1: Auto */}
              {plintMode === 'auto' && (
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Estimasi Keliling (4 Sisi):</span>
                    <span className="font-bold">{(4 * approxSide).toFixed(1)} m</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-100">
                    <span>Dikurangi Bukaan Pintu:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={plintBukaanPintu}
                        onChange={e => setPlintBukaanPintu(e.target.value)}
                        className="w-16 p-1 text-center bg-amber-50 border border-amber-300 rounded font-bold"
                      />
                      <span>m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Sides */}
              {plintMode === 'sides' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">Panjang Ruang (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={plintPanjangRuang}
                        onChange={e => setPlintPanjangRuang(e.target.value)}
                        placeholder={`default ${approxSide.toFixed(1)}`}
                        className="w-full p-1.5 bg-white border border-amber-200 rounded font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">Lebar Ruang (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={plintLebarRuang}
                        onChange={e => setPlintLebarRuang(e.target.value)}
                        placeholder={`default ${approxSide.toFixed(1)}`}
                        className="w-full p-1.5 bg-white border border-amber-200 rounded font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-1.5 ${plintSisiDepan ? 'bg-amber-100/80 border-amber-400 font-bold text-amber-950' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" checked={plintSisiDepan} onChange={e => setPlintSisiDepan(e.target.checked)} className="w-3.5 h-3.5 text-amber-600 rounded" />
                      <span>Sisi Depan</span>
                    </label>
                    <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-1.5 ${plintSisiBelakang ? 'bg-amber-100/80 border-amber-400 font-bold text-amber-950' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" checked={plintSisiBelakang} onChange={e => setPlintSisiBelakang(e.target.checked)} className="w-3.5 h-3.5 text-amber-600 rounded" />
                      <span>Sisi Belakang</span>
                    </label>
                    <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-1.5 ${plintSisiKiri ? 'bg-amber-100/80 border-amber-400 font-bold text-amber-950' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" checked={plintSisiKiri} onChange={e => setPlintSisiKiri(e.target.checked)} className="w-3.5 h-3.5 text-amber-600 rounded" />
                      <span>Samping Kiri</span>
                    </label>
                    <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-1.5 ${plintSisiKanan ? 'bg-amber-100/80 border-amber-400 font-bold text-amber-950' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" checked={plintSisiKanan} onChange={e => setPlintSisiKanan(e.target.checked)} className="w-3.5 h-3.5 text-amber-600 rounded" />
                      <span>Samping Kanan</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-amber-800 italic">
                    💡 Hapus centang pada sisi yang dipasangi <em>kitchen set</em> atau lemari tanam.
                  </p>
                </div>
              )}

              {/* Mode 3: Manual */}
              {plintMode === 'manual' && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-amber-200">
                  <label className="text-xs text-amber-900 font-bold">Panjang Plint Langsung:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={plintManualMeter}
                    onChange={e => setPlintManualMeter(e.target.value)}
                    placeholder="mis. 18.5"
                    className="w-24 p-1.5 bg-amber-50 border border-amber-300 rounded font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">meter lari</span>
                </div>
              )}

              {/* Result Summary */}
              {plintMeterVal > 0 && (
                <div className="p-3 rounded-xl bg-white border border-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Panjang Plint:</span>
                    <span className="font-heading text-lg font-bold text-amber-950">{formatNumber(plintMeterVal, 2)} m'</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Keping Keramik Diperlukan:</span>
                    <span className="font-heading text-lg font-bold text-amber-700">± {formatNumber(plintPcs)} keping</span>
                    <span className="text-[9.5px] text-slate-400 block">(potongan modul {tile.p * 100}cm)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          
          {/* Card A: Waterproofing */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                💧 Waterproofing Kamar Mandi / Balkon Lt. 2
              </span>
              <span className="text-[10px] text-blue-700 font-mono font-semibold bg-blue-100/70 px-2 py-0.5 rounded-md">2 Lapis (1.5 kg/m²)</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">
                Luas Area Basah
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={inWpArea}
                  onChange={e => setInWpArea(e.target.value)}
                  placeholder="mis. 6"
                  className="w-full p-2.5 pr-8 text-xs font-mono font-bold rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 font-semibold">m²</span>
              </div>
            </div>

            {wpAreaVal > 0 && (
              <div className="p-3 rounded-xl bg-white border border-blue-100 text-xs space-y-1 shadow-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Total Kebutuhan:</span>
                  <span className="font-bold text-blue-900">{formatNumber(wpKg, 1)} kg</span>
                </div>
                <div className="flex justify-between font-mono text-blue-950 font-bold border-t border-slate-100 pt-1">
                  <span>Kemasan Diperlukan:</span>
                  <span className="text-blue-600">{wpSets} Set (25kg)</span>
                </div>
              </div>
            )}
          </div>

          {/* Card B: Step Nosing Tangga */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                🪜 Profil Step Nosing Anti-Slip Tangga
              </span>
              <span className="text-[10px] text-amber-800 font-mono font-semibold bg-amber-100/70 px-2 py-0.5 rounded-md">Injakan Trap</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">
                  Jumlah Trap
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={inNosingSteps}
                    onChange={e => setInNosingSteps(e.target.value)}
                    placeholder="mis. 18"
                    className="w-full p-2.5 pr-10 text-xs font-mono font-bold rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 font-semibold">trap</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">
                  Lebar Tangga
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={inNosingWidth}
                    onChange={e => setInNosingWidth(e.target.value)}
                    placeholder="mis. 1.0"
                    className="w-full p-2.5 pr-7 text-xs font-mono font-bold rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 font-semibold">m</span>
                </div>
              </div>
            </div>

            {nosingMeter > 0 && (
              <div className="p-3 rounded-xl bg-white border border-amber-100 text-xs flex justify-between font-mono font-bold text-amber-950 shadow-xs">
                <span>Panjang Profil Tangga:</span>
                <span className="text-amber-700">{formatNumber(nosingMeter, 2)} m'</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* OPSIONAL: HARGA SATUAN BAHAN */}
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
          Isi harga satuan bahan untuk langsung menghitung estimasi anggaran dan diteruskan ke BoQ.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Keramik (Rp/dus)</label>
            <input
              type="number"
              min="0"
              value={hargaKeramik}
              onChange={e => setHargaKeramik(e.target.value)}
              placeholder="mis. 75000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Semen (Rp/sak 40kg)</label>
            <input
              type="number"
              min="0"
              value={hargaSemen}
              onChange={e => setHargaSemen(e.target.value)}
              placeholder="mis. 65000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Pasir Pasang (Rp/m³)</label>
            <input
              type="number"
              min="0"
              value={hargaPasir}
              onChange={e => setHargaPasir(e.target.value)}
              placeholder="mis. 380000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              {mortarUnit === 'sak' ? 'Mortar (Rp/sak 40kg)' : 'Mortar (Rp/kg)'}
            </label>
            <input
              type="number"
              min="0"
              value={hargaMortar}
              onChange={e => setHargaMortar(e.target.value)}
              placeholder={mortarUnit === 'sak' ? 'mis. 85000' : 'mis. 2125'}
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Plint Lantai (Rp/m')</label>
            <input
              type="number"
              min="0"
              value={hargaPlint}
              onChange={e => setHargaPlint(e.target.value)}
              placeholder="mis. 25000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              {natUnit === 'bungkus' ? 'Nat Semen (Rp/Bungkus @1kg)' : 'Nat Semen (Rp/kg)'}
            </label>
            <input
              type="number"
              min="0"
              value={hargaNat}
              onChange={e => setHargaNat(e.target.value)}
              placeholder="mis. 18000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Waterproofing (Rp/set 25kg)</label>
            <input
              type="number"
              min="0"
              value={hargaWaterproofing}
              onChange={e => setHargaWaterproofing(e.target.value)}
              placeholder="285000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Step Nosing Tangga (Rp/m')</label>
            <input
              type="number"
              min="0"
              value={hargaNosing}
              onChange={e => setHargaNosing(e.target.value)}
              placeholder="45000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 05. KIRIM KE BOQ */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/80 border-2 border-dashed border-amber-400/80 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-amber-900">
            Kirim Hasil ke BoQ Tools
          </h2>
        </div>
        <p className="text-xs text-amber-800/80 mb-4 ml-8.5">
          Centang item yang ingin dikirimkan sebagai usulan volume ke dalam proyek BoQ Anda.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-3.5 rounded-xl border border-amber-200">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendKeramikPcs}
              onChange={e => setSendKeramikPcs(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <span>Keramik (Buah) — <b className="font-mono text-amber-900">{formatNumber(pcs)} buah</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendKeramikDus}
              onChange={e => setSendKeramikDus(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <span>Keramik (Dus) — <b className="font-mono text-amber-900">{formatNumber(dus)} dus</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendSemen}
              onChange={e => setSendSemen(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <span>Semen Adukan Dasar — <b className="font-mono text-amber-900">{semenZak} sak</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendPasir}
              onChange={e => setSendPasir(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <span>Pasir Pasang — <b className="font-mono text-amber-900">{formatNumber(pasirM3, 3)} m³</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendMortar}
              onChange={e => setSendMortar(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <div className="flex items-center gap-1.5">
              <span>Mortar Instan — <b className="font-mono text-amber-900">{mortarUnit === 'sak' ? mortarZak + ' Sak' : formatNumber(mortarKg) + ' kg'}</b></span>
              <span className="inline-flex rounded bg-paper-200 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setMortarUnit('sak')}
                  className={`px-1.5 py-0.5 rounded font-bold ${mortarUnit === 'sak' ? 'bg-amber-700 text-white' : 'text-paper-700'}`}
                >
                  Sak
                </button>
                <button
                  type="button"
                  onClick={() => setMortarUnit('kg')}
                  className={`px-1.5 py-0.5 rounded font-bold ${mortarUnit === 'kg' ? 'bg-amber-700 text-white' : 'text-paper-700'}`}
                >
                  Kg
                </button>
              </span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendNat}
              onChange={e => setSendNat(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
            />
            <div className="flex items-center gap-1.5">
              <span>Nat Semen — <b className="font-mono text-amber-900">{natUnit === 'bungkus' ? Math.ceil(natKg) + ' Bks' : formatNumber(natKg, 1) + ' kg'}</b></span>
              <span className="inline-flex rounded bg-paper-200 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setNatUnit('bungkus')}
                  className={`px-1.5 py-0.5 rounded font-bold ${natUnit === 'bungkus' ? 'bg-amber-700 text-white' : 'text-paper-700'}`}
                >
                  Bungkus (1kg)
                </button>
                <button
                  type="button"
                  onClick={() => setNatUnit('kg')}
                  className={`px-1.5 py-0.5 rounded font-bold ${natUnit === 'kg' ? 'bg-amber-700 text-white' : 'text-paper-700'}`}
                >
                  Kg
                </button>
              </span>
            </div>
          </label>

          {hitungPlint && plintMeterVal > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendPlint}
                onChange={e => setSendPlint(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <span>Plint Keramik — <b className="font-mono text-amber-900">{formatNumber(plintMeterVal, 2)} m'</b></span>
            </label>
          )}

          {wpSets > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-blue-950 border-t border-slate-100 pt-2">
              <input
                type="checkbox"
                checked={sendWaterproofing}
                onChange={e => setSendWaterproofing(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
              />
              <span>Waterproofing K.Mandi/Balkon — <b className="font-mono text-blue-900">{wpSets} Set (25kg)</b></span>
            </label>
          )}

          {nosingMeter > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-amber-950 border-t border-slate-100 pt-2">
              <input
                type="checkbox"
                checked={sendNosing}
                onChange={e => setSendNosing(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <span>Step Nosing Profil Tangga — <b className="font-mono text-amber-900">{formatNumber(nosingMeter, 2)} m'</b></span>
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={handleSendToBoQ}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display font-semibold text-xs shadow-md shadow-amber-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Kirim yang Dicentang ke BoQ
        </button>
      </div>

    </div>
  );
}

