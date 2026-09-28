import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum, formatRp } from '../../utils/formatters';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';
import { 
  ArrowLeft, 
  DoorOpen, 
  Send, 
  Layers, 
  Check, 
  Plus, 
  Trash2, 
  Info, 
  Sparkles, 
  Sliders,
  DollarSign,
  Maximize2
} from 'lucide-react';

const INITIAL_OPENINGS = [
  { id: 'P1', type: 'door', name: 'P1 — Pintu Utama Double', width: 1.60, height: 2.40, qty: 1, glassArea: 0.8, leaves: 2, hinges: 6, lockType: 'mortise', isHookOnly: false },
  { id: 'P2', type: 'door', name: 'P2 — Pintu Kamar Tidur', width: 0.90, height: 2.15, qty: 3, glassArea: 0.0, leaves: 1, hinges: 3, lockType: 'mortise', isHookOnly: false },
  { id: 'P3', type: 'door', name: 'P3 — Pintu KM / WC', width: 0.75, height: 2.05, qty: 2, glassArea: 0.0, leaves: 1, hinges: 3, lockType: 'cylindrical', isHookOnly: false },
  { id: 'J1', type: 'window', name: 'J1 — Jendela Utama 2 Daun', width: 1.50, height: 1.50, qty: 2, glassArea: 1.8, leaves: 2, hinges: 4, lockType: 'casement', isHookOnly: false },
  { id: 'J2', type: 'window', name: 'J2 — Jendela Kamar 1 Daun', width: 0.80, height: 1.30, qty: 4, glassArea: 0.85, leaves: 1, hinges: 2, lockType: 'casement', isHookOnly: false },
  { id: 'JS', type: 'window', name: 'JS — Jendela Samping (Khusus Hook)', width: 0.60, height: 1.20, qty: 2, glassArea: 0.60, leaves: 1, hinges: 2, lockType: 'casement', isHookOnly: true },
  { id: 'BV', type: 'window', name: 'BV — Bovenlicht Ventilasi', width: 0.60, height: 0.40, qty: 2, glassArea: 0.20, leaves: 0, hinges: 0, lockType: 'none', isHookOnly: false }
];

