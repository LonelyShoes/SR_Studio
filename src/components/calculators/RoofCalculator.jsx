import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum, formatRp } from '../../utils/formatters';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { 
  ArrowLeft, 
  Home, 
  Send, 
  Layers, 
  Check, 
  Info, 
  Sparkles, 
  RotateCcw,
  Sliders,
  DollarSign,
  Maximize2,
  Compass
} from 'lucide-react';
import { RoofTrussStudio } from './RoofTrussStudio';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';

export function RoofCalculator() {
  const { setActiveTab, queueCalculatedItems, showToast, clusterUnits, updateClusterUnits } = useBoQ();
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_rf_cluster_mode', 'multiplied');
  const [activeMode, setActiveMode] = usePersistentState('sr_calc_rf_active_mode', 'standard'); // 'standard' | 'studio'

  // Model Atap: 'pelana' (Gable) | 'limasan' (Hip) | 'miring' (Shed) | 'datar' (Flat)
  const [roofType, setRoofType] = usePersistentState('sr_calc_rf_type', 'pelana');
  
  // Dimensi Bangunan
  const [length, setLength] = usePersistentState('sr_calc_rf_length', '12'); // Panjang (m)
  const [width, setWidth] = usePersistentState('sr_calc_rf_width', '8');    // Lebar (m)
  const [overhang, setOverhang] = usePersistentState('sr_calc_rf_overhang', '0.8'); // Overstek tritisan (m)
  const [pitch, setPitch] = usePersistentState('sr_calc_rf_pitch', '30');   // Kemiringan atap (derajat)

  // Jenis Penutup Atap
  const [coveringType, setCoveringType] = usePersistentState('sr_calc_rf_covering_type', 'metal_pasir'); 
  // 'metal_pasir' | 'spandek' | 'genteng_beton' | 'genteng_morando'

  // Custom Harga Satuan (Rp)
  const [hargaTrussC75, setHargaTrussC75] = usePersistentState('sr_calc_rf_harga_truss', '99700'); // Rp / Batang (6m)
  const [hargaRengR32, setHargaRengR32] = usePersistentState('sr_calc_rf_harga_reng', '99700');   // Rp / Batang (6m)
  const [hargaPenutup, setHargaPenutup] = usePersistentState('sr_calc_rf_harga_penutup', '30500');   // Rp / Satuan
  const [hargaNok, setHargaNok] = usePersistentState('sr_calc_rf_harga_nok', '25700');           // Rp / Buah
  const [hargaLisplang, setHargaLisplang] = usePersistentState('sr_calc_rf_harga_lisplang', '65000'); // Rp / Lembar 2.4m
  const [hargaSekrup, setHargaSekrup] = usePersistentState('sr_calc_rf_harga_sekrup', '450');       // Rp / Baut
  const [hargaTalang, setHargaTalang] = usePersistentState('sr_calc_rf_harga_talang', '45000');

  // Checkbox pemilihan item untuk dikirim ke BoQ
  const [sendTruss, setSendTruss] = usePersistentState('sr_calc_rf_send_truss', true);
  const [sendReng, setSendReng] = usePersistentState('sr_calc_rf_send_reng', true);
  const [sendCovering, setSendCovering] = usePersistentState('sr_calc_rf_send_covering', true);
  const [sendNok, setSendNok] = usePersistentState('sr_calc_rf_send_nok', true);
  const [sendLisplang, setSendLisplang] = usePersistentState('sr_calc_rf_send_lisplang', true);
  const [sendSekrup, setSendSekrup] = usePersistentState('sr_calc_rf_send_sekrup', false);
  const [sekrupDispatchUnit, setSekrupDispatchUnit] = usePersistentState('sr_calc_rf_sekrup_unit', 'buah'); // 'buah' | 'dus'

  // Kustomisasi Lisplang & Pilihan Sisi (Manual / Sisi Tertentu)
  const [lisplangMode, setLisplangMode] = usePersistentState('sr_calc_rf_lisplang_mode', 'sides'); // 'auto' | 'sides' | 'manual'
  const [lisplangSisiDepan, setLisplangSisiDepan] = usePersistentState('sr_calc_rf_lisplang_depan', true);
  const [lisplangSisiBelakang, setLisplangSisiBelakang] = usePersistentState('sr_calc_rf_lisplang_belakang', true);
  const [lisplangSisiKiri, setLisplangSisiKiri] = usePersistentState('sr_calc_rf_lisplang_kiri', false);
  const [lisplangSisiKanan, setLisplangSisiKanan] = usePersistentState('sr_calc_rf_lisplang_kanan', false);
  const [lisplangManualMeter, setLisplangManualMeter] = usePersistentState('sr_calc_rf_lisplang_manual', '');

  // Kustomisasi Nok / Bubungan
  const [nokMode, setNokMode] = usePersistentState('sr_calc_rf_nok_mode', 'auto'); // 'auto' | 'manual'
  const [nokManualMeter, setNokManualMeter] = usePersistentState('sr_calc_rf_nok_manual', '');

  // Kustomisasi Talang Air Hujan / Seng Jurai
  const [sendTalang, setSendTalang] = usePersistentState('sr_calc_rf_send_talang', false);
  const [talangManualMeter, setTalangManualMeter] = usePersistentState('sr_calc_rf_talang_manual', '');

  // Parsing angka
  const lVal = parseNum(length);
  const wVal = parseNum(width);
  const oVal = parseNum(overhang);
  const pVal = parseNum(pitch);

  // Kalkulasi Geometri Atap
  const calc = useMemo(() => {
    if (lVal <= 0 || wVal <= 0) {
      return {
        lEff: 0,
        wEff: 0,
        flatArea: 0,
        pitchFactor: 1,
        slopedArea: 0,
        ridgeLength: 0,
        perimeterLisplang: 0,
        trussBatang: 0,
        trussMeter: 0,
        rengBatang: 0,
        rengMeter: 0,
        coveringQty: 0,
        coveringUnit: 'm2',
        coveringDesc: '',
        nokQty: 0,
        lisplangQty: 0,
        sekrupQty: 0
      };
    }

    const lEff = lVal + 2 * oVal;
    const wEff = wVal + 2 * oVal;
    const flatArea = lEff * wEff;

    // Sudut radian & faktor kemiringan
    const rad = (pVal * Math.PI) / 180;
    const cosPitch = Math.max(0.2, Math.cos(rad));
    const pitchFactor = 1 / cosPitch;
    const slopedArea = flatArea * pitchFactor;

    // Panjang Nok Otomatis (Ridge)
    let autoRidgeLength = 0;
    if (roofType === 'pelana') {
      autoRidgeLength = lEff;
    } else if (roofType === 'limasan') {
      const mainRidge = Math.max(1, lEff - wEff);
      const hipDiagonal = Math.sqrt(Math.pow(wEff / 2, 2) + Math.pow(wEff / 2, 2) + Math.pow((wEff / 2) * Math.tan(rad), 2));
      autoRidgeLength = mainRidge + (4 * hipDiagonal);
    } else if (roofType === 'miring') {
      autoRidgeLength = lEff;
    } else {
      autoRidgeLength = 0; // datar
    }

    const ridgeLength = (nokMode === 'manual' && parseNum(nokManualMeter) > 0)
      ? parseNum(nokManualMeter)
      : autoRidgeLength;

    // Panjang Sisi-Sisi Lisplang
    const sisiDepanM = lEff;
    const sisiBelakangM = lEff;
    const sisiKiriM = roofType === 'pelana' ? (2 * (wEff / (2 * cosPitch))) : wEff;
    const sisiKananM = roofType === 'pelana' ? (2 * (wEff / (2 * cosPitch))) : wEff;

    let autoPerimeterLisplang = 0;
    if (roofType === 'pelana') {
      autoPerimeterLisplang = (2 * lEff) + (4 * (wEff / (2 * cosPitch)));
    } else {
      autoPerimeterLisplang = 2 * (lEff + wEff);
    }

    let perimeterLisplang = 0;
    if (lisplangMode === 'auto') {
      perimeterLisplang = autoPerimeterLisplang;
    } else if (lisplangMode === 'sides') {
      let sum = 0;
      if (lisplangSisiDepan) sum += sisiDepanM;
      if (lisplangSisiBelakang) sum += sisiBelakangM;
      if (lisplangSisiKiri) sum += sisiKiriM;
      if (lisplangSisiKanan) sum += sisiKananM;
      perimeterLisplang = sum;
    } else if (lisplangMode === 'manual') {
      perimeterLisplang = parseNum(lisplangManualMeter);
    }

    const talangMeter = parseNum(talangManualMeter);

    // Material Takeoff
    // 1. Truss C75.75: ~4.2 m' per m2 luas miring atap (standar SNI)
    const trussMeter = slopedArea * 4.2 * 1.05;
    const trussBatang = Math.ceil(trussMeter / 6);

    // 2. Reng R.32 (0.45mm): ~3.2 m' per m2 luas miring atap
    const rengMeter = slopedArea * 3.2 * 1.05;
    const rengBatang = Math.ceil(rengMeter / 6);

    // 3. Penutup Atap
    let coveringQty = 0;
    let coveringUnit = 'm²';
    let coveringDesc = '';

    if (coveringType === 'metal_pasir') {
      coveringQty = Math.ceil(slopedArea * 1.35 * 1.05); // 1.35 lembar/m2
      coveringUnit = 'Lembar';
      coveringDesc = 'Genteng Metal Berpasir 2×4 Daun';
    } else if (coveringType === 'spandek') {
      coveringQty = Math.round(slopedArea * 1.05 * 100) / 100;
      coveringUnit = 'm²';
      coveringDesc = 'Atap Spandek / Galvalum 0.35mm Menerus';
    } else if (coveringType === 'genteng_beton') {
      coveringQty = Math.ceil(slopedArea * 9.8 * 1.05); // 9.8 bh/m2
      coveringUnit = 'Buah';
      coveringDesc = 'Genteng Beton Gelombang';
    } else {
      coveringQty = Math.ceil(slopedArea * 18 * 1.05); // 18 bh/m2
      coveringUnit = 'Buah';
      coveringDesc = 'Genteng Morando / Palentong Besar';
    }

    // 4. Nok / Bubungan: efektif 0.9m per nok
    const nokQty = ridgeLength > 0 ? Math.ceil(ridgeLength / 0.9) : 0;

    // 5. Lisplang GRC: papan panjang 2.40m
    const lisplangQty = Math.ceil(perimeterLisplang / 2.4);

    // 6. Sekrup / Baut Roofing: ~20 pcs per m2
    const sekrupQty = Math.ceil(slopedArea * 20);

    // Multiplier Factor
    const mult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;

    return {
      lEff,
      wEff,
      flatArea: Math.round(flatArea * mult * 100) / 100,
      pitchFactor,
      slopedArea: Math.round(slopedArea * mult * 100) / 100,
      ridgeLength: Math.round(ridgeLength * mult * 100) / 100,
      autoRidgeLength: Math.round(autoRidgeLength * mult * 100) / 100,
      perimeterLisplang: Math.round(perimeterLisplang * mult * 100) / 100,
      autoPerimeterLisplang: Math.round(autoPerimeterLisplang * mult * 100) / 100,
      sisiDepanM,
      sisiBelakangM,
      sisiKiriM,
      sisiKananM,
      talangMeter: Math.round(talangMeter * mult * 100) / 100,
      trussBatang: trussBatang * mult,
      trussMeter: Math.round(trussMeter * mult * 100) / 100,
      rengBatang: rengBatang * mult,
      rengMeter: Math.round(rengMeter * mult * 100) / 100,
      coveringQty: coveringQty * mult,
      coveringUnit,
      coveringDesc,
      nokQty: nokQty * mult,
      lisplangQty: lisplangQty * mult,
      sekrupQty: sekrupQty * mult
    };
  }, [lVal, wVal, oVal, pVal, roofType, coveringType, clusterApplyMode, clusterUnits, lisplangMode, lisplangSisiDepan, lisplangSisiBelakang, lisplangSisiKiri, lisplangSisiKanan, lisplangManualMeter, nokMode, nokManualMeter, talangManualMeter]);

  // Estimasi Biaya
  const totalCost = useMemo(() => {
    let cost = 0;
    if (sendTruss) cost += calc.trussBatang * parseNum(hargaTrussC75);
    if (sendReng) cost += calc.rengBatang * parseNum(hargaRengR32);
    if (sendCovering) cost += calc.coveringQty * parseNum(hargaPenutup);
    if (sendNok) cost += calc.nokQty * parseNum(hargaNok);
    if (sendLisplang) cost += calc.lisplangQty * parseNum(hargaLisplang);
    if (sendTalang) cost += (calc.talangMeter || 0) * parseNum(hargaTalang);
    if (sendSekrup) cost += (sekrupDispatchUnit === 'dus' ? Math.ceil(calc.sekrupQty / 500) : calc.sekrupQty) * parseNum(hargaSekrup);
    return cost;
  }, [calc, sendTruss, sendReng, sendCovering, sendNok, sendLisplang, sendTalang, sendSekrup, sekrupDispatchUnit, hargaTrussC75, hargaRengR32, hargaPenutup, hargaNok, hargaLisplang, hargaTalang, hargaSekrup]);

  // Handle Send to BoQ Divisi V (Atap)
  const handleSendToBoQ = () => {
    if (calc.slopedArea <= 0) {
      showToast("Masukkan dimensi bangunan (> 0 meter) terlebih dahulu.", "warning");
      return;
    }

    const itemsToSend = [];

    if (sendTruss && calc.trussBatang > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Baja Ringan Canai Dingin C75 (Kuda-kuda Atap ${calc.slopedArea.toFixed(1)} m²)`,
        satuan: 'Batang',
        jumlah: calc.trussBatang,
        harga: parseNum(hargaTrussC75) || 99700,
        source: 'Kalkulator Atap & Baja Ringan'
      });
    }

    if (sendReng && calc.rengBatang > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Reng Baja Ringan R.32 Tebal 0.45mm`,
        satuan: 'Batang',
        jumlah: calc.rengBatang,
        harga: parseNum(hargaRengR32) || 99700,
        source: 'Kalkulator Atap & Baja Ringan'
      });
    }

    if (sendCovering && calc.coveringQty > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `${calc.coveringDesc} (Kemiringan ${pVal}°)`,
        satuan: calc.coveringUnit,
        jumlah: calc.coveringQty,
        harga: parseNum(hargaPenutup) || 30500,
        source: 'Kalkulator Atap & Baja Ringan'
      });
    }

    if (sendNok && calc.nokQty > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Nok / Bubungan Atap (${calc.ridgeLength.toFixed(1)} m')`,
        satuan: 'Keping',
        jumlah: calc.nokQty,
        harga: parseNum(hargaNok) || 25700,
        source: 'Kalkulator Atap & Baja Ringan'
      });
    }

    if (sendLisplang && calc.lisplangQty > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Lisplang GRC / Kayu (${calc.perimeterLisplang.toFixed(1)} m')`,
        satuan: 'Lembar',
        jumlah: calc.lisplangQty,
        harga: parseNum(hargaLisplang) || 65000,
        source: 'Kalkulator Atap & Baja Ringan'
      });
    }

    if (sendTalang && calc.talangMeter > 0) {
      const btgTalang = Math.ceil((calc.talangMeter * 1.05) / 4.0);
      itemsToSend.push({
        category: 'atap',
        label: `Talang Air Hujan PVC Kotak (Batang @4m) (${calc.talangMeter.toFixed(1)} m')`,
        satuan: 'Batang',
        jumlah: btgTalang,
        harga: parseNum(hargaTalang) || 85000,
        source: 'Kalkulator Atap (Kemasan Batang Toko 4m)'
      });
    }

    if (sendSekrup && calc.sekrupQty > 0) {
      if (sekrupDispatchUnit === 'dus') {
        const dusCount = Math.ceil(calc.sekrupQty / 500);
        itemsToSend.push({
          category: 'atap',
          label: `Sekrup / Roofing Screw Baja Ringan (Dus @500 pcs)`,
          satuan: 'Dus',
          jumlah: dusCount,
          harga: parseNum(hargaSekrup) || 125000,
          source: 'Kalkulator Atap (Kemasan Dus Toko)'
        });
      } else {
        itemsToSend.push({
          category: 'atap',
          label: `Sekrup / Roofing Screw Baja Ringan`,
          satuan: 'Buah',
          jumlah: calc.sekrupQty,
          harga: parseNum(hargaSekrup) || 450,
          source: 'Kalkulator Atap & Baja Ringan'
        });
      }
    }

    if (itemsToSend.length === 0) {
      showToast("Pilih minimal satu item material untuk dikirim ke BoQ.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      // Optional reset
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
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">ROOF STRUCTURE & STEEL TRUSS</span>
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
              Kalkulator Rangka Atap Baja Ringan & Genteng
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Hitung otomatis luas bidang miring atap, kebutuhan batang Truss C75, Reng R.32, genteng metal/beton, nok, lisplang, dan langsung transfer ke BoQ Divisi V.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveMode('standard')}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
                activeMode === 'standard'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Mode Standar (Kalkulator Luas)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('studio')}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
                activeMode === 'studio'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Studio Rangka Kuda-Kuda Kreatif (2D Interaktif)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 font-bold border border-cyan-400/40">
                BARU
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER MODE STUDIO VS MODE STANDAR */}
      {activeMode === 'studio' ? (
        <RoofTrussStudio />
      ) : (
        <>
          {/* REUSABLE CLUSTER MULTIPLIER TOOLBAR */}
          <ClusterMultiplierBar 
            multiplier={clusterUnits}
            onChange={updateClusterUnits}
            applyMode={clusterApplyMode}
            onToggleApplyMode={setClusterApplyMode}
            unitLabel="Atap Unit Cluster / Kavling"
          />

      {/* Main Grid: Inputs + Blueprint Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Parameters (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Pilihan Tipe Atap & Penutup */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-5">
            <div>
              <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 flex items-center gap-2">
                1. Tipe Bentuk Atap & Penutup
              </h2>
              <p className="text-xs text-slate-500">Pilih model arsitektural dan spesifikasi material penutup atap.</p>
            </div>

            {/* Model Atap Buttons */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-2">Model Bentuk Atap</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'pelana', label: 'Pelana', desc: 'Gable (2 Lereng)' },
                  { id: 'limasan', label: 'Limasan', desc: 'Hip (4 Lereng)' },
                  { id: 'miring', label: 'Miring / Shed', desc: '1 Lereng Sandar' },
                  { id: 'datar', label: 'Datar / Kanopi', desc: 'Low Slope' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRoofType(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      roofType === item.id 
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-400' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`font-bold text-xs ${roofType === item.id ? 'text-amber-900' : 'text-slate-900'}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Penutup Atap Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-2">Jenis Penutup Atap</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'metal_pasir', label: 'Genteng Metal', sub: 'Berpasir 2×4' },
                  { id: 'spandek', label: 'Spandek', sub: 'Galvalum 0.35' },
                  { id: 'genteng_beton', label: 'Genteng Beton', sub: '9.8 bh / m²' },
                  { id: 'genteng_morando', label: 'Morando', sub: '18 bh / m²' }
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCoveringType(c.id);
                      if (c.id === 'metal_pasir') setHargaPenutup('30500');
                      if (c.id === 'spandek') setHargaPenutup('49300');
                      if (c.id === 'genteng_beton') setHargaPenutup('7900');
                      if (c.id === 'genteng_morando') setHargaPenutup('5300');
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      coveringType === c.id 
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`font-bold text-xs ${coveringType === c.id ? 'text-blue-950' : 'text-slate-900'}`}>{c.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Dimensi & Sudut Kemiringan */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-5">
            <div>
              <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 flex items-center gap-2">
                2. Dimensi Denah & Sudut Kemiringan
              </h2>
              <p className="text-xs text-slate-500">Masukkan ukuran bangunan dalam meter dan sudut kemiringan kuda-kuda.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Panjang Denah (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  placeholder="12.0"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Lebar Denah (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  placeholder="8.0"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Tritisan Overstek (m)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={overhang}
                  onChange={(e) => setOverhang(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  placeholder="0.8"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Sudut Kemiringan (°)</label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="60"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  placeholder="30"
                />
              </div>
            </div>

            {/* Quick Angle Badges */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[10px] text-slate-400">Rekomendasi Sudut:</span>
              {[25, 30, 35, 40].map(deg => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setPitch(deg.toString())}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    pVal === deg 
                      ? 'bg-amber-500 text-slate-950 font-black' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Daftar Item Material & Checkbox Kirim ke BoQ */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 flex items-center gap-2">
                  3. Rincian Material & Pengiriman ke BoQ
                </h2>
                <p className="text-xs text-slate-500">Pilih item yang ingin ditambahkan ke anggaran pekerjaan atap.</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Estimasi Biaya Atap</span>
                <span className="text-sm sm:text-base font-black font-mono text-emerald-600">
                  {formatRp(totalCost)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              
              {/* Item 1: Truss C75 */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendTruss}
                    onChange={(e) => setSendTruss(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Baja Ringan Truss C75.75 (Kuda-kuda Utama)</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {calc.trussMeter.toFixed(1)} m' &bull; <strong>{calc.trussBatang} Batang</strong> (panjang 6m)
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaTrussC75}
                    onChange={(e) => setHargaTrussC75(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / Batang</span>
                </div>
              </div>

              {/* Item 2: Reng R32 */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendReng}
                    onChange={(e) => setSendReng(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Reng Baja Ringan R.32 (0.45mm)</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {calc.rengMeter.toFixed(1)} m' &bull; <strong>{calc.rengBatang} Batang</strong> (panjang 6m)
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaRengR32}
                    onChange={(e) => setHargaRengR32(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / Batang</span>
                </div>
              </div>

              {/* Item 3: Penutup Atap */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendCovering}
                    onChange={(e) => setSendCovering(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{calc.coveringDesc}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Kebutuhan: <strong>{calc.coveringQty} {calc.coveringUnit}</strong>
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaPenutup}
                    onChange={(e) => setHargaPenutup(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / {calc.coveringUnit}</span>
                </div>
              </div>

              {/* Item 4: Nok / Bubungan */}
              <div className="p-3.5 bg-white hover:bg-slate-50/80 transition-all space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={sendNok}
                      onChange={(e) => setSendNok(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>Nok / Bubungan Puncak Atap</span>
                        {nokMode === 'manual' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                            Manual Meter
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Panjang <strong>{calc.ridgeLength.toFixed(1)} m'</strong> &bull; <strong>{calc.nokQty} Buah</strong>
                      </div>
                    </div>
                  </label>
                  <div className="w-28">
                    <input
                      type="number"
                      value={hargaNok}
                      onChange={(e) => setHargaNok(e.target.value)}
                      className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-[9px] text-slate-400 text-right block">Rp / Buah</span>
                  </div>
                </div>

                {sendNok && (
                  <div className="ml-7 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNokMode(prev => prev === 'auto' ? 'manual' : 'auto')}
                      className="text-[10.5px] font-mono text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {nokMode === 'auto' ? '✏️ Ingin custom panjang nok manual?' : '🔄 Kembalikan ke panjang otomatis'}
                    </button>
                    {nokMode === 'manual' && (
                      <div className="flex items-center gap-1.5 ml-1 animate-fadeIn">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={nokManualMeter}
                          onChange={e => setNokManualMeter(e.target.value)}
                          placeholder="mis. 8.5"
                          className="w-20 px-2 py-0.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-mono text-slate-500">meter lari</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Item 5: Lisplang GRC / Kayu dengan Kustomisasi Sisi */}
              <div className="p-3.5 bg-white hover:bg-slate-50/80 transition-all space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={sendLisplang}
                      onChange={(e) => setSendLisplang(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>Lisplang GRC / Kayu</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {lisplangMode === 'sides' ? '🎯 Pilihan Sisi Aktif' : lisplangMode === 'manual' ? '✏️ Manual Meter' : '🔄 4 Sisi Keliling'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Panjang <strong>{calc.perimeterLisplang.toFixed(1)} m'</strong> &bull; <strong>{calc.lisplangQty} Lembar</strong> (papan 2.4m)
                      </div>
                    </div>
                  </label>
                  <div className="w-28">
                    <input
                      type="number"
                      value={hargaLisplang}
                      onChange={(e) => setHargaLisplang(e.target.value)}
                      className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-[9px] text-slate-400 text-right block">Rp / Lembar</span>
                  </div>
                </div>

                {/* Sub-panel Kustomisasi Sisi Lisplang */}
                {sendLisplang && (
                  <div className="ml-7 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10.5px] font-mono font-bold text-slate-700 uppercase tracking-wide">
                        Mode Perhitungan Sisi Lisplang:
                      </span>
                      <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={() => setLisplangMode('auto')}
                          className={`px-2 py-1 rounded-md transition-all ${lisplangMode === 'auto' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Keliling 4 Sisi
                        </button>
                        <button
                          type="button"
                          onClick={() => setLisplangMode('sides')}
                          className={`px-2 py-1 rounded-md transition-all ${lisplangMode === 'sides' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Pilih Sisi Tertentu
                        </button>
                        <button
                          type="button"
                          onClick={() => setLisplangMode('manual')}
                          className={`px-2 py-1 rounded-md transition-all ${lisplangMode === 'manual' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Input Meter Langsung
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Pilih Sisi Tertentu (Sangat pas untuk rumah cluster!) */}
                    {lisplangMode === 'sides' && (
                      <div className="space-y-2 pt-1 border-t border-slate-200/80 animate-fadeIn">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${lisplangSisiDepan ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="checkbox"
                              checked={lisplangSisiDepan}
                              onChange={e => setLisplangSisiDepan(e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <div className="text-[11px] leading-tight">
                              <div>Sisi Depan</div>
                              <div className="text-[9.5px] font-mono text-slate-500">{calc.sisiDepanM.toFixed(1)} m</div>
                            </div>
                          </label>

                          <label className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${lisplangSisiBelakang ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="checkbox"
                              checked={lisplangSisiBelakang}
                              onChange={e => setLisplangSisiBelakang(e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <div className="text-[11px] leading-tight">
                              <div>Sisi Belakang</div>
                              <div className="text-[9.5px] font-mono text-slate-500">{calc.sisiBelakangM.toFixed(1)} m</div>
                            </div>
                          </label>

                          <label className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${lisplangSisiKiri ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="checkbox"
                              checked={lisplangSisiKiri}
                              onChange={e => setLisplangSisiKiri(e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <div className="text-[11px] leading-tight">
                              <div>Samping Kiri</div>
                              <div className="text-[9.5px] font-mono text-slate-500">{calc.sisiKiriM.toFixed(1)} m</div>
                            </div>
                          </label>

                          <label className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${lisplangSisiKanan ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="checkbox"
                              checked={lisplangSisiKanan}
                              onChange={e => setLisplangSisiKanan(e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <div className="text-[11px] leading-tight">
                              <div>Samping Kanan</div>
                              <div className="text-[9.5px] font-mono text-slate-500">{calc.sisiKananM.toFixed(1)} m</div>
                            </div>
                          </label>
                        </div>
                        <p className="text-[10.5px] text-slate-500 italic">
                          💡 <em>Tips Cluster:</em> Rumah deret/kopel yang sisi sampingnya menempel dinding tetangga cukup mencentang <strong>Sisi Depan</strong> dan <strong>Sisi Belakang</strong> saja.
                        </p>
                      </div>
                    )}

                    {/* Mode 2: Input Manual Meter */}
                    {lisplangMode === 'manual' && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80 animate-fadeIn">
                        <label className="text-[11px] text-slate-700 font-mono">Panjang Lisplang Custom:</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={lisplangManualMeter}
                          onChange={e => setLisplangManualMeter(e.target.value)}
                          placeholder="mis. 14.5"
                          className="w-24 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-xs font-mono text-slate-500">meter lari</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Item 6: Talang Air Hujan / Seng Jurai (Opsional) */}
              <div className="p-3.5 bg-white hover:bg-slate-50/80 transition-all space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={sendTalang}
                      onChange={(e) => setSendTalang(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>Talang Air Hujan / Seng Jurai Atap</span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Opsional
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Panjang <strong>{(calc.talangMeter || 0).toFixed(1)} m'</strong>
                      </div>
                    </div>
                  </label>
                  <div className="w-28">
                    <input
                      type="number"
                      value={hargaTalang}
                      onChange={(e) => setHargaTalang(e.target.value)}
                      className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                    />
                    <span className="text-[9px] text-slate-400 text-right block">Rp / m'</span>
                  </div>
                </div>

                {sendTalang && (
                  <div className="ml-7 flex items-center gap-2 text-xs animate-fadeIn">
                    <label className="text-[11px] font-mono text-slate-600">Panjang Talang Air:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={talangManualMeter}
                      onChange={e => setTalangManualMeter(e.target.value)}
                      placeholder="mis. 12"
                      className="w-24 px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-mono text-slate-500">meter lari</span>
                  </div>
                )}
              </div>

              {/* Item 7: Sekrup Roofing */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
checked={sendSekrup}
                    onChange={(e) => setSendSekrup(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                    <div>
                      <div className="font-bold text-slate-900">Sekrup / Baut Roofing Baja Ringan</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>Kebutuhan: <strong>{calc.sekrupQty} Buah</strong> ({Math.ceil(calc.sekrupQty / 500)} Dus)</span>
                        <div className="inline-flex rounded bg-slate-200 p-0.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setSekrupDispatchUnit('buah')}
                            className={`px-1.5 py-0.5 rounded font-bold ${sekrupDispatchUnit === 'buah' ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                          >
                            Buah
                          </button>
                          <button
                            type="button"
                            onClick={() => setSekrupDispatchUnit('dus')}
                            className={`px-1.5 py-0.5 rounded font-bold ${sekrupDispatchUnit === 'dus' ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                          >
                            Dus (@500)
                          </button>
                        </div>
                      </div>
                    </div>
                </label>
                <div className="w-32">
                  <input
                    type="number"
                    value={hargaSekrup}
                    onChange={(e) => setHargaSekrup(e.target.value)}
                    placeholder={sekrupDispatchUnit === 'dus' ? 'mis. 125000' : 'mis. 450'}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">
                    {sekrupDispatchUnit === 'dus' ? 'Rp / Dus @500' : 'Rp / Buah'}
                  </span>
                </div>
              </div>

            </div>

            {/* Tombol Kirim ke BoQ */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendToBoQ}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Material Terpilih ke BoQ (Divisi V - Atap)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Visual Blueprint & Geometrical Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Blueprint SVG Card */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="font-heading font-black text-xs uppercase tracking-wider text-slate-200">
                  Visual Skematik Atap (2D Blueprint)
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                Model: {roofType.toUpperCase()}
              </span>
            </div>

            {/* SVG Render */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center justify-center min-h-[220px]">
              <svg viewBox="0 0 360 220" className="w-full h-auto select-none max-h-[200px]">
                {/* Architectural Grid Background */}
                <defs>
                  <pattern id="roofGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="360" height="220" fill="url(#roofGrid)" />

                {/* Overhang Outline (Tritisan) */}
                <rect 
                  x="40" 
                  y="30" 
                  width="280" 
                  height="160" 
                  fill="none" 
                  stroke="#64748b" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4"
                />

                {/* Building Wall Outline */}
                <rect 
                  x="60" 
                  y="50" 
                  width="240" 
                  height="120" 
                  fill="rgba(59, 130, 246, 0.08)" 
                  stroke="#3b82f6" 
                  strokeWidth="2" 
                />

                {/* Roof Lines based on roofType */}
                {roofType === 'pelana' && (
                  <g>
                    {/* Main Ridge Line (Nok Tengah) */}
                    <line x1="40" y1="110" x2="320" y2="110" stroke="#f59e0b" strokeWidth="3" />
                    {/* Ridge Circles */}
                    <circle cx="40" cy="110" r="4" fill="#f59e0b" />
                    <circle cx="320" cy="110" r="4" fill="#f59e0b" />
                    {/* Slope Arrows */}
                    <path d="M 180 85 L 180 65 M 175 70 L 180 65 L 185 70" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
                    <path d="M 180 135 L 180 155 M 175 150 L 180 155 L 185 150" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
                    <text x="180" y="118" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                      NOK PUNCAK ({calc.lEff.toFixed(1)}m)
                    </text>
                  </g>
                )}

                {roofType === 'limasan' && (
                  <g>
                    {/* Central Ridge */}
                    <line x1="120" y1="110" x2="240" y2="110" stroke="#f59e0b" strokeWidth="3" />
                    {/* 4 Hip Hips (Jurai Luar) */}
                    <line x1="40" y1="30" x2="120" y2="110" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="40" y1="190" x2="120" y2="110" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="320" y1="30" x2="240" y2="110" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="320" y1="190" x2="240" y2="110" stroke="#f59e0b" strokeWidth="2" />
                    <text x="180" y="105" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                      NOK UTAMA
                    </text>
                  </g>
                )}

                {roofType === 'miring' && (
                  <g>
                    {/* Shed Top Ridge */}
                    <line x1="40" y1="30" x2="320" y2="30" stroke="#f59e0b" strokeWidth="3" />
                    {/* Downward Slope Arrow */}
                    <path d="M 180 70 L 180 150 M 172 142 L 180 150 L 188 142" stroke="#f59e0b" strokeWidth="2" fill="none" />
                    <text x="180" y="110" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      Kemiringan {pVal}°
                    </text>
                  </g>
                )}

                {roofType === 'datar' && (
                  <g>
                    <line x1="40" y1="30" x2="320" y2="190" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="190" x2="320" y2="30" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="180" y="115" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">
                      Datar / Dak Kanopi
                    </text>
                  </g>
                )}

                {/* Dimension Annotations */}
                <text x="180" y="22" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Panjang Atap: {calc.lEff.toFixed(1)} m
                </text>
                <text x="25" y="115" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 25 115)">
                  Lebar: {calc.wEff.toFixed(1)} m
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-blue-500/20 border border-blue-400 rounded-sm"></span> Dinding Bangunan
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-500"></span> Nok / Jurai Puncak
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 border border-dashed border-slate-500"></span> Tritisan ({oVal}m)
              </span>
            </div>
          </div>

          {/* Geometrical KPI Summary Cards */}
          <div className="bg-white rounded-3xl p-5 border border-paper-300 shadow-xl space-y-3">
            <h3 className="font-heading font-black text-xs text-slate-900 uppercase tracking-wider">
              Ringkasan Perhitungan Geometris Atap
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Luas Bidang Miring</span>
                <span className="text-xl font-black font-mono text-amber-950">
                  {calc.slopedArea.toFixed(2)} m²
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5 font-mono">
                  Datar: {calc.flatArea.toFixed(1)} m²
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Faktor Kemiringan</span>
                <span className="text-xl font-black font-mono text-blue-950">
                  {calc.pitchFactor.toFixed(3)}
                </span>
                <span className="text-[10px] text-blue-700 block mt-0.5 font-mono">
                  1 / cos({pVal}°)
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Panjang Garis Nok</span>
                <span className="text-lg font-black font-mono text-slate-800">
                  {calc.ridgeLength.toFixed(1)} m'
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {calc.nokQty} keping bubungan
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Keliling Lisplang</span>
                <span className="text-lg font-black font-mono text-slate-800">
                  {calc.perimeterLisplang.toFixed(1)} m'
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {calc.lisplangQty} lembar papan
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Kebutuhan batang Truss C75 dan Reng R.32 dihitung berdasarkan pedoman SNI baja ringan dengan faktor cadangan (*waste*) 5%.
              </span>
            </div>
          </div>

        </div>

      </div>
      </>
      )}

    </div>
  );
}
