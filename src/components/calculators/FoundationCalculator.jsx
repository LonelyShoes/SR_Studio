import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum, calcRebarWeightPerM } from '../../utils/formatters';
import { 
  ArrowLeft, 
  Building2, 
  Send, 
  Plus, 
  Trash2, 
  Layers, 
  Info, 
  Check,
  ChevronDown
} from 'lucide-react';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { StructuralCrossSectionVisualizer } from '../common/StructuralCrossSectionVisualizer';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';
import {
  calcEffectiveMultiplier,
  calcSharedRatio,
  calcBatuKaliEffectiveLength,
  calcBatuKaliVolumes,
  calcFootplatTotals,
  buildBorepileItem,
  calcBorepileTotals,
} from '../../utils/foundationCalc';

export function FoundationCalculator() {
  const { 
    setActiveTab, 
    queueCalculatedItems, 
    showToast, 
    clusterUnits, 
    updateClusterUnits, 
    clusterTypology, 
    clusterRowUnits 
  } = useBoQ();
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_fd_cluster_mode', 'multiplied');

  const [activeSub, setActiveSub] = usePersistentState('sr_calc_fd_active_sub', 'batukali'); // 'batukali' | 'footplat' | 'borepile'

  /* ==================== BATU KALI STATE ==================== */
  const [bkPanjang, setBkPanjang] = usePersistentState('sr_calc_fd_bk_panjang', '');
  const [bkPanjangBatas, setBkPanjangBatas] = usePersistentState('sr_calc_fd_bk_panjang_batas', '');
  const [bkLebarAtas, setBkLebarAtas] = usePersistentState('sr_calc_fd_bk_lebar_atas', '');
  const [bkLebarBawah, setBkLebarBawah] = usePersistentState('sr_calc_fd_bk_lebar_bawah', '');
  const [bkTinggi, setBkTinggi] = usePersistentState('sr_calc_fd_bk_tinggi', '');
  const [bkRasio, setBkRasio] = usePersistentState('sr_calc_fd_bk_rasio', '4'); // 1PC : X PP

  const [bkTGalian, setBkTGalian] = usePersistentState('sr_calc_fd_bk_t_galian', false);
  const [bkGalianDalam, setBkGalianDalam] = usePersistentState('sr_calc_fd_bk_galian_dalam', '');
  const [bkGalianLebar, setBkGalianLebar] = usePersistentState('sr_calc_fd_bk_galian_lebar', '');

  const [bkTUrug, setBkTUrug] = usePersistentState('sr_calc_fd_bk_t_urug', false);
  const [bkUrugTebal, setBkUrugTebal] = usePersistentState('sr_calc_fd_bk_urug_tebal', '0.05');

  const [bkTAan, setBkTAan] = usePersistentState('sr_calc_fd_bk_t_aan', false);
  const [bkAanTebal, setBkAanTebal] = usePersistentState('sr_calc_fd_bk_aan_tebal', '0.2');

  const [bkSendBatu, setBkSendBatu] = usePersistentState('sr_calc_fd_bk_send_batu', true);
  const [bkSendSemen, setBkSendSemen] = usePersistentState('sr_calc_fd_bk_send_semen', true);
  const [bkSendPasir, setBkSendPasir] = usePersistentState('sr_calc_fd_bk_send_pasir', true);
  const [bkSendGalian, setBkSendGalian] = usePersistentState('sr_calc_fd_bk_send_galian', false);
  const [bkSendUrug, setBkSendUrug] = usePersistentState('sr_calc_fd_bk_send_urug', false);
  const [bkSendAan, setBkSendAan] = usePersistentState('sr_calc_fd_bk_send_aan', false);
  const [bkSendUrugKembali, setBkSendUrugKembali] = usePersistentState('sr_calc_fd_bk_send_urug_kembali', false);

  // Batu Kali optional prices
  const [bkHargaBatu, setBkHargaBatu] = usePersistentState('sr_calc_fd_bk_harga_batu', '');
  const [bkHargaSemen, setBkHargaSemen] = usePersistentState('sr_calc_fd_bk_harga_semen', '');
  const [bkHargaPasir, setBkHargaPasir] = usePersistentState('sr_calc_fd_bk_harga_pasir', '');
  const [bkHargaGalian, setBkHargaGalian] = usePersistentState('sr_calc_fd_bk_harga_galian', '85000');
  const [bkHargaUrug, setBkHargaUrug] = usePersistentState('sr_calc_fd_bk_harga_urug', '285000');
  const [bkHargaAan, setBkHargaAan] = usePersistentState('sr_calc_fd_bk_harga_aan', '395000');
  const [bkHargaUrugKembali, setBkHargaUrugKembali] = usePersistentState('sr_calc_fd_bk_harga_urug_kembali', '35000');

  // Opsi Satuan Pasaran Toko
  const [bkBahanUnit, setBkBahanUnit] = usePersistentState('sr_calc_fd_bk_bahan_unit', 'm3'); // 'm3' | 'rit'
  const [fpBesiDispatchUnit, setFpBesiDispatchUnit] = usePersistentState('sr_calc_fd_fp_besi_unit', 'batang'); // 'batang' | 'kg'

  /* ==================== FOOTPLAT STATE ==================== */
  const [fpList, setFpList] = usePersistentState('sr_calc_fd_fp_list', []);
  const [fpNama, setFpNama] = usePersistentState('sr_calc_fd_fp_nama', '');
  const [fpP, setFpP] = usePersistentState('sr_calc_fd_fp_p', '');
  const [fpL, setFpL] = usePersistentState('sr_calc_fd_fp_l', '');
  const [fpT, setFpT] = usePersistentState('sr_calc_fd_fp_t', '');
  const [fpJumlah, setFpJumlah] = usePersistentState('sr_calc_fd_fp_jumlah', '1');
  const [fpMutu, setFpMutu] = usePersistentState('sr_calc_fd_fp_mutu', 'K250');
  const [inFpIsBoundary, setInFpIsBoundary] = usePersistentState('sr_calc_fd_fp_is_boundary', false);

  const [fpDiaX, setFpDiaX] = usePersistentState('sr_calc_fd_fp_dia_x', '12');
  const [fpJarakX, setFpJarakX] = usePersistentState('sr_calc_fd_fp_jarak_x', '150');
  const [fpDiaY, setFpDiaY] = usePersistentState('sr_calc_fd_fp_dia_y', '12');
  const [fpJarakY, setFpJarakY] = usePersistentState('sr_calc_fd_fp_jarak_y', '150');

  const [fpTLeher, setFpTLeher] = usePersistentState('sr_calc_fd_fp_t_leher', false);
  const [fpLeherLebar, setFpLeherLebar] = usePersistentState('sr_calc_fd_fp_leher_lebar', '');
  const [fpLeherTebal, setFpLeherTebal] = usePersistentState('sr_calc_fd_fp_leher_tebal', '');
  const [fpLeherTinggi, setFpLeherTinggi] = usePersistentState('sr_calc_fd_fp_leher_tinggi', '');
  const [fpLeherDiaUtama, setFpLeherDiaUtama] = usePersistentState('sr_calc_fd_fp_leher_dia_utama', '12');
  const [fpLeherJmlUtama, setFpLeherJmlUtama] = usePersistentState('sr_calc_fd_fp_leher_jml_utama', '4');
  const [fpLeherDiaSeng, setFpLeherDiaSeng] = usePersistentState('sr_calc_fd_fp_leher_dia_seng', '8');
  const [fpLeherJarakSeng, setFpLeherJarakSeng] = usePersistentState('sr_calc_fd_fp_leher_jarak_seng', '150');

  const [fpTGalian, setFpTGalian] = usePersistentState('sr_calc_fd_fp_t_galian', false);
  const [fpGalianDalam, setFpGalianDalam] = usePersistentState('sr_calc_fd_fp_galian_dalam', '');
  const [fpTLK, setFpTLK] = usePersistentState('sr_calc_fd_fp_t_lk', false);
  const [fpLKTebal, setFpLKTebal] = usePersistentState('sr_calc_fd_fp_lk_tebal', '0.05');
  const [fpTUrug, setFpTUrug] = usePersistentState('sr_calc_fd_fp_t_urug', false);
  const [fpUrugTebal, setFpUrugTebal] = usePersistentState('sr_calc_fd_fp_urug_tebal', '0.1');

  const [fpSendBeton, setFpSendBeton] = usePersistentState('sr_calc_fd_fp_send_beton', true);
  const [fpSendSemen, setFpSendSemen] = usePersistentState('sr_calc_fd_fp_send_semen', false);
  const [fpSendPasir, setFpSendPasir] = usePersistentState('sr_calc_fd_fp_send_pasir', false);
  const [fpSendKerikil, setFpSendKerikil] = usePersistentState('sr_calc_fd_fp_send_kerikil', false);
  const [fpSendBesi, setFpSendBesi] = usePersistentState('sr_calc_fd_fp_send_besi', true);
  const [fpSendGalian, setFpSendGalian] = usePersistentState('sr_calc_fd_fp_send_galian', false);
  const [fpSendLK, setFpSendLK] = usePersistentState('sr_calc_fd_fp_send_lk', false);
  const [fpSendUrug, setFpSendUrug] = usePersistentState('sr_calc_fd_fp_send_urug', false);

  // Footplat optional prices
  const [fpHargaBeton, setFpHargaBeton] = usePersistentState('sr_calc_fd_fp_harga_beton', '');
  const [fpHargaBesi, setFpHargaBesi] = usePersistentState('sr_calc_fd_fp_harga_besi', '');
  const [fpHargaSemen, setFpHargaSemen] = usePersistentState('sr_calc_fd_fp_harga_semen', '');
  const [fpHargaPasir, setFpHargaPasir] = usePersistentState('sr_calc_fd_fp_harga_pasir', '');
  const [fpHargaKerikil, setFpHargaKerikil] = usePersistentState('sr_calc_fd_fp_harga_kerikil', '285000');
  const [fpHargaGalian, setFpHargaGalian] = usePersistentState('sr_calc_fd_fp_harga_galian', '85000');
  const [fpHargaLK, setFpHargaLK] = usePersistentState('sr_calc_fd_fp_harga_lk', '750000');
  const [fpHargaUrug, setFpHargaUrug] = usePersistentState('sr_calc_fd_fp_harga_urug', '285000');

  /* ==================== BOREPILE STATE ==================== */
  const [bpList, setBpList] = usePersistentState('sr_calc_fd_bp_list', []);
  const [bpNama, setBpNama] = usePersistentState('sr_calc_fd_bp_nama', '');
  const [bpDiameter, setBpDiameter] = useState('');
  const [bpKedalaman, setBpKedalaman] = useState('');
  const [bpJumlah, setBpJumlah] = useState('1');
  const [bpMutu, setBpMutu] = useState('K225');

  const [bpDiaUtama, setBpDiaUtama] = useState('16');
  const [bpJmlUtama, setBpJmlUtama] = useState('6');
  const [bpPanjangUtama, setBpPanjangUtama] = useState('');
  const [bpDiaSpiral, setBpDiaSpiral] = useState('8');
  const [bpJarakSpiral, setBpJarakSpiral] = useState('200');

  const [bpSendBeton, setBpSendBeton] = useState(true);
  const [bpSendSemen, setBpSendSemen] = useState(false);
  const [bpSendPasir, setBpSendPasir] = useState(false);
  const [bpSendKerikil, setBpSendKerikil] = useState(false);
  const [bpSendBesi, setBpSendBesi] = useState(true);
  const [bpSendSpoil, setBpSendSpoil] = useState(false);

  // Borepile optional prices
  const [bpHargaBeton, setBpHargaBeton] = useState('');
  const [bpHargaBesi, setBpHargaBesi] = useState('');
  const [bpHargaSemen, setBpHargaSemen] = useState('');
  const [bpHargaPasir, setBpHargaPasir] = useState('');
  const [bpHargaKerikil, setBpHargaKerikil] = useState('285000');
  const [bpHargaSpoil, setBpHargaSpoil] = useState('65000');

  /* ==================== BATU KALI CALCULATION ==================== */
  const effectiveMultiplier = calcEffectiveMultiplier(clusterApplyMode, clusterUnits);
  const { rowN, sharedRatio } = calcSharedRatio(clusterRowUnits);

  const bkBasePanjang = parseNum(bkPanjang);
  const bkPartyWallVal = parseNum(bkPanjangBatas);

  const { effective: bkPanjangEffective, hemat: bkPanjangHemat } = calcBatuKaliEffectiveLength({
    bkPanjang, bkPanjangBatas, clusterTypology, effectiveMultiplier, sharedRatio,
  });

  const bkCalc = useMemo(() => calcBatuKaliVolumes({
    panjangEffective: bkPanjangEffective,
    lebarAtas: bkLebarAtas, lebarBawah: bkLebarBawah, tinggi: bkTinggi, rasio: bkRasio,
    tGalian: bkTGalian, galianDalam: bkGalianDalam, galianLebar: bkGalianLebar,
    tUrug: bkTUrug, urugTebal: bkUrugTebal, tAan: bkTAan, aanTebal: bkAanTebal,
  }), [bkPanjangEffective, bkLebarAtas, bkLebarBawah, bkTinggi, bkRasio, bkTGalian, bkGalianDalam, bkGalianLebar, bkTUrug, bkUrugTebal, bkTAan, bkAanTebal]);

  const handleSendBatuKali = () => {
    if (!bkCalc.has || bkCalc.batuM3 <= 0) {
      showToast("Isi dimensi pondasi batu kali terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }
    const pBatu = parseNum(bkHargaBatu);
    const pSemen = parseNum(bkHargaSemen);
    const pPasir = parseNum(bkHargaPasir);

    const clusterSuffix = effectiveMultiplier > 1
      ? (clusterTypology === 'shared'
          ? ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Bersama]`
          : ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Ganda]`)
      : '';

    const items = [];
    if (bkSendBatu && bkCalc.batuM3 > 0) {
      if (bkBahanUnit === 'rit') {
        const ritBatu = +(bkCalc.batuM3 / 5).toFixed(1);
        items.push({
          category: 'tanah_pondasi',
          label: `Batu Belah / Batu Kali (Dump Truck ~5m³)${clusterSuffix}`,
          satuan: 'Rit',
          jumlah: ritBatu,
          harga: parseNum(bkHargaBatu) || 1375000,
          source: 'Kalkulator Pondasi (Batu Kali)'
        });
      } else {
        items.push({
          category: 'tanah_pondasi',
          label: `Batu Belah / Batu Kali${clusterSuffix}`,
          satuan: 'm³',
          jumlah: +bkCalc.batuM3.toFixed(3),
          harga: parseNum(bkHargaBatu) || 275000,
          source: 'Kalkulator Pondasi (Batu Kali)'
        });
      }
    }
    if (bkSendSemen && bkCalc.semenZak > 0) {
      items.push({ category: 'tanah_pondasi', label: `Semen Portland (Pasangan Batu Kali)${clusterSuffix}`, satuan: 'Sak', jumlah: bkCalc.semenZak, harga: parseNum(bkHargaSemen) || 65000, source: 'Kalkulator Pondasi (Batu Kali)' });
    }
    if (bkSendPasir && bkCalc.pasirM3 > 0) {
      if (bkBahanUnit === 'rit') {
        const ritPasir = +(bkCalc.pasirM3 / 6).toFixed(1);
        items.push({
          category: 'tanah_pondasi',
          label: `Pasir Pasang (Dump Truck ~6m³)${clusterSuffix}`,
          satuan: 'Rit',
          jumlah: ritPasir,
          harga: parseNum(bkHargaPasir) || 1650000,
          source: 'Kalkulator Pondasi (Batu Kali)'
        });
      } else {
        items.push({
          category: 'tanah_pondasi',
          label: `Pasir Pasang (Batu Kali)${clusterSuffix}`,
          satuan: 'm³',
          jumlah: +bkCalc.pasirM3.toFixed(3),
          harga: parseNum(bkHargaPasir) || 380000,
          source: 'Kalkulator Pondasi (Batu Kali)'
        });
      }
    }
    if (bkSendGalian && bkCalc.volGalian !== undefined && bkCalc.volGalian > 0) {
      items.push({ category: 'tanah_pondasi', label: `Galian Tanah Pondasi${clusterSuffix}`, satuan: 'm³', jumlah: +bkCalc.volGalian.toFixed(3), harga: parseNum(bkHargaGalian) || 85000, source: 'Kalkulator Pondasi (Batu Kali)' });
    }
    if (bkSendUrug && bkCalc.volUrug !== undefined && bkCalc.volUrug > 0) {
      items.push({ category: 'tanah_pondasi', label: `Urugan Pasir Bawah Pondasi${clusterSuffix}`, satuan: 'm³', jumlah: +bkCalc.volUrug.toFixed(3), harga: parseNum(bkHargaUrug) || 285000, source: 'Kalkulator Pondasi (Batu Kali)' });
    }
    if (bkSendAan && bkCalc.volAan !== undefined && bkCalc.volAan > 0) {
      items.push({ category: 'tanah_pondasi', label: `Aanstamping / Batu Kosong${clusterSuffix}`, satuan: 'm³', jumlah: +bkCalc.volAan.toFixed(3), harga: parseNum(bkHargaAan) || 395000, source: 'Kalkulator Pondasi (Batu Kali)' });
    }
    if (bkSendUrugKembali && bkCalc.volUrugKembali !== undefined && bkCalc.volUrugKembali > 0) {
      items.push({ category: 'tanah_pondasi', label: `Urugan Tanah Kembali${clusterSuffix}`, satuan: 'm³', jumlah: +bkCalc.volUrugKembali.toFixed(3), harga: parseNum(bkHargaUrugKembali) || 35000, source: 'Kalkulator Pondasi (Batu Kali)' });
    }

    if (items.length === 0) {
      showToast("Centang minimal satu bahan batu kali dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(items, () => {
      setBkPanjang('');
      setBkLebarAtas('');
      setBkLebarBawah('');
      setBkTinggi('');
    });
  };

  /* ==================== FOOTPLAT LOGIC ==================== */
  const handleAddFootplat = (e) => {
    e.preventDefault();
    const p = parseNum(fpP);
    const l = parseNum(fpL);
    const t = parseNum(fpT);
    const qty = parseInt(fpJumlah, 10) || 1;

    if (p <= 0 || l <= 0 || t <= 0) {
      alert("Isi panjang, lebar, dan tebal pelat dengan angka > 0.");
      return;
    }

    const diaX = parseNum(fpDiaX);
    const jarakX = parseNum(fpJarakX);
    const diaY = parseNum(fpDiaY);
    const jarakY = parseNum(fpJarakY);

    const volPelat = p * l * t * qty;
    let besiPelat = 0;

    if (jarakX > 0 && diaX > 0) {
      const nX = Math.floor(l / (jarakX / 1000)) + 1;
      besiPelat += nX * p * 2 * calcRebarWeightPerM(diaX);
    }
    if (jarakY > 0 && diaY > 0) {
      const nY = Math.floor(p / (jarakY / 1000)) + 1;
      besiPelat += nY * l * 2 * calcRebarWeightPerM(diaY);
    }
    besiPelat *= qty;

    let volLeher = 0;
    let besiLeher = 0;
    let leherText = '';

    if (fpTLeher) {
      const ll = parseNum(fpLeherLebar);
      const lt = parseNum(fpLeherTebal);
      const lh = parseNum(fpLeherTinggi);
      const dUtama = parseNum(fpLeherDiaUtama);
      const jUtama = parseInt(fpLeherJmlUtama, 10) || 0;
      const dSeng = parseNum(fpLeherDiaSeng);
      const jarakSeng = parseNum(fpLeherJarakSeng);

      if (ll > 0 && lt > 0 && lh > 0) {
        volLeher = ll * lt * lh * qty;
        const panjangUtama = lh + 0.4;
        let besiLeherSatu = jUtama * panjangUtama * calcRebarWeightPerM(dUtama);

        if (jarakSeng > 0 && dSeng > 0) {
          const kelilingSeng = 2 * Math.max(0, ll - 0.08) + 2 * Math.max(0, lt - 0.08);
          const jmlSeng = Math.floor(lh / (jarakSeng / 1000)) + 1;
          besiLeherSatu += jmlSeng * kelilingSeng * calcRebarWeightPerM(dSeng);
        }
        besiLeher = besiLeherSatu * qty;
        leherText = ` + Leher ${ll}×${lt}×${lh}m`;
      }
    }

    const newItem = {
      id: Date.now(),
      nama: fpNama.trim() || `Tipe ${fpList.length + 1}`,
      p, l, t,
      jumlah: qty,
      mutu: fpMutu,
      volTotal: volPelat + volLeher,
      besiTotal: besiPelat + besiLeher,
      dimText: `${p}×${l}×${t} m${leherText}`,
      isSharedBoundary: inFpIsBoundary
    };

    setFpList(prev => [...prev, newItem]);
    setFpNama('');
    setInFpIsBoundary(false);
  };

  const fpTotals = useMemo(() => calcFootplatTotals({
    fpList, clusterApplyMode, clusterTypology, effectiveMultiplier, sharedRatio,
    tGalian: fpTGalian, galianDalam: fpGalianDalam, tLK: fpTLK, lkTebal: fpLKTebal,
    tUrug: fpTUrug, urugTebal: fpUrugTebal,
  }), [fpList, fpTGalian, fpGalianDalam, fpTLK, fpLKTebal, fpTUrug, fpUrugTebal, clusterApplyMode, clusterTypology, effectiveMultiplier, sharedRatio]);

  const fpHematSharedVol = useMemo(() => {
    if (clusterTypology !== 'shared' || clusterApplyMode !== 'multiplied' || effectiveMultiplier <= 1) return 0;
    const doubleVol = fpList.reduce((acc, it) => acc + (it.volTotal * effectiveMultiplier), 0);
    return Math.max(0, doubleVol - (fpTotals.totalVol || 0));
  }, [fpList, clusterTypology, clusterApplyMode, effectiveMultiplier, fpTotals.totalVol]);

  const handleSendFootplat = () => {
    if (!fpTotals.has || fpTotals.totalVol <= 0) {
      showToast("Tambahkan minimal satu tipe footplat terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }
    const pBeton = parseNum(fpHargaBeton);
    const pBesi = parseNum(fpHargaBesi);
    const pSemen = parseNum(fpHargaSemen);
    const pPasir = parseNum(fpHargaPasir);

    const clusterSuffix = effectiveMultiplier > 1
      ? (clusterTypology === 'shared'
          ? ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Bersama]`
          : ` [Total ${effectiveMultiplier} Unit Cluster · Dinding Ganda]`)
      : '';

    const items = [];
    if (fpSendBeton && fpTotals.totalVol > 0) {
      items.push({ category: 'tanah_pondasi', label: `Cor Beton Footplat${clusterSuffix}`, satuan: 'm³', jumlah: +fpTotals.totalVol.toFixed(3), harga: pBeton, source: 'Kalkulator Pondasi (Footplat)' });
    }
    if (fpSendSemen && fpTotals.semenZak > 0) {
      items.push({ category: 'tanah_pondasi', label: `Semen Portland (Footplat)${clusterSuffix}`, satuan: 'Sak', jumlah: fpTotals.semenZak, harga: pSemen, source: 'Kalkulator Pondasi (Footplat)' });
    }
    if (fpSendPasir && fpTotals.pasirM3 > 0) {
      items.push({ category: 'tanah_pondasi', label: `Pasir Beton (Footplat)${clusterSuffix}`, satuan: 'm³', jumlah: +fpTotals.pasirM3.toFixed(3), harga: pPasir, source: 'Kalkulator Pondasi (Footplat)' });
    }
    if (fpSendKerikil && fpTotals.kerikilM3 > 0) {
      items.push({ category: 'tanah_pondasi', label: `Kerikil / Split (Footplat)${clusterSuffix}`, satuan: 'm³', jumlah: +fpTotals.kerikilM3.toFixed(3), harga: parseNum(fpHargaKerikil) || 285000, source: 'Kalkulator Pondasi (Footplat)' });
    }
    if (fpSendBesi && fpTotals.totalBesi > 0) {
      if (fpBesiDispatchUnit === 'batang') {
        const btgLonjor = Math.ceil(fpTotals.totalBesi / 10.66);
        items.push({
          category: 'tanah_pondasi',
          label: `Besi Tulangan Footplat (Batang Lonjor 12m)${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: btgLonjor,
          harga: parseNum(fpHargaBesi) || 145000,
          source: 'Kalkulator Pondasi (Footplat)'
        });
      } else {
        items.push({
          category: 'tanah_pondasi',
          label: `Besi Tulangan Footplat${clusterSuffix}`,
          satuan: 'Kg',
          jumlah: Math.round(fpTotals.totalBesi),
          harga: parseNum(fpHargaBesi) || 14500,
          source: 'Kalkulator Pondasi (Footplat)'
        });
      }
    }
    if (fpSendGalian && fpTotals.volGalian !== undefined && fpTotals.volGalian > 0) {
      items.push({ category: 'tanah_pondasi', label: `Galian Tanah Footplat${clusterSuffix}`, satuan: 'm³', jumlah: +fpTotals.volGalian.toFixed(3), harga: parseNum(fpHargaGalian) || 85000, source: 'Kalkulator Pondasi (Footplat)' });
    }
    if (fpSendLK && fpTotals.volLK !== undefined && fpTotals.volLK > 0) {
      items.push({ category: 'tanah_pondasi', label: `Lantai Kerja Footplat${clusterSuffix}`, satuan: 'm³', jumlah: +fpTotals.volLK.toFixed(3), harga: parseNum(fpHargaLK) || 750000, source: 'Kalkulator Pondasi (Footplat)' });
    }
    if (fpSendUrug && fpTotals.volUrug !== undefined && fpTotals.volUrug > 0) {
      items.push({ category: 'tanah_pondasi', label: `Urugan Pasir Bawah Footplat${clusterSuffix}`, satuan: 'm³', jumlah: +fpTotals.volUrug.toFixed(3), harga: parseNum(fpHargaUrug) || 285000, source: 'Kalkulator Pondasi (Footplat)' });
    }

    if (items.length === 0) {
      showToast("Centang minimal satu bahan footplat dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(items, () => {
      setFpList([]);
    });
  };

  /* ==================== BOREPILE LOGIC ==================== */
  const handleAddBorepile = (e) => {
    e.preventDefault();
    const newItem = buildBorepileItem({
      nama: bpNama, seq: bpList.length + 1, diameter: bpDiameter, kedalaman: bpKedalaman,
      jumlah: bpJumlah, mutu: bpMutu, diaUtama: bpDiaUtama, jmlUtama: bpJmlUtama,
      panjangUtama: bpPanjangUtama, diaSpiral: bpDiaSpiral, jarakSpiral: bpJarakSpiral,
    });
    if (!newItem) {
      alert("Isi diameter dan kedalaman borepile dengan angka > 0.");
      return;
    }
    setBpList(prev => [...prev, newItem]);
    setBpNama('');
  };

  const bpTotals = useMemo(() => calcBorepileTotals(bpList), [bpList]);

  const handleSendBorepile = () => {
    if (bpList.length === 0 || !bpTotals.has || bpTotals.totalVol <= 0) {
      showToast("Tambahkan minimal satu tipe/titik borepile terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }
    const pBeton = parseNum(bpHargaBeton);
    const pBesi = parseNum(bpHargaBesi);
    const pSemen = parseNum(bpHargaSemen);
    const pPasir = parseNum(bpHargaPasir);

    const mult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
    const clusterSuffix = mult > 1 ? ` [x${mult} Unit Cluster]` : '';

    const items = [];
    if (bpSendBeton && bpTotals.totalVol > 0) {
      items.push({ category: 'tanah_pondasi', label: `Cor Beton Borepile${clusterSuffix}`, satuan: 'm³', jumlah: +(bpTotals.totalVol * mult).toFixed(3), harga: pBeton, source: 'Kalkulator Pondasi (Borepile)' });
    }
    if (bpSendSemen && bpTotals.semenZak > 0) {
      items.push({ category: 'tanah_pondasi', label: `Semen Portland (Borepile)${clusterSuffix}`, satuan: 'Sak', jumlah: Math.ceil(bpTotals.semenZak * mult), harga: pSemen, source: 'Kalkulator Pondasi (Borepile)' });
    }
    if (bpSendPasir && bpTotals.pasirM3 > 0) {
      items.push({ category: 'tanah_pondasi', label: `Pasir Beton (Borepile)${clusterSuffix}`, satuan: 'm³', jumlah: +(bpTotals.pasirM3 * mult).toFixed(3), harga: pPasir, source: 'Kalkulator Pondasi (Borepile)' });
    }
    if (bpSendKerikil && bpTotals.kerikilM3 > 0) {
      items.push({ category: 'tanah_pondasi', label: `Kerikil / Split (Borepile)${clusterSuffix}`, satuan: 'm³', jumlah: +(bpTotals.kerikilM3 * mult).toFixed(3), harga: parseNum(bpHargaKerikil) || 285000, source: 'Kalkulator Pondasi (Borepile)' });
    }
    if (bpSendBesi && bpTotals.totalBesi > 0) {
      const diaU = parseInt(bpDiaUtama, 10) || 16;
      const wtM = (diaU * diaU) / 162;
      const wtLonjor = wtM * 12 || 18.9;
      const lonjorBorepile = Math.ceil((bpTotals.totalBesi * mult) / wtLonjor);
      const pBatangBorepile = pBesi > 0 ? Math.round(pBesi * wtLonjor) : 285000;
      items.push({
        category: 'tanah_pondasi',
        label: `Besi Tulangan Borepile (Batang Lonjor 12m)${clusterSuffix}`,
        satuan: 'Batang',
        jumlah: lonjorBorepile,
        harga: pBatangBorepile,
        source: 'Kalkulator Pondasi (Standar Lonjor Toko 12m)'
      });
    }
    if (bpSendSpoil && bpTotals.volSpoil > 0) {
      items.push({ category: 'tanah_pondasi', label: `Buang Tanah Bor (Spoil)${clusterSuffix}`, satuan: 'm³', jumlah: +(bpTotals.volSpoil * mult).toFixed(3), harga: parseNum(bpHargaSpoil) || 65000, source: 'Kalkulator Pondasi (Borepile)' });
    }

    if (items.length === 0) {
      showToast("Centang minimal satu bahan borepile dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(items, () => {
      setBpList([]);
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
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">FOUNDATION & SUBSTRUCTURE</span>
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
              Kalkulator Kebutuhan Pondasi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              Perhitungan volume batu kali, footplat (cakar ayam), dan borepile beserta kebutuhan besi beton, semen, pasir, dan galian tanah.
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
        unitLabel="Titik Pondasi Unit Cluster"
      />

      {/* SUB-CALCULATOR SELECTOR TABS */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
          <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
            Pilih Jenis Pondasi
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'batukali', label: '🪨 Pondasi Batu Kali' },
            { id: 'footplat', label: '🏗️ Pondasi Footplat (Pelat Setempat)' },
            { id: 'borepile', label: '🔩 Pondasi Borepile' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSub(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-display text-xs font-bold transition-all ${
                activeSub === tab.id
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-paper-100 hover:bg-paper-200 text-paper-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== SUB: BATU KALI ==================== */}
      {activeSub === 'batukali' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Visualisasi Penampang Potongan CAD Interaktif */}
          <StructuralCrossSectionVisualizer
            type="batukali"
            params={{
              bkLebarAtas,
              bkLebarBawah,
              bkTinggi,
              bkAanTebal,
              bkUrugTebal
            }}
          />

          {/* Dimensi */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Dimensi & Profil Trapesium Batu Kali
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Panjang Total</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={bkPanjang}
                    onChange={e => setBkPanjang(e.target.value)}
                    placeholder="mis. 40"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-paper-50 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-paper-500 font-mono">m</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Lebar Atas</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={bkLebarAtas}
                    onChange={e => setBkLebarAtas(e.target.value)}
                    placeholder="mis. 0.3"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-paper-50 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-paper-500 font-mono">m</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Lebar Bawah</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={bkLebarBawah}
                    onChange={e => setBkLebarBawah(e.target.value)}
                    placeholder="mis. 0.6"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-paper-50 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-paper-500 font-mono">m</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Tinggi</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={bkTinggi}
                    onChange={e => setBkTinggi(e.target.value)}
                    placeholder="mis. 0.8"
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-paper-50 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-paper-500 font-mono">m</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-paper-600 uppercase font-mono mb-1">Rasio Adukan</label>
                <select
                  value={bkRasio}
                  onChange={e => setBkRasio(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-paper-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-paper-50 focus:bg-white"
                >
                  <option value="3">1 PC : 3 PP</option>
                  <option value="4">1 PC : 4 PP</option>
                  <option value="5">1 PC : 5 PP</option>
                  <option value="6">1 PC : 6 PP</option>
                </select>
              </div>
            </div>

            {/* Sub-panel Jalur Pondasi Batu Kali Batas Samping (Shared Wall) */}
            {clusterTypology === 'shared' && effectiveMultiplier > 1 && (
              <div className="mt-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">🤝</span>
                    <span className="text-xs font-heading font-bold text-emerald-950 uppercase tracking-wide">
                      Parameter Jalur Pondasi Batas Kavling (Shared Foundation)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-800 font-bold">
                    Deret: {rowN} Unit / Blok · Rasio Batas: {(sharedRatio * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-emerald-900 font-mono mb-1">
                      Panjang Jalur Pondasi Batas Samping per Unit (m)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bkPanjangBatas}
                        onChange={e => setBkPanjangBatas(e.target.value)}
                        placeholder="mis. 20 (panjang batas kiri & kanan)"
                        className="w-full p-2.5 text-sm font-mono font-bold rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-950"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-600">m/unit</span>
                    </div>
                    <p className="text-[10.5px] text-emerald-700 mt-1 leading-snug">
                      Jalur pondasi batu kali di bawah dinding pembatas hanya digali dan dipasang 1 jalur bersama di as tanah perbatasan.
                    </p>
                  </div>

                  <div className="sm:col-span-6 bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-xs space-y-1 text-xs">
                    <div className="flex justify-between font-mono text-paper-600 text-[11px]">
                      <span>Total Jalur Dinding Ganda:</span>
                      <span className="font-bold">{(bkBasePanjang * effectiveMultiplier).toFixed(1)} m</span>
                    </div>
                    <div className="flex justify-between font-mono text-emerald-800 font-bold">
                      <span>Total Jalur Dinding Bersama:</span>
                      <span className="text-emerald-700 font-bold">{bkPanjangEffective.toFixed(1)} m</span>
                    </div>
                    {bkPanjangHemat > 0 && (
                      <div className="flex justify-between font-mono text-emerald-700 font-bold pt-1 border-t border-emerald-100 text-[11.5px]">
                        <span>🎉 Penghematan Jalur Galian & Pasangan:</span>
                        <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-black">
                          - {bkPanjangHemat.toFixed(1)} m ({((bkPanjangHemat / (bkBasePanjang * effectiveMultiplier)) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Galian & Lapisan Tambahan */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Galian & Lapisan Dasar Pondasi (Opsional)
              </h2>
            </div>

            <div className="space-y-3 pt-2">
              {/* Galian */}
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-paper-800">
                  <input
                    type="checkbox"
                    checked={bkTGalian}
                    onChange={e => setBkTGalian(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span>Hitung Galian Tanah Pondasi</span>
                </label>
                {bkTGalian && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 ml-6 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Kedalaman Galian (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bkGalianDalam}
                        onChange={e => setBkGalianDalam(e.target.value)}
                        placeholder="mis. 0.9"
                        className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Lebar Galian (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bkGalianLebar}
                        onChange={e => setBkGalianLebar(e.target.value)}
                        placeholder="mis. 0.8"
                        className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Urugan pasir */}
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-paper-800">
                  <input
                    type="checkbox"
                    checked={bkTUrug}
                    onChange={e => setBkTUrug(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span>Hitung Urugan Pasir Bawah Pondasi</span>
                </label>
                {bkTUrug && (
                  <div className="max-w-xs mt-3 ml-6 animate-fadeIn">
                    <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Tebal Urugan Pasir (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bkUrugTebal}
                      onChange={e => setBkUrugTebal(e.target.value)}
                      className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                    />
                  </div>
                )}
              </div>

              {/* Aanstamping */}
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-paper-800">
                  <input
                    type="checkbox"
                    checked={bkTAan}
                    onChange={e => setBkTAan(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span>Hitung Aanstamping (Batu Kosong)</span>
                </label>
                {bkTAan && (
                  <div className="max-w-xs mt-3 ml-6 animate-fadeIn">
                    <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Tebal Aanstamping (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bkAanTebal}
                      onChange={e => setBkAanTebal(e.target.value)}
                      className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hasil Kebutuhan */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Kebutuhan Material Hasil Perhitungan
              </h2>
            </div>

            {bkCalc.has ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-fadeIn">
                <div className="p-4 rounded-xl bg-amber-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-200">Volume Pasangan</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.volPasangan, 3)} m³</span>
                  <span className="text-[10px] text-amber-200 font-mono">Trapesium {bkPanjang} m</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-800 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-300">Batu Belah</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.batuM3, 3)} m³</span>
                  <span className="text-[10px] text-slate-300 font-mono">Koefisien 1,2 m³/m³</span>
                </div>

                <div className="p-4 rounded-xl bg-paper-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-paper-300">Semen Pasangan</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.semenKg)} kg</span>
                  <span className="text-[10px] text-paper-300 font-mono">≈ {bkCalc.semenZak} sak (40 kg)</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-700">Pasir Pasang</span>
                  <span className="font-heading text-2xl font-bold block my-1 text-amber-900">{formatNumber(bkCalc.pasirM3, 3)} m³</span>
                  <span className="text-[10px] text-amber-700 font-mono">1PC : {bkRasio}PP</span>
                </div>

                {bkCalc.volGalian !== undefined && (
                  <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                    <span className="text-[10px] font-mono uppercase font-bold text-paper-600">Galian Tanah</span>
                    <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.volGalian, 3)} m³</span>
                  </div>
                )}

                {bkCalc.volUrug !== undefined && (
                  <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                    <span className="text-[10px] font-mono uppercase font-bold text-paper-600">Urugan Pasir Dasar</span>
                    <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.volUrug, 3)} m³</span>
                  </div>
                )}

                {bkCalc.volAan !== undefined && (
                  <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                    <span className="text-[10px] font-mono uppercase font-bold text-paper-600">Aanstamping</span>
                    <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.volAan, 3)} m³</span>
                  </div>
                )}

                {bkCalc.volUrugKembali !== undefined && (
                  <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                    <span className="text-[10px] font-mono uppercase font-bold text-paper-600">Urugan Tanah Kembali</span>
                    <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bkCalc.volUrugKembali, 3)} m³</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-paper-500 font-sans italic">
                Isi dimensi profil batu kali di atas untuk melihat rincian material.
              </p>
            )}
          </div>

          {/* OPSIONAL: HARGA SATUAN BATU KALI */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
                <span>Harga Satuan Bahan Batu Kali</span>
                <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
                  opsional (default 0)
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
                  {bkBahanUnit === 'rit' ? 'Batu Belah (Rp/Rit ~5m³)' : 'Batu Belah (Rp/m³)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaBatu}
                  onChange={e => setBkHargaBatu(e.target.value)}
                  placeholder={bkBahanUnit === 'rit' ? 'mis. 1375000' : 'mis. 275000'}
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Semen (Rp/sak 40kg)</label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaSemen}
                  onChange={e => setBkHargaSemen(e.target.value)}
                  placeholder="mis. 65000"
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
                  {bkBahanUnit === 'rit' ? 'Pasir Pasang (Rp/Rit ~6m³)' : 'Pasir Pasang (Rp/m³)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaPasir}
                  onChange={e => setBkHargaPasir(e.target.value)}
                  placeholder={bkBahanUnit === 'rit' ? 'mis. 1650000' : 'mis. 380000'}
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Galian Tanah (Rp/m³)</label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaGalian}
                  onChange={e => setBkHargaGalian(e.target.value)}
                  placeholder="85000"
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Pasir Urug (Rp/m³)</label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaUrug}
                  onChange={e => setBkHargaUrug(e.target.value)}
                  placeholder="285000"
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Aanstamping (Rp/m³)</label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaAan}
                  onChange={e => setBkHargaAan(e.target.value)}
                  placeholder="395000"
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Urug Kembali (Rp/m³)</label>
                <input
                  type="number"
                  min="0"
                  value={bkHargaUrugKembali}
                  onChange={e => setBkHargaUrugKembali(e.target.value)}
                  placeholder="35000"
                  className="w-full p-2.5 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Kirim ke BoQ */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-400 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">06</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-emerald-900">
                Kirim Batu Kali ke BoQ Tools
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-3.5 rounded-xl border border-emerald-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input type="checkbox" checked={bkSendBatu} onChange={e => setBkSendBatu(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                <span>Batu Belah — <b className="font-mono">{bkCalc.has ? (bkBahanUnit === 'rit' ? `${+(bkCalc.batuM3 / 5).toFixed(1)} Rit` : `${formatNumber(bkCalc.batuM3, 3)} m³`) : '–'}</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input type="checkbox" checked={bkSendSemen} onChange={e => setBkSendSemen(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                <span>Semen Portland — <b className="font-mono">{bkCalc.has ? bkCalc.semenZak + ' sak' : '–'}</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input type="checkbox" checked={bkSendPasir} onChange={e => setBkSendPasir(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                <span>Pasir Pasang — <b className="font-mono">{bkCalc.has ? (bkBahanUnit === 'rit' ? `${+(bkCalc.pasirM3 / 6).toFixed(1)} Rit` : `${formatNumber(bkCalc.pasirM3, 3)} m³`) : '–'}</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input type="checkbox" checked={bkSendGalian} onChange={e => setBkSendGalian(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                <span>Galian Tanah — <b className="font-mono">{bkCalc.volGalian !== undefined ? formatNumber(bkCalc.volGalian, 3) + ' m³' : '–'}</b></span>
              </label>
            </div>

            {/* Opsi Satuan Pasaran Batu & Pasir */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-emerald-300 mb-3 text-xs">
              <span className="font-bold text-emerald-950 font-mono">Satuan Pengadaan Material ke BoQ:</span>
              <div className="inline-flex rounded-lg bg-paper-100 p-0.5 border border-paper-300 text-xs">
                <button
                  type="button"
                  onClick={() => setBkBahanUnit('m3')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${bkBahanUnit === 'm3' ? 'bg-emerald-700 text-white shadow-xs' : 'text-paper-700 hover:bg-paper-200'}`}
                >
                  m³ (Volume Kubik)
                </button>
                <button
                  type="button"
                  onClick={() => setBkBahanUnit('rit')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${bkBahanUnit === 'rit' ? 'bg-emerald-700 text-white shadow-xs' : 'text-paper-700 hover:bg-paper-200'}`}
                >
                  Rit (Dump Truck ~5-6m³)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendBatuKali}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold text-xs shadow-md"
            >
              <Send className="w-4 h-4" />
              Kirim yang Dicentang ke BoQ
            </button>
          </div>

        </div>
      )}

      {/* ==================== SUB: FOOTPLAT ==================== */}
      {activeSub === 'footplat' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Visualisasi Isometrik & Penampang Melintang CAD Interaktif */}
          <StructuralCrossSectionVisualizer
            type="footplat"
            params={{
              fpP,
              fpL,
              fpT,
              fpDiaX,
              fpJarakX,
              fpDiaY,
              fpJarakY,
              fpTLeher,
              fpLeherLebar,
              fpLeherTinggi
            }}
          />

          {/* Input Footplat Form */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Tambah Tipe Footplat
              </h2>
            </div>

            <form onSubmit={handleAddFootplat} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Nama Tipe</label>
                  <input
                    type="text"
                    value={fpNama}
                    onChange={e => setFpNama(e.target.value)}
                    placeholder="mis. FP-1"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Panjang (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fpP}
                    onChange={e => setFpP(e.target.value)}
                    placeholder="mis. 1.2"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Lebar (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fpL}
                    onChange={e => setFpL(e.target.value)}
                    placeholder="mis. 1.2"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Tebal (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fpT}
                    onChange={e => setFpT(e.target.value)}
                    placeholder="mis. 0.25"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Jumlah Titik</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={fpJumlah}
                    onChange={e => setFpJumlah(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Mutu Beton</label>
                  <select
                    value={fpMutu}
                    onChange={e => setFpMutu(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  >
                    <option value="K225">K225</option>
                    <option value="K250">K250</option>
                    <option value="K275">K275</option>
                    <option value="K300">K300</option>
                  </select>
                </div>
              </div>

              {/* Tulangan Pelat */}
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <span className="text-[11px] font-mono font-bold uppercase text-paper-700 block mb-2">
                  Tulangan Pelat Footplat (2 Lapis: Atas & Bawah)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Ø Arah X (mm)</label>
                    <input type="number" value={fpDiaX} onChange={e => setFpDiaX(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Jarak Arah X (mm)</label>
                    <input type="number" value={fpJarakX} onChange={e => setFpJarakX(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Ø Arah Y (mm)</label>
                    <input type="number" value={fpDiaY} onChange={e => setFpDiaY(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Jarak Arah Y (mm)</label>
                    <input type="number" value={fpJarakY} onChange={e => setFpJarakY(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                </div>
              </div>

              {/* Leher / Kolom Pedestal Toggle */}
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-paper-800">
                  <input
                    type="checkbox"
                    checked={fpTLeher}
                    onChange={e => setFpTLeher(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                  <span>Ada Leher / Kolom Pedestal di Atas Pelat</span>
                </label>

                {fpTLeher && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs font-mono animate-fadeIn">
                    <div>
                      <label className="block text-[10px] text-paper-600 mb-1">Lebar Leher (m)</label>
                      <input type="number" step="0.01" value={fpLeherLebar} onChange={e => setFpLeherLebar(e.target.value)} placeholder="0.25" className="w-full p-1.5 rounded border border-paper-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-paper-600 mb-1">Tebal Leher (m)</label>
                      <input type="number" step="0.01" value={fpLeherTebal} onChange={e => setFpLeherTebal(e.target.value)} placeholder="0.25" className="w-full p-1.5 rounded border border-paper-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-paper-600 mb-1">Tinggi Leher (m)</label>
                      <input type="number" step="0.01" value={fpLeherTinggi} onChange={e => setFpLeherTinggi(e.target.value)} placeholder="0.6" className="w-full p-1.5 rounded border border-paper-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-paper-600 mb-1">Tulangan Utama (Ø mm)</label>
                      <input type="number" value={fpLeherDiaUtama} onChange={e => setFpLeherDiaUtama(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Pilihan Posisi Footplat: Mandiri vs Berhimpitan Batas Kavling */}
              <div className="p-3.5 rounded-2xl bg-paper-50 border border-paper-300 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-[11px] font-semibold text-paper-700 uppercase font-mono">
                    Posisi Footplat (Peruntukan):
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
                    onClick={() => setInFpIsBoundary(false)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      !inFpIsBoundary
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/50 shadow-sm'
                        : 'border-paper-200 bg-white hover:bg-paper-100 text-paper-700'
                    }`}
                  >
                    <span className="text-xl leading-none mt-0.5">🏠</span>
                    <div>
                      <div className="text-xs font-bold font-display text-paper-900">
                        Footplat Dalam / Fasad Mandiri
                      </div>
                      <p className="text-[11px] text-paper-600 mt-0.5 leading-snug">
                        Titik kolom ruang dalam atau fasad. Dihitung 100% per unit untuk seluruh {effectiveMultiplier} unit cluster.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInFpIsBoundary(true)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      inFpIsBoundary
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/50 shadow-sm'
                        : 'border-paper-200 bg-white hover:bg-paper-100 text-paper-700'
                    }`}
                  >
                    <span className="text-xl leading-none mt-0.5">🤝</span>
                    <div>
                      <div className="text-xs font-bold font-display text-emerald-950 flex items-center gap-1.5">
                        <span>Footplat Batas Kavling (Berhimpitan)</span>
                        {clusterTypology === 'shared' && (
                          <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                            Hemat {(((2 * rowN - (rowN + 1)) / (2 * rowN)) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                        Titik cakar ayam di garis perbatasan antar-rumah (menopang kolom pembatas bersama).
                      </p>
                    </div>
                  </button>
                </div>

                {/* Keterangan Gamblang & Contoh Angka Riil */}
                {inFpIsBoundary && (
                  <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>💡 Mengapa jumlah footplat batas berkurang di Dinding Bersama?</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-emerald-800">
                      Pada cluster <strong>1 Dinding Bersama</strong>, titik cakar ayam di as perbatasan tanah hanya dibuat <strong>1 titik bersama untuk menopang kolom bersama</strong> (tidak dibuat dobel). Volume beton dan besi tulangan untuk titik batas ini dihemat hingga <strong>{(((2 * rowN - (rowN + 1)) / (2 * rowN)) * 100).toFixed(0)}%</strong> se-cluster.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-paper-900 hover:bg-paper-800 text-white font-display font-semibold text-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                Tambah ke Daftar Footplat
              </button>
            </form>

            {/* Footplat Table */}
            <div className="mt-5 border-t border-paper-200 pt-4 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-paper-300 text-paper-600 text-[11px] uppercase">
                    <th className="py-2 px-3 font-sans">Tipe</th>
                    <th className="py-2 px-3">Dimensi</th>
                    <th className="py-2 px-3">Jml</th>
                    <th className="py-2 px-3 text-right">Vol Beton</th>
                    <th className="py-2 px-3 text-right">Berat Besi</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {fpList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-paper-500 font-sans">
                        Belum ada tipe footplat ditambahkan.
                      </td>
                    </tr>
                  ) : (
                    fpList.map(it => (
                      <tr key={it.id} className="hover:bg-paper-50">
                        <td className="py-2 px-3 font-sans font-semibold text-paper-900">
                          {it.nama} ({it.mutu})
                          {it.isSharedBoundary && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🤝 As Bersama
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-paper-700">{it.dimText}</td>
                        <td className="py-2 px-3 text-paper-700">{it.jumlah} titik</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800">{formatNumber(it.volTotal, 3)} m³</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">{formatNumber(it.besiTotal)} kg</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setFpList(prev => prev.filter(x => x.id !== it.id))}
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

          {/* Footplat Totals */}
          {fpTotals.has && (
            <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                  Total Kebutuhan Material Footplat
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-emerald-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-300">Total Volume Beton</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(fpTotals.totalVol, 3)} m³</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-300">Total Besi Beton</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(fpTotals.totalBesi)} kg</span>
                  <span className="text-[10px] text-slate-300 font-mono">Pelat 2 lapis + leher</span>
                </div>

                <div className="p-4 rounded-xl bg-paper-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-paper-300">Semen Cor</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(fpTotals.mixTotals.semen)} kg</span>
                  <span className="text-[10px] text-paper-300 font-mono">≈ {fpTotals.semenZak} sak</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-700">Pasir Beton</span>
                  <span className="font-heading text-2xl font-bold block my-1 text-amber-900">{formatNumber(fpTotals.pasirM3, 3)} m³</span>
                </div>
              </div>

              {fpHematSharedVol > 0 && (
                <div className="mt-3 text-right text-xs font-mono text-emerald-700 font-bold">
                  🎉 Penghematan Dinding Bersama: -{formatNumber(fpHematSharedVol, 3)} m³ beton cor footplat
                </div>
              )}
            </div>
          )}

          {/* OPSIONAL: HARGA SATUAN FOOTPLAT */}
          {fpTotals.has && (
            <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
                  <span>Harga Satuan Bahan Footplat</span>
                  <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
                    opsional (default 0)
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Beton Ready Mix (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaBeton}
                    onChange={e => setFpHargaBeton(e.target.value)}
                    placeholder="mis. 880000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">
                    {fpBesiDispatchUnit === 'batang' ? 'Besi Tulangan (Rp/Batang 12m)' : 'Besi Tulangan (Rp/Kg)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaBesi}
                    onChange={e => setFpHargaBesi(e.target.value)}
                    placeholder={fpBesiDispatchUnit === 'batang' ? 'mis. 145000' : 'mis. 14500'}
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Semen (Rp/sak)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaSemen}
                    onChange={e => setFpHargaSemen(e.target.value)}
                    placeholder="mis. 70000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Pasir Beton (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaPasir}
                    onChange={e => setFpHargaPasir(e.target.value)}
                    placeholder="mis. 385000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Kerikil / Split (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaKerikil}
                    onChange={e => setFpHargaKerikil(e.target.value)}
                    placeholder="285000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Galian Tanah (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaGalian}
                    onChange={e => setFpHargaGalian(e.target.value)}
                    placeholder="85000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Lantai Kerja (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaLK}
                    onChange={e => setFpHargaLK(e.target.value)}
                    placeholder="750000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Pasir Urug Bawah (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={fpHargaUrug}
                    onChange={e => setFpHargaUrug(e.target.value)}
                    placeholder="285000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kirim Footplat ke BoQ */}
          {fpTotals.has && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-400 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-emerald-900">
                  Kirim Footplat ke BoQ Tools
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-3.5 rounded-xl border border-emerald-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={fpSendBeton} onChange={e => setFpSendBeton(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Volume Beton — <b className="font-mono">{formatNumber(fpTotals.totalVol, 3)} m³</b></span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={fpSendBesi} onChange={e => setFpSendBesi(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Besi Tulangan — <b className="font-mono">{fpTotals.totalBesi > 0 ? (fpBesiDispatchUnit === 'batang' ? `${Math.ceil(fpTotals.totalBesi / 10.66)} Batang (12m)` : `${Math.round(fpTotals.totalBesi)} kg`) : '–'}</b></span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={fpSendSemen} onChange={e => setFpSendSemen(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Semen (Cor) — <b className="font-mono">{fpTotals.semenZak} sak</b></span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={fpSendPasir} onChange={e => setFpSendPasir(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Pasir Beton — <b className="font-mono">{formatNumber(fpTotals.pasirM3, 3)} m³</b></span>
                </label>
              </div>

              {/* Opsi Satuan Pasaran Besi Tulangan Footplat */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-emerald-300 mb-3 text-xs">
                <span className="font-bold text-emerald-950 font-mono">Satuan Besi Tulangan ke BoQ:</span>
                <div className="inline-flex rounded-lg bg-paper-100 p-0.5 border border-paper-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setFpBesiDispatchUnit('batang')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${fpBesiDispatchUnit === 'batang' ? 'bg-emerald-700 text-white shadow-xs' : 'text-paper-700 hover:bg-paper-200'}`}
                  >
                    Batang (Lonjor 12m) — Standar Toko
                  </button>
                  <button
                    type="button"
                    onClick={() => setFpBesiDispatchUnit('kg')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${fpBesiDispatchUnit === 'kg' ? 'bg-emerald-700 text-white shadow-xs' : 'text-paper-700 hover:bg-paper-200'}`}
                  >
                    Kg (Timbangan Berat)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendFootplat}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold text-xs shadow-md"
              >
                <Send className="w-4 h-4" />
                Kirim yang Dicentang ke BoQ
              </button>
            </div>
          )}

        </div>
      )}

      {/* ==================== SUB: BOREPILE ==================== */}
      {activeSub === 'borepile' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Input Borepile Form */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Tambah Tipe Titik Borepile
              </h2>
            </div>

            <form onSubmit={handleAddBorepile} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Nama Tipe</label>
                  <input
                    type="text"
                    value={bpNama}
                    onChange={e => setBpNama(e.target.value)}
                    placeholder="mis. BP-1"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Diameter (cm)</label>
                  <input
                    type="number"
                    step="1"
                    value={bpDiameter}
                    onChange={e => setBpDiameter(e.target.value)}
                    placeholder="mis. 40"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Kedalaman (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bpKedalaman}
                    onChange={e => setBpKedalaman(e.target.value)}
                    placeholder="mis. 8"
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Jumlah Titik</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={bpJumlah}
                    onChange={e => setBpJumlah(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-paper-600 mb-1">Mutu Beton</label>
                  <select
                    value={bpMutu}
                    onChange={e => setBpMutu(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-paper-300"
                  >
                    <option value="K225">K225</option>
                    <option value="K250">K250</option>
                    <option value="K275">K275</option>
                    <option value="K300">K300</option>
                  </select>
                </div>
              </div>

              {/* Tulangan Borepile */}
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <span className="text-[11px] font-mono font-bold uppercase text-paper-700 block mb-2">
                  Tulangan Utama & Spiral Borepile
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Ø Tul. Utama (mm)</label>
                    <input type="number" value={bpDiaUtama} onChange={e => setBpDiaUtama(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Jml Batang Utama</label>
                    <input type="number" value={bpJmlUtama} onChange={e => setBpJmlUtama(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Panjang Batang (m)</label>
                    <input type="number" step="0.1" value={bpPanjangUtama} onChange={e => setBpPanjangUtama(e.target.value)} placeholder="samakan kedalaman" className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Ø Spiral (mm)</label>
                    <input type="number" value={bpDiaSpiral} onChange={e => setBpDiaSpiral(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-600 mb-1">Jarak Lilitan (mm)</label>
                    <input type="number" value={bpJarakSpiral} onChange={e => setBpJarakSpiral(e.target.value)} className="w-full p-1.5 rounded border border-paper-300" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-paper-900 hover:bg-paper-800 text-white font-display font-semibold text-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                Tambah ke Daftar Borepile
              </button>
            </form>

            {/* Borepile Table */}
            <div className="mt-5 border-t border-paper-200 pt-4 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-paper-300 text-paper-600 text-[11px] uppercase">
                    <th className="py-2 px-3 font-sans">Tipe</th>
                    <th className="py-2 px-3">Dimensi</th>
                    <th className="py-2 px-3">Jml</th>
                    <th className="py-2 px-3 text-right">Vol Beton</th>
                    <th className="py-2 px-3 text-right">Berat Besi</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {bpList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-paper-500 font-sans">
                        Belum ada tipe borepile ditambahkan.
                      </td>
                    </tr>
                  ) : (
                    bpList.map(it => (
                      <tr key={it.id} className="hover:bg-paper-50">
                        <td className="py-2 px-3 font-sans font-semibold text-paper-900">{it.nama} ({it.mutu})</td>
                        <td className="py-2 px-3 text-paper-700">{it.dimText}</td>
                        <td className="py-2 px-3 text-paper-700">{it.jumlah} titik</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800">{formatNumber(it.volTotal, 3)} m³</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">{formatNumber(it.besiTotal)} kg</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setBpList(prev => prev.filter(x => x.id !== it.id))}
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

          {/* Borepile Totals */}
          {bpTotals.has && (
            <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-6 h-6 rounded-md bg-paper-900 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                  Total Kebutuhan Material Borepile
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-emerald-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-300">Total Volume Cor</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bpTotals.totalVol, 3)} m³</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-300">Total Besi Beton</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bpTotals.totalBesi)} kg</span>
                  <span className="text-[10px] text-slate-300 font-mono">Utama + Spiral</span>
                </div>

                <div className="p-4 rounded-xl bg-paper-900 text-white">
                  <span className="text-[10px] font-mono uppercase font-bold text-paper-300">Semen Cor</span>
                  <span className="font-heading text-2xl font-bold block my-1">{formatNumber(bpTotals.mixTotals.semen)} kg</span>
                  <span className="text-[10px] text-paper-300 font-mono">≈ {bpTotals.semenZak} sak</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-700">Tanah Bor Dibuang (Spoil)</span>
                  <span className="font-heading text-2xl font-bold block my-1 text-amber-900">{formatNumber(bpTotals.volSpoil, 3)} m³</span>
                  <span className="text-[10px] text-amber-700 font-mono">Faktor kembang 15%</span>
                </div>
              </div>
            </div>
          )}

          {/* OPSIONAL: HARGA SATUAN BOREPILE */}
          {bpTotals.has && (
            <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
                  <span>Harga Satuan Bahan Borepile</span>
                  <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
                    opsional (default 0)
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Beton Ready Mix (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={bpHargaBeton}
                    onChange={e => setBpHargaBeton(e.target.value)}
                    placeholder="mis. 880000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Besi Beton (Rp/kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={bpHargaBesi}
                    onChange={e => setBpHargaBesi(e.target.value)}
                    placeholder="mis. 14250"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Semen (Rp/sak)</label>
                  <input
                    type="number"
                    min="0"
                    value={bpHargaSemen}
                    onChange={e => setBpHargaSemen(e.target.value)}
                    placeholder="mis. 70000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Pasir Beton (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={bpHargaPasir}
                    onChange={e => setBpHargaPasir(e.target.value)}
                    placeholder="mis. 385000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Kerikil / Split (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={bpHargaKerikil}
                    onChange={e => setBpHargaKerikil(e.target.value)}
                    placeholder="285000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-paper-600 uppercase mb-1">Buang Spoil Tanah (Rp/m³)</label>
                  <input
                    type="number"
                    min="0"
                    value={bpHargaSpoil}
                    onChange={e => setBpHargaSpoil(e.target.value)}
                    placeholder="65000"
                    className="w-full p-2 rounded-xl border border-paper-300 bg-paper-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kirim Borepile ke BoQ */}
          {bpTotals.has && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-400 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-emerald-900">
                  Kirim Borepile ke BoQ Tools
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-3.5 rounded-xl border border-emerald-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={bpSendBeton} onChange={e => setBpSendBeton(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Volume Beton — <b className="font-mono">{formatNumber(bpTotals.totalVol, 3)} m³</b></span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={bpSendBesi} onChange={e => setBpSendBesi(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Besi Tulangan — <b className="font-mono">{Math.ceil(bpTotals.totalBesi / (((parseInt(bpDiaUtama, 10) || 16) ** 2 / 162) * 12))} btg ({formatNumber(bpTotals.totalBesi)} kg)</b></span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={bpSendSemen} onChange={e => setBpSendSemen(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Semen (Cor) — <b className="font-mono">{bpTotals.semenZak} sak</b></span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                  <input type="checkbox" checked={bpSendSpoil} onChange={e => setBpSendSpoil(e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                  <span>Buang Tanah Bor (Spoil) — <b className="font-mono">{formatNumber(bpTotals.volSpoil, 3)} m³</b></span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSendBorepile}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold text-xs shadow-md"
              >
                <Send className="w-4 h-4" />
                Kirim yang Dicentang ke BoQ
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