export function DoorWindowCalculator() {
  const { setActiveTab, queueCalculatedItems, showToast, clusterUnits, updateClusterUnits } = useBoQ();
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_dw_cluster_mode', 'multiplied');

  const [openings, setOpenings] = usePersistentState('sr_calc_dw_openings', INITIAL_OPENINGS);
  const [selectedId, setSelectedId] = usePersistentState('sr_calc_dw_selected_id', 'P1');

  // Profil Kusen & Kaca
  const [kusenProfile, setKusenProfile] = usePersistentState('sr_calc_dw_kusen_profile', 'alum_3'); // 'alum_3' | 'alum_4' | 'kayu'
  const [glassType, setGlassType] = usePersistentState('sr_calc_dw_glass_type', 'kaca_5mm');     // 'kaca_5mm' | 'kaca_rayban' | 'kaca_tempered'

  // Harga Satuan (Perwali Semarang 2026 Defaults)
  const [hargaKusen, setHargaKusen] = usePersistentState('sr_calc_dw_harga_kusen', '199880');  // Rp / m' (Kusen Aluminium 3")
  const [hargaKaca, setHargaKaca] = usePersistentState('sr_calc_dw_harga_kaca', '125600');    // Rp / m2 (Kaca 5mm)
  const [hargaKunci, setHargaKunci] = usePersistentState('sr_calc_dw_harga_kunci', '72700');   // Rp / bh (Kunci Tanam)
  const [hargaEngselPintu, setHargaEngselPintu] = usePersistentState('sr_calc_dw_harga_engsel_pintu', '76900'); // Rp / bh (Engsel 4")
  const [hargaEngselJendela, setHargaEngselJendela] = usePersistentState('sr_calc_dw_harga_engsel_jendela', '55000'); // Rp / set (Casement 8")
  const [hargaDoorCloser, setHargaDoorCloser] = usePersistentState('sr_calc_dw_harga_door_closer', '164600');     // Rp / set

  // Checkbox pemilihan pengiriman ke BoQ
  const [sendKusen, setSendKusen] = usePersistentState('sr_calc_dw_send_kusen', true);
  const [sendKaca, setSendKaca] = usePersistentState('sr_calc_dw_send_kaca', true);
  const [sendKunci, setSendKunci] = usePersistentState('sr_calc_dw_send_kunci', true);
  const [sendEngselPintu, setSendEngselPintu] = usePersistentState('sr_calc_dw_send_engsel_pintu', true);
  const [sendEngselJendela, setSendEngselJendela] = usePersistentState('sr_calc_dw_send_engsel_jendela', true);
  const [sendDoorCloser, setSendDoorCloser] = usePersistentState('sr_calc_dw_send_door_closer', false);

  // Opsi Satuan Pasaran Toko
  const [kusenDispatchUnit, setKusenDispatchUnit] = usePersistentState('sr_calc_dw_kusen_unit', 'meter'); // 'meter' | 'batang'

  // New Opening Form Modal State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('door');
  const [newWidth, setNewWidth] = useState('0.90');
  const [newHeight, setNewHeight] = useState('2.10');
  const [newQty, setNewQty] = useState('1');
  const [newIsHookOnly, setNewIsHookOnly] = useState(false);

  // Update opening row field
  const updateOpeningField = (id, field, val) => {
    setOpenings(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: val };
    }));
  };

  // Add new opening type
  const handleAddOpening = (e) => {
    e.preventDefault();
    if (!newCode.trim()) {
      showToast("Masukkan kode bukaan (misal: P4 atau J3)", "warning");
      return;
    }
    const w = parseFloat(newWidth) || 0.9;
    const h = parseFloat(newHeight) || 2.1;
    const q = parseInt(newQty) || 1;

    const newItem = {
      id: newCode.trim().toUpperCase(),
      type: newType,
      name: newName.trim() || `${newCode.trim().toUpperCase()} — Bukaan Tambahan`,
      width: w,
      height: h,
      qty: q,
      glassArea: newType === 'window' ? Math.round(w * h * 0.8 * 100) / 100 : 0,
      leaves: newType === 'door' ? 1 : 1,
      hinges: newType === 'door' ? 3 : 2,
      lockType: newType === 'door' ? 'mortise' : 'casement',
      isHookOnly: newIsHookOnly
    };

    setOpenings(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
    setNewCode('');
    setNewName('');
    setNewIsHookOnly(false);
    showToast(`Bukaan ${newItem.id} berhasil ditambahkan.`, "success");
  };

  // Remove opening type
  const handleRemoveOpening = (id) => {
    if (openings.length <= 1) {
      showToast("Minimal harus ada 1 tipe bukaan dalam daftar.", "warning");
      return;
    }
    setOpenings(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) {
      const remaining = openings.filter(item => item.id !== id);
      setSelectedId(remaining[0].id);
    }
  };

  // Kalkulasi Total Kebutuhan
  const totals = useMemo(() => {
    let totalKusenMeter = 0;
    let totalKacaM2 = 0;
    let totalPintuDaun = 0;
    let totalJendelaDaun = 0;
    let totalEngselPintu = 0;
    let totalEngselJendela = 0;
    let totalKunci = 0;

    const baseMult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;

    openings.forEach(item => {
      const q = Math.max(0, parseInt(item.qty) || 0);
      if (q === 0) return;

      // Multiplier untuk bukaan ini:
      // Jika isHookOnly === true, pengali dibatasi maksimal 2 unit se-cluster
      const itemMult = (clusterApplyMode === 'multiplied' && item.isHookOnly)
        ? Math.min(2, baseMult)
        : baseMult;

      const effectiveQty = q * itemMult;

      const w = parseFloat(item.width) || 0;
      const h = parseFloat(item.height) || 0;

      // Panjang kusen per unit:
      let kusenPerUnit = 0;
      if (item.type === 'door') {
        kusenPerUnit = (2 * h) + w;
        if (item.leaves > 1) kusenPerUnit += h;
      } else {
        kusenPerUnit = 2 * (w + h);
        if (item.leaves > 1) kusenPerUnit += h;
      }

      totalKusenMeter += kusenPerUnit * effectiveQty;
      totalKacaM2 += (parseFloat(item.glassArea) || 0) * effectiveQty;

      if (item.type === 'door') {
        totalPintuDaun += (item.leaves || 1) * effectiveQty;
        totalEngselPintu += (item.hinges || 3) * effectiveQty;
        if (item.lockType !== 'none') totalKunci += effectiveQty;
      } else {
        totalJendelaDaun += (item.leaves || 1) * effectiveQty;
        totalEngselJendela += (item.hinges || 2) * effectiveQty;
      }
    });

    // Kusen waste factor 5%
    totalKusenMeter = Math.round(totalKusenMeter * 1.05 * 100) / 100;
    totalKacaM2 = Math.round(totalKacaM2 * 1.05 * 100) / 100;

    return {
      totalKusenMeter,
      totalKacaM2,
      totalPintuDaun,
      totalJendelaDaun,
      totalEngselPintu,
      totalEngselJendela,
      totalKunci,
      multiplier: baseMult
    };
  }, [openings, clusterApplyMode, clusterUnits]);

  // Estimasi Biaya
  const totalCost = useMemo(() => {
    let cost = 0;
    if (sendKusen) cost += totals.totalKusenMeter * parseNum(hargaKusen);
    if (sendKaca) cost += totals.totalKacaM2 * parseNum(hargaKaca);
    if (sendKunci) cost += totals.totalKunci * parseNum(hargaKunci);
    if (sendEngselPintu) cost += totals.totalEngselPintu * parseNum(hargaEngselPintu);
    if (sendEngselJendela) cost += totals.totalEngselJendela * parseNum(hargaEngselJendela);
    if (sendDoorCloser) cost += totals.totalPintuDaun * parseNum(hargaDoorCloser);
    return cost;
  }, [totals, hargaKusen, hargaKaca, hargaKunci, hargaEngselPintu, hargaEngselJendela, hargaDoorCloser, sendKusen, sendKaca, sendKunci, sendEngselPintu, sendEngselJendela, sendDoorCloser]);

  // Selected item detail for preview
  const selectedItem = openings.find(item => item.id === selectedId) || openings[0];

  // Send to BoQ Divisi VIII (Kusen, Pintu & Jendela)
  const handleSendToBoQ = () => {
    if (totals.totalKusenMeter <= 0) {
      showToast("Kuantitas bukaan masih 0. Masukkan jumlah unit bukaan.", "warning");
      return;
    }

    const itemsToSend = [];

    if (sendKusen && totals.totalKusenMeter > 0) {
      const kusenLabel = kusenProfile === 'alum_3' 
        ? 'Kusen Aluminium 3 Inch' 
        : kusenProfile === 'alum_4' 
        ? 'Kusen Aluminium 4 Inch' 
        : 'Kusen Kayu Kamper Samarinda';

      if (kusenDispatchUnit === 'batang') {
        const btg6m = Math.ceil(totals.totalKusenMeter / 6);
        itemsToSend.push({
          category: 'kusen_pintu_jendela',
          label: `${kusenLabel} (Batang 6.0m)`,
          satuan: 'Batang',
          jumlah: btg6m,
          harga: parseNum(hargaKusen) || 245000,
          source: 'Kalkulator Kusen & Bukaan (Standar Toko 6m)'
        });
      } else {
        itemsToSend.push({
          category: 'kusen_pintu_jendela',
          label: `${kusenLabel} — Keliling Terpasang`,
          satuan: 'm\'',
          jumlah: totals.totalKusenMeter,
          harga: parseNum(hargaKusen) || 199880,
          source: 'Kalkulator Kusen & Bukaan'
        });
      }
    }

    if (sendKaca && totals.totalKacaM2 > 0) {
      const glassLabel = glassType === 'kaca_5mm' 
        ? 'Kaca Polos 5mm' 
        : glassType === 'kaca_rayban' 
        ? 'Kaca Rayban / Gelap 5mm' 
        : 'Kaca Tempered 8mm';

      itemsToSend.push({
        category: 'kusen_pintu_jendela',
        label: `${glassLabel} (Bukaan Pintu & Jendela)`,
        satuan: 'm²',
        jumlah: totals.totalKacaM2,
        harga: parseNum(hargaKaca) || 125600,
        source: 'Kalkulator Kusen & Bukaan'
      });
    }

    if (sendKunci && totals.totalKunci > 0) {
      itemsToSend.push({
        category: 'kusen_pintu_jendela',
        label: 'Kunci Tanam / Mortise Lock Standar Pintu',
        satuan: 'Buah',
        jumlah: totals.totalKunci,
        harga: parseNum(hargaKunci) || 72700,
        source: 'Kalkulator Kusen & Bukaan'
      });
    }

    if (sendEngselPintu && totals.totalEngselPintu > 0) {
      itemsToSend.push({
        category: 'kusen_pintu_jendela',
        label: 'Engsel Kupu-kupu 4 Inch (Pintu)',
        satuan: 'Buah',
        jumlah: totals.totalEngselPintu,
        harga: parseNum(hargaEngselPintu) || 76900,
        source: 'Kalkulator Kusen & Bukaan'
      });
    }

    if (sendEngselJendela && totals.totalEngselJendela > 0) {
      itemsToSend.push({
        category: 'kusen_pintu_jendela',
        label: 'Engsel Casement 8 Inch / Friction Stay (Jendela)',
        satuan: 'Set',
        jumlah: totals.totalEngselJendela,
        harga: parseNum(hargaEngselJendela) || 55000,
        source: 'Kalkulator Kusen & Bukaan'
      });
    }

    if (sendDoorCloser && totals.totalPintuDaun > 0) {
      itemsToSend.push({
        category: 'kusen_pintu_jendela',
        label: 'Door Closer Otomatis',
        satuan: 'Set',
        jumlah: totals.totalPintuDaun,
        harga: parseNum(hargaDoorCloser) || 164600,
        source: 'Kalkulator Kusen & Bukaan'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Pilih minimal satu item material untuk dikirim ke BoQ.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {});
  };

  return (
    <div className="space-y-6 pb-28 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-4 sm:p-7 border border-slate-800 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <DoorOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">DOOR & WINDOW SCHEDULE</span>
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
              Kalkulator Kusen, Pintu, Jendela & Aksesoris
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Susun jadwal tipe bukaan arsitektur (P1, P2, J1, J2), hitung keliling kusen aluminium/kayu, volume kaca, engsel, handle kunci, dan transfer langsung ke BoQ Divisi VIII.
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
        unitLabel="Pintu / Unit Kavling"
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Schedule Table & Profile Picker (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Kusen & Kaca Profile Selectors */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 flex items-center gap-2">
                  1. Spesifikasi Material Profil Kusen & Kaca
                </h2>
                <p className="text-xs text-slate-500">Pilih jenis bahan dasar kusen dan ketebalan kaca.</p>
              </div>

              {/* Kusen Selector */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                {[
                  { id: 'alum_3', label: 'Aluminium 3"', price: '199880' },
                  { id: 'alum_4', label: 'Aluminium 4"', price: '220380' },
                  { id: 'kayu', label: 'Kayu Kamper', price: '185000' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setKusenProfile(item.id);
                      setHargaKusen(item.price);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      kusenProfile === item.id 
                        ? 'bg-sky-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Glass Selector */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Pilihan Kaca:</span>
              <div className="flex gap-2">
                {[
                  { id: 'kaca_5mm', label: 'Kaca Polos 5mm', price: '125600' },
                  { id: 'kaca_rayban', label: 'Kaca Rayban 5mm', price: '145000' },
                  { id: 'kaca_tempered', label: 'Kaca Tempered 8mm', price: '400000' }
                ].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setGlassType(g.id);
                      setHargaKaca(g.price);
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all ${
                      glassType === g.id 
                        ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Schedule Table (Daftar Tipe Bukaan) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 flex items-center gap-2">
                  2. Jadwal Tipe Bukaan (Door & Window Schedule)
                </h2>
                <p className="text-xs text-slate-500">Daftar dimensi dan kuantitas unit kusen pintu/jendela.</p>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-mono font-bold text-xs">
                {openings.length} Tipe Terdaftar
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-heading uppercase text-[10.5px]">
                    <th className="py-2.5 px-2 text-center w-12">Kode</th>
                    <th className="py-2.5 px-3 text-left">Nama Tipe Bukaan</th>
                    <th className="py-2.5 px-2 text-center w-20">Lebar (m)</th>
                    <th className="py-2.5 px-2 text-center w-20">Tinggi (m)</th>
                    <th className="py-2.5 px-2 text-center w-16">Jumlah</th>
                    <th className="py-2.5 px-2 text-center w-20">Kaca (m²)</th>
                    <th className="py-2.5 px-2 text-center w-10">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {openings.map(item => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50/90 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-mono font-black text-sky-600">
                          {item.id}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.name}</span>
                            {item.isHookOnly ? (
                              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold inline-flex items-center gap-1">
                                <span>🏠 Khusus Hook</span>
                                <span className="text-amber-700">(Maks 2)</span>
                              </span>
                            ) : null}
                          </div>
                          <label className="inline-flex items-center gap-1 mt-1 cursor-pointer text-[10.5px] text-slate-500 hover:text-amber-800" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!item.isHookOnly}
                              onChange={e => updateOpeningField(item.id, 'isHookOnly', e.target.checked)}
                              className="w-3 h-3 text-amber-600 rounded"
                            />
                            <span>Tandai Khusus Unit Hook</span>
                          </label>
                        </td>
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            step="0.05"
                            value={item.width}
                            onChange={(e) => updateOpeningField(item.id, 'width', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-center font-mono py-1 px-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            step="0.05"
                            value={item.height}
                            onChange={(e) => updateOpeningField(item.id, 'height', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-center font-mono py-1 px-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => updateOpeningField(item.id, 'qty', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-14 text-center font-mono font-bold py-1 px-1 bg-white border border-slate-300 rounded text-xs text-sky-700 focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-1 px-1 text-center font-mono text-slate-600">
                          <input
                            type="number"
                            step="0.05"
                            value={item.glassArea}
                            onChange={(e) => updateOpeningField(item.id, 'glassArea', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-center font-mono py-1 px-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleRemoveOpening(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Add Opening Inline Form */}
            <form onSubmit={handleAddOpening} className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Kode (misal: P4)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 font-mono uppercase font-bold"
              />
              <input
                type="text"
                placeholder="Nama Keterangan Bukaan"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-xl border border-slate-300"
              />
              <label className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer text-[11px] text-amber-900 font-medium">
                <input
                  type="checkbox"
                  checked={newIsHookOnly}
                  onChange={(e) => setNewIsHookOnly(e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-600 rounded"
                />
                <span>🏠 Khusus Hook (Maks 2)</span>
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-slate-300 font-medium bg-slate-50"
              >
                <option value="door">Pintu</option>
                <option value="window">Jendela</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tipe</span>
              </button>
            </form>
          </div>

          {/* Card 3: Items to Send to BoQ */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 flex items-center gap-2">
                  3. Pengiriman Material ke BoQ (Divisi VIII)
                </h2>
                <p className="text-xs text-slate-500">Pilih item hasil perhitungan yang ingin dimasukkan ke anggaran.</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Total Estimasi Kusen & Bukaan</span>
                <span className="text-sm sm:text-base font-black font-mono text-sky-600">
                  {formatRp(totalCost)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              
              {/* Kusen */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendKusen}
                    onChange={(e) => setSendKusen(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Kusen {kusenProfile === 'alum_3' ? 'Aluminium 3 Inch' : kusenProfile === 'alum_4' ? 'Aluminium 4 Inch' : 'Kayu Kamper'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {kusenDispatchUnit === 'batang' 
                        ? <>Volume: <strong>{Math.ceil(totals.totalKusenMeter / 6.0)} Batang (6m)</strong> ({totals.totalKusenMeter.toFixed(2)} m')</>
                        : <>Keliling: <strong>{totals.totalKusenMeter.toFixed(2)} m'</strong> (termasuk waste 5%)</>}
                    </div>
                  </div>
                </label>
                <div className="w-32">
                  <input
                    type="number"
                    value={hargaKusen}
                    onChange={(e) => setHargaKusen(e.target.value)}
                    placeholder={kusenDispatchUnit === 'batang' ? 'mis. 245000' : 'mis. 199880'}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">
                    {kusenDispatchUnit === 'batang' ? 'Rp / Batang 6m' : 'Rp / m\''}
                  </span>
                </div>
              </div>

              {/* Kaca */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendKaca}
                    onChange={(e) => setSendKaca(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      {glassType === 'kaca_5mm' ? 'Kaca Polos 5mm' : glassType === 'kaca_rayban' ? 'Kaca Rayban 5mm' : 'Kaca Tempered 8mm'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Luas Bidang Kaca: <strong>{totals.totalKacaM2.toFixed(2)} m²</strong>
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaKaca}
                    onChange={(e) => setHargaKaca(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / m²</span>
                </div>
              </div>

              {/* Kunci Tanam */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendKunci}
                    onChange={(e) => setSendKunci(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Kunci Tanam / Mortise Lock Pintu</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Jumlah: <strong>{totals.totalKunci} Buah</strong> (1 set / daun pintu utama & kamar)
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaKunci}
                    onChange={(e) => setHargaKunci(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / Buah</span>
                </div>
              </div>

              {/* Engsel Pintu 4" */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendEngselPintu}
                    onChange={(e) => setSendEngselPintu(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Engsel Kupu-kupu 4 Inch (Pintu)</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Jumlah: <strong>{totals.totalEngselPintu} Buah</strong> (3 pcs / daun)
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaEngselPintu}
                    onChange={(e) => setHargaEngselPintu(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / Buah</span>
                </div>
              </div>

              {/* Engsel Jendela Casement */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendEngselJendela}
                    onChange={(e) => setSendEngselJendela(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Engsel Casement 8 Inch / Friction Stay (Jendela)</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Jumlah: <strong>{totals.totalEngselJendela} Set</strong>
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaEngselJendela}
                    onChange={(e) => setHargaEngselJendela(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / Set</span>
                </div>
              </div>

              {/* Door Closer Otomatis */}
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendDoorCloser}
                    onChange={(e) => setSendDoorCloser(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Door Closer Otomatis (Pintu Utama)</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Jumlah: <strong>{totals.totalDoorCloser} Set</strong>
                    </div>
                  </div>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    value={hargaDoorCloser}
                    onChange={(e) => setHargaDoorCloser(e.target.value)}
                    className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[9px] text-slate-400 text-right block">Rp / Set</span>
                </div>
              </div>

            </div>

            {/* Selector Satuan Kusen */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-sky-50 border border-sky-200 mb-3 text-xs">
              <span className="font-bold text-sky-950 font-mono">Satuan Pengadaan Kusen ke BoQ:</span>
              <div className="inline-flex rounded-lg bg-white p-0.5 border border-sky-300 text-xs">
                <button
                  type="button"
                  onClick={() => setKusenDispatchUnit('meter')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${kusenDispatchUnit === 'meter' ? 'bg-sky-700 text-white shadow-xs' : 'text-sky-800 hover:bg-sky-100'}`}
                >
                  Meter (m') — Keliling Terpasang
                </button>
                <button
                  type="button"
                  onClick={() => setKusenDispatchUnit('batang')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${kusenDispatchUnit === 'batang' ? 'bg-sky-700 text-white shadow-xs' : 'text-sky-800 hover:bg-sky-100'}`}
                >
                  Batang (6.0m) — Standar Toko Profil
                </button>
              </div>
            </div>

            {/* Tombol Kirim ke BoQ */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendToBoQ}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Material Terpilih ke BoQ (Divisi VIII - Kusen & Pintu)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right: Visual Elevation Sketch & Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Elevation Blueprint Sketch Card */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-sky-400" />
                <span className="font-heading font-black text-xs uppercase tracking-wider text-slate-200">
                  Elevasi Bukaan: {selectedItem.id}
                </span>
              </div>
              <span className="text-[10px] font-mono text-sky-400 font-bold">
                {selectedItem.width}m × {selectedItem.height}m
              </span>
            </div>

            {/* SVG Elevation Sketch */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center justify-center min-h-[220px]">
              <svg viewBox="0 0 200 220" className="w-full h-auto max-h-[190px] select-none">
                {/* Wall Opening Aperture */}
                <rect x="30" y="20" width="140" height="180" fill="#0f172a" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />

                {/* Outer Kusen Frame */}
                <rect 
                  x="40" 
                  y="30" 
                  width="120" 
                  height={selectedItem.type === 'door' ? "170" : "160"} 
                  fill="rgba(14, 165, 233, 0.08)" 
                  stroke="#0284c7" 
                  strokeWidth="3" 
                />

                {/* Door Leaves or Window Panes */}
                {selectedItem.type === 'door' ? (
                  <g>
                    {/* Door Leaf */}
                    <rect x="46" y="36" width="108" height="164" fill="rgba(255,255,255,0.05)" stroke="#38bdf8" strokeWidth="1.5" />
                    {/* Door Handle */}
                    <circle cx="140" cy="118" r="4" fill="#f59e0b" />
                    <rect x="135" y="117" width="12" height="3" fill="#f59e0b" rx="1" />
                    {/* Swing Arch */}
                    <path d="M 46 200 A 108 108 0 0 0 154 200" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
                    {/* Glass insert if any */}
                    {selectedItem.glassArea > 0 && (
                      <rect x="65" y="55" width="70" height="60" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1" />
                    )}
                  </g>
                ) : (
                  <g>
                    {/* Window Frame Inner Panes */}
                    <rect x="46" y="36" width="108" height="148" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeWidth="1.5" />
                    {/* Window Glazing Bars / Mullion */}
                    <line x1="100" y1="36" x2="100" y2="184" stroke="#0284c7" strokeWidth="2" />
                    {/* Diagonal Reflection Glass Lines */}
                    <line x1="60" y1="70" x2="75" y2="55" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <line x1="120" y1="130" x2="135" y2="115" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  </g>
                )}

                {/* Dimension Texts */}
                <text x="100" y="15" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  L = {selectedItem.width} m
                </text>
                <text x="22" y="115" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 22 115)">
                  T = {selectedItem.height} m
                </text>
              </svg>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 font-mono flex justify-between">
              <span>Tipe: <strong>{selectedItem.type.toUpperCase()}</strong></span>
              <span>Jumlah: <strong>{selectedItem.qty} Unit</strong></span>
            </div>
          </div>

          {/* Quick Recap KPI Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-3">
            <h3 className="font-heading font-black text-xs text-slate-900 uppercase tracking-wider">
              Rekapitulasi Kebutuhan Total
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                <span className="text-slate-600">Total Keliling Kusen:</span>
                <span className="font-mono font-bold text-sky-950">{totals.totalKusenMeter.toFixed(2)} m'</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Total Luas Kaca:</span>
                <span className="font-mono font-bold text-slate-900">{totals.totalKacaM2.toFixed(2)} m²</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Total Daun Pintu:</span>
                <span className="font-mono font-bold text-slate-900">{totals.totalPintuDaun} Unit</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Total Daun Jendela:</span>
                <span className="font-mono font-bold text-slate-900">{totals.totalJendelaDaun} Unit</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Engsel Pintu 4":</span>
                <span className="font-mono font-bold text-slate-900">{totals.totalEngselPintu} Buah</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Engsel Jendela Casement:</span>
                <span className="font-mono font-bold text-slate-900">{totals.totalEngselJendela} Set</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>
                Kusen pintu dihitung 3 sisi (2 tinggi + 1 lebar), sedangkan jendela dihitung 4 sisi keliling penuh.
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

