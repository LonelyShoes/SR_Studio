import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { CONCRETE_MIX, DENSITIES } from '../../data/calculatorConstants';
import { formatNumber, parseNum, formatRp } from '../../utils/formatters';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { StructuralCrossSectionVisualizer } from '../common/StructuralCrossSectionVisualizer';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';
import { 
  ArrowLeft, 
  Layers, 
  Plus, 
  Trash2, 
  Send, 
  Droplet, 
  Sparkles,
  Info,
  Sliders,
  Check,
  Building,
  Maximize2
} from 'lucide-react';

export function ConcreteCalculator() {
  const { 
    setActiveTab, 
    queueCalculatedItems, 
    showToast, 
    clusterUnits, 
    updateClusterUnits, 
    clusterTypology, 
    clusterRowUnits 
  } = useBoQ();

  const [currentMutu, setCurrentMutu] = usePersistentState('sr_calc_cc_mutu', 'K250');
  // 'sloof' | 'kolom' | 'balok' | 'pelat' | 'tangga' | 'volume'
  const [currentType, setCurrentType] = usePersistentState('sr_calc_cc_type', 'sloof');

  // Input states - Sloof & Balok
  const [inPanjang, setInPanjang] = usePersistentState('sr_calc_cc_in_p', '');
  const [inLebar, setInLebar] = usePersistentState('sr_calc_cc_in_l', '');
  const [inTinggi, setInTinggi] = usePersistentState('sr_calc_cc_in_t', '');
  const [inJumlah, setInJumlah] = usePersistentState('sr_calc_cc_in_jml', '1');

  // Input states - Kolom
  const [inKolomLebar, setInKolomLebar] = usePersistentState('sr_calc_cc_kol_l', '');
  const [inKolomTebal, setInKolomTebal] = usePersistentState('sr_calc_cc_kol_t', '');
  const [inKolomTinggi, setInKolomTinggi] = usePersistentState('sr_calc_cc_kol_h', '');
  const [inKolomJumlah, setInKolomJumlah] = usePersistentState('sr_calc_cc_kol_jml', '1');

  // Input states - Pelat Lantai Bertingkat
  const [inPelatPanjang, setInPelatPanjang] = usePersistentState('sr_calc_cc_plt_p', '');
  const [inPelatLebar, setInPelatLebar] = usePersistentState('sr_calc_cc_plt_l', '');
  const [inPelatTebal, setInPelatTebal] = usePersistentState('sr_calc_cc_plt_t', '12'); // cm
  const [inPelatMetode, setInPelatMetode] = usePersistentState('sr_calc_cc_plt_metode', 'bondek'); // 'bondek' | 'konvensional'
  const [inPelatJumlah, setInPelatJumlah] = usePersistentState('sr_calc_cc_plt_jml', '1');

  // Input states - Tangga Beton Bertingkat
  const [inTanggaTinggi, setInTanggaTinggi] = usePersistentState('sr_calc_cc_tg_h', '3.6'); // Tinggi antar lantai (m)
  const [inTanggaLebar, setInTanggaLebar] = usePersistentState('sr_calc_cc_tg_l', '1.0');   // Lebar tangga (m)
  const [inTanggaTebalPelat, setInTanggaTebalPelat] = usePersistentState('sr_calc_cc_tg_t', '12'); // Tebal pelat tangga (cm)
  const [inTanggaBordesArea, setInTanggaBordesArea] = usePersistentState('sr_calc_cc_tg_bordes', '1.0'); // Luas bordes (m2)
  const [inTanggaJumlah, setInTanggaJumlah] = usePersistentState('sr_calc_cc_tg_jml', '1');

  // Input states - Direct Volume
  const [inDirectVol, setInDirectVol] = usePersistentState('sr_calc_cc_dir_vol', '');
  const [inDirectJumlah, setInDirectJumlah] = usePersistentState('sr_calc_cc_dir_jml', '1');

  // Shared boundary element toggle
  const [inIsBoundary, setInIsBoundary] = usePersistentState('sr_calc_cc_is_boundary', false);

  const [formMsg, setFormMsg] = useState('');
  const [elements, setElements] = usePersistentState('sr_calc_cc_elements', []);

  // Cluster Multiplier Mode ('multiplied' | 'single')
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_cc_cluster_mode', 'multiplied');

  // Checkbox selection for sending to BoQ
  const [sendSemen, setSendSemen] = usePersistentState('sr_calc_cc_send_semen', true);
  const [sendPasir, setSendPasir] = usePersistentState('sr_calc_cc_send_pasir', true);
  const [sendKerikil, setSendKerikil] = usePersistentState('sr_calc_cc_send_kerikil', true);
  const [sendBondek, setSendBondek] = usePersistentState('sr_calc_cc_send_bondek', true);
  const [sendWiremesh, setSendWiremesh] = usePersistentState('sr_calc_cc_send_wiremesh', true);
  const [sendBekisting, setSendBekisting] = usePersistentState('sr_calc_cc_send_bekisting', false);
  const [agregatDispatchUnit, setAgregatDispatchUnit] = usePersistentState('sr_calc_cc_agregat_unit', 'm3'); // 'm3' | 'rit'

  // Optional custom unit prices (Rp)
  const [hargaSemen, setHargaSemen] = usePersistentState('sr_calc_cc_harga_semen', '');
  const [hargaPasir, setHargaPasir] = usePersistentState('sr_calc_cc_harga_pasir', '');
  const [hargaKerikil, setHargaKerikil] = usePersistentState('sr_calc_cc_harga_kerikil', '');
  const [hargaBondek, setHargaBondek] = usePersistentState('sr_calc_cc_harga_bondek', '125000'); // Rp / m2
  const [hargaWiremesh, setHargaWiremesh] = usePersistentState('sr_calc_cc_harga_wiremesh', '550000'); // Rp / lembar M8
  const [hargaBekisting, setHargaBekisting] = usePersistentState('sr_calc_cc_harga_bekisting', '165000'); // Rp / m2

  // Add Element
  const handleAddElement = (e) => {
    e.preventDefault();
    setFormMsg('');

    let volume = 0;
    let dimText = '';
    let qty = 1;
    let label = '';
    let bondek = 0;
    let wiremesh = 0;
    let bekisting = 0;

    if (currentType === 'sloof' || currentType === 'balok') {
      const p = parseNum(inPanjang);
      const l = parseNum(inLebar);
      const t = parseNum(inTinggi);
      qty = parseInt(inJumlah, 10) || 1;

      if (p <= 0 || l <= 0 || t <= 0) {
        setFormMsg('Isi panjang, lebar, dan tinggi penampang dengan angka > 0.');
        return;
      }
      volume = p * (l / 100) * (t / 100) * qty;
      dimText = `${p} m × ${l}/${t} cm`;
      label = currentType === 'sloof' ? 'Sloof' : 'Balok';
      bekisting = (2 * (t / 100) * p) * qty; // 2 sisi bekisting
    } else if (currentType === 'kolom') {
      const l = parseNum(inKolomLebar);
      const tb = parseNum(inKolomTebal);
      const h = parseNum(inKolomTinggi);
      qty = parseInt(inKolomJumlah, 10) || 1;

      if (l <= 0 || tb <= 0 || h <= 0) {
        setFormMsg('Isi lebar, tebal, dan tinggi kolom dengan angka > 0.');
        return;
      }
      volume = (l / 100) * (tb / 100) * h * qty;
      dimText = `${l}/${tb} cm × ${h} m`;
      label = 'Kolom';
      bekisting = (2 * (l + tb) / 100 * h) * qty; // 4 sisi bekisting
    } else if (currentType === 'pelat') {
      const p = parseNum(inPelatPanjang);
      const l = parseNum(inPelatLebar);
      const t = parseNum(inPelatTebal) || 12;
      qty = parseInt(inPelatJumlah, 10) || 1;

      if (p <= 0 || l <= 0 || t <= 0) {
        setFormMsg('Isi panjang, lebar, dan tebal pelat lantai dengan angka > 0.');
        return;
      }

      const area = p * l * qty;
      volume = area * (t / 100);
      dimText = `${p}m × ${l}m × ${t}cm (${inPelatMetode.toUpperCase()})`;
      label = 'Pelat Lantai Bertingkat';

      if (inPelatMetode === 'bondek') {
        bondek = area;
        wiremesh = Math.ceil(area / 10); // 1 lembar wiremesh 2.1x5.4m ~10m2 efektif
      } else {
        bekisting = area;
      }
    } else if (currentType === 'tangga') {
      const h = parseNum(inTanggaTinggi) || 3.6;
      const w = parseNum(inTanggaLebar) || 1.0;
      const t = parseNum(inTanggaTebalPelat) || 12;
      const bordes = parseNum(inTanggaBordesArea) || 1.0;
      qty = parseInt(inTanggaJumlah, 10) || 1;

      if (h <= 0 || w <= 0) {
        setFormMsg('Isi tinggi antar lantai dan lebar tangga dengan angka > 0.');
        return;
      }

      // Standar arsitektur: optrede ~18cm, antrede ~30cm
      const optrede = 0.18;
      const antrede = 0.30;
      const numSteps = Math.max(1, Math.round(h / optrede));
      const actualOptrede = h / numSteps;
      const slopedLength = Math.sqrt(Math.pow(numSteps * antrede, 2) + Math.pow(h, 2));

      // 1. Volume Pelat Miring
      const volPelat = slopedLength * w * (t / 100);
      // 2. Volume Prisma Segitiga Anak Tangga
      const volSteps = numSteps * (0.5 * actualOptrede * antrede * w);
      // 3. Volume Bordes Datar
      const volBordes = bordes * (t / 100);

      volume = (volPelat + volSteps + volBordes) * qty;
      dimText = `T. ${h}m, L. ${w}m (${numSteps} Trap + Bordes)`;
      label = 'Tangga Beton Bertingkat';
      bekisting = (slopedLength * w + bordes + (numSteps * actualOptrede * w)) * qty;
    } else if (currentType === 'volume') {
      const v = parseNum(inDirectVol);
      qty = parseInt(inDirectJumlah, 10) || 1;

      if (v <= 0) {
        setFormMsg('Isi volume beton dengan angka > 0.');
        return;
      }
      volume = v * qty;
      dimText = `${formatNumber(v, 2)} m³ langsung`;
      label = 'Volume Langsung';
    }

    const isBoundary = (currentType === 'sloof' || currentType === 'kolom' || currentType === 'balok') && inIsBoundary;

    setElements(prev => [
      ...prev, 
      { 
        id: Date.now(), 
        type: label, 
        dimText, 
        jumlah: qty, 
        volume,
        bondek,
        wiremesh,
        bekisting,
        isSharedBoundary: isBoundary
      }
    ]);
    
    // Clear inputs
    setInPanjang('');
    setInLebar('');
    setInTinggi('');
    setInJumlah('1');
    setInKolomLebar('');
    setInKolomTebal('');
    setInKolomTinggi('');
    setInKolomJumlah('1');
    setInPelatPanjang('');
    setInPelatLebar('');
    setInDirectVol('');
    setInDirectJumlah('1');
    setInIsBoundary(false);
  };

  const handleDeleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  // Base Single-Unit Calculations
  const baseVolume = useMemo(() => {
    return elements.reduce((acc, el) => acc + el.volume, 0);
  }, [elements]);

  const baseBondek = useMemo(() => {
    return elements.reduce((acc, el) => acc + (el.bondek || 0), 0);
  }, [elements]);

  const baseWiremesh = useMemo(() => {
    return elements.reduce((acc, el) => acc + (el.wiremesh || 0), 0);
  }, [elements]);

  const baseBekisting = useMemo(() => {
    return elements.reduce((acc, el) => acc + (el.bekisting || 0), 0);
  }, [elements]);

  // Effective Multiplier Factor & Shared Wall Calculation
  const effectiveMultiplier = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
  const rowN = Math.max(2, clusterRowUnits || 4);
  const sharedRatio = (rowN + 1) / (2 * rowN); // e.g. row 4 -> 0.625

  // Multiplied Calculations with per-element shared boundary scaling
  const totalVolume = useMemo(() => {
    return elements.reduce((acc, el) => {
      const mult = (clusterApplyMode === 'multiplied' && clusterTypology === 'shared' && el.isSharedBoundary)
        ? effectiveMultiplier * sharedRatio
        : effectiveMultiplier;
      return acc + (el.volume * mult);
    }, 0);
  }, [elements, effectiveMultiplier, clusterApplyMode, clusterTypology, sharedRatio]);

  const volumeHematShared = useMemo(() => {
    if (clusterTypology !== 'shared' || clusterApplyMode !== 'multiplied' || effectiveMultiplier <= 1) return 0;
    const doubleVol = elements.reduce((acc, el) => acc + (el.volume * effectiveMultiplier), 0);
    return Math.max(0, doubleVol - totalVolume);
  }, [elements, effectiveMultiplier, clusterApplyMode, clusterTypology, totalVolume]);

  const totalBondek = baseBondek * effectiveMultiplier;
  const totalWiremesh = baseWiremesh * effectiveMultiplier;

  const totalBekisting = useMemo(() => {
    return elements.reduce((acc, el) => {
      const mult = (clusterApplyMode === 'multiplied' && clusterTypology === 'shared' && el.isSharedBoundary)
        ? effectiveMultiplier * sharedRatio
        : effectiveMultiplier;
      return acc + ((el.bekisting || 0) * mult);
    }, 0);
  }, [elements, effectiveMultiplier, clusterApplyMode, clusterTypology, sharedRatio]);

  const mix = CONCRETE_MIX[currentMutu];
  const semenKg = totalVolume * mix.semen;
  const semenZak = Math.ceil(semenKg / DENSITIES.ZAK_SEMEN);

  const pasirKg = totalVolume * mix.pasir;
  const pasirM3 = pasirKg / DENSITIES.PASIR;

  const kerikilKg = totalVolume * mix.kerikil;
  const kerikilM3 = kerikilKg / DENSITIES.KERIKIL;

  const airL = totalVolume * mix.air;

  // Composition % by weight
  const totalWeight = semenKg + pasirKg + kerikilKg;
  const pctSemen = totalWeight > 0 ? (semenKg / totalWeight) * 100 : 0;
  const pctPasir = totalWeight > 0 ? (pasirKg / totalWeight) * 100 : 0;
  const pctKerikil = totalWeight > 0 ? (kerikilKg / totalWeight) * 100 : 0;

  // Dispatch to BoQ
  const handleSendToBoQ = () => {
    if (totalVolume <= 0) {
      showToast("Tambahkan minimal satu elemen beton dengan dimensi/volume > 0 sebelum mengirim.", "warning");
      return;
    }

    const pSemen = parseNum(hargaSemen);
    const pPasir = parseNum(hargaPasir);
    const pKerikil = parseNum(hargaKerikil);
    const pBondek = parseNum(hargaBondek) || 125000;
    const pWiremesh = parseNum(hargaWiremesh) || 550000;
    const pBekisting = parseNum(hargaBekisting) || 165000;

    const clusterSuffix = effectiveMultiplier > 1
      ? (clusterTypology === 'shared'
          ? ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Bersama]`
          : ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Ganda]`)
      : '';
    const itemsToSend = [];

    if (sendSemen && semenZak > 0) {
      itemsToSend.push({
        category: 'struktur',
        label: `Semen Portland (${currentMutu})${clusterSuffix}`,
        satuan: 'Sak',
        jumlah: semenZak,
        harga: pSemen,
        source: `Kalkulator Cor Beton (${currentMutu})`
      });
    }

    if (sendPasir && pasirM3 > 0) {
      if (agregatDispatchUnit === 'rit') {
        const ritPasir = +(pasirM3 / 6).toFixed(1);
        itemsToSend.push({
          category: 'struktur',
          label: `Pasir Beton (${currentMutu}) — Rit Dump Truck (~6m³)${clusterSuffix}`,
          satuan: 'Rit',
          jumlah: ritPasir,
          harga: parseNum(hargaPasir) || 1650000,
          source: `Kalkulator Cor Beton (${currentMutu})`
        });
      } else {
        itemsToSend.push({
          category: 'struktur',
          label: `Pasir Beton (${currentMutu})${clusterSuffix}`,
          satuan: 'm³',
          jumlah: +pasirM3.toFixed(2),
          harga: parseNum(hargaPasir) || 380000,
          source: `Kalkulator Cor Beton (${currentMutu})`
        });
      }
    }

    if (sendKerikil && kerikilM3 > 0) {
      if (agregatDispatchUnit === 'rit') {
        const ritKerikil = +(kerikilM3 / 6).toFixed(1);
        itemsToSend.push({
          category: 'struktur',
          label: `Agregat Kasar / Kerikil Split (${currentMutu}) — Rit Dump Truck (~6m³)${clusterSuffix}`,
          satuan: 'Rit',
          jumlah: ritKerikil,
          harga: parseNum(hargaKerikil) || 1750000,
          source: `Kalkulator Cor Beton (${currentMutu})`
        });
      } else {
        itemsToSend.push({
          category: 'struktur',
          label: `Agregat Kasar / Kerikil Split (${currentMutu})${clusterSuffix}`,
          satuan: 'm³',
          jumlah: +kerikilM3.toFixed(2),
          harga: parseNum(hargaKerikil) || 380000,
          source: `Kalkulator Cor Beton (${currentMutu})`
        });
      }
    }

    if (sendBondek && totalBondek > 0) {
      itemsToSend.push({
        category: 'struktur',
        label: `Steel Floor Decking / Bondek 0.75mm (Pelat Lantai)${clusterSuffix}`,
        satuan: 'm²',
        jumlah: +totalBondek.toFixed(2),
        harga: pBondek,
        source: `Kalkulator Cor Beton (Pelat Bertingkat)`
      });
    }

    if (sendWiremesh && totalWiremesh > 0) {
      itemsToSend.push({
        category: 'struktur',
        label: `Wiremesh M8 / M10 Lembar (2.1×5.4m)${clusterSuffix}`,
        satuan: 'Lembar',
        jumlah: totalWiremesh,
        harga: pWiremesh,
        source: `Kalkulator Cor Beton (Pelat Bertingkat)`
      });
    }

    if (sendBekisting && totalBekisting > 0) {
      itemsToSend.push({
        category: 'struktur',
        label: `Bekisting Balok / Pelat / Tangga${clusterSuffix}`,
        satuan: 'm²',
        jumlah: +totalBekisting.toFixed(2),
        harga: pBekisting,
        source: `Kalkulator Cor Beton`
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu bahan beton dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      setElements([]);
      showToast(`Bahan cor beton (${effectiveMultiplier} unit) berhasil dikirim ke antrian BoQ.`, "success");
    });
  };

  return (
    <div className="space-y-6 pb-28 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-4 sm:p-7 border border-slate-800 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">CONCRETE STRUCTURE & MIX</span>
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
              Kalkulator Campuran & Struktur Beton
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Hitung kebutuhan sloof, kolom, balok, pelat lantai bertingkat (bondek/wiremesh), serta tangga beton presisi SNI 03-2834.
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
        unitLabel="Pintu / Kavling Cluster"
      />

      {/* 01. PILIH MUTU BETON */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Pilih Mutu Beton
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Pilih kelas mutu karakteristik sesuai kebutuhan kekuatan konstruksi (SNI 03-2834).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.keys(CONCRETE_MIX).map(mutu => (
            <button
              key={mutu}
              type="button"
              onClick={() => setCurrentMutu(mutu)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                currentMutu === mutu
                  ? 'border-blueprint-600 bg-blueprint-50/70 shadow-sm ring-1 ring-blueprint-500'
                  : 'border-paper-300 bg-paper-50 hover:bg-paper-100 text-paper-700'
              }`}
            >
              <div className="font-heading font-bold text-sm text-paper-900">{mutu}</div>
              <div className="text-[10px] text-paper-500 font-mono mt-0.5">
                {CONCRETE_MIX[mutu].desc || 'Standar Struktural'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 02. INPUT DIMENSI ELEMEN STRUKTUR */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Dimensi Elemen Beton
          </h2>
        </div>
        <p className="text-xs text-paper-600 ml-8.5">
          Pilih tipe struktur: Sloof, Kolom, Balok, <strong>Pelat Lantai Bertingkat (Bondek)</strong>, atau <strong>Tangga Beton Bertingkat</strong>.
        </p>

        {/* Type pills with 2 NEW MULTI-STOREY BUTTONS */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: 'sloof', label: 'Sloof Dasar' },
            { id: 'kolom', label: 'Kolom Struktur' },
            { id: 'balok', label: 'Balok Lantai' },
            { id: 'pelat', label: '🏢 Pelat Lantai (Bondek/Cor)' },
            { id: 'tangga', label: '🪜 Tangga Beton Bertingkat' },
            { id: 'volume', label: 'Volume Langsung (m³)' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setCurrentType(t.id); setFormMsg(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold font-display transition-all ${
                currentType === t.id
                  ? 'bg-blueprint-600 text-white shadow-md shadow-blueprint-900/30'
                  : 'bg-paper-100 text-paper-700 hover:bg-paper-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Visualisasi Isometrik & Penampang Melintang CAD Interaktif */}
        {currentType !== 'volume' && currentType !== 'tangga' && (
          <div className="pt-3 border-t border-paper-200 mb-4 animate-fadeIn">
            <StructuralCrossSectionVisualizer
              type={currentType}
              params={{
                width: currentType === 'kolom' ? inKolomLebar : inLebar,
                height: currentType === 'kolom' ? inKolomTebal : currentType === 'pelat' ? inPelatTebal : inTinggi,
                length: currentType === 'kolom' ? inKolomTinggi : currentType === 'pelat' ? inPelatPanjang : inPanjang,
                cover: currentType === 'kolom' ? 3.0 : 2.5,
                metode: inPelatMetode
              }}
            />
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleAddElement} className={currentType === 'volume' || currentType === 'tangga' ? "pt-3 border-t border-paper-200" : ""}>
          
          {/* A. Sloof & Balok */}
          {(currentType === 'sloof' || currentType === 'balok') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Panjang Total (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inPanjang}
                  onChange={e => setInPanjang(e.target.value)}
                  placeholder="mis. 24"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Lebar Penampang (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inLebar}
                  onChange={e => setInLebar(e.target.value)}
                  placeholder="mis. 15"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Tinggi Penampang (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inTinggi}
                  onChange={e => setInTinggi(e.target.value)}
                  placeholder="mis. 20"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Jumlah Segmen</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inJumlah}
                  onChange={e => setInJumlah(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* B. Kolom */}
          {currentType === 'kolom' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Lebar Kolom (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inKolomLebar}
                  onChange={e => setInKolomLebar(e.target.value)}
                  placeholder="mis. 20"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Tebal Kolom (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inKolomTebal}
                  onChange={e => setInKolomTebal(e.target.value)}
                  placeholder="mis. 20"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Tinggi Kolom (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inKolomTinggi}
                  onChange={e => setInKolomTinggi(e.target.value)}
                  placeholder="mis. 3.5"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Jumlah Titik Kolom</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inKolomJumlah}
                  onChange={e => setInKolomJumlah(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* C. NEW: Pelat Lantai Bertingkat (Bondek / Konvensional) */}
          {currentType === 'pelat' && (
            <div className="space-y-3 mb-4 animate-fadeIn bg-blue-50/50 p-4 rounded-2xl border border-blue-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-blue-600" />
                  Parameter Pelat Lantai Bertingkat
                </span>
                
                {/* Metode Toggle */}
                <div className="inline-flex rounded-xl bg-white p-1 border border-blue-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInPelatMetode('bondek')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      inPelatMetode === 'bondek' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bondek + Wiremesh (Modern)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInPelatMetode('konvensional')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      inPelatMetode === 'konvensional' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Konvensional (Bekisting Triplek)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Panjang Pelat (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inPelatPanjang}
                    onChange={e => setInPelatPanjang(e.target.value)}
                    placeholder="mis. 12"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Lebar Pelat (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inPelatLebar}
                    onChange={e => setInPelatLebar(e.target.value)}
                    placeholder="mis. 6"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Tebal Cor (cm)</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="30"
                    value={inPelatTebal}
                    onChange={e => setInPelatTebal(e.target.value)}
                    placeholder="mis. 12"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Jumlah Lantai</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inPelatJumlah}
                    onChange={e => setInPelatJumlah(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* D. NEW: Tangga Beton Bertingkat */}
          {currentType === 'tangga' && (
            <div className="space-y-3 mb-4 animate-fadeIn bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-amber-600" />
                  Parameter Tangga Beton Bertingkat (Antar Lantai)
                </span>
                <span className="text-[10px] text-amber-800 font-mono">
                  Standar Optrede 18cm &bull; Antrede 30cm
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Tinggi Lantai (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inTanggaTinggi}
                    onChange={e => setInTanggaTinggi(e.target.value)}
                    placeholder="mis. 3.6"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Lebar Tangga (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inTanggaLebar}
                    onChange={e => setInTanggaLebar(e.target.value)}
                    placeholder="mis. 1.0"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Tebal Pelat (cm)</label>
                  <input
                    type="number"
                    step="1"
                    value={inTanggaTebalPelat}
                    onChange={e => setInTanggaTebalPelat(e.target.value)}
                    placeholder="mis. 12"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Luas Bordes (m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inTanggaBordesArea}
                    onChange={e => setInTanggaBordesArea(e.target.value)}
                    placeholder="mis. 1.0"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase font-mono mb-1">Jumlah Tangga</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inTanggaJumlah}
                    onChange={e => setInTanggaJumlah(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 font-bold text-amber-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* E. Direct Volume */}
          {currentType === 'volume' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Volume Beton Langsung (m³)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inDirectVol}
                  onChange={e => setInDirectVol(e.target.value)}
                  placeholder="mis. 5.2"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Pengulangan / Qty</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inDirectJumlah}
                  onChange={e => setInDirectJumlah(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:ring-2 focus:ring-blueprint-500 bg-paper-50 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Pilihan Posisi Struktur: Mandiri vs Berhimpitan Batas Kavling */}
          {(currentType === 'sloof' || currentType === 'kolom' || currentType === 'balok') && (
            <div className="mb-4 p-3.5 rounded-2xl bg-paper-50 border border-paper-300 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-[11px] font-semibold text-paper-700 uppercase font-mono">
                  Posisi Struktur di Bangunan (Peruntukan):
                </label>
                {clusterTypology === 'shared' && (
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 self-start sm:self-auto">
                    Mode Cluster 1 Dinding Bersama Aktif
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInIsBoundary(false)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    !inIsBoundary
                      ? 'border-blueprint-600 bg-blueprint-50/80 ring-2 ring-blueprint-500/50 shadow-sm'
                      : 'border-paper-200 bg-white hover:bg-paper-100 text-paper-700'
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5">🏠</span>
                  <div>
                    <div className="text-xs font-bold font-display text-paper-900">
                      Struktur Dalam / Fasad Mandiri
                    </div>
                    <p className="text-[11px] text-paper-600 mt-0.5 leading-snug">
                      Sloof/kolom ruang tengah, teras, atau fasad depan-belakang. Dihitung 100% penuh untuk tiap unit.
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
                      <span>Struktur Batas Kavling (Berhimpitan)</span>
                      {clusterTypology === 'shared' && (
                        <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                          Hemat {(((2 * rowN - (rowN + 1)) / (2 * rowN)) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                      Sloof memanjang atau kolom praktis di dinding batas samping yang menempel dengan rumah tetangga.
                    </p>
                  </div>
                </button>
              </div>

              {/* Keterangan Gamblang & Contoh Angka Riil */}
              {inIsBoundary && (
                <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💡 Mengapa volume elemen batas ini berbeda di Dinding Bersama?</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-emerald-800">
                    Pada cluster <strong>1 Dinding Bersama</strong>, dua rumah yang berhimpitan hanya membangun <strong>1 baris sloof dan 1 kolom bersama</strong> di as tanah perbatasan (tidak dibangun dobel).
                  </p>
                  <div className="font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-emerald-200 mt-1 space-y-0.5 text-paper-800">
                    <div>&bull; <strong>Dinding Ganda (2 dinding)</strong>: Elemen batas dibangun rangkap 2 (dikali {effectiveMultiplier} unit penuh).</div>
                    <div>&bull; <strong>Dinding Bersama (1 dinding)</strong>: Untuk deret {rowN} unit, volume cor elemen batas ini hanya dihitung <strong>{((rowN + 1) / (2 * rowN) * 100).toFixed(1)}%</strong> karena dipakai bersama tetangga sebelah.</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {formMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-sans">
              {formMsg}
            </div>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-semibold text-xs shadow-md transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Tambahkan ke Daftar Elemen
          </button>
        </form>

        {/* Tabel Daftar Elemen */}
        <div className="mt-6 pt-4 border-t border-paper-200">
          <h3 className="font-heading uppercase text-xs font-bold tracking-wider text-paper-700 mb-3">
            Daftar Elemen Terinput ({elements.length})
          </h3>

          <div className="overflow-x-auto border border-paper-300 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper-100 border-b border-paper-300 text-paper-700 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Tipe Struktur</th>
                  <th className="py-2.5 px-3">Dimensi / Spesifikasi</th>
                  <th className="py-2.5 px-3 text-center">Jumlah</th>
                  <th className="py-2.5 px-3 text-right">Volume (m³)</th>
                  <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200 font-mono">
                {elements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-paper-500 font-sans text-xs">
                      Belum ada elemen yang ditambahkan. Isi formulir di atas.
                    </td>
                  </tr>
                ) : (
                  elements.map(el => (
                    <tr key={el.id} className="hover:bg-paper-50">
                      <td className="py-2 px-3 font-sans font-semibold text-paper-900">
                        {el.type}
                        {el.isSharedBoundary && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🤝 As Bersama
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-paper-600">{el.dimText}</td>
                      <td className="py-2 px-3 text-center">{el.jumlah}</td>
                      <td className="py-2 px-3 text-right font-bold text-blueprint-700">{formatNumber(el.volume, 3)}</td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteElement(el.id)}
                          className="p-1 rounded text-paper-400 hover:text-red-600 hover:bg-red-50"
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

          <div className="mt-4 pt-3 border-t-2 border-paper-900 flex items-center justify-between">
            <span className="font-heading uppercase text-xs font-bold tracking-wider text-paper-700">
              Total Volume Cor {effectiveMultiplier > 1 && `(x${effectiveMultiplier} Unit Cluster)`}
            </span>
            <span className="font-mono text-xl font-bold text-paper-900">
              {formatNumber(totalVolume, 3)} <span className="text-sm font-normal text-paper-600">m³</span>
            </span>
          </div>
          {volumeHematShared > 0 && (
            <div className="mt-2 text-right text-xs font-mono text-emerald-700 font-bold">
              🎉 Penghematan Dinding Bersama: -{formatNumber(volumeHematShared, 3)} m³ beton cor
            </div>
          )}
        </div>
      </div>

      {/* 03. HASIL KEBUTUHAN BAHAN */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Kebutuhan Material Hasil Campuran Beton
          </h2>
        </div>

        {/* Composition Bar */}
        <div>
          <div className="h-7 rounded-lg overflow-hidden border border-paper-400 flex text-[10px] font-mono font-bold text-white text-center">
            <div 
              style={{ width: `${pctSemen || 33}%` }} 
              className="bg-paper-900 flex items-center justify-center transition-all duration-300"
            >
              SEMEN
            </div>
            <div 
              style={{ width: `${pctPasir || 33}%` }} 
              className="bg-amber-600 flex items-center justify-center transition-all duration-300"
            >
              PASIR
            </div>
            <div 
              style={{ width: `${pctKerikil || 34}%` }} 
              className="bg-slate-500 flex items-center justify-center transition-all duration-300"
            >
              KERIKIL
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs font-sans text-paper-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-paper-900 inline-block"></span>
              Semen: <b>{formatNumber(pctSemen, 1)}%</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block"></span>
              Pasir: <b>{formatNumber(pctPasir, 1)}%</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block"></span>
              Kerikil: <b>{formatNumber(pctKerikil, 1)}%</b>
            </span>
          </div>
        </div>

        {/* Material Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="p-4 rounded-2xl bg-paper-900 text-white shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-paper-300 font-bold">Semen Portland</span>
            <div className="my-2">
              <span className="font-heading text-2xl font-bold">{formatNumber(semenKg)} kg</span>
              <p className="text-xs font-mono text-paper-300 mt-0.5">≈ {semenZak} zak (40 kg)</p>
            </div>
            <span className="text-[10px] text-paper-400 font-mono">Dibulatkan ke atas</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold">Pasir Beton</span>
            <div className="my-2">
              <span className="font-heading text-2xl font-bold text-amber-900">{formatNumber(pasirKg)} kg</span>
              <p className="text-xs font-mono text-amber-800 font-semibold mt-0.5">≈ {formatNumber(pasirM3, 2)} m³</p>
            </div>
            <span className="text-[10px] text-amber-700 font-mono">BJ ± 1.400 kg/m³</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-900 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 font-bold">Kerikil / Split</span>
            <div className="my-2">
              <span className="font-heading text-2xl font-bold text-slate-800">{formatNumber(kerikilKg)} kg</span>
              <p className="text-xs font-mono text-slate-700 font-semibold mt-0.5">≈ {formatNumber(kerikilM3, 2)} m³</p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">BJ ± 1.350 kg/m³</span>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-700 font-bold flex items-center gap-1">
              <Droplet className="w-3 h-3 text-cyan-600" /> Air Campuran
            </span>
            <div className="my-2">
              <span className="font-heading text-2xl font-bold text-cyan-900">{formatNumber(airL)} L</span>
              <p className="text-xs text-cyan-700 mt-0.5">Acuan SNI 03-2834</p>
            </div>
            <span className="text-[10px] text-cyan-600 font-mono">Standar slump 10±2cm</span>
          </div>

        </div>

        {/* Additional Multi-Storey Takeoff Cards (if Pelat / Tangga added) */}
        {(totalBondek > 0 || totalWiremesh > 0 || totalBekisting > 0) && (
          <div className="pt-3 border-t border-paper-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 font-heading block mb-2">
              Material Tambahan Pelat Lantai & Tangga Bertingkat
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {totalBondek > 0 && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Bondek Floor Decking</span>
                  <span className="text-xl font-bold font-mono text-blue-950">{formatNumber(totalBondek, 2)} m²</span>
                </div>
              )}

              {totalWiremesh > 0 && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase block">Wiremesh M8/M10</span>
                  <span className="text-xl font-bold font-mono text-indigo-950">{totalWiremesh} Lembar</span>
                  <span className="text-[10px] text-indigo-600 font-mono block">Ukuran 2.1×5.4m</span>
                </div>
              )}

              {totalBekisting > 0 && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-900">
                  <span className="text-[10px] text-slate-600 font-bold uppercase block">Bekisting Triplek</span>
                  <span className="text-xl font-bold font-mono text-slate-900">{formatNumber(totalBekisting, 2)} m²</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 03. ESTIMASI HARGA SATUAN BAHAN */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-blueprint-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
            <span>Estimasi Harga Satuan Bahan Beton & Cetakan</span>
            <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
              opsional (sesuai survei/analisa)
            </span>
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Tentukan estimasi harga satuan sebelum mengirim ke BoQ. Jika dikosongkan, BoQ akan menggunakan harga master.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs font-mono">
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Semen (Rp/sak 40kg)</label>
            <input
              type="number"
              min="0"
              value={hargaSemen}
              onChange={e => setHargaSemen(e.target.value)}
              placeholder="mis. 65000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-blueprint-500 font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              {agregatDispatchUnit === 'rit' ? 'Pasir Beton (Rp/Rit ~6m³)' : 'Pasir Beton (Rp/m³)'}
            </label>
            <input
              type="number"
              min="0"
              value={hargaPasir}
              onChange={e => setHargaPasir(e.target.value)}
              placeholder={agregatDispatchUnit === 'rit' ? 'mis. 1650000' : 'mis. 380000'}
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-blueprint-500 font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              {agregatDispatchUnit === 'rit' ? 'Kerikil / Split (Rp/Rit ~6m³)' : 'Kerikil / Split (Rp/m³)'}
            </label>
            <input
              type="number"
              min="0"
              value={hargaKerikil}
              onChange={e => setHargaKerikil(e.target.value)}
              placeholder={agregatDispatchUnit === 'rit' ? 'mis. 1750000' : 'mis. 380000'}
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-blueprint-500 font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Floor Deck / Bondek (Rp/m²)</label>
            <input
              type="number"
              min="0"
              value={hargaBondek}
              onChange={e => setHargaBondek(e.target.value)}
              placeholder="125000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-blueprint-500 font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Wiremesh M8 (Rp/lbr)</label>
            <input
              type="number"
              min="0"
              value={hargaWiremesh}
              onChange={e => setHargaWiremesh(e.target.value)}
              placeholder="550000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-blueprint-500 font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Bekisting Balok/Pelat (Rp/m²)</label>
            <input
              type="number"
              min="0"
              value={hargaBekisting}
              onChange={e => setHargaBekisting(e.target.value)}
              placeholder="165000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-blueprint-500 font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 04. KIRIM KE BOQ */}
      <div className="rounded-3xl bg-gradient-to-br from-blueprint-50 to-indigo-50 border-2 border-dashed border-blueprint-400 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-blueprint-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-blueprint-900">
            Kirim Hasil Perhitungan ke BoQ (Divisi III - Struktur)
          </h2>
        </div>
        <p className="text-xs text-blueprint-800/80 mb-4 ml-8.5">
          Centang item yang ingin dimasukkan ke antrian BoQ.
          {effectiveMultiplier > 1 && (
            <span className="font-bold text-amber-700 ml-1">
              (Volume otomatis dikalikan x{effectiveMultiplier} unit cluster).
            </span>
          )}
        </p>

        <div className="space-y-2.5 mb-5 bg-white p-4 rounded-2xl border border-blueprint-200">
          <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendSemen}
              onChange={e => setSendSemen(e.target.checked)}
              className="w-4 h-4 rounded text-blueprint-600 focus:ring-blueprint-500 accent-blueprint-600 cursor-pointer"
            />
            <span>Semen Portland — <b className="font-mono text-blueprint-800">{semenZak} sak</b></span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendPasir}
              onChange={e => setSendPasir(e.target.checked)}
              className="w-4 h-4 rounded text-blueprint-600 focus:ring-blueprint-500 accent-blueprint-600 cursor-pointer"
            />
            <span>Pasir Beton — <b className="font-mono text-blueprint-800">{agregatDispatchUnit === 'rit' ? `${+(pasirM3 / 6).toFixed(1)} Rit` : `${formatNumber(pasirM3, 2)} m³`}</b></span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-paper-800">
            <input
              type="checkbox"
              checked={sendKerikil}
              onChange={e => setSendKerikil(e.target.checked)}
              className="w-4 h-4 rounded text-blueprint-600 focus:ring-blueprint-500 accent-blueprint-600 cursor-pointer"
            />
            <span>Agregat Kasar / Kerikil — <b className="font-mono text-blueprint-800">{agregatDispatchUnit === 'rit' ? `${+(kerikilM3 / 6).toFixed(1)} Rit` : `${formatNumber(kerikilM3, 2)} m³`}</b></span>
          </label>

          {totalBondek > 0 && (
            <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-blue-900 border-t border-slate-100 pt-2">
              <input
                type="checkbox"
                checked={sendBondek}
                onChange={e => setSendBondek(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
              />
              <span>Steel Floor Decking / Bondek 0.75mm — <b className="font-mono text-blue-800">{formatNumber(totalBondek, 2)} m²</b></span>
            </label>
          )}

          {totalWiremesh > 0 && (
            <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-indigo-900">
              <input
                type="checkbox"
                checked={sendWiremesh}
                onChange={e => setSendWiremesh(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <span>Wiremesh M8 / M10 Lembar (2.1×5.4m) — <b className="font-mono text-indigo-800">{totalWiremesh} lembar</b></span>
            </label>
          )}

          {totalBekisting > 0 && (
            <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={sendBekisting}
                onChange={e => setSendBekisting(e.target.checked)}
                className="w-4 h-4 rounded text-slate-600 focus:ring-slate-500 accent-slate-600 cursor-pointer"
              />
              <span>Bekisting Balok / Pelat / Tangga — <b className="font-mono text-slate-800">{formatNumber(totalBekisting, 2)} m²</b></span>
            </label>
          )}
        </div>

        {/* Opsi Satuan Pasaran Pasir & Kerikil */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-paper-100 border border-paper-300 text-xs mb-3">
          <span className="font-bold text-paper-900 font-mono">Satuan Agregat Curah (Pasir & Split) ke BoQ:</span>
          <div className="inline-flex rounded-lg bg-white p-0.5 border border-paper-300 text-xs">
            <button
              type="button"
              onClick={() => setAgregatDispatchUnit('m3')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${agregatDispatchUnit === 'm3' ? 'bg-blueprint-600 text-white shadow-xs' : 'text-paper-700 hover:bg-paper-100'}`}
            >
              m³ (Volume Kubik)
            </button>
            <button
              type="button"
              onClick={() => setAgregatDispatchUnit('rit')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${agregatDispatchUnit === 'rit' ? 'bg-blueprint-600 text-white shadow-xs' : 'text-paper-700 hover:bg-paper-100'}`}
            >
              Rit (Dump Truck ~6m³)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendToBoQ}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blueprint-600 hover:bg-blueprint-700 text-white font-display font-bold text-xs shadow-md shadow-blueprint-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Kirim yang Dicentang ke BoQ
        </button>
      </div>

    </div>
  );
}
