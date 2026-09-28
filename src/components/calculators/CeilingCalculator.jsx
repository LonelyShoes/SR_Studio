import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum } from '../../utils/formatters';
import { 
  ArrowLeft, 
  Send, 
  Plus, 
  Trash2, 
  Layers, 
  Info, 
  Check, 
  Sparkles, 
  Boxes, 
  Grid, 
  LayoutTemplate,
  ChevronDown,
  Settings2,
  RotateCcw
} from 'lucide-react';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';

export function CeilingCalculator() {
  const { setActiveTab, queueCalculatedItems, showToast, clusterUnits, updateClusterUnits } = useBoQ();
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_cl_cluster_mode', 'multiplied'); // 'multiplied' | 'single'

  // Rooms list
  const [daftarRuangan, setDaftarRuangan] = usePersistentState('sr_calc_cl_rooms', []);

  // Active Multi-segment Builder state
  const [segPanjang, setSegPanjang] = usePersistentState('sr_calc_cl_seg_p', '');
  const [segLebar, setSegLebar] = usePersistentState('sr_calc_cl_seg_l', '');
  const [segmenAktif, setSegmenAktif] = usePersistentState('sr_calc_cl_active_segs', []);
  const [segMsg, setSegMsg] = useState('');

  // Active Room Form Fields
  const [namaRuangan, setNamaRuangan] = usePersistentState('sr_calc_cl_room_name', '');
  const [dropTinggi, setDropTinggi] = usePersistentState('sr_calc_cl_drop_h', '0.3'); // meter
  const [jenisPenutup, setJenisPenutup] = usePersistentState('sr_calc_cl_penutup_type', 'gypsum'); // 'gypsum' | 'grc' | 'pvc' | 'triplek'
  const [luasLembar, setLuasLembar] = usePersistentState('sr_calc_cl_luas_lembar', '2.88'); // 120x240cm = 2.88m²
  const [wasteLembar, setWasteLembar] = usePersistentState('sr_calc_cl_waste_lembar', '10'); // %
  const [skrupPerLembar, setSkrupPerLembar] = usePersistentState('sr_calc_cl_skrup_per_lbr', '30'); // pcs/lembar

  // Rangka Hollow
  const [jarakUtama, setJarakUtama] = usePersistentState('sr_calc_cl_jarak_utama', '120'); // cm
  const [jarakPembagi, setJarakPembagi] = usePersistentState('sr_calc_cl_jarak_pembagi', '60'); // cm
  const [panjangBatangHollow, setPanjangBatangHollow] = usePersistentState('sr_calc_cl_panjang_hollow', '4'); // meter
  const [skrupPerTitikRangka, setSkrupPerTitikRangka] = usePersistentState('sr_calc_cl_skrup_per_titik', '2'); // pcs/sambungan

  // Penggantung Plafond (Tipe Penggantung: 'kawat' | 'hollow')
  const [tipePenggantung, setTipePenggantung] = usePersistentState('sr_calc_cl_tipe_gantung', 'kawat'); // 'kawat' | 'hollow'
  const [jarakGantung, setJarakGantung] = usePersistentState('sr_calc_cl_jarak_gantung', '120'); // cm
  const [allowanceKawat, setAllowanceKawat] = usePersistentState('sr_calc_cl_allow_kawat', '0.3'); // meter per titik

  // Compound & Tape (Gypsum)
  const [hitungCompound, setHitungCompound] = usePersistentState('sr_calc_cl_hitung_compound', true);
  const [koefCompound, setKoefCompound] = usePersistentState('sr_calc_cl_koef_compound', '0.35'); // kg/m²
  const [koefTape, setKoefTape] = usePersistentState('sr_calc_cl_koef_tape', '1.1'); // m/m²

  // Lis Profil Keliling
  const [hitungLis, setHitungLis] = usePersistentState('sr_calc_cl_hitung_lis', true);
  const [panjangBatangLis, setPanjangBatangLis] = usePersistentState('sr_calc_cl_panjang_lis', '4'); // meter per batang
  const [lisCustomMode, setLisCustomMode] = usePersistentState('sr_calc_cl_lis_mode', 'auto'); // 'auto' | 'custom'
  const [lisCustomMeter, setLisCustomMeter] = usePersistentState('sr_calc_cl_lis_custom_m', '');

  // Pengaturan Kemasan Pembelian (Live)
  const [dusSkrupPcs, setDusSkrupPcs] = usePersistentState('sr_calc_cl_dus_skrup', '1000');
  const [boxFischerPcs, setBoxFischerPcs] = usePersistentState('sr_calc_cl_box_fischer', '100');
  const [beratKawatPerM, setBeratKawatPerM] = usePersistentState('sr_calc_cl_berat_kawat', '0.02'); // kg/m
  const [sakCompoundKg, setSakCompoundKg] = usePersistentState('sr_calc_cl_sak_compound', '25');
  const [rollTapeM, setRollTapeM] = usePersistentState('sr_calc_cl_roll_tape', '75');

  // Optional Material Prices (Rp)
  const [hargaPenutup, setHargaPenutup] = usePersistentState('sr_calc_cl_harga_penutup', ''); // Rp/lembar
  const [hargaRangka, setHargaRangka] = usePersistentState('sr_calc_cl_harga_rangka', ''); // Rp/btg 4m
  const [hargaPenggantungKawat, setHargaPenggantungKawat] = usePersistentState('sr_calc_cl_harga_kawat', ''); // Rp/kg
  const [hargaPenggantungHollow, setHargaPenggantungHollow] = usePersistentState('sr_calc_cl_harga_gantung_hollow', ''); // Rp/btg 4m
  const [hargaSkrupDus, setHargaSkrupDus] = usePersistentState('sr_calc_cl_harga_skrup', ''); // Rp/dus
  const [hargaFischerBox, setHargaFischerBox] = usePersistentState('sr_calc_cl_harga_fischer', ''); // Rp/box
  const [hargaCompoundSak, setHargaCompoundSak] = usePersistentState('sr_calc_cl_harga_compound', ''); // Rp/sak
  const [hargaTapeRoll, setHargaTapeRoll] = usePersistentState('sr_calc_cl_harga_tape', ''); // Rp/roll
  const [hargaLisBatang, setHargaLisBatang] = usePersistentState('sr_calc_cl_harga_lis', ''); // Rp/btg

  // BoQ Checkbox Selection
  const [sendPenutup, setSendPenutup] = usePersistentState('sr_calc_cl_send_penutup', true);
  const [sendRangka, setSendRangka] = usePersistentState('sr_calc_cl_send_rangka', true);
  const [sendPenggantung, setSendPenggantung] = usePersistentState('sr_calc_cl_send_gantung', true);
  const [sendSkrup, setSendSkrup] = usePersistentState('sr_calc_cl_send_skrup', true);
  const [sendFischer, setSendFischer] = usePersistentState('sr_calc_cl_send_fischer', true);
  const [sendCompound, setSendCompound] = usePersistentState('sr_calc_cl_send_compound', true);
  const [sendTape, setSendTape] = usePersistentState('sr_calc_cl_send_tape', true);
  const [sendLis, setSendLis] = usePersistentState('sr_calc_cl_send_lis', true);

  // Segment Handlers
  const handleAddSegment = (e) => {
    e.preventDefault();
    setSegMsg('');
    const p = parseNum(segPanjang);
    const l = parseNum(segLebar);
    if (p <= 0 || l <= 0) {
      setSegMsg('Panjang dan lebar segmen harus lebih dari 0.');
      return;
    }
    const newSeg = {
      id: Date.now() + Math.random(),
      panjang: p,
      lebar: l,
      luas: p * l,
      keliling: 2 * (p + l)
    };
    setSegmenAktif(prev => [...prev, newSeg]);
    setSegPanjang('');
    setSegLebar('');
  };

  const handleDeleteSegment = (id) => {
    setSegmenAktif(prev => prev.filter(s => s.id !== id));
  };

  const totalLuasSegmenAktif = useMemo(() => {
    return segmenAktif.reduce((acc, s) => acc + s.luas, 0);
  }, [segmenAktif]);

  const totalKelilingSegmenAktif = useMemo(() => {
    // If 1 segment = 2*(p+l); for multi-segment approximate boundary = sum of perimeters with deduction factor
    if (segmenAktif.length === 0) return 0;
    if (segmenAktif.length === 1) return segmenAktif[0].keliling;
    // Approximated perimeter for polygon decomposition (deducting internal shared edges)
    const rawSum = segmenAktif.reduce((acc, s) => acc + s.keliling, 0);
    return rawSum * 0.75;
  }, [segmenAktif]);

  // Add Room Entry Handler
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (segmenAktif.length === 0) {
      alert("Tambahkan minimal satu segmen dimensi ruangan.");
      return;
    }

    const luas = totalLuasSegmenAktif;
    const keliling = totalKelilingSegmenAktif;
    const jUtama = (parseNum(jarakUtama) || 120) / 100;
    const jPembagi = (parseNum(jarakPembagi) || 60) / 100;
    const pBatang = parseNum(panjangBatangHollow) || 4;
    const sTitikRangka = parseNum(skrupPerTitikRangka) || 2;

    const jGantung = (parseNum(jarakGantung) || 120) / 100;
    const dHollow = parseNum(dropTinggi) || 0.3;
    const allowKawat = parseNum(allowanceKawat) || 0.3;

    const lLembar = parseNum(luasLembar) || 2.88;
    const wLembar = parseNum(wasteLembar) || 10;
    const sLembar = parseNum(skrupPerLembar) || 30;

    const useCompound = hitungCompound && jenisPenutup === 'gypsum';
    const kCompound = parseNum(koefCompound) || 0.35;
    const kTape = parseNum(koefTape) || 1.1;

    // Mathematical calculations
    const jumlahLembar = Math.ceil((luas * (1 + wLembar / 100)) / lLembar);
    const panjangUtama = jUtama > 0 ? luas * (1 / jUtama) : 0;
    const panjangPembagi = jPembagi > 0 ? luas * (1 / jPembagi) : 0;
    const batangUtama = pBatang > 0 ? Math.ceil(panjangUtama / pBatang) : 0;
    const batangPembagi = pBatang > 0 ? Math.ceil(panjangPembagi / pBatang) : 0;
    const totalBatangRangka = batangUtama + batangPembagi;

    const titikSilang = (jUtama > 0 && jPembagi > 0) ? luas * (1 / jUtama) * (1 / jPembagi) : 0;
    const skrupRangkaTotal = Math.ceil(titikSilang * sTitikRangka);
    const skrupPenutupTotal = jumlahLembar * sLembar;

    const titikGantung = (jUtama > 0 && jGantung > 0) ? Math.ceil(luas * (1 / jUtama) * (1 / jGantung)) : 0;

    // Penggantung calculation: Kawat vs Hollow
    let panjangKawat = 0;
    let batangHollowPenggantung = 0;
    let panjangHollowPenggantung = 0;

    if (tipePenggantung === 'kawat') {
      panjangKawat = titikGantung * (dHollow + allowKawat);
    } else {
      // Lis Hollow Baja Ringan Penggantung (batang vertikal drop + sambungan)
      const pPerTitik = dHollow + 0.1; // 10cm allowance sambungan sekrup
      panjangHollowPenggantung = titikGantung * pPerTitik;
      batangHollowPenggantung = pBatang > 0 ? Math.ceil(panjangHollowPenggantung / pBatang) : 0;
    }

    const fischerTotal = titikGantung; // 1 fischer/dynabolt per titik gantung ke dak

    const compoundKg = useCompound ? luas * kCompound : 0;
    const tapeM = useCompound ? luas * kTape : 0;

    const pLisBatang = parseNum(panjangBatangLis) || 4;
    const panjangLisEfektif = (lisCustomMode === 'custom' && parseNum(lisCustomMeter) > 0)
      ? parseNum(lisCustomMeter)
      : keliling;
    const batangLis = hitungLis ? Math.ceil(panjangLisEfektif / pLisBatang) : 0;

    const newRoom = {
      id: Date.now(),
      nama: namaRuangan.trim() || `Ruangan ${daftarRuangan.length + 1}`,
      luas,
      keliling,
      panjangLis: panjangLisEfektif,
      isLisCustom: lisCustomMode === 'custom' && parseNum(lisCustomMeter) > 0,
      jumlahSegmen: segmenAktif.length,
      segmen: [...segmenAktif],
      jenisPenutup,
      tipePenggantung,
      jumlahLembar,
      batangUtama,
      batangPembagi,
      totalBatangRangka,
      panjangUtama,
      panjangPembagi,
      titikSilang,
      skrupRangkaTotal,
      skrupPenutupTotal,
      titikGantung,
      panjangKawat,
      batangHollowPenggantung,
      panjangHollowPenggantung,
      fischerTotal,
      useCompound,
      compoundKg,
      tapeM,
      batangLis
    };

    setDaftarRuangan(prev => [...prev, newRoom]);
    setNamaRuangan('');
    setSegmenAktif([]);
    setLisCustomMeter('');
    setLisCustomMode('auto');
  };

  const handleDeleteRoom = (id) => {
    setDaftarRuangan(prev => prev.filter(r => r.id !== id));
  };

  // Grand Total Accumulation
  const summary = useMemo(() => {
    let totalLuas = 0;
    let totalKeliling = 0;
    let totalLembar = 0;
    let totalBatangUtama = 0;
    let totalBatangPembagi = 0;
    let totalBatangRangka = 0;
    let totalSkrupRangka = 0;
    let totalSkrupPenutup = 0;
    let totalTitikGantung = 0;
    let totalPanjangKawat = 0;
    let totalBatangHollowGantung = 0;
    let totalPanjangHollowGantung = 0;
    let totalFischer = 0;
    let totalCompound = 0;
    let totalTape = 0;
    let totalBatangLis = 0;
    let hasCompound = false;

    daftarRuangan.forEach(r => {
      totalLuas += r.luas;
      totalKeliling += r.keliling;
      totalLembar += r.jumlahLembar;
      totalBatangUtama += r.batangUtama;
      totalBatangPembagi += r.batangPembagi;
      totalBatangRangka += r.totalBatangRangka;
      totalSkrupRangka += r.skrupRangkaTotal;
      totalSkrupPenutup += r.skrupPenutupTotal;
      totalTitikGantung += r.titikGantung;
      totalPanjangKawat += r.panjangKawat;
      totalBatangHollowGantung += r.batangHollowPenggantung;
      totalPanjangHollowGantung += r.panjangHollowPenggantung;
      totalFischer += r.fischerTotal;
      if (r.useCompound) {
        totalCompound += r.compoundKg;
        totalTape += r.tapeM;
        hasCompound = true;
      }
      totalBatangLis += r.batangLis;
    });

    const totalSkrupAll = totalSkrupRangka + totalSkrupPenutup;

    // Packaging conversions
    const dSkrup = parseNum(dusSkrupPcs) || 1000;
    const bFischer = parseNum(boxFischerPcs) || 100;
    const bKawatM = parseNum(beratKawatPerM) || 0.02;
    const sCompound = parseNum(sakCompoundKg) || 25;
    const rTape = parseNum(rollTapeM) || 75;

    const totalKawatKg = totalPanjangKawat * bKawatM;
    const totalDusSkrup = Math.ceil(totalSkrupAll / dSkrup);
    const totalBoxFischer = Math.ceil(totalFischer / bFischer);
    const totalSakCompound = Math.ceil(totalCompound / sCompound);
    const totalRollTape = Math.ceil(totalTape / rTape);

    // Cost calculations
    const pPenutup = parseNum(hargaPenutup);
    const pRangka = parseNum(hargaRangka);
    const pKawatKg = parseNum(hargaPenggantungKawat);
    const pHollowGantung = parseNum(hargaPenggantungHollow);
    const pSkrupDus = parseNum(hargaSkrupDus);
    const pFischerBox = parseNum(hargaFischerBox);
    const pCompoundSak = parseNum(hargaCompoundSak);
    const pTapeRoll = parseNum(hargaTapeRoll);
    const pLisBtg = parseNum(hargaLisBatang);

    const costPenutup = totalLembar * pPenutup;
    const costRangka = totalBatangRangka * pRangka;
    const costKawat = totalKawatKg * pKawatKg;
    const costHollowGantung = totalBatangHollowGantung * pHollowGantung;
    const costSkrup = totalDusSkrup * pSkrupDus;
    const costFischer = totalBoxFischer * pFischerBox;
    const costCompound = totalSakCompound * pCompoundSak;
    const costTape = totalRollTape * pTapeRoll;
    const costLis = totalBatangLis * pLisBtg;

    const totalEstimasiBiaya = costPenutup + costRangka + costKawat + costHollowGantung + 
      costSkrup + costFischer + costCompound + costTape + costLis;

    return {
      totalLuas,
      totalKeliling,
      totalLembar,
      totalBatangUtama,
      totalBatangPembagi,
      totalBatangRangka,
      totalSkrupRangka,
      totalSkrupPenutup,
      totalSkrupAll,
      totalDusSkrup,
      totalTitikGantung,
      totalPanjangKawat,
      totalKawatKg,
      totalBatangHollowGantung,
      totalPanjangHollowGantung,
      totalFischer,
      totalBoxFischer,
      totalCompound,
      totalSakCompound,
      totalTape,
      totalRollTape,
      hasCompound,
      totalBatangLis,
      totalEstimasiBiaya
    };
  }, [
    daftarRuangan, 
    dusSkrupPcs, boxFischerPcs, beratKawatPerM, sakCompoundKg, rollTapeM,
    hargaPenutup, hargaRangka, hargaPenggantungKawat, hargaPenggantungHollow, 
    hargaSkrupDus, hargaFischerBox, hargaCompoundSak, hargaTapeRoll, hargaLisBatang
  ]);

  // Send to BoQ Queue Handler
  const handleSendToBoQ = () => {
    if (daftarRuangan.length === 0) {
      showToast("Tambahkan minimal satu ruangan plafond terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }

    const mult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
    const clusterSuffix = mult > 1 ? ` [x${mult} Unit Cluster]` : '';

    const itemsToSend = [];
    const pPenutup = parseNum(hargaPenutup);
    const pRangka = parseNum(hargaRangka);
    const pKawatKg = parseNum(hargaPenggantungKawat);
    const pHollowGantung = parseNum(hargaPenggantungHollow);
    const pSkrupDus = parseNum(hargaSkrupDus);
    const pFischerBox = parseNum(hargaFischerBox);
    const pCompoundSak = parseNum(hargaCompoundSak);
    const pTapeRoll = parseNum(hargaTapeRoll);
    const pLisBtg = parseNum(hargaLisBatang);

    // 1. Lembar Penutup Plafond
    if (sendPenutup && summary.totalLembar > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Penutup Plafond ${jenisPenutup.toUpperCase()} (120×240 cm)${clusterSuffix}`,
        satuan: 'Lembar',
        jumlah: summary.totalLembar * mult,
        harga: pPenutup,
        source: 'Kalkulator Plafond'
      });
    }

    // 2. Rangka Hollow Plafond
    if (sendRangka && summary.totalBatangRangka > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Rangka Plafond Hollow Baja Ringan / Galvalum (4m)${clusterSuffix}`,
        satuan: 'Batang',
        jumlah: summary.totalBatangRangka * mult,
        harga: pRangka,
        source: 'Kalkulator Plafond'
      });
    }

    // 3. Penggantung Plafond (Kawat vs Lis Hollow)
    if (sendPenggantung) {
      if (summary.totalKawatKg > 0) {
        itemsToSend.push({
          category: 'plafond',
          label: `Kawat Penggantung Plafond Galvanis Ø2mm${clusterSuffix}`,
          satuan: 'Kg',
          jumlah: +(summary.totalKawatKg * mult).toFixed(2),
          harga: pKawatKg,
          source: 'Kalkulator Plafond'
        });
      }
      if (summary.totalBatangHollowGantung > 0) {
        itemsToSend.push({
          category: 'plafond',
          label: `Penggantung Rangka Plafond Hollow Baja Ringan (4m)${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: summary.totalBatangHollowGantung * mult,
          harga: pHollowGantung,
          source: 'Kalkulator Plafond'
        });
      }
    }

    // 4. Skrup Plafond
    if (sendSkrup && summary.totalDusSkrup > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Skrup Plafond & Rangka Hollow${clusterSuffix}`,
        satuan: 'Dus',
        jumlah: summary.totalDusSkrup * mult,
        harga: pSkrupDus,
        source: 'Kalkulator Plafond'
      });
    }

    // 5. Fischer / Dynabolt
    if (sendFischer && summary.totalBoxFischer > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Fischer / Dynabolt Penggantung Dak${clusterSuffix}`,
        satuan: 'Box',
        jumlah: summary.totalBoxFischer * mult,
        harga: pFischerBox,
        source: 'Kalkulator Plafond'
      });
    }

    // 6. Compound Gypsum
    if (sendCompound && summary.totalSakCompound > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Compound Gypsum Sambungan Plafond${clusterSuffix}`,
        satuan: 'Sak',
        jumlah: summary.totalSakCompound * mult,
        harga: pCompoundSak,
        source: 'Kalkulator Plafond'
      });
    }

    // 7. Tape Sambungan
    if (sendTape && summary.totalRollTape > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Tape Sambungan Plafond Gypsum (Paper Tape / Kasa)${clusterSuffix}`,
        satuan: 'Roll',
        jumlah: summary.totalRollTape * mult,
        harga: pTapeRoll,
        source: 'Kalkulator Plafond'
      });
    }

    // 8. Lis Profil Plafond
    if (sendLis && summary.totalBatangLis > 0) {
      itemsToSend.push({
        category: 'plafond',
        label: `Lis Profil Plafond Tepi Dinding (4m)${clusterSuffix}`,
        satuan: 'Batang',
        jumlah: summary.totalBatangLis * mult,
        harga: pLisBtg,
        source: 'Kalkulator Plafond'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu item material plafond dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      setDaftarRuangan([]);
    });
  };

  return (
    <div className="space-y-6 pb-28 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-4 sm:p-7 border border-slate-800 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate">
              <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">CEILING & GYPSUM FRAME</span>
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
              Kalkulator Kebutuhan Plafond
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Hitung penutup (gypsum/GRC), rangka hollow galvalum, penggantung (kawat / lis hollow baja ringan), skrup, dan compound.
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
        unitLabel="Unit Plafond / Kavling"
      />

      {/* 01. TAMBAH RUANGAN / AREA PLAFOND */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-teal-800 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Tambah Ruangan / Area Plafond (Multi-Segmen L/U)
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Pecah ruangan persegi/L-shape/U-shape menjadi beberapa segmen persegi. Luas poligon akan dijumlahkan otomatis tanpa tumpang tindih.
        </p>

        {/* Multi-Segment Box */}
        <div className="p-4 rounded-xl bg-paper-50 border border-paper-200 mb-4">
          <span className="text-xs font-mono font-bold uppercase text-teal-900 block mb-2">
            A. Dimensi Segmen Ruangan
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-[10px] text-paper-600 uppercase mb-1">Panjang Segmen (m)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={segPanjang}
                onChange={e => setSegPanjang(e.target.value)}
                placeholder="mis. 4"
                className="w-full p-2 rounded-lg border border-paper-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-paper-600 uppercase mb-1">Lebar Segmen (m)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={segLebar}
                onChange={e => setSegLebar(e.target.value)}
                placeholder="mis. 3"
                className="w-full p-2 rounded-lg border border-paper-300 bg-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddSegment}
                className="w-full p-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                + Tambah Segmen
              </button>
            </div>
          </div>
          {segMsg && <p className="text-xs text-red-600 font-sans mt-2">{segMsg}</p>}

          {/* Segment Table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-paper-300 text-[10px] text-paper-500 uppercase">
                  <th className="py-1.5 px-2 text-left">Segmen</th>
                  <th className="py-1.5 px-2 text-right">Panjang</th>
                  <th className="py-1.5 px-2 text-right">Lebar</th>
                  <th className="py-1.5 px-2 text-right">Luas</th>
                  <th className="py-1.5 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {segmenAktif.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-paper-400 font-sans italic">
                      Belum ada segmen ditambahkan.
                    </td>
                  </tr>
                ) : (
                  segmenAktif.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="py-1.5 px-2 font-semibold text-paper-800">Segmen {idx + 1}</td>
                      <td className="py-1.5 px-2 text-right text-paper-700">{formatNumber(s.panjang, 2)} m</td>
                      <td className="py-1.5 px-2 text-right text-paper-700">{formatNumber(s.lebar, 2)} m</td>
                      <td className="py-1.5 px-2 text-right font-bold text-teal-800">{formatNumber(s.luas, 2)} m²</td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSegment(s.id)}
                          className="p-0.5 text-paper-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {segmenAktif.length > 0 && (
                <tfoot>
                  <tr className="border-t border-paper-400 font-bold bg-teal-50/60 text-teal-950">
                    <td colSpan={3} className="py-2 px-2 uppercase font-sans">Total Luas Ruangan Ini</td>
                    <td className="py-2 px-2 text-right font-heading text-sm">{formatNumber(totalLuasSegmenAktif, 2)} m²</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Room Form & Parameters */}
        <form onSubmit={handleAddRoom} className="space-y-4">
          
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-paper-50 border border-paper-200">
            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase font-mono mb-1">
                Nama / Kode Ruangan
              </label>
              <input
                type="text"
                value={namaRuangan}
                onChange={e => setNamaRuangan(e.target.value)}
                placeholder="mis. R. Tamu (L-Shape)"
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-paper-600 uppercase font-mono mb-1">
                Tinggi Drop Plafond (m) — Jarak Dak / Atap ke Plafond
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={dropTinggi}
                onChange={e => setDropTinggi(e.target.value)}
                placeholder="0.3"
                className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 bg-white"
              />
            </div>
          </div>

          {/* SECTION B: PENUTUP PLAFOND */}
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
            <span className="text-xs font-mono font-bold uppercase text-teal-900 block mb-2.5 flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-teal-600" /> B. Material Penutup Plafond
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Jenis Penutup</label>
                <select
                  value={jenisPenutup}
                  onChange={e => setJenisPenutup(e.target.value)}
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                >
                  <option value="gypsum">Gypsum Board (9mm)</option>
                  <option value="grc">GRC Board (4mm)</option>
                  <option value="pvc">PVC Board Panel</option>
                  <option value="triplek">Triplek (4mm / 6mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Ukuran Lembar</label>
                <select
                  value={luasLembar}
                  onChange={e => setLuasLembar(e.target.value)}
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                >
                  <option value="2.88">120 × 240 cm (2.88 m²)</option>
                  <option value="2.9768">122 × 244 cm (2.98 m²)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Waste Lembar (%)</label>
                <input
                  type="number"
                  step="1"
                  value={wasteLembar}
                  onChange={e => setWasteLembar(e.target.value)}
                  placeholder="10"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Skrup per Lembar (pcs)</label>
                <input
                  type="number"
                  step="1"
                  value={skrupPerLembar}
                  onChange={e => setSkrupPerLembar(e.target.value)}
                  placeholder="30"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION C: RANGKA HOLLOW */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
            <span className="text-xs font-mono font-bold uppercase text-slate-900 block mb-2.5 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-slate-600" /> C. Rangka Hollow Galvalum
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Jarak Rangka Utama (cm)</label>
                <input
                  type="number"
                  step="5"
                  value={jarakUtama}
                  onChange={e => setJarakUtama(e.target.value)}
                  placeholder="120"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Jarak Rangka Pembagi (cm)</label>
                <input
                  type="number"
                  step="5"
                  value={jarakPembagi}
                  onChange={e => setJarakPembagi(e.target.value)}
                  placeholder="60"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Panjang Batang Hollow (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={panjangBatangHollow}
                  onChange={e => setPanjangBatangHollow(e.target.value)}
                  placeholder="4"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Skrup / Titik Silang</label>
                <input
                  type="number"
                  step="1"
                  value={skrupPerTitikRangka}
                  onChange={e => setSkrupPerTitikRangka(e.target.value)}
                  placeholder="2"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION D: PENGGANTUNG PLAFOND (KAWAT vs LIS HOLLOW BAJA RINGAN) */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300">
            <span className="text-xs font-mono font-bold uppercase text-amber-900 block mb-2.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-amber-700" /> D. Penggantung Plafond (Pilih Metode)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono mb-3">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1 font-bold text-amber-950">
                  Pilihan Tipe Penggantung:
                </label>
                <select
                  value={tipePenggantung}
                  onChange={e => setTipePenggantung(e.target.value)}
                  className="w-full p-2 font-bold rounded-lg border border-amber-400 bg-white text-amber-950 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="kawat">Kawat Galvanis Ø2mm</option>
                  <option value="hollow">Lis Hollow Baja Ringan (Batang)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Jarak Titik Penggantung (cm)</label>
                <input
                  type="number"
                  step="5"
                  value={jarakGantung}
                  onChange={e => setJarakGantung(e.target.value)}
                  placeholder="120"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              {tipePenggantung === 'kawat' ? (
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Allowance Ikatan Kawat (m/titik)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={allowanceKawat}
                    onChange={e => setAllowanceKawat(e.target.value)}
                    placeholder="0.3"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Metode Penggantung Hollow</label>
                  <div className="p-2 rounded-lg bg-white border border-amber-300 text-[11px] text-amber-900 font-sans">
                    Menggunakan potongan batang hollow vertikal ke dak beton (+10cm allowance sambungan).
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION E: COMPOUND & LIS PROFIL TOGGLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Compound */}
            <div className="p-3.5 rounded-xl bg-paper-50 border border-paper-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-paper-800 mb-2">
                <input
                  type="checkbox"
                  checked={hitungCompound}
                  onChange={e => setHitungCompound(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                />
                <span>Hitung Compound & Tape Sambungan (Gypsum)</span>
              </label>
              {hitungCompound && (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-1">
                  <div>
                    <label className="block text-[10px] text-paper-500">Koef. Compound (kg/m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={koefCompound}
                      onChange={e => setKoefCompound(e.target.value)}
                      className="w-full p-1.5 rounded border border-paper-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-500">Koef. Tape (m/m²)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={koefTape}
                      onChange={e => setKoefTape(e.target.value)}
                      className="w-full p-1.5 rounded border border-paper-300 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Lis Profil */}
            <div className="p-3.5 rounded-xl bg-paper-50 border border-paper-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={hitungLis}
                  onChange={e => setHitungLis(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                />
                <span>Hitung Lis Profil Tepi Dinding</span>
              </label>
              {hitungLis && (
                <div className="space-y-2 pt-1 border-t border-paper-200 text-xs font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-paper-600 uppercase font-semibold">Mode Panjang Lis:</span>
                    <div className="inline-flex rounded-lg bg-paper-200 p-0.5 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setLisCustomMode('auto')}
                        className={`px-2 py-0.5 rounded transition-all ${lisCustomMode === 'auto' ? 'bg-white text-paper-900 font-bold shadow-xs' : 'text-paper-600'}`}
                      >
                        Otomatis Keliling ({formatNumber(totalKelilingSegmenAktif, 1)} m)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLisCustomMode('custom')}
                        className={`px-2 py-0.5 rounded transition-all ${lisCustomMode === 'custom' ? 'bg-teal-700 text-white font-bold shadow-xs' : 'text-paper-600'}`}
                      >
                        ✏️ Custom Meter
                      </button>
                    </div>
                  </div>

                  {lisCustomMode === 'custom' && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 border border-teal-200 animate-fadeIn">
                      <label className="text-[10.5px] text-teal-900 font-bold">Panjang Lis Custom (m'):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lisCustomMeter}
                        onChange={e => setLisCustomMeter(e.target.value)}
                        placeholder="mis. 12.5"
                        className="w-20 p-1 text-xs font-mono font-bold bg-white border border-teal-300 rounded focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-[10px] text-teal-700">(dinding bebas lemari/drop curtain)</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-paper-500">Panjang Batang Lis (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={panjangBatangLis}
                        onChange={e => setPanjangBatangLis(e.target.value)}
                        className="w-full p-1.5 rounded border border-paper-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-paper-500">Kebutuhan Batang</label>
                      <div className="p-1.5 font-bold text-teal-900 bg-paper-100 rounded text-xs text-center border border-paper-200">
                        {Math.ceil(((lisCustomMode === 'custom' && parseNum(lisCustomMeter) > 0 ? parseNum(lisCustomMeter) : totalKelilingSegmenAktif) || 0) / (parseNum(panjangBatangLis) || 4))} Batang
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-display font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            + Tambah Ruangan ke Daftar
          </button>
        </form>

        {/* Rooms Table */}
        <div className="mt-5 border-t border-paper-200 pt-4 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-paper-300 text-paper-600 text-[11px] uppercase">
                <th className="py-2 px-3 font-sans">Ruangan</th>
                <th className="py-2 px-3">Bentuk / Segmen</th>
                <th className="py-2 px-3">Luas (m²)</th>
                <th className="py-2 px-3">Penutup</th>
                <th className="py-2 px-3">Rangka (btg)</th>
                <th className="py-2 px-3">Penggantung</th>
                <th className="py-2 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {daftarRuangan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-paper-500 font-sans">
                    Belum ada ruangan ditambahkan ke daftar.
                  </td>
                </tr>
              ) : (
                daftarRuangan.map((r) => (
                  <tr key={r.id} className="hover:bg-paper-50">
                    <td className="py-2.5 px-3 font-sans font-semibold text-paper-900">
                      <div>{r.nama}</div>
                      {r.batangLis > 0 && (
                        <div className="text-[10px] text-teal-700 font-mono flex items-center gap-1 mt-0.5">
                          <span>Lis: {formatNumber(r.panjangLis || r.keliling, 1)} m' ({r.batangLis} btg)</span>
                          {r.isLisCustom && (
                            <span className="text-[9px] bg-teal-100 text-teal-800 px-1 rounded font-bold">Custom</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-paper-600">
                      {r.jumlahSegmen === 1 ? 'Persegi (1 segmen)' : `${r.jumlahSegmen} Segmen (L/U)`}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-teal-800">
                      {formatNumber(r.luas, 2)} m²
                    </td>
                    <td className="py-2.5 px-3 text-paper-700">
                      {r.jumlahLembar} lbr <span className="text-[10px] text-paper-500 font-mono">({r.jenisPenutup})</span>
                    </td>
                    <td className="py-2.5 px-3 text-paper-700">
                      {r.totalBatangRangka} btg <span className="text-[10px] text-paper-500">({r.batangUtama}U + {r.batangPembagi}P)</span>
                    </td>
                    <td className="py-2.5 px-3 text-amber-900 font-medium">
                      {r.tipePenggantung === 'kawat' 
                        ? `${formatNumber(r.panjangKawat, 1)} m kawat` 
                        : `${r.batangHollowPenggantung} btg hollow`}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(r.id)}
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

      {/* 02. REKAPITULASI KEBUTUHAN MATERIAL PLAFOND */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-teal-800 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
            <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
              Rekapitulasi Kebutuhan Material & Kemasan
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase bg-teal-50 text-teal-800 px-2 py-1 rounded border border-teal-200">
            Total {daftarRuangan.length} Ruangan
          </span>
        </div>

        {daftarRuangan.length === 0 ? (
          <p className="text-xs text-paper-500 font-sans italic py-4 text-center">
            Tambahkan minimal satu ruangan di atas untuk melihat rekapitulasi kebutuhan bahan.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            
            {/* Lembar Penutup */}
            <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-800 font-bold block">
                1. Lembar Penutup Plafond
              </span>
              <span className="font-heading text-2xl font-bold text-teal-950 block mt-1">
                {formatNumber(summary.totalLembar)} lembar
              </span>
              <p className="text-xs text-teal-700 font-mono mt-1">
                Luas Plafond: {formatNumber(summary.totalLuas, 2)} m²
              </p>
              <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white/80 text-teal-800 border border-teal-200 mt-2">
                Sudah termasuk waste 10%
              </span>
            </div>

            {/* Rangka Hollow */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-700 font-bold block">
                2. Rangka Hollow Galvalum (4m)
              </span>
              <span className="font-heading text-2xl font-bold text-slate-900 block mt-1">
                {formatNumber(summary.totalBatangRangka)} batang
              </span>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Utama: {summary.totalBatangUtama} btg · Pembagi: {summary.totalBatangPembagi} btg
              </p>
              <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 mt-2">
                Modul 120 × 60 cm standar
              </span>
            </div>

            {/* Penggantung Plafond (Kawat vs Hollow) */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold block">
                3. Penggantung Plafond
              </span>
              {summary.totalKawatKg > 0 && (
                <div className="mt-1">
                  <span className="font-heading text-xl font-bold text-amber-950 block">
                    {formatNumber(summary.totalKawatKg, 2)} kg <span className="text-xs font-normal font-sans text-paper-600">({formatNumber(summary.totalPanjangKawat, 1)} m kawat)</span>
                  </span>
                </div>
              )}
              {summary.totalBatangHollowGantung > 0 && (
                <div className="mt-1">
                  <span className="font-heading text-xl font-bold text-amber-950 block">
                    {formatNumber(summary.totalBatangHollowGantung)} batang hollow
                  </span>
                  <span className="text-[11px] font-mono text-amber-800 block">
                    Total {formatNumber(summary.totalPanjangHollowGantung, 1)} m hollow vertikal
                  </span>
                </div>
              )}
              <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200 mt-2">
                {summary.totalTitikGantung} titik penggantung
              </span>
            </div>

            {/* Skrup Plafond & Rangka */}
            <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                4. Skrup Plafond & Rangka
              </span>
              <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                {formatNumber(summary.totalSkrupAll)} pcs
              </span>
              <p className="text-xs text-paper-600 font-mono mt-1">
                ≈ {summary.totalDusSkrup} dus (@1000 pcs)
              </p>
              <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                Rangka {formatNumber(summary.totalSkrupRangka)} + Penutup {formatNumber(summary.totalSkrupPenutup)}
              </span>
            </div>

            {/* Fischer / Dynabolt */}
            <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                5. Fischer / Dynabolt ke Dak
              </span>
              <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                {formatNumber(summary.totalFischer)} pcs
              </span>
              <p className="text-xs text-paper-600 font-mono mt-1">
                ≈ {summary.totalBoxFischer} box (@100 pcs)
              </p>
              <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                1 pcs per titik gantung
              </span>
            </div>

            {/* Compound & Tape / Lis Profil */}
            <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                6. Finishing & Lis Profil
              </span>
              {summary.hasCompound ? (
                <div className="mt-1 space-y-0.5">
                  <span className="font-mono text-sm font-bold text-paper-900 block">
                    Compound: {formatNumber(summary.totalCompound, 1)} kg (≈ {summary.totalSakCompound} sak)
                  </span>
                  <span className="font-mono text-sm font-bold text-paper-900 block">
                    Tape: {formatNumber(summary.totalTape, 1)} m (≈ {summary.totalRollTape} roll)
                  </span>
                </div>
              ) : null}
              {summary.totalBatangLis > 0 ? (
                <span className="font-mono text-sm font-bold text-teal-900 block mt-1">
                  Lis Profil: {summary.totalBatangLis} batang (@4m)
                </span>
              ) : null}
            </div>

          </div>
        )}
      </div>

      {/* 03. PENGATURAN KEMASAN PEMBELIAN */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-paper-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Pengaturan Isi Kemasan Pembelian Toko
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Sesuaikan isi per dus/box/sak dengan kemasan produk yang tersedia di toko bahan bangunan langganan Anda.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div>
            <label className="block text-[10px] text-paper-600 uppercase mb-1">Isi Dus Skrup</label>
            <input
              type="number"
              value={dusSkrupPcs}
              onChange={e => setDusSkrupPcs(e.target.value)}
              className="w-full p-2 rounded-lg border border-paper-300 bg-white"
            />
            <span className="text-[10px] text-paper-400">pcs/dus</span>
          </div>

          <div>
            <label className="block text-[10px] text-paper-600 uppercase mb-1">Isi Box Fischer</label>
            <input
              type="number"
              value={boxFischerPcs}
              onChange={e => setBoxFischerPcs(e.target.value)}
              className="w-full p-2 rounded-lg border border-paper-300 bg-white"
            />
            <span className="text-[10px] text-paper-400">pcs/box</span>
          </div>

          <div>
            <label className="block text-[10px] text-paper-600 uppercase mb-1">Berat Kawat / m</label>
            <input
              type="number"
              step="0.005"
              value={beratKawatPerM}
              onChange={e => setBeratKawatPerM(e.target.value)}
              className="w-full p-2 rounded-lg border border-paper-300 bg-white"
            />
            <span className="text-[10px] text-paper-400">kg/meter</span>
          </div>

          <div>
            <label className="block text-[10px] text-paper-600 uppercase mb-1">Isi Sak Compound</label>
            <input
              type="number"
              value={sakCompoundKg}
              onChange={e => setSakCompoundKg(e.target.value)}
              className="w-full p-2 rounded-lg border border-paper-300 bg-white"
            />
            <span className="text-[10px] text-paper-400">kg/sak</span>
          </div>

          <div>
            <label className="block text-[10px] text-paper-600 uppercase mb-1">Isi Roll Tape</label>
            <input
              type="number"
              value={rollTapeM}
              onChange={e => setRollTapeM(e.target.value)}
              className="w-full p-2 rounded-lg border border-paper-300 bg-white"
            />
            <span className="text-[10px] text-paper-400">meter/roll</span>
          </div>
        </div>
      </div>

      {/* 04. OPSIONAL: HARGA SATUAN BAHAN */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
            <span>Harga Satuan Bahan Plafond</span>
            <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
              opsional untuk diisi (default 0)
            </span>
          </h2>
        </div>
        <p className="text-xs text-paper-600 mb-4 ml-8.5">
          Isi estimasi harga satuan bahan untuk langsung menghitung perkiraan biaya dan diteruskan ke BoQ.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs font-mono">
          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Lembar Gypsum/Penutup (Rp/lbr)
            </label>
            <input
              type="number"
              min="0"
              value={hargaPenutup}
              onChange={e => setHargaPenutup(e.target.value)}
              placeholder="mis. 75000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Rangka Hollow (Rp/btg 4m)
            </label>
            <input
              type="number"
              min="0"
              value={hargaRangka}
              onChange={e => setHargaRangka(e.target.value)}
              placeholder="mis. 22000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Kawat Penggantung (Rp/kg)
            </label>
            <input
              type="number"
              min="0"
              value={hargaPenggantungKawat}
              onChange={e => setHargaPenggantungKawat(e.target.value)}
              placeholder="mis. 25000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Hollow Penggantung (Rp/btg)
            </label>
            <input
              type="number"
              min="0"
              value={hargaPenggantungHollow}
              onChange={e => setHargaPenggantungHollow(e.target.value)}
              placeholder="mis. 22000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Skrup Plafond (Rp/dus)
            </label>
            <input
              type="number"
              min="0"
              value={hargaSkrupDus}
              onChange={e => setHargaSkrupDus(e.target.value)}
              placeholder="mis. 65000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Fischer / Dynabolt (Rp/box)
            </label>
            <input
              type="number"
              min="0"
              value={hargaFischerBox}
              onChange={e => setHargaFischerBox(e.target.value)}
              placeholder="mis. 45000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Compound Gypsum (Rp/sak)
            </label>
            <input
              type="number"
              min="0"
              value={hargaCompoundSak}
              onChange={e => setHargaCompoundSak(e.target.value)}
              placeholder="mis. 60000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Tape Sambungan Plafond (Rp/roll)
            </label>
            <input
              type="number"
              min="0"
              value={hargaTapeRoll}
              onChange={e => setHargaTapeRoll(e.target.value)}
              placeholder="mis. 28500"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
              Lis Profil (Rp/btg 4m)
            </label>
            <input
              type="number"
              min="0"
              value={hargaLisBatang}
              onChange={e => setHargaLisBatang(e.target.value)}
              placeholder="mis. 20000"
              className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {summary.totalEstimasiBiaya > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-mono">
            <span className="text-xs font-semibold text-emerald-900 font-sans">Estimasi Total Biaya Pengadaan Material Plafond:</span>
            <span className="font-heading text-lg font-bold text-emerald-800">
              Rp {formatNumber(summary.totalEstimasiBiaya, 0)}
            </span>
          </div>
        )}
      </div>

      {/* 05. KIRIM HASIL KE BOQ TOOLS */}
      <div className="rounded-3xl bg-gradient-to-br from-teal-50/80 via-white to-slate-50/80 border-2 border-dashed border-teal-400/80 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-6 h-6 rounded-md bg-teal-800 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-teal-950">
            Kirim Hasil ke BoQ Tools
          </h2>
        </div>
        <p className="text-xs text-teal-900/80 mb-4 ml-8.5">
          Centang item kebutuhan plafond yang ingin diteruskan ke antrian usulan volume BoQ.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-4 rounded-xl border border-teal-200">
          {summary.totalLembar > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendPenutup}
                onChange={e => setSendPenutup(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Penutup Plafond — <b className="font-mono text-teal-950">{formatNumber(summary.totalLembar)} lembar</b>
              </span>
            </label>
          )}

          {summary.totalBatangRangka > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendRangka}
                onChange={e => setSendRangka(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Rangka Hollow Galvalum — <b className="font-mono text-teal-950">{formatNumber(summary.totalBatangRangka)} batang</b>
              </span>
            </label>
          )}

          {summary.totalKawatKg > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendPenggantung}
                onChange={e => setSendPenggantung(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Kawat Penggantung — <b className="font-mono text-teal-950">{formatNumber(summary.totalKawatKg, 2)} kg</b>
              </span>
            </label>
          )}

          {summary.totalBatangHollowGantung > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendPenggantung}
                onChange={e => setSendPenggantung(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Lis Hollow Penggantung — <b className="font-mono text-teal-950">{formatNumber(summary.totalBatangHollowGantung)} batang</b>
              </span>
            </label>
          )}

          {summary.totalDusSkrup > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendSkrup}
                onChange={e => setSendSkrup(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Skrup Plafond & Rangka — <b className="font-mono text-teal-950">{summary.totalDusSkrup} dus</b>
              </span>
            </label>
          )}

          {summary.totalBoxFischer > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendFischer}
                onChange={e => setSendFischer(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Fischer / Dynabolt — <b className="font-mono text-teal-950">{summary.totalBoxFischer} box</b>
              </span>
            </label>
          )}

          {summary.totalSakCompound > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendCompound}
                onChange={e => setSendCompound(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Compound Gypsum — <b className="font-mono text-teal-950">{summary.totalSakCompound} sak</b>
              </span>
            </label>
          )}

          {summary.totalRollTape > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendTape}
                onChange={e => setSendTape(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Tape Sambungan — <b className="font-mono text-teal-950">{summary.totalRollTape} roll</b>
              </span>
            </label>
          )}

          {summary.totalBatangLis > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
              <input
                type="checkbox"
                checked={sendLis}
                onChange={e => setSendLis(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>
                Lis Profil Plafond — <b className="font-mono text-teal-950">{summary.totalBatangLis} batang</b>
              </span>
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={handleSendToBoQ}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-display font-semibold text-xs shadow-md shadow-teal-950/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Kirim yang Dicentang ke BoQ
        </button>
      </div>

    </div>
  );
}
