import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum, formatRp } from '../../utils/formatters';
import { 
  ArrowLeft, 
  Send, 
  Layers, 
  Check, 
  Info, 
  Sparkles, 
  Route, 
  Trees, 
  ShieldCheck, 
  Building, 
  Box, 
  Compass, 
  Grid, 
  Droplets 
} from 'lucide-react';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';

export function InfrastructureCalculator() {
  const { setActiveTab, queueCalculatedItems, showToast } = useBoQ();

  // ==================== 1. JALAN PAVING & KANSTIN ====================
  const [pavingPanjang, setPavingPanjang] = usePersistentState('sr_calc_inf_paving_p', '50'); // meter
  const [pavingLebar, setPavingLebar] = usePersistentState('sr_calc_inf_paving_l', '5.0'); // meter
  const [pavingAreaTambahan, setPavingAreaTambahan] = usePersistentState('sr_calc_inf_paving_add', ''); // misal carport/tikungan m²
  const [pavingType, setPavingType] = usePersistentState('sr_calc_inf_paving_type', 'bata_6'); // 'bata_6' | 'bata_8' | 'segi_enam' | 'grass_block'
  
  // Ketebalan lapisan
  const [tebalAbuBatu, setTebalAbuBatu] = usePersistentState('sr_calc_inf_abu_batu_t', '0.05'); // meter (5cm)
  const [tebalSirtu, setTebalSirtu] = usePersistentState('sr_calc_inf_sirtu_t', '0.15'); // meter (15cm)
  
  // Kanstin
  const [hitungKanstin, setHitungKanstin] = usePersistentState('sr_calc_inf_hitung_kanstin', true);
  const [sisiKanstin, setSisiKanstin] = usePersistentState('sr_calc_inf_sisi_kanstin', '2'); // '2' sisi kiri & kanan, atau '1' satu sisi

  // Harga Satuan Default (Perwali Semarang TA 2026 / Analisa Pasar)
  const [hargaPaving, setHargaPaving] = usePersistentState('sr_calc_inf_h_paving', '85000'); // Rp/m² terpasang atau per pcs
  const [hargaAbuBatu, setHargaAbuBatu] = usePersistentState('sr_calc_inf_h_abu_batu', '320000'); // Rp/m³
  const [hargaSirtu, setHargaSirtu] = usePersistentState('sr_calc_inf_h_sirtu', '215000'); // Rp/m³ (Perwali M.135)
  const [hargaKanstin, setHargaKanstin] = usePersistentState('sr_calc_inf_h_kanstin', '42000'); // Rp/buah (40x20x10cm)

  // ==================== 2. SALURAN DRAINASE U-DITCH ====================
  const [panjangSaluran, setPanjangSaluran] = usePersistentState('sr_calc_inf_saluran_p', '100'); // meter
  const [tipeSaluran, setTipeSaluran] = usePersistentState('sr_calc_inf_saluran_type', 'uditch_30'); // 'uditch_30' | 'uditch_40' | 'uditch_50' | 'batu_kali'
  const [pakaiTutupUditch, setPakaiTutupUditch] = usePersistentState('sr_calc_inf_pakai_tutup', true);
  const [tipeTutup, setTipeTutup] = usePersistentState('sr_calc_inf_tutup_type', 'heavy'); // 'heavy' (bisa dilewati mobil) | 'light' (pejalan kaki)

  const [hargaUditch, setHargaUditch] = usePersistentState('sr_calc_inf_h_uditch', '195000'); // Rp/btg modul 1.2m
  const [hargaTutupUditch, setHargaTutupUditch] = usePersistentState('sr_calc_inf_h_tutup', '95000'); // Rp/buah modul 0.6m
  const [hargaGalian, setHargaGalian] = usePersistentState('sr_calc_inf_h_galian', '85000'); // Rp/m³

  // ==================== 3. PAGAR KELILING KAWASAN ====================
  const [panjangPagar, setPanjangPagar] = usePersistentState('sr_calc_inf_pagar_p', '60'); // meter
  const [tinggiPagar, setTinggiPagar] = usePersistentState('sr_calc_inf_pagar_t', '2.0'); // meter
  const [tipePagar, setTipePagar] = usePersistentState('sr_calc_inf_pagar_type', 'panel_beton'); // 'panel_beton' | 'bata_plester' | 'brc'
  
  // Pos Jaga / Security & Gerbang
  const [includePosSatpam, setIncludePosSatpam] = usePersistentState('sr_calc_inf_include_pos', true);
  const [tipePos, setTipePos] = usePersistentState('sr_calc_inf_pos_type', 'standar'); // 'standar' (2x2m) | 'lengkap' (2x3m + toilet)
  const [includeGerbang, setIncludeGerbang] = usePersistentState('sr_calc_inf_include_gerbang', true);
  const [lebarGerbang, setLebarGerbang] = usePersistentState('sr_calc_inf_gerbang_l', '6.0'); // meter

  const [hargaPagar, setHargaPagar] = usePersistentState('sr_calc_inf_h_pagar', '385000'); // Rp/m' terpasang
  const [hargaPosSatpam, setHargaPosSatpam] = usePersistentState('sr_calc_inf_h_pos', '18500000'); // Rp/unit
  const [hargaGerbang, setHargaGerbang] = usePersistentState('sr_calc_inf_h_gerbang', '1200000'); // Rp/m'

  // ==================== CHECKBOX KIRIM BOQ ====================
  const [sendPaving, setSendPaving] = usePersistentState('sr_calc_inf_send_paving', true);
  const [sendAbuBatu, setSendAbuBatu] = usePersistentState('sr_calc_inf_send_abu_batu', true);
  const [sendSirtu, setSendSirtu] = usePersistentState('sr_calc_inf_send_sirtu', true);
  const [sendKanstin, setSendKanstin] = usePersistentState('sr_calc_inf_send_kanstin', true);
  const [sendUditch, setSendUditch] = usePersistentState('sr_calc_inf_send_uditch', true);
  const [sendTutupUditch, setSendTutupUditch] = usePersistentState('sr_calc_inf_send_tutup', true);
  const [sendGalianSaluran, setSendGalianSaluran] = usePersistentState('sr_calc_inf_send_galian', true);
  const [sendPagarKawasan, setSendPagarKawasan] = usePersistentState('sr_calc_inf_send_pagar', true);
  const [sendPosSatpam, setSendPosSatpam] = usePersistentState('sr_calc_inf_send_pos', true);
  const [sendGerbangKawasan, setSendGerbangKawasan] = usePersistentState('sr_calc_inf_send_gerbang', true);

  // ==================== KALKULASI TEKNIS ====================
  const calc = useMemo(() => {
    // 1. Jalan & Paving
    const pJalan = parseNum(pavingPanjang);
    const lJalan = parseNum(pavingLebar);
    const areaTambahan = parseNum(pavingAreaTambahan);
    const luasJalanUtama = pJalan * lJalan;
    const totalLuasPaving = luasJalanUtama + areaTambahan;

    let koefPcsPerM2 = 44; // bata standar 10x20cm
    let namaPaving = 'Paving Block Bata Tebal 6 cm (K-250)';
    if (pavingType === 'bata_8') {
      koefPcsPerM2 = 44;
      namaPaving = 'Paving Block Bata Tebal 8 cm Heavy Duty (K-300)';
    } else if (pavingType === 'segi_enam') {
      koefPcsPerM2 = 29;
      namaPaving = 'Paving Block Hexagon / Segi Enam 6 cm';
    } else if (pavingType === 'grass_block') {
      koefPcsPerM2 = 8.3;
      namaPaving = 'Grass Block Lubang Rumput 8 cm';
    }

    const totalPcsPaving = Math.ceil(totalLuasPaving * koefPcsPerM2 * 1.03); // waste 3%
    const volAbuBatu = +(totalLuasPaving * (parseNum(tebalAbuBatu) || 0.05) * 1.2).toFixed(2); // faktor padat 1.2
    const volSirtu = +(totalLuasPaving * (parseNum(tebalSirtu) || 0.15) * 1.25).toFixed(2); // faktor padat 1.25

    // Kanstin: panjang = pJalan * sisi (misal 2 sisi kiri & kanan)
    const panjangKanstinMeter = hitungKanstin ? pJalan * (parseNum(sisiKanstin) || 2) : 0;
    const pcsKanstin = panjangKanstinMeter > 0 ? Math.ceil(panjangKanstinMeter / 0.4) : 0; // panjang modul 40cm

    // 2. Saluran Drainase
    const pSaluran = parseNum(panjangSaluran);
    // Dimensi galian perkiraan
    let lebarGalian = 0.5;
    let dalamGalian = 0.5;
    let namaUditch = 'U-Ditch Precast 30×30 cm (Panjang 1.20m)';
    if (tipeSaluran === 'uditch_40') {
      lebarGalian = 0.6;
      dalamGalian = 0.6;
      namaUditch = 'U-Ditch Precast 40×40 cm (Panjang 1.20m)';
    } else if (tipeSaluran === 'uditch_50') {
      lebarGalian = 0.7;
      dalamGalian = 0.7;
      namaUditch = 'U-Ditch Precast 50×50 cm (Panjang 1.20m)';
    } else if (tipeSaluran === 'batu_kali') {
      lebarGalian = 0.5;
      dalamGalian = 0.5;
      namaUditch = 'Saluran Pasangan Batu Kali';
    }

    const batangUditch = Math.ceil(pSaluran / 1.2); // modul 1.2 meter
    const tutupUditch = pakaiTutupUditch ? Math.ceil(pSaluran / 0.6) : 0; // tutup biasanya modul 60 cm
    const volGalianSaluran = +(pSaluran * lebarGalian * dalamGalian).toFixed(2);
    const volPasirUrugSaluran = +(pSaluran * lebarGalian * 0.05).toFixed(2); // 5cm pasir urug dasar

    // 3. Pagar Keliling & Gerbang
    const pPagar = parseNum(panjangPagar);
    const tPagar = parseNum(tinggiPagar) || 2.0;
    const luasPagarM2 = pPagar * tPagar;

    let panelPcs = 0;
    let tiangKolomPcs = 0;
    if (tipePagar === 'panel_beton') {
      // Panel 240 x 40 x 5 cm
      const jumlahLembarPerTumpuk = Math.ceil(tPagar / 0.4);
      const jumlahBentang = Math.ceil(pPagar / 2.4);
      panelPcs = jumlahBentang * jumlahLembarPerTumpuk;
      tiangKolomPcs = jumlahBentang + 1;
    }

    return {
      totalLuasPaving,
      namaPaving,
      totalPcsPaving,
      volAbuBatu,
      volSirtu,
      panjangKanstinMeter,
      pcsKanstin,
      namaUditch,
      batangUditch,
      tutupUditch,
      volGalianSaluran,
      volPasirUrugSaluran,
      pPagar,
      tPagar,
      luasPagarM2,
      panelPcs,
      tiangKolomPcs
    };
  }, [
    pavingPanjang, pavingLebar, pavingAreaTambahan, pavingType, tebalAbuBatu, tebalSirtu, hitungKanstin, sisiKanstin,
    panjangSaluran, tipeSaluran, pakaiTutupUditch,
    panjangPagar, tinggiPagar, tipePagar
  ]);

  // Estimasi Total Anggaran
  const totalEstimasiBiaya = useMemo(() => {
    let cost = 0;
    if (sendPaving) cost += calc.totalLuasPaving * parseNum(hargaPaving);
    if (sendAbuBatu) cost += calc.volAbuBatu * parseNum(hargaAbuBatu);
    if (sendSirtu) cost += calc.volSirtu * parseNum(hargaSirtu);
    if (sendKanstin && calc.pcsKanstin > 0) cost += calc.pcsKanstin * parseNum(hargaKanstin);
    if (sendUditch && calc.batangUditch > 0) cost += calc.batangUditch * parseNum(hargaUditch);
    if (sendTutupUditch && calc.tutupUditch > 0) cost += calc.tutupUditch * parseNum(hargaTutupUditch);
    if (sendGalianSaluran && calc.volGalianSaluran > 0) cost += calc.volGalianSaluran * parseNum(hargaGalian);
    if (sendPagarKawasan && calc.pPagar > 0) cost += calc.pPagar * parseNum(hargaPagar);
    if (includePosSatpam && sendPosSatpam) cost += parseNum(hargaPosSatpam);
    if (includeGerbang && sendGerbangKawasan) cost += parseNum(lebarGerbang) * parseNum(hargaGerbang);
    return cost;
  }, [
    calc, sendPaving, sendAbuBatu, sendSirtu, sendKanstin, sendUditch, sendTutupUditch, sendGalianSaluran,
    sendPagarKawasan, includePosSatpam, sendPosSatpam, includeGerbang, sendGerbangKawasan,
    hargaPaving, hargaAbuBatu, hargaSirtu, hargaKanstin, hargaUditch, hargaTutupUditch, hargaGalian,
    hargaPagar, hargaPosSatpam, hargaGerbang, lebarGerbang
  ]);

  // Kirim ke BoQ
  const handleSendToBoQ = () => {
    const itemsToSend = [];

    // Paving Block
    if (sendPaving && calc.totalLuasPaving > 0) {
      itemsToSend.push({
        category: 'lain_lain',
        label: `${calc.namaPaving} (Luas ${calc.totalLuasPaving.toFixed(1)} m²)`,
        satuan: 'm²',
        jumlah: +calc.totalLuasPaving.toFixed(2),
        harga: parseNum(hargaPaving) || 85000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Abu Batu
    if (sendAbuBatu && calc.volAbuBatu > 0) {
      itemsToSend.push({
        category: 'tanah_pondasi',
        label: `Abu Batu / Pasir Alas Paving Jalan Lingkungan t=5cm`,
        satuan: 'm³',
        jumlah: calc.volAbuBatu,
        harga: parseNum(hargaAbuBatu) || 320000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Sirtu
    if (sendSirtu && calc.volSirtu > 0) {
      itemsToSend.push({
        category: 'tanah_pondasi',
        label: `Lapisan Pondasi Bawah Sirtu / Agregat Jalan Lingkungan t=15cm`,
        satuan: 'm³',
        jumlah: calc.volSirtu,
        harga: parseNum(hargaSirtu) || 215000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Kanstin
    if (sendKanstin && calc.pcsKanstin > 0) {
      itemsToSend.push({
        category: 'lain_lain',
        label: `Kanstin / Kerb Beton Pengunci Tepi Jalan (${calc.panjangKanstinMeter} m')`,
        satuan: 'Buah',
        jumlah: calc.pcsKanstin,
        harga: parseNum(hargaKanstin) || 42000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // U-Ditch
    if (sendUditch && calc.batangUditch > 0) {
      itemsToSend.push({
        category: 'lain_lain',
        label: `${calc.namaUditch} Saluran Drainase Depan Kavling (${parseNum(panjangSaluran)} m')`,
        satuan: 'Batang',
        jumlah: calc.batangUditch,
        harga: parseNum(hargaUditch) || 195000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Tutup U-Ditch
    if (sendTutupUditch && calc.tutupUditch > 0) {
      const coverLabel = tipeTutup === 'heavy' ? 'Cover U-Ditch Heavy Duty (Beban Mobil)' : 'Cover U-Ditch Light Duty (Pedestrian)';
      itemsToSend.push({
        category: 'lain_lain',
        label: `${coverLabel} Modul 60cm`,
        satuan: 'Buah',
        jumlah: calc.tutupUditch,
        harga: parseNum(hargaTutupUditch) || 95000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Galian Saluran
    if (sendGalianSaluran && calc.volGalianSaluran > 0) {
      itemsToSend.push({
        category: 'tanah_pondasi',
        label: `Galian Tanah Saluran Drainase U-Ditch`,
        satuan: 'm³',
        jumlah: calc.volGalianSaluran,
        harga: parseNum(hargaGalian) || 85000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Pagar Keliling
    if (sendPagarKawasan && calc.pPagar > 0) {
      const pagarLabel = tipePagar === 'panel_beton'
        ? `Pagar Panel Beton Precast T.${calc.tPagar}m (${calc.pPagar} m')`
        : tipePagar === 'bata_plester'
        ? `Pagar Pasangan Bata Ringan / Hebel T.${calc.tPagar}m Diplester Aci`
        : `Pagar BRC Galvanis T.${calc.tPagar}m + Tiang`;

      itemsToSend.push({
        category: 'lain_lain',
        label: pagarLabel,
        satuan: 'm\'',
        jumlah: calc.pPagar,
        harga: parseNum(hargaPagar) || 385000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Pos Satpam
    if (includePosSatpam && sendPosSatpam) {
      itemsToSend.push({
        category: 'lain_lain',
        label: `Pos Satpam / Pos Security Cluster (Tipe ${tipePos === 'standar' ? '2×2m Standar' : '2×3m + Toilet'})`,
        satuan: 'Unit',
        jumlah: 1,
        harga: parseNum(hargaPosSatpam) || 18500000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    // Gerbang Utama
    if (includeGerbang && sendGerbangKawasan) {
      const lGerbang = parseNum(lebarGerbang) || 6.0;
      itemsToSend.push({
        category: 'lain_lain',
        label: `Main Gate Pintu Gerbang Cluster Besi Hollow Galvanis (Lebar ${lGerbang}m)`,
        satuan: 'm\'',
        jumlah: lGerbang,
        harga: parseNum(hargaGerbang) || 1200000,
        source: 'Kalkulator Infrastruktur Kawasan'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Pilih minimal satu item pekerjaan infrastruktur untuk dikirim ke BoQ.", "warning");
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
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <Trees className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">CLUSTER INFRASTRUCTURE & SITE WORKS</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ke BoQ</span>
            </button>
          </div>

          <div className="max-w-2xl">
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              Infrastruktur Kawasan Cluster
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              Kalkulasi pekerjaan luar kavling (*site works*): perkerasan jalan paving block & kanstin, drainase U-ditch precast depan kavling, pagar kawasan, dan gerbang / pos keamanan.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Konten 3 Kolom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ==================== CARD 1: JALAN PAVING & KANSTIN ==================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-heading font-black text-slate-900 uppercase">
                    1. Jalan Paving & Kanstin
                  </h2>
                  <p className="text-[10px] text-slate-500">Perkerasan jalan lingkungan cluster</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono font-bold text-[11px] border border-amber-200">
                {formatNumber(calc.totalLuasPaving, 1)} m²
              </span>
            </div>

            {/* Inputs Jalan */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Panjang Jalan (m)</label>
                <input
                  type="number"
                  step="1"
                  value={pavingPanjang}
                  onChange={e => setPavingPanjang(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Lebar Jalan (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={pavingLebar}
                  onChange={e => setPavingLebar(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Area Tambahan (Carport/Belokan m²)</label>
              <input
                type="number"
                step="1"
                value={pavingAreaTambahan}
                onChange={e => setPavingAreaTambahan(e.target.value)}
                placeholder="mis. 24"
                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Tipe Paving */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Jenis Paving Block</label>
              <select
                value={pavingType}
                onChange={e => setPavingType(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="bata_6">Paving Bata Tebal 6 cm (K-250) — Mobil Ringan</option>
                <option value="bata_8">Paving Bata Tebal 8 cm (K-300) — Heavy Duty / Truk</option>
                <option value="segi_enam">Hexagon / Segi Enam 6 cm (29 pcs/m²)</option>
                <option value="grass_block">Grass Block Lubang Rumput 8 cm</option>
              </select>
            </div>

            {/* Kanstin Toggle */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-amber-950 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={hitungKanstin}
                    onChange={e => setHitungKanstin(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-600 rounded"
                  />
                  Kanstin Beton Pengunci Tepi
                </span>
                <select
                  value={sisiKanstin}
                  onChange={e => setSisiKanstin(e.target.value)}
                  disabled={!hitungKanstin}
                  className="p-1 text-[10px] font-mono bg-white border border-amber-300 rounded"
                >
                  <option value="2">2 Sisi (Kiri & Kanan)</option>
                  <option value="1">1 Sisi Saja</option>
                </select>
              </label>
              {hitungKanstin && (
                <p className="text-[10px] font-mono text-amber-800">
                  Panjang: <b>{calc.panjangKanstinMeter} m'</b> (≈ <b>{calc.pcsKanstin} pcs</b> kanstin 40cm)
                </p>
              )}
            </div>

            {/* Material Result Summary */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Keping Paving:</span>
                <span className="font-bold text-amber-800">± {formatNumber(calc.totalPcsPaving)} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Abu Batu Alas (t=5cm):</span>
                <span className="font-bold text-slate-900">{calc.volAbuBatu} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Sirtu Agregat (t=15cm):</span>
                <span className="font-bold text-slate-900">{calc.volSirtu} m³</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CARD 2: SALURAN DRAINASE U-DITCH ==================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-600 flex items-center justify-center font-bold">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-heading font-black text-slate-900 uppercase">
                    2. Drainase U-Ditch
                  </h2>
                  <p className="text-[10px] text-slate-500">Saluran air hujan depan kavling</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono font-bold text-[11px] border border-sky-200">
                {parseNum(panjangSaluran)} m'
              </span>
            </div>

            {/* Inputs Drainase */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Panjang Saluran Total (m')</label>
              <input
                type="number"
                step="1"
                value={panjangSaluran}
                onChange={e => setPanjangSaluran(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-slate-50 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400">Total panjang saluran di sisi kiri & kanan jalan</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Tipe Saluran Precast</label>
              <select
                value={tipeSaluran}
                onChange={e => setTipeSaluran(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="uditch_30">U-Ditch Precast 30×30 cm (Standar Cluster)</option>
                <option value="uditch_40">U-Ditch Precast 40×40 cm (Saluran Utama)</option>
                <option value="uditch_50">U-Ditch Precast 50×50 cm (Kapasitas Besar)</option>
                <option value="batu_kali">Pasangan Batu Kali Konvensional</option>
              </select>
            </div>

            {/* Cover / Tutup U-ditch */}
            <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-sky-950 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={pakaiTutupUditch}
                    onChange={e => setPakaiTutupUditch(e.target.checked)}
                    className="w-3.5 h-3.5 text-sky-600 rounded"
                  />
                  Tutup Beton Bertulang (Cover)
                </span>
                <select
                  value={tipeTutup}
                  onChange={e => setTipeTutup(e.target.value)}
                  disabled={!pakaiTutupUditch}
                  className="p-1 text-[10px] font-mono bg-white border border-sky-300 rounded"
                >
                  <option value="heavy">Heavy Duty (Mobil)</option>
                  <option value="light">Light Duty (Pedestrian)</option>
                </select>
              </label>
              {pakaiTutupUditch && (
                <p className="text-[10px] font-mono text-sky-800">
                  Kebutuhan Cover: <b>{calc.tutupUditch} buah</b> (modul 60cm)
                </p>
              )}
            </div>

            {/* Material Result Summary */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-600">Modul U-Ditch 1.2m:</span>
                <span className="font-bold text-sky-800">{calc.batangUditch} batang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Galian Tanah Saluran:</span>
                <span className="font-bold text-slate-900">{calc.volGalianSaluran} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Pasir Urug Alas:</span>
                <span className="font-bold text-slate-900">{calc.volPasirUrugSaluran} m³</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CARD 3: PAGAR KELILING & GERBANG ==================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-paper-300 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-heading font-black text-slate-900 uppercase">
                    3. Pagar & Keamanan
                  </h2>
                  <p className="text-[10px] text-slate-500">Batas kawasan, pos & gerbang</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-mono font-bold text-[11px] border border-indigo-200">
                {parseNum(panjangPagar)} m'
              </span>
            </div>

            {/* Inputs Pagar */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Panjang Pagar (m)</label>
                <input
                  type="number"
                  step="1"
                  value={panjangPagar}
                  onChange={e => setPanjangPagar(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Tinggi Pagar (m)</label>
                <input
                  type="number"
                  step="0.2"
                  value={tinggiPagar}
                  onChange={e => setTinggiPagar(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Tipe Konstruksi Pagar</label>
              <select
                value={tipePagar}
                onChange={e => setTipePagar(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="panel_beton">Pagar Panel Beton Pracetak (Kolom H-Beam)</option>
                <option value="bata_plester">Pagar Bata Merah / Hebel Diplester Aci</option>
                <option value="brc">Pagar BRC Galvanis</option>
              </select>
            </div>

            {/* Pos Satpam & Gerbang Checks */}
            <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={includePosSatpam}
                    onChange={e => setIncludePosSatpam(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  Pos Satpam / Security
                </span>
                <select
                  value={tipePos}
                  onChange={e => setTipePos(e.target.value)}
                  disabled={!includePosSatpam}
                  className="p-1 text-[10px] font-mono bg-white border border-indigo-300 rounded"
                >
                  <option value="standar">2×2m Standar</option>
                  <option value="lengkap">2×3m + Toilet</option>
                </select>
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-indigo-100">
                <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={includeGerbang}
                    onChange={e => setIncludeGerbang(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  Pintu Gerbang Utama
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={lebarGerbang}
                    onChange={e => setLebarGerbang(e.target.value)}
                    disabled={!includeGerbang}
                    className="w-12 p-0.5 text-center font-mono text-[10px] bg-white border border-indigo-300 rounded"
                  />
                  <span className="text-[10px] text-slate-500">m</span>
                </div>
              </label>
            </div>

            {/* Material Result Summary */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-600">Luas Bidang Pagar:</span>
                <span className="font-bold text-slate-900">{calc.luasPagarM2.toFixed(1)} m²</span>
              </div>
              {tipePagar === 'panel_beton' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Panel Daun Beton:</span>
                    <span className="font-bold text-indigo-800">{calc.panelPcs} lembar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tiang Kolom H-Beam:</span>
                    <span className="font-bold text-indigo-800">{calc.tiangKolomPcs} batang</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ==================== HARGA SATUAN ESTIMASI ==================== */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
            <span>Harga Satuan Pekerjaan Infrastruktur</span>
            <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
              Acuan Pasar & Perwali Kota Semarang TA 2026
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono pt-2">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Paving Block (Rp/m²)</label>
            <input
              type="number"
              value={hargaPaving}
              onChange={e => setHargaPaving(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Abu Batu (Rp/m³)</label>
            <input
              type="number"
              value={hargaAbuBatu}
              onChange={e => setHargaAbuBatu(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Sirtu Urug (Rp/m³)</label>
            <input
              type="number"
              value={hargaSirtu}
              onChange={e => setHargaSirtu(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Kanstin (Rp/buah)</label>
            <input
              type="number"
              value={hargaKanstin}
              onChange={e => setHargaKanstin(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">U-Ditch (Rp/btg)</label>
            <input
              type="number"
              value={hargaUditch}
              onChange={e => setHargaUditch(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Cover U-Ditch (Rp/bh)</label>
            <input
              type="number"
              value={hargaTutupUditch}
              onChange={e => setHargaTutupUditch(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Pagar Kawasan (Rp/m')</label>
            <input
              type="number"
              value={hargaPagar}
              onChange={e => setHargaPagar(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Galian Saluran (Rp/m³)</label>
            <input
              type="number"
              value={hargaGalian}
              onChange={e => setHargaGalian(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Pos Satpam (Rp/unit)</label>
            <input
              type="number"
              value={hargaPosSatpam}
              onChange={e => setHargaPosSatpam(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase mb-1">Main Gate Gerbang (Rp/m²)</label>
            <input
              type="number"
              value={hargaGerbang}
              onChange={e => setHargaGerbang(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* ==================== PENGIRIMAN KE BOQ ==================== */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/80 border-2 border-dashed border-emerald-400/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
            <div>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-emerald-950">
                Kirim Pekerjaan Infrastruktur ke BoQ Tools
              </h2>
              <p className="text-xs text-emerald-800/80">
                Pilih item pekerjaan luar kavling untuk dimasukkan ke WBS proyek Anda.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 block">Total Estimasi Infrastruktur</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-950">
              {formatRp(totalEstimasiBiaya)}
            </span>
          </div>
        </div>

        {/* Checkbox Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white p-4 rounded-2xl border border-emerald-200">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={sendPaving} onChange={e => setSendPaving(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span>Paving Block — <b className="font-mono text-emerald-900">{formatNumber(calc.totalLuasPaving, 1)} m²</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={sendAbuBatu} onChange={e => setSendAbuBatu(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span>Abu Batu Alas — <b className="font-mono text-emerald-900">{calc.volAbuBatu} m³</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={sendSirtu} onChange={e => setSendSirtu(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span>Pondasi Sirtu — <b className="font-mono text-emerald-900">{calc.volSirtu} m³</b></span>
          </label>

          {hitungKanstin && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" checked={sendKanstin} onChange={e => setSendKanstin(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
              <span>Kanstin Pengunci — <b className="font-mono text-emerald-900">{calc.pcsKanstin} buah</b></span>
            </label>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={sendUditch} onChange={e => setSendUditch(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span>U-Ditch Precast — <b className="font-mono text-emerald-900">{calc.batangUditch} btg</b></span>
          </label>

          {pakaiTutupUditch && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" checked={sendTutupUditch} onChange={e => setSendTutupUditch(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
              <span>Cover U-Ditch — <b className="font-mono text-emerald-900">{calc.tutupUditch} buah</b></span>
            </label>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={sendGalianSaluran} onChange={e => setSendGalianSaluran(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span>Galian Saluran — <b className="font-mono text-emerald-900">{calc.volGalianSaluran} m³</b></span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={sendPagarKawasan} onChange={e => setSendPagarKawasan(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span>Pagar Keliling — <b className="font-mono text-emerald-900">{calc.pPagar} m'</b></span>
          </label>

          {includePosSatpam && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" checked={sendPosSatpam} onChange={e => setSendPosSatpam(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
              <span>Pos Satpam — <b className="font-mono text-emerald-900">1 Unit</b></span>
            </label>
          )}

          {includeGerbang && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" checked={sendGerbangKawasan} onChange={e => setSendGerbangKawasan(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
              <span>Gerbang Utama — <b className="font-mono text-emerald-900">{lebarGerbang} m'</b></span>
            </label>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSendToBoQ}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-heading font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Terpilih ke Antrian BoQ</span>
          </button>
        </div>
      </div>

    </div>
  );
}
