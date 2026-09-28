import React, { useState, useMemo, useEffect } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum } from '../../utils/formatters';
import { 
  ArrowLeft, 
  Send, 
  Plus, 
  Trash2, 
  Zap, 
  Droplets, 
  Sparkles, 
  HelpCircle,
  Building,
  Maximize2
} from 'lucide-react';
import { ClusterMultiplierBar } from '../common/ClusterMultiplierBar';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';

export function MepSanitationCalculator({ initialMode = 'mep' }) {
  const { setActiveTab, queueCalculatedItems, showToast, clusterUnits, updateClusterUnits } = useBoQ();

  // Mode switcher: 'mep' (Elektrikal) | 'sanitasi' (Plumbing)
  const [activeMode, setActiveMode] = usePersistentState('sr_calc_mep_active_mode', initialMode);
  const [clusterApplyMode, setClusterApplyMode] = usePersistentState('sr_calc_mep_cluster_mode', 'multiplied');

  useEffect(() => {
    if (initialMode) setActiveMode(initialMode);
  }, [initialMode]);

  /* =========================================================================
   * ⚡ STATE BAGIAN A: ELEKTRIKAL & MEP (TOPOLOGI TITIK & SIRKUIT)
   * ========================================================================= */
  const [daftarSirkuit, setDaftarSirkuit] = usePersistentState('sr_calc_mep_circuits', []);

  // Form input sirkuit baru
  const [cNama, setCNama] = usePersistentState('sr_calc_mep_c_nama', '');
  const [cJenisKabel, setCJenisKabel] = usePersistentState('sr_calc_mep_c_jenis_kabel', 'nym_3x2.5');
  const [cMcbAmp, setCMcbAmp] = usePersistentState('sr_calc_mep_c_mcb_amp', '10');
  const [cFeederDist, setCFeederDist] = usePersistentState('sr_calc_mep_c_feeder', '');
  const [cSpanDist, setCSpanDist] = usePersistentState('sr_calc_mep_c_span', '');
  const [cTitikLampu, setCTitikLampu] = usePersistentState('sr_calc_mep_c_lampu', '');
  const [cTitikSaklarTunggal, setCTitikSaklarTunggal] = usePersistentState('sr_calc_mep_c_saklar1', '');
  const [cTitikSaklarGanda, setCTitikSaklarGanda] = usePersistentState('sr_calc_mep_c_saklar2', '');
  const [cTitikSaklarTriple, setCTitikSaklarTriple] = usePersistentState('sr_calc_mep_c_saklar3', '');
  const [cTitikStopKontak, setCTitikStopKontak] = usePersistentState('sr_calc_mep_c_sk', '');
  const [cTitikStopKontakAC, setCTitikStopKontakAC] = usePersistentState('sr_calc_mep_c_sk_ac', '');
  const [cDropSaklar, setCDropSaklar] = usePersistentState('sr_calc_mep_c_drop_saklar', '1.5');
  const [cDropSK, setCDropSK] = usePersistentState('sr_calc_mep_c_drop_sk', '2.5');

  // Harga satuan bahan MEP (Rp)
  const [hargaKabel2x15, setHargaKabel2x15] = usePersistentState('sr_calc_mep_h_kabel2x15', '');
  const [hargaKabel3x15, setHargaKabel3x15] = usePersistentState('sr_calc_mep_h_kabel3x15', '');
  const [hargaKabel3x25, setHargaKabel3x25] = usePersistentState('sr_calc_mep_h_kabel3x25', '');
  const [hargaKabel3x4, setHargaKabel3x4] = usePersistentState('sr_calc_mep_h_kabel3x4', '');
  const [hargaPipaKonduit, setHargaPipaKonduit] = usePersistentState('sr_calc_mep_h_konduit', '');
  const [hargaSaklarTunggal, setHargaSaklarTunggal] = usePersistentState('sr_calc_mep_h_saklar1', '');
  const [hargaSaklarGanda, setHargaSaklarGanda] = usePersistentState('sr_calc_mep_h_saklar2', '');
  const [hargaSaklarTriple, setHargaSaklarTriple] = usePersistentState('sr_calc_mep_h_saklar3', '');
  const [hargaStopKontak, setHargaStopKontak] = usePersistentState('sr_calc_mep_h_sk', '');
  const [hargaStopKontakAC, setHargaStopKontakAC] = usePersistentState('sr_calc_mep_h_sk_ac', '');
  const [hargaFittingLampu, setHargaFittingLampu] = usePersistentState('sr_calc_mep_h_fitting', '');
  const [hargaLampuLED, setHargaLampuLED] = usePersistentState('sr_calc_mep_h_lampu', '');
  const [hargaMcbBox, setHargaMcbBox] = usePersistentState('sr_calc_mep_h_mcb_box', '');
  const [hargaMcbUnit, setHargaMcbUnit] = usePersistentState('sr_calc_mep_h_mcb_unit', '');
  const [hargaInbowDus, setHargaInbowDus] = usePersistentState('sr_calc_mep_h_inbow', '');
  const [hargaTDus, setHargaTDus] = usePersistentState('sr_calc_mep_h_tdus', '');

  // Checkbox dispatch MEP
  const [sendKabel, setSendKabel] = usePersistentState('sr_calc_mep_send_kabel', true);
  const [sendKonduit, setSendKonduit] = usePersistentState('sr_calc_mep_send_konduit', true);
  const [sendSaklarSK, setSendSaklarSK] = usePersistentState('sr_calc_mep_send_saklar_sk', true);
  const [sendLampu, setSendLampu] = usePersistentState('sr_calc_mep_send_lampu', true);
  const [sendMcbPanel, setSendMcbPanel] = usePersistentState('sr_calc_mep_send_mcb_panel', true);
  const [sendDusAksesoris, setSendDusAksesoris] = usePersistentState('sr_calc_mep_send_dus', true);

  // Opsi Satuan Pasaran Toko
  const [kabelSatuanMode, setKabelSatuanMode] = usePersistentState('sr_calc_mep_kabel_satuan', 'roll50'); // 'meter' | 'roll50' | 'roll100'
  const [pipaSatuanMode, setPipaSatuanMode] = usePersistentState('sr_calc_mep_pipa_satuan', 'batang'); // 'batang' | 'meter'

  /* =========================================================================
   * 💧 STATE BAGIAN B: SANITASI & PLUMBING (JARINGAN AIR & SALURAN)
   * ========================================================================= */
  const [pdamTorenDist, setPdamTorenDist] = usePersistentState('sr_calc_san_pdam_toren', '');
  const [pipaUtamaDia, setPipaUtamaDia] = usePersistentState('sr_calc_san_pipa_utama_dia', '3/4');
  const [cabangDistPerTitik, setCabangDistPerTitik] = usePersistentState('sr_calc_san_cabang_dist', '');

  // Titik Fixture Saniter
  const [qtyKranDinding, setQtyKranDinding] = usePersistentState('sr_calc_san_kran', '');
  const [qtyShower, setQtyShower] = usePersistentState('sr_calc_san_shower', '');
  const [qtyWastafel, setQtyWastafel] = usePersistentState('sr_calc_san_wastafel', '');
  const [qtyClosetDuduk, setQtyClosetDuduk] = usePersistentState('sr_calc_san_closet_duduk', '');
  const [qtyClosetJongkok, setQtyClosetJongkok] = usePersistentState('sr_calc_san_closet_jongkok', '');
  const [qtySinkDapur, setQtySinkDapur] = usePersistentState('sr_calc_san_sink', '');
  const [qtyMesinCuci, setQtyMesinCuci] = usePersistentState('sr_calc_san_mesin_cuci', '');

  // Air Kotor & Air Bekas
  const [distSepticTank, setDistSepticTank] = usePersistentState('sr_calc_san_dist_septic', '');
  const [diaPipaKotor, setDiaPipaKotor] = usePersistentState('sr_calc_san_dia_kotor', '4');
  const [distGreyWater, setDistGreyWater] = usePersistentState('sr_calc_san_dist_grey', '');
  const [diaPipaBekas, setDiaPipaBekas] = usePersistentState('sr_calc_san_dia_bekas', '2.5');
  const [qtyFloorDrain, setQtyFloorDrain] = usePersistentState('sr_calc_san_floor_drain', '');
  const [qtyBakKontrol, setQtyBakKontrol] = usePersistentState('sr_calc_san_bak_kontrol', '');
  const [distPipaVent, setDistPipaVent] = usePersistentState('sr_calc_san_pipa_vent', '');

  // Harga satuan bahan Sanitasi (Rp)
  const [hargaPipaAW12, setHargaPipaAW12] = usePersistentState('sr_calc_san_h_aw12', '');
  const [hargaPipaAW34, setHargaPipaAW34] = usePersistentState('sr_calc_san_h_aw34', '');
  const [hargaPipaAW1, setHargaPipaAW1] = usePersistentState('sr_calc_san_h_aw1', '');
  const [hargaPipaD2, setHargaPipaD2] = usePersistentState('sr_calc_san_h_d2', '');
  const [hargaPipaD3, setHargaPipaD3] = usePersistentState('sr_calc_san_h_d3', '');
  const [hargaPipaD4, setHargaPipaD4] = usePersistentState('sr_calc_san_h_d4', '');
  const [hargaKranAir, setHargaKranAir] = usePersistentState('sr_calc_san_h_kran', '');
  const [hargaShower, setHargaShower] = usePersistentState('sr_calc_san_h_shower', '');
  const [hargaWastafelUnit, setHargaWastafelUnit] = usePersistentState('sr_calc_san_h_wastafel', '');
  const [hargaClosetDudukUnit, setHargaClosetDudukUnit] = usePersistentState('sr_calc_san_h_closet_duduk', '');
  const [hargaClosetJongkokUnit, setHargaClosetJongkokUnit] = usePersistentState('sr_calc_san_h_closet_jongkok', '');
  const [hargaFloorDrainUnit, setHargaFloorDrainUnit] = usePersistentState('sr_calc_san_h_floor_drain', '');
  const [hargaBiotankUnit, setHargaBiotankUnit] = usePersistentState('sr_calc_san_h_biotank', '');
  const [hargaBakKontrolUnit, setHargaBakKontrolUnit] = usePersistentState('sr_calc_san_h_bak_kontrol', '');

  // Checkbox dispatch Sanitasi
  const [sendPipaAirBersih, setSendPipaAirBersih] = usePersistentState('sr_calc_san_send_bersih', true);
  const [sendPipaAirKotor, setSendPipaAirKotor] = usePersistentState('sr_calc_san_send_kotor', true);
  const [sendPipaAirBekas, setSendPipaAirBekas] = usePersistentState('sr_calc_san_send_bekas', true);
  const [sendSaniterKran, setSendSaniterKran] = usePersistentState('sr_calc_san_send_kran', true);
  const [sendSaniterKloset, setSendSaniterKloset] = usePersistentState('sr_calc_san_send_kloset', true);
  const [sendSepticTank, setSendSepticTank] = usePersistentState('sr_calc_san_send_septic', true);

  // Multi-Storey Plumbing States
  const [inRiserTinggi, setInRiserTinggi] = usePersistentState('sr_calc_san_riser_h', '3.6');
  const [inRiserShafts, setInRiserShafts] = usePersistentState('sr_calc_san_riser_shafts', '1');
  const [enableRiser, setEnableRiser] = usePersistentState('sr_calc_san_enable_riser', true);
  const [inRoofTank, setInRoofTank] = usePersistentState('sr_calc_san_roof_tank', '1000'); // 'none' | '500' | '1000' | '1500'
  const [inBoosterPump, setInBoosterPump] = usePersistentState('sr_calc_san_booster_pump', true);
  const [inRadar, setInRadar] = usePersistentState('sr_calc_san_radar', true);
  const [inBiofilType, setInBiofilType] = usePersistentState('sr_calc_san_biofil_type', 'individual'); // 'individual' | 'komunal'
  const [hargaRoofTank, setHargaRoofTank] = usePersistentState('sr_calc_san_h_roof_tank', '1650000');
  const [hargaBoosterPump, setHargaBoosterPump] = usePersistentState('sr_calc_san_h_booster_pump', '750000');
  const [hargaRadar, setHargaRadar] = usePersistentState('sr_calc_san_h_radar', '85000');

  // Multi-Storey & Cluster Electrical States
  const [inSdpLt2, setInSdpLt2] = usePersistentState('sr_calc_mep_sdp_lt2', false);
  const [inKwhCluster, setInKwhCluster] = usePersistentState('sr_calc_mep_kwh_cluster', false);
  const [hargaSdp, setHargaSdp] = usePersistentState('sr_calc_mep_h_sdp', '450000');
  const [hargaKwh, setHargaKwh] = usePersistentState('sr_calc_mep_h_kwh', '1250000');

  /* =========================================================================
   * ⚡ PERHITUNGAN TOPOLOGI ELEKTRIKAL & MEP
   * ========================================================================= */
  const handleAddSirkuit = (e) => {
    e.preventDefault();
    const feeder = parseNum(cFeederDist) || 0;
    const span = parseNum(cSpanDist) || 0;
    const tLampu = parseInt(cTitikLampu, 10) || 0;
    const tSaklar1 = parseInt(cTitikSaklarTunggal, 10) || 0;
    const tSaklar2 = parseInt(cTitikSaklarGanda, 10) || 0;
    const tSaklar3 = parseInt(cTitikSaklarTriple, 10) || 0;
    const tSK = parseInt(cTitikStopKontak, 10) || 0;
    const tSKAC = parseInt(cTitikStopKontakAC, 10) || 0;

    const totalNodes = tLampu + tSaklar1 + tSaklar2 + tSaklar3 + tSK + tSKAC;
    if (totalNodes === 0) {
      alert("Masukkan minimal satu titik beban (lampu, saklar, atau stop kontak) pada sirkuit ini.");
      return;
    }

    const dropSaklar = parseNum(cDropSaklar) || 1.5;
    const dropSK = parseNum(cDropSK) || 2.5;

    const totalSaklar = tSaklar1 + tSaklar2 + tSaklar3;
    const totalTitikBeban = tLampu + tSK + tSKAC;
    const spanCount = Math.max(0, (totalTitikBeban + totalSaklar) - 1);
    const horizontalRun = feeder + (spanCount * span);
    const verticalDroppers = (totalSaklar * dropSaklar) + ((tSK + tSKAC) * dropSK);
    const panjangKabelRaw = (horizontalRun + verticalDroppers) * 1.10;

    const newCircuit = {
      id: Date.now(),
      nama: cNama.trim() || `Grup ${daftarSirkuit.length + 1}`,
      jenisKabel: cJenisKabel,
      mcbAmp: cMcbAmp,
      feederDist: feeder,
      spanDist: span,
      titikLampu: tLampu,
      titikSaklarTunggal: tSaklar1,
      titikSaklarGanda: tSaklar2,
      titikSaklarTriple: tSaklar3,
      titikStopKontak: tSK,
      titikStopKontakAC: tSKAC,
      dropSaklar,
      dropSK,
      panjangKabelRaw
    };

    setDaftarSirkuit(prev => [...prev, newCircuit]);
    setCNama('');
    setCFeederDist('');
    setCSpanDist('');
    setCTitikLampu('');
    setCTitikSaklarTunggal('');
    setCTitikSaklarGanda('');
    setCTitikSaklarTriple('');
    setCTitikStopKontak('');
    setCTitikStopKontakAC('');
  };

  const handleDeleteSirkuit = (id) => {
    setDaftarSirkuit(prev => prev.filter(c => c.id !== id));
  };

  // MEP Aggregated Summary
  const mepSummary = useMemo(() => {
    let totalKabel2x15 = 0;
    let totalKabel3x15 = 0;
    let totalKabel3x25 = 0;
    let totalKabel3x4 = 0;

    let totalTitikLampu = 0;
    let totalSaklarTunggal = 0;
    let totalSaklarGanda = 0;
    let totalSaklarTriple = 0;
    let totalStopKontak = 0;
    let totalStopKontakAC = 0;

    daftarSirkuit.forEach(c => {
      if (c.jenisKabel === 'nym_2x1.5') totalKabel2x15 += c.panjangKabelRaw;
      else if (c.jenisKabel === 'nym_3x1.5') totalKabel3x15 += c.panjangKabelRaw;
      else if (c.jenisKabel === 'nym_3x2.5') totalKabel3x25 += c.panjangKabelRaw;
      else if (c.jenisKabel === 'nym_3x4') totalKabel3x4 += c.panjangKabelRaw;

      totalTitikLampu += c.titikLampu;
      totalSaklarTunggal += c.titikSaklarTunggal;
      totalSaklarGanda += c.titikSaklarGanda;
      totalSaklarTriple += c.titikSaklarTriple;
      totalStopKontak += c.titikStopKontak;
      totalStopKontakAC += c.titikStopKontakAC;
    });

    const totalKabelAll = totalKabel2x15 + totalKabel3x15 + totalKabel3x25 + totalKabel3x4;
    const totalBatangKonduit = Math.ceil(totalKabelAll / 3.0);
    const totalInbowDus = totalSaklarTunggal + totalSaklarGanda + totalSaklarTriple + totalStopKontak + totalStopKontakAC;
    const totalTDus = daftarSirkuit.length > 0 ? Math.ceil(totalTitikLampu + (daftarSirkuit.length * 2)) : 0;
    const totalMcbGrup = daftarSirkuit.length;
    const totalMcbAll = totalMcbGrup > 0 ? totalMcbGrup + 1 : 0;

    const pK215 = parseNum(hargaKabel2x15);
    const pK315 = parseNum(hargaKabel3x15);
    const pK325 = parseNum(hargaKabel3x25);
    const pK34 = parseNum(hargaKabel3x4);
    const pKonduit = parseNum(hargaPipaKonduit);
    const pSak1 = parseNum(hargaSaklarTunggal);
    const pSak2 = parseNum(hargaSaklarGanda);
    const pSak3 = parseNum(hargaSaklarTriple);
    const pSK = parseNum(hargaStopKontak);
    const pSKAC = parseNum(hargaStopKontakAC);
    const pFitting = parseNum(hargaFittingLampu);
    const pLED = parseNum(hargaLampuLED);
    const pMcbBox = parseNum(hargaMcbBox);
    const pMcbUnit = parseNum(hargaMcbUnit);
    const pInbow = parseNum(hargaInbowDus);
    const pTDus = parseNum(hargaTDus);

    const costKabel = (totalKabel2x15 * pK215) + (totalKabel3x15 * pK315) + (totalKabel3x25 * pK325) + (totalKabel3x4 * pK34);
    const costKonduit = totalBatangKonduit * pKonduit;
    const costSaklarSK = (totalSaklarTunggal * pSak1) + (totalSaklarGanda * pSak2) + (totalSaklarTriple * pSak3) + (totalStopKontak * pSK) + (totalStopKontakAC * pSKAC);
    const costLampu = (totalTitikLampu * pFitting) + (totalTitikLampu * pLED);
    const costMcbPanel = totalMcbAll > 0 ? pMcbBox + (totalMcbAll * pMcbUnit) : 0;
    const costDus = (totalInbowDus * pInbow) + (totalTDus * pTDus);

    const totalEstimasiMep = costKabel + costKonduit + costSaklarSK + costLampu + costMcbPanel + costDus;

    return {
      totalKabel2x15,
      totalKabel3x15,
      totalKabel3x25,
      totalKabel3x4,
      totalKabelAll,
      totalBatangKonduit,
      totalTitikLampu,
      totalSaklarTunggal,
      totalSaklarGanda,
      totalSaklarTriple,
      totalStopKontak,
      totalStopKontakAC,
      totalInbowDus,
      totalTDus,
      totalMcbGrup,
      totalMcbAll,
      totalEstimasiMep
    };
  }, [
    daftarSirkuit,
    hargaKabel2x15, hargaKabel3x15, hargaKabel3x25, hargaKabel3x4,
    hargaPipaKonduit, hargaSaklarTunggal, hargaSaklarGanda, hargaSaklarTriple,
    hargaStopKontak, hargaStopKontakAC, hargaFittingLampu, hargaLampuLED,
    hargaMcbBox, hargaMcbUnit, hargaInbowDus, hargaTDus
  ]);

  /* =========================================================================
   * 💧 PERHITUNGAN TOPOLOGI SANITASI & PLUMBING
   * ========================================================================= */
  const sanitasiSummary = useMemo(() => {
    const kran = parseInt(qtyKranDinding, 10) || 0;
    const shower = parseInt(qtyShower, 10) || 0;
    const wastafel = parseInt(qtyWastafel, 10) || 0;
    const closetD = parseInt(qtyClosetDuduk, 10) || 0;
    const closetJ = parseInt(qtyClosetJongkok, 10) || 0;
    const sink = parseInt(qtySinkDapur, 10) || 0;
    const cuci = parseInt(qtyMesinCuci, 10) || 0;

    const totalTitikAirBersih = kran + shower + wastafel + closetD + closetJ + sink + cuci;
    const totalCloset = closetD + closetJ;
    const totalFloorDrain = parseInt(qtyFloorDrain, 10) || 0;
    const totalBakKontrol = parseInt(qtyBakKontrol, 10) || 0;

    const pMainDist = parseNum(pdamTorenDist) || 0;
    const pBranchDistPerTitik = parseNum(cabangDistPerTitik) || (totalTitikAirBersih > 0 ? 2.5 : 0);

    const totalMeterPipaUtama = pMainDist > 0 ? pMainDist * 1.10 : 0;
    const totalMeterPipaCabang = totalTitikAirBersih > 0 ? (totalTitikAirBersih * pBranchDistPerTitik) * 1.10 : 0;

    const btgPipaUtama = totalMeterPipaUtama > 0 ? Math.ceil(totalMeterPipaUtama / 4.0) : 0;
    const btgPipaCabang12 = totalMeterPipaCabang > 0 ? Math.ceil(totalMeterPipaCabang / 4.0) : 0;

    const distBlack = parseNum(distSepticTank) || 0;
    const totalMeterPipaKotor = distBlack > 0 ? distBlack * 1.10 : 0;
    const btgPipaKotor = totalMeterPipaKotor > 0 ? Math.ceil(totalMeterPipaKotor / 4.0) : 0;

    const distGrey = parseNum(distGreyWater) || 0;
    const totalMeterPipaBekas = distGrey > 0 ? distGrey * 1.10 : 0;
    const btgPipaBekas = totalMeterPipaBekas > 0 ? Math.ceil(totalMeterPipaBekas / 4.0) : 0;

    const distVent = parseNum(distPipaVent) || 0;
    const btgPipaVent = distVent > 0 ? Math.ceil(distVent / 4.0) : 0;

    const totalKddKuningan = totalTitikAirBersih;
    const totalFittingTeeElbow = totalTitikAirBersih > 0 ? Math.ceil(totalTitikAirBersih * 2.5) : 0;

    const pPipa12 = parseNum(hargaPipaAW12);
    const pPipa34 = parseNum(hargaPipaAW34);
    const pPipa1 = parseNum(hargaPipaAW1);
    const pPipaD2 = parseNum(hargaPipaD2);
    const pPipaD3 = parseNum(hargaPipaD3);
    const pPipaD4 = parseNum(hargaPipaD4);
    const pKran = parseNum(hargaKranAir);
    const pShower = parseNum(hargaShower);
    const pWastafel = parseNum(hargaWastafelUnit);
    const pClosetD = parseNum(hargaClosetDudukUnit);
    const pClosetJ = parseNum(hargaClosetJongkokUnit);
    const pFD = parseNum(hargaFloorDrainUnit);
    const pBio = parseNum(hargaBiotankUnit);
    const pBK = parseNum(hargaBakKontrolUnit);

    const pricePipaUtama = pipaUtamaDia === '1' ? pPipa1 : pPipa34;
    const pricePipaKotor = diaPipaKotor === '3' ? pPipaD3 : pPipaD4;
    const pricePipaBekas = diaPipaBekas === '3' ? pPipaD3 : pPipaD2;

    const costPipaBersih = (btgPipaUtama * pricePipaUtama) + (btgPipaCabang12 * pPipa12);
    const costPipaKotor = (btgPipaKotor * pricePipaKotor) + (btgPipaVent * pPipaD2);
    const costPipaBekas = btgPipaBekas * pricePipaBekas;
    const costSaniter = (kran * pKran) + (shower * pShower) + (wastafel * pWastafel) + (closetD * pClosetD) + (closetJ * pClosetJ) + (totalFloorDrain * pFD);
    const costSepticBak = (totalCloset > 0 || distBlack > 0 ? pBio : 0) + (totalBakKontrol * pBK);

    const totalEstimasiSanitasi = costPipaBersih + costPipaKotor + costPipaBekas + costSaniter + costSepticBak;

    return {
      totalTitikAirBersih,
      totalCloset,
      totalFloorDrain,
      totalBakKontrol,
      totalMeterPipaUtama,
      totalMeterPipaCabang,
      btgPipaUtama,
      btgPipaCabang12,
      totalMeterPipaKotor,
      btgPipaKotor,
      totalMeterPipaBekas,
      btgPipaBekas,
      btgPipaVent,
      totalKddKuningan,
      totalFittingTeeElbow,
      totalEstimasiSanitasi
    };
  }, [
    pdamTorenDist, pipaUtamaDia, cabangDistPerTitik,
    qtyKranDinding, qtyShower, qtyWastafel, qtyClosetDuduk, qtyClosetJongkok, qtySinkDapur, qtyMesinCuci,
    distSepticTank, diaPipaKotor, distGreyWater, diaPipaBekas, qtyFloorDrain, qtyBakKontrol, distPipaVent,
    hargaPipaAW12, hargaPipaAW34, hargaPipaAW1, hargaPipaD2, hargaPipaD3, hargaPipaD4,
    hargaKranAir, hargaShower, hargaWastafelUnit, hargaClosetDudukUnit, hargaClosetJongkokUnit,
    hargaFloorDrainUnit, hargaBiotankUnit, hargaBakKontrolUnit
  ]);

  /* =========================================================================
   * 📤 DISPATCH KE BOQ DENGAN SINKRONISASI REAL-TIME DRAFT
   * ========================================================================= */
  const handleSendMepToBoQ = () => {
    if (daftarSirkuit.length === 0 && !inSdpLt2 && !inKwhCluster) {
      showToast("Tambahkan minimal satu sirkuit elektrikal terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }

    const mult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
    const clusterSuffix = mult > 1 ? ` [x${mult} Unit Cluster]` : '';

    const itemsToSend = [];
    const pK215 = parseNum(hargaKabel2x15);
    const pK315 = parseNum(hargaKabel3x15);
    const pK325 = parseNum(hargaKabel3x25);
    const pK34 = parseNum(hargaKabel3x4);
    const pKonduit = parseNum(hargaPipaKonduit);
    const pSak1 = parseNum(hargaSaklarTunggal);
    const pSak2 = parseNum(hargaSaklarGanda);
    const pSak3 = parseNum(hargaSaklarTriple);
    const pSK = parseNum(hargaStopKontak);
    const pSKAC = parseNum(hargaStopKontakAC);
    const pFitting = parseNum(hargaFittingLampu);
    const pLED = parseNum(hargaLampuLED);
    const pMcbBox = parseNum(hargaMcbBox);
    const pInbow = parseNum(hargaInbowDus);
    const pTDus = parseNum(hargaTDus);

    // 1. Kabel Listrik
    if (sendKabel) {
      const getKabelConfig = (totalM, basePrice, labelText) => {
        if (kabelSatuanMode === 'roll50') {
          const rolls = Math.ceil(totalM / 50);
          return {
            label: `${labelText} (Roll 50m)${clusterSuffix}`,
            satuan: 'Roll',
            jumlah: rolls,
            harga: basePrice > 0 ? basePrice * 50 : 0
          };
        } else if (kabelSatuanMode === 'roll100') {
          const rolls = Math.ceil(totalM / 100);
          return {
            label: `${labelText} (Roll 100m)${clusterSuffix}`,
            satuan: 'Roll',
            jumlah: rolls,
            harga: basePrice > 0 ? basePrice * 100 : 0
          };
        }
        return {
          label: `${labelText}${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round(totalM),
          harga: basePrice
        };
      };

      if (mepSummary.totalKabel2x15 > 0) {
        const conf = getKabelConfig(mepSummary.totalKabel2x15 * mult, pK215, 'Kabel NYM 2x1.5mm² (Instalasi Penerangan)');
        itemsToSend.push({ category: 'mep', ...conf, source: 'Kalkulator MEP' });
      }
      if (mepSummary.totalKabel3x15 > 0) {
        const conf = getKabelConfig(mepSummary.totalKabel3x15 * mult, pK315, 'Kabel NYM 3x1.5mm² (Instalasi Lampu Grounding)');
        itemsToSend.push({ category: 'mep', ...conf, source: 'Kalkulator MEP' });
      }
      if (mepSummary.totalKabel3x25 > 0) {
        const conf = getKabelConfig(mepSummary.totalKabel3x25 * mult, pK325, 'Kabel NYM 3x2.5mm² (Instalasi Stop Kontak Daya)');
        itemsToSend.push({ category: 'mep', ...conf, source: 'Kalkulator MEP' });
      }
      if (mepSummary.totalKabel3x4 > 0) {
        const conf = getKabelConfig(mepSummary.totalKabel3x4 * mult, pK34, 'Kabel NYM 3x4mm² (Instalasi Khusus / AC / Feeder)');
        itemsToSend.push({ category: 'mep', ...conf, source: 'Kalkulator MEP' });
      }
    }

    // 2. Pipa Konduit
    if (sendKonduit && mepSummary.totalBatangKonduit > 0) {
      itemsToSend.push({
        category: 'mep',
        label: `Pipa Konduit Listrik PVC 20mm (3m)${clusterSuffix}`,
        satuan: 'Batang',
        jumlah: mepSummary.totalBatangKonduit * mult,
        harga: pKonduit,
        source: 'Kalkulator MEP'
      });
    }

    // 3. Saklar & Stop Kontak
    if (sendSaklarSK) {
      if (mepSummary.totalSaklarTunggal > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `Saklar Tunggal${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalSaklarTunggal * mult,
          harga: pSak1,
          source: 'Kalkulator MEP'
        });
      }
      if (mepSummary.totalSaklarGanda > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `Saklar Ganda (Seri)${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalSaklarGanda * mult,
          harga: pSak2,
          source: 'Kalkulator MEP'
        });
      }
      if (mepSummary.totalSaklarTriple > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `Saklar Triple${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalSaklarTriple * mult,
          harga: pSak3,
          source: 'Kalkulator MEP'
        });
      }
      if (mepSummary.totalStopKontak > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `Stop Kontak 1P 10A (Standar)${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalStopKontak * mult,
          harga: pSK,
          source: 'Kalkulator MEP'
        });
      }
      if (mepSummary.totalStopKontakAC > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `Stop Kontak AC / Daya Khusus${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalStopKontakAC * mult,
          harga: pSKAC,
          source: 'Kalkulator MEP'
        });
      }
    }

    // 4. Lampu & Fitting
    if (sendLampu && mepSummary.totalTitikLampu > 0) {
      itemsToSend.push({
        category: 'mep',
        label: `Fitting E27 / Downlight Plafond${clusterSuffix}`,
        satuan: 'Buah',
        jumlah: mepSummary.totalTitikLampu * mult,
        harga: pFitting,
        source: 'Kalkulator MEP'
      });
      itemsToSend.push({
        category: 'mep',
        label: `Lampu LED E27 10 Watt${clusterSuffix}`,
        satuan: 'Buah',
        jumlah: mepSummary.totalTitikLampu * mult,
        harga: pLED,
        source: 'Kalkulator MEP'
      });
    }

    // 5. MCB & Panel Box
    if (sendMcbPanel && mepSummary.totalMcbAll > 0) {
      itemsToSend.push({
        category: 'mep',
        label: `MCB Box + MCB Unit (${mepSummary.totalMcbAll} Group)${clusterSuffix}`,
        satuan: 'Unit',
        jumlah: 1 * mult,
        harga: pMcbBox + (mepSummary.totalMcbAll * parseNum(hargaMcbUnit)),
        source: 'Kalkulator MEP'
      });
    }

    // 6. Inbow & T-Dus
    if (sendDusAksesoris) {
      if (mepSummary.totalInbowDus > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `Inbow Dus Mangkok Saklar / Stop Kontak${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalInbowDus * mult,
          harga: pInbow,
          source: 'Kalkulator MEP'
        });
      }
      if (mepSummary.totalTDus > 0) {
        itemsToSend.push({
          category: 'mep',
          label: `T-Dus / Junction Box Percabangan Listrik${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: mepSummary.totalTDus * mult,
          harga: pTDus,
          source: 'Kalkulator MEP'
        });
      }
    }

    // 7. Tambahan Bertingkat: Sub-Distribution Panel (SDP Lt. 2)
    if (inSdpLt2) {
      itemsToSend.push({
        category: 'mep',
        label: `Sub-Distribution Panel (SDP) Box MCB Lantai 2${clusterSuffix}`,
        satuan: 'Unit',
        jumlah: 1 * mult,
        harga: parseNum(hargaSdp) || 450000,
        source: 'Kalkulator MEP (Bertingkat)'
      });
      itemsToSend.push({
        category: 'mep',
        label: `Kabel Feeder NYM 3x4mm² (MDP ke SDP Lt. 2)${clusterSuffix}`,
        satuan: 'm\'',
        jumlah: 15 * mult,
        harga: parseNum(hargaKabel3x4) || 28500,
        source: 'Kalkulator MEP (Bertingkat)'
      });
    }

    // 8. Tambahan Cluster: KWH Meter PLN
    if (inKwhCluster) {
      itemsToSend.push({
        category: 'mep',
        label: `KWH Meter Prabayar PLN + MCB Pembatas${clusterSuffix}`,
        satuan: 'Unit',
        jumlah: 1 * mult,
        harga: parseNum(hargaKwh) || 1250000,
        source: 'Kalkulator MEP (Cluster)'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu kelompok material MEP dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      // success feedback
    });
  };

  const handleSendSanitasiToBoQ = () => {
    const totalPipaBtg = sanitasiSummary.btgPipaUtama + sanitasiSummary.btgPipaCabang12 + sanitasiSummary.btgPipaKotor + sanitasiSummary.btgPipaBekas + sanitasiSummary.btgPipaVent;
    const totalFixtures = sanitasiSummary.totalTitikAirBersih + sanitasiSummary.totalFloorDrain + sanitasiSummary.totalBakKontrol;
    
    if (totalPipaBtg === 0 && totalFixtures === 0 && !enableRiser && inRoofTank === 'none') {
      showToast("Isi data titik saniter atau pipa terlebih dahulu sebelum mengirim ke BoQ.", "warning");
      return;
    }

    const mult = clusterApplyMode === 'multiplied' ? Math.max(1, clusterUnits || 1) : 1;
    const clusterSuffix = mult > 1 ? ` [x${mult} Unit Cluster]` : '';

    const itemsToSend = [];
    const pPipa12 = parseNum(hargaPipaAW12);
    const pPipa34 = parseNum(hargaPipaAW34);
    const pPipa1 = parseNum(hargaPipaAW1);
    const pPipaD2 = parseNum(hargaPipaD2);
    const pPipaD3 = parseNum(hargaPipaD3);
    const pPipaD4 = parseNum(hargaPipaD4);
    const pKran = parseNum(hargaKranAir);
    const pShower = parseNum(hargaShower);
    const pWastafel = parseNum(hargaWastafelUnit);
    const pClosetD = parseNum(hargaClosetDudukUnit);
    const pClosetJ = parseNum(hargaClosetJongkokUnit);
    const pFD = parseNum(hargaFloorDrainUnit);
    const pBio = parseNum(hargaBiotankUnit);
    const pBK = parseNum(hargaBakKontrolUnit);

    // 1. Pipa Air Bersih
    if (sendPipaAirBersih) {
      if (sanitasiSummary.btgPipaCabang12 > 0) {
        if (pipaSatuanMode === 'batang') {
          itemsToSend.push({
            category: 'sanitasi',
            label: `Pipa PVC AW Dia. 1/2 Inch (15mm) (Batang 4m)${clusterSuffix}`,
            satuan: 'Batang',
            jumlah: sanitasiSummary.btgPipaCabang12 * mult,
            harga: pPipa12,
            source: 'Kalkulator Sanitasi'
          });
        } else {
          itemsToSend.push({
            category: 'sanitasi',
            label: `Pipa PVC AW Dia. 1/2 Inch (15mm) — Cabang Saniter${clusterSuffix}`,
            satuan: 'm\'',
            jumlah: Math.round(sanitasiSummary.totalMeterPipaCabang * mult),
            harga: Math.round(pPipa12 / 4),
            source: 'Kalkulator Sanitasi'
          });
        }
      }
      if (sanitasiSummary.btgPipaUtama > 0) {
        const diaLabel = pipaUtamaDia === '1' ? '1 Inch (25mm)' : '3/4 Inch (20mm)';
        const fullP = pipaUtamaDia === '1' ? pPipa1 : pPipa34;
        if (pipaSatuanMode === 'batang') {
          itemsToSend.push({
            category: 'sanitasi',
            label: `Pipa PVC AW Dia. ${diaLabel} (Batang 4m)${clusterSuffix}`,
            satuan: 'Batang',
            jumlah: sanitasiSummary.btgPipaUtama * mult,
            harga: fullP,
            source: 'Kalkulator Sanitasi'
          });
        } else {
          itemsToSend.push({
            category: 'sanitasi',
            label: `Pipa PVC AW Dia. ${diaLabel} — Distribusi Utama${clusterSuffix}`,
            satuan: 'm\'',
            jumlah: Math.round(sanitasiSummary.totalMeterPipaUtama * mult),
            harga: Math.round(fullP / 4),
            source: 'Kalkulator Sanitasi'
          });
        }
      }
    }

    // 2. Pipa Air Kotor
    if (sendPipaAirKotor && sanitasiSummary.btgPipaKotor > 0) {
      const diaKotorLabel = diaPipaKotor === '3' ? '3 Inch (75mm)' : '4 Inch (100mm)';
      const fullPKotor = diaPipaKotor === '3' ? pPipaD3 : pPipaD4;
      if (pipaSatuanMode === 'batang') {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa PVC AW/D Dia. ${diaKotorLabel} (Batang 4m)${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: sanitasiSummary.btgPipaKotor * mult,
          harga: fullPKotor,
          source: 'Kalkulator Sanitasi'
        });
      } else {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa PVC AW/D Dia. ${diaKotorLabel} — Pembuangan Kloset${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round(sanitasiSummary.totalMeterPipaKotor * mult),
          harga: Math.round(fullPKotor / 4),
          source: 'Kalkulator Sanitasi'
        });
      }
    }

    // 3. Pipa Air Bekas
    if (sendPipaAirBekas && sanitasiSummary.btgPipaBekas > 0) {
      const diaBekasLabel = diaPipaBekas === '3' ? '3 Inch (75mm)' : '2 Inch (50mm)';
      const fullPBekas = diaPipaBekas === '3' ? pPipaD3 : pPipaD2;
      if (pipaSatuanMode === 'batang') {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa PVC D Dia. ${diaBekasLabel} (Batang 4m)${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: sanitasiSummary.btgPipaBekas * mult,
          harga: fullPBekas,
          source: 'Kalkulator Sanitasi'
        });
      } else {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa PVC D Dia. ${diaBekasLabel} — Saluran Air Bekas${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round(sanitasiSummary.totalMeterPipaBekas * mult),
          harga: Math.round(fullPBekas / 4),
          source: 'Kalkulator Sanitasi'
        });
      }
    }

    // 4. Kran & Shower
    if (sendSaniterKran) {
      const kran = parseInt(qtyKranDinding, 10) || 0;
      const shower = parseInt(qtyShower, 10) || 0;
      const fd = parseInt(qtyFloorDrain, 10) || 0;
      if (kran > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Kran Air Standar${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: kran * mult,
          harga: pKran,
          source: 'Kalkulator Sanitasi'
        });
      }
      if (shower > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Shower Mandi + Stop Kran Set${clusterSuffix}`,
          satuan: 'Set',
          jumlah: shower * mult,
          harga: pShower,
          source: 'Kalkulator Sanitasi'
        });
      }
      if (fd > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Floor Drain${clusterSuffix}`,
          satuan: 'Buah',
          jumlah: fd * mult,
          harga: pFD,
          source: 'Kalkulator Sanitasi'
        });
      }
    }

    // 5. Kloset & Wastafel
    if (sendSaniterKloset) {
      const closetD = parseInt(qtyClosetDuduk, 10) || 0;
      const closetJ = parseInt(qtyClosetJongkok, 10) || 0;
      const wastafel = parseInt(qtyWastafel, 10) || 0;
      if (closetD > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Closet Duduk (Standar)${clusterSuffix}`,
          satuan: 'Unit',
          jumlah: closetD * mult,
          harga: pClosetD,
          source: 'Kalkulator Sanitasi'
        });
      }
      if (closetJ > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Closet Jongkok${clusterSuffix}`,
          satuan: 'Unit',
          jumlah: closetJ * mult,
          harga: pClosetJ,
          source: 'Kalkulator Sanitasi'
        });
      }
      if (wastafel > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Wastafel + Aksesoris${clusterSuffix}`,
          satuan: 'Unit',
          jumlah: wastafel * mult,
          harga: pWastafel,
          source: 'Kalkulator Sanitasi'
        });
      }
    }

    // 6. Septic Tank & Bak Kontrol
    if (sendSepticTank) {
      const closetD = parseInt(qtyClosetDuduk, 10) || 0;
      const closetJ = parseInt(qtyClosetJongkok, 10) || 0;
      const distBlack = parseNum(distSepticTank) || 0;
      if (closetD > 0 || closetJ > 0 || distBlack > 0) {
        if (inBiofilType === 'komunal') {
          itemsToSend.push({
            category: 'sanitasi',
            label: `Septictank Biofil Komunal (Kapasitas 3.000–5.000 Liter)`,
            satuan: 'Unit',
            jumlah: 1,
            harga: parseNum(hargaBiotankUnit) ? parseNum(hargaBiotankUnit) * 3 : 7500000,
            source: 'Kalkulator Sanitasi (Biofil Komunal)'
          });
        } else {
          itemsToSend.push({
            category: 'sanitasi',
            label: `Septictank Biofil (Kapasitas Individual 500-800L)${clusterSuffix}`,
            satuan: 'Unit',
            jumlah: 1 * mult,
            harga: pBio || 2500000,
            source: 'Kalkulator Sanitasi'
          });
        }
      }
      if (sanitasiSummary.totalBakKontrol > 0) {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Bak Kontrol Air Kotor (Pas. Bata 40x40cm)${clusterSuffix}`,
          satuan: 'Unit',
          jumlah: sanitasiSummary.totalBakKontrol * mult,
          harga: pBK,
          source: 'Kalkulator Sanitasi'
        });
      }
    }

    // 7. Pipa Riser Vertikal (Antar Lantai Bertingkat)
    if (enableRiser) {
      const riserH = parseNum(inRiserTinggi) || 3.6;
      const shafts = parseInt(inRiserShafts, 10) || 1;
      const riserM = riserH * shafts * mult;

      if (pipaSatuanMode === 'batang') {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Riser Vertikal PVC AW/D 4" (Shaft Tinja) — Batang 4m${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: Math.ceil(riserM / 4),
          harga: pPipaD4 || 220000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Riser Vertikal PVC AW/D 3" (Shaft Bekas) — Batang 4m${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: Math.ceil(riserM / 4),
          harga: pPipaD3 || 152000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Riser Vertikal PVC AW 3/4" (Air Bersih) — Batang 4m${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: Math.ceil(riserM / 4),
          harga: pPipa34 || 72000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Vent Udara PVC 1.5" — Batang 4m${clusterSuffix}`,
          satuan: 'Batang',
          jumlah: Math.ceil(((riserH + 1.0) * shafts * mult) / 4),
          harga: pPipa12 || 56000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
      } else {
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Riser Vertikal PVC AW/D 4" (Shaft Air Kotor Tinja)${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round(riserM),
          harga: Math.round(pPipaD4 / 4) || 55000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Riser Vertikal PVC AW/D 3" (Shaft Air Bekas Mandi)${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round(riserM),
          harga: Math.round(pPipaD3 / 4) || 38000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Riser Vertikal PVC AW 3/4" (Distribusi Air Bersih Toren)${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round(riserM),
          harga: Math.round(pPipa34 / 4) || 18000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
        itemsToSend.push({
          category: 'sanitasi',
          label: `Pipa Vent Udara PVC 1.5" (Pelepas Tekanan Udara)${clusterSuffix}`,
          satuan: 'm\'',
          jumlah: Math.round((riserH + 1.0) * shafts * mult),
          harga: Math.round(pPipa12 / 4) || 14000,
          source: 'Kalkulator Sanitasi (Riser Bertingkat)'
        });
      }
    }

    // 8. Toren Air Atas & Pompa Booster
    if (inRoofTank !== 'none') {
      const torenPrice = inRoofTank === '500' ? 950000 : inRoofTank === '1000' ? 1650000 : 2450000;
      const torenQty = inBiofilType === 'komunal' ? 1 : 1 * mult;
      itemsToSend.push({
        category: 'sanitasi',
        label: `Tangki Air Atas / Toren Polyethylene ${inRoofTank} Liter${clusterSuffix}`,
        satuan: 'Unit',
        jumlah: torenQty,
        harga: parseNum(hargaRoofTank) || torenPrice,
        source: 'Kalkulator Sanitasi (Toren Atas)'
      });
    }

    if (inBoosterPump) {
      const boosterQty = inBiofilType === 'komunal' ? 1 : 1 * mult;
      itemsToSend.push({
        category: 'sanitasi',
        label: `Pompa Pendorong Air Otomatis (Booster Pump 125-200W)${clusterSuffix}`,
        satuan: 'Unit',
        jumlah: boosterQty,
        harga: parseNum(hargaBoosterPump) || 750000,
        source: 'Kalkulator Sanitasi (Booster Pump)'
      });
    }

    if (inRadar) {
      const radarQty = inBiofilType === 'komunal' ? 1 : 1 * mult;
      itemsToSend.push({
        category: 'sanitasi',
        label: `Pelampung Otomatis Radar Tangki Air (Water Level Switch)${clusterSuffix}`,
        satuan: 'Unit',
        jumlah: radarQty,
        harga: parseNum(hargaRadar) || 85000,
        source: 'Kalkulator Sanitasi'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Centang minimal satu kelompok material Sanitasi dengan volume > 0 untuk dikirim.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      // success feedback
    });
  };

  return (
    <div className="space-y-6 pb-28 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-4 sm:p-7 border border-slate-800 shadow-2xl">
        <div className={`absolute -top-24 -right-24 w-72 sm:w-80 h-72 sm:h-80 ${activeMode === 'mep' ? 'bg-amber-500/15' : 'bg-sky-500/15'} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full ${activeMode === 'mep' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'} text-[11px] sm:text-xs font-mono font-bold tracking-wide truncate`}>
              {activeMode === 'mep' ? <Zap className="w-3.5 h-3.5 shrink-0" /> : <Droplets className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{activeMode === 'mep' ? 'ELECTRICAL & MEP TOPOLOGY' : 'PLUMBING & SANITATION'}</span>
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
              {activeMode === 'mep' ? 'Kalkulator Elektrikal (MEP)' : 'Kalkulator Plumbing & Sanitasi'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1 sm:mt-1.5">
              {activeMode === 'mep'
                ? 'Kebutuhan kabel & pipa konduit dihitung dari topologi titik ke panel (feeder + span + dropper vertikal) secara akurat.'
                : 'Dihitung dari panjang jalur jaringan pipa (air bersih, kotor, bekas), titik saniter, dan jarak ke septic tank/biofil.'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-3xl border border-paper-300 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMode('mep')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-heading font-bold text-xs sm:text-sm uppercase tracking-wide transition-all ${
            activeMode === 'mep'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
              : 'text-paper-700 hover:bg-paper-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. Kalkulator Elektrikal (MEP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('sanitasi')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-heading font-bold text-xs sm:text-sm uppercase tracking-wide transition-all ${
            activeMode === 'sanitasi'
              ? 'bg-sky-700 text-white shadow-md shadow-sky-950/30'
              : 'text-paper-700 hover:bg-paper-100'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>2. Kalkulator Plumbing & Sanitasi</span>
        </button>
      </div>

      {/* REUSABLE CLUSTER MULTIPLIER TOOLBAR */}
      <ClusterMultiplierBar 
        multiplier={clusterUnits}
        onChange={updateClusterUnits}
        applyMode={clusterApplyMode}
        onToggleApplyMode={setClusterApplyMode}
        unitLabel="Unit Instalasi / Kavling"
      />

      {/* =========================================================================
       * ⚡ VIEW MODE A: ELEKTRIKAL & MEP
       * ========================================================================= */}
      {activeMode === 'mep' && (
        <div className="space-y-6 animate-fadeIn">
          


          {/* =========================================================================
           * 📐 GAMBAR PENJELAS PARAMETER TOPOLOGI ELEKTRIKAL (STATIC STATIS NON-RESPONSIF)
           * ========================================================================= */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
              <div>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                  Panduan Visual Parameter Topologi Listrik
                </h2>
                <p className="text-xs text-paper-600">
                  Gambar ilustrasi statis penjelas istilah Feeder, Span, dan Dropper vertikal pada instalasi kabel & pipa konduit.
                </p>
              </div>
            </div>

            {/* Static Clean Vector Illustration (Non-responsive / static reference diagram) */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-white overflow-x-auto custom-scrollbar">
              <svg viewBox="0 0 960 330" className="w-full min-w-[760px] h-auto font-sans" xmlns="http://www.w3.org/2000/svg">
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="mepStaticGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="960" height="330" fill="#090d16" rx="12" />
                <rect width="960" height="330" fill="url(#mepStaticGrid)" rx="12" />

                {/* Ceiling & Floor Structural Guide Lines */}
                <line x1="30" y1="75" x2="930" y2="75" stroke="#334155" strokeWidth="2" strokeDasharray="8 4" />
                <text x="35" y="68" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold">RANGKA / GARIS PLAFOND (CEILING LEVEL)</text>
                
                <line x1="30" y1="285" x2="930" y2="285" stroke="#334155" strokeWidth="2" />
                <text x="35" y="305" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold">LANTAI UTAMA (FLOOR LEVEL)</text>

                {/* Left Wall */}
                <rect x="30" y="70" width="16" height="215" fill="#1e293b" stroke="#334155" />

                {/* ========================================================
                 * 1. TOP DIMENSION BADGES (ABOVE CEILING LINE)
                 * ======================================================== */}
                
                {/* ① FEEDER (Panel -> T-1) */}
                <line x1="78" y1="36" x2="292" y2="36" stroke="#fbbf24" strokeWidth="1.5" />
                <circle cx="78" cy="36" r="3" fill="#fbbf24" />
                <circle cx="292" cy="36" r="3" fill="#fbbf24" />
                <rect x="105" y="24" width="160" height="24" rx="6" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="185" y="40" fill="#fef08a" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ① Feeder: mis. 8.0 m
                </text>

                {/* ② SPAN 1 (T-1 -> T-2) */}
                <line x1="308" y1="36" x2="542" y2="36" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="308" cy="36" r="3" fill="#38bdf8" />
                <circle cx="542" cy="36" r="3" fill="#38bdf8" />
                <rect x="345" y="24" width="160" height="24" rx="6" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="425" y="40" fill="#e0f2fe" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ② Span: mis. 3.5 m
                </text>

                {/* SPAN 2 (T-2 -> T-3) */}
                <line x1="558" y1="36" x2="792" y2="36" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                <circle cx="558" cy="36" r="3" fill="#38bdf8" />
                <circle cx="792" cy="36" r="3" fill="#38bdf8" />
                <rect x="595" y="24" width="160" height="24" rx="6" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="675" y="40" fill="#e0f2fe" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  Span Antar Titik: 3.5 m
                </text>

                {/* ========================================================
                 * 2. MAIN HORIZONTAL CONDUIT RUN (ON CEILING Y=75)
                 * ======================================================== */}
                {/* Feeder line from Panel to T-1 */}
                <path d="M 75 140 L 75 75 L 300 75" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
                
                {/* Span line T-1 to T-2 */}
                <path d="M 300 75 L 550 75" fill="none" stroke="#f59e0b" strokeWidth="3.5" />

                {/* Span line T-2 to T-3 */}
                <path d="M 550 75 L 800 75" fill="none" stroke="#f59e0b" strokeWidth="3.5" />

                {/* ========================================================
                 * 3. LEFT ITEM: PANEL MCB INDUK (X = 46..104, Y = 140..220)
                 * ======================================================== */}
                <rect x="46" y="140" width="58" height="80" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                <rect x="55" y="150" width="40" height="26" rx="4" fill="#78350f" stroke="#fbbf24" strokeWidth="1" />
                <text x="75" y="167" fill="#fef08a" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">MCB</text>
                <text x="75" y="190" fill="#f1f5f9" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">PANEL INDUK</text>
                <text x="75" y="204" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">(Sumber Daya)</text>

                {/* ========================================================
                 * 4. TITIK 1: LAMPU PLAFOND (X = 300)
                 * ======================================================== */}
                {/* T-Dus #1 Node */}
                <circle cx="300" cy="75" r="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="300" y="79" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">T-1</text>

                {/* Downlight Fixture under T-1 */}
                <path d="M 300 88 L 300 100" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <path d="M 282 100 L 318 100 L 326 120 L 274 120 Z" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
                <circle cx="300" cy="120" r="10" fill="#fef08a" />
                <text x="300" y="124" fill="#78350f" fontSize="11" textAnchor="middle">💡</text>

                {/* Titik Lampu Label Card */}
                <rect x="235" y="145" width="130" height="34" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                <text x="300" y="160" fill="#fef08a" fontSize="10" fontWeight="bold" textAnchor="middle">TITIK LAMPU 1</text>
                <text x="300" y="172" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">Di Rangka Plafond</text>

                {/* ========================================================
                 * 5. TITIK 2: SAKLAR DINDING (X = 550)
                 * ======================================================== */}
                {/* T-Dus #2 Node */}
                <circle cx="550" cy="75" r="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="550" y="79" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">T-2</text>

                {/* Dropper Saklar Vertical Conduit */}
                <path d="M 550 88 L 550 175" fill="none" stroke="#818cf8" strokeWidth="3" strokeDasharray="5 3" />
                
                {/* Drop Saklar Dimension Leader & Pill Badge */}
                <line x1="565" y1="90" x2="565" y2="170" stroke="#818cf8" strokeWidth="1.5" />
                <circle cx="565" cy="90" r="2.5" fill="#818cf8" />
                <circle cx="565" cy="170" r="2.5" fill="#818cf8" />
                <rect x="575" y="118" width="145" height="24" rx="6" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
                <text x="647" y="134" fill="#e0e7ff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ③ Drop Saklar: 1.5 m
                </text>

                {/* Saklar Wall Switch Box */}
                <rect x="532" y="175" width="36" height="46" rx="6" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                <rect x="542" y="184" width="16" height="26" rx="3" fill="#6366f1" />
                <circle cx="550" cy="192" r="3" fill="#ffffff" />
                <text x="550" y="236" fill="#c7d2fe" fontSize="10" fontWeight="bold" textAnchor="middle">🔘 SAKLAR DINDING</text>
                <text x="550" y="248" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">(Tinggi 1.5m dr lantai)</text>

                {/* ========================================================
                 * 6. TITIK 3: STOP KONTAK BAWAH (X = 800)
                 * ======================================================== */}
                {/* T-Dus #3 Node */}
                <circle cx="800" cy="75" r="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="800" y="79" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">T-3</text>

                {/* Dropper Stop Kontak Vertical Conduit */}
                <path d="M 800 88 L 800 240" fill="none" stroke="#34d399" strokeWidth="3" strokeDasharray="5 3" />

                {/* Drop Stop Kontak Dimension Leader & Pill Badge */}
                <line x1="815" y1="90" x2="815" y2="235" stroke="#34d399" strokeWidth="1.5" />
                <circle cx="815" cy="90" r="2.5" fill="#34d399" />
                <circle cx="815" cy="235" r="2.5" fill="#34d399" />
                <rect x="825" y="145" width="125" height="24" rx="6" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
                <text x="887" y="161" fill="#d1fae5" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ④ Drop SK: 2.5 m
                </text>

                {/* Stop Kontak Outlet Box */}
                <rect x="782" y="240" width="36" height="36" rx="6" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
                <circle cx="793" cy="258" r="3.5" fill="#a7f3d0" />
                <circle cx="807" cy="258" r="3.5" fill="#a7f3d0" />
                <text x="800" y="290" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">🔌 STOP KONTAK</text>
                <text x="800" y="302" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">(Tinggi 30-50cm dr lantai)</text>
              </svg>
            </div>

            {/* 3 Parameter Explanations Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="font-mono font-bold text-amber-900 text-xs block mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-amber-600 text-white flex items-center justify-center text-[10px]">①</span>
                  Jarak Feeder (Home-Run)
                </span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Jarak kabel dari <b>Box MCB Induk</b> menuju titik percabangan (T-Dus #1) pertama di atas plafond (mis. 8.0 m).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                <span className="font-mono font-bold text-sky-900 text-xs block mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-sky-600 text-white flex items-center justify-center text-[10px]">②</span>
                  Jarak Span (Looping Antar Titik)
                </span>
                <p className="text-sky-800 text-[11px] leading-relaxed">
                  Jarak bentang mendatar di atas plafond dari T-1 ke T-2, T-3, dst. (mis. 3.5 m).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="font-mono font-bold text-indigo-900 text-xs block mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">③/④</span>
                  Drop Turun Saklar & Stop Kontak
                </span>
                <p className="text-indigo-800 text-[11px] leading-relaxed">
                  Panjang kabel vertikal dari T-Dus plafond ke saklar (1.5 m) dan ke stop kontak dinding bawah (2.5 m).
                </p>
              </div>
            </div>
          </div>

          {/* KONFIGURASI BERTINGKAT & CLUSTER ELEKTRIKAL */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">
                <Building className="w-3.5 h-3.5" />
              </span>
              <div>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                  Opsi Khusus: Bangunan Bertingkat & Cluster Multi-Unit
                </h2>
                <p className="text-xs text-paper-600">
                  Sub-Panel Lantai 2 (SDP), kabel feeder vertikal, dan KWH Meter PLN per pintu kontrakan / unit kavling.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Opsi 1: SDP Lantai 2 */}
              <div className={`p-4 rounded-xl border transition-all ${inSdpLt2 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inSdpLt2}
                    onChange={e => setInSdpLt2(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      🏢 Sub-Distribution Panel (SDP Lantai 2)
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tambahkan 1 unit Box Panel pembagi di Lantai 2 + 15 meter kabel feeder NYM 3x4mm² dari panel induk (MDP Lt. 1).
                    </p>
                  </div>
                </label>
              </div>

              {/* Opsi 2: KWH Meter PLN Cluster */}
              <div className={`p-4 rounded-xl border transition-all ${inKwhCluster ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inKwhCluster}
                    onChange={e => setInKwhCluster(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      ⚡ KWH Meter PLN Mandiri per Unit
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Ideal untuk kontrakan/kost/cluster: 1 KWH meter prabayar per pintu unit (dikalikan otomatis dengan jumlah unit cluster).
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 01. INPUT GRUP SIRKUIT LISTRIK */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Konfigurasi Grup Sirkuit Listrik (Grup Panel MCB)
              </h2>
            </div>
            <p className="text-xs text-paper-600 mb-4 ml-8.5">
              Tentukan jarak dari Box Panel ke titik awal (Feeder), jarak antar titik (Span), dan jumlah titik saklar/stop kontak pada sirkuit tersebut.
            </p>

            <form onSubmit={handleAddSirkuit} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1 font-semibold">Nama / Kode Sirkuit</label>
                  <input
                    type="text"
                    value={cNama}
                    onChange={e => setCNama(e.target.value)}
                    placeholder="mis. Grup 1: Penerangan Lt 1"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1 font-semibold">Jenis Kabel Sirkuit</label>
                  <select
                    value={cJenisKabel}
                    onChange={e => setCJenisKabel(e.target.value)}
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  >
                    <option value="nym_2x1.5">NYM 2x1.5 mm² (Lampu Standar)</option>
                    <option value="nym_3x1.5">NYM 3x1.5 mm² (Lampu + Arde)</option>
                    <option value="nym_3x2.5">NYM 3x2.5 mm² (Stop Kontak Standar)</option>
                    <option value="nym_3x4">NYM 3x4 mm² (AC / Daya Besar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1 font-semibold">Kapasitas MCB</label>
                  <select
                    value={cMcbAmp}
                    onChange={e => setCMcbAmp(e.target.value)}
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  >
                    <option value="6">MCB 1P 6 Ampere (1.300 VA)</option>
                    <option value="10">MCB 1P 10 Ampere (2.200 VA)</option>
                    <option value="16">MCB 1P 16 Ampere (3.500 VA)</option>
                    <option value="20">MCB 1P 20 Ampere (4.400 VA)</option>
                  </select>
                </div>
              </div>

              {/* Topologi Parameter */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono p-3 bg-white rounded-xl border border-amber-200">
                <div>
                  <label className="block text-[10px] text-amber-900 uppercase mb-1 font-bold">
                    Jarak dari Panel (Feeder)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={cFeederDist}
                      onChange={e => setCFeederDist(e.target.value)}
                      placeholder="mis. 8"
                      className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                    />
                    <span className="text-[11px] text-paper-500">m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-amber-900 uppercase mb-1 font-bold">
                    Jarak Antar Titik (Span)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={cSpanDist}
                      onChange={e => setCSpanDist(e.target.value)}
                      placeholder="mis. 3.5"
                      className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                    />
                    <span className="text-[11px] text-paper-500">m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">
                    Drop Turun Saklar
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={cDropSaklar}
                      onChange={e => setCDropSaklar(e.target.value)}
                      placeholder="mis. 1.5"
                      className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                    />
                    <span className="text-[11px] text-paper-500">m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">
                    Drop Turun Stop Kontak
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={cDropSK}
                      onChange={e => setCDropSK(e.target.value)}
                      placeholder="mis. 2.5"
                      className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                    />
                    <span className="text-[11px] text-paper-500">m</span>
                  </div>
                </div>
              </div>

              {/* Titik Beban pada Grup ini */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Titik Lampu</label>
                  <input
                    type="number"
                    min="0"
                    value={cTitikLampu}
                    onChange={e => setCTitikLampu(e.target.value)}
                    placeholder="mis. 6"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Saklar Tunggal</label>
                  <input
                    type="number"
                    min="0"
                    value={cTitikSaklarTunggal}
                    onChange={e => setCTitikSaklarTunggal(e.target.value)}
                    placeholder="mis. 3"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Saklar Ganda</label>
                  <input
                    type="number"
                    min="0"
                    value={cTitikSaklarGanda}
                    onChange={e => setCTitikSaklarGanda(e.target.value)}
                    placeholder="mis. 1"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Saklar Triple</label>
                  <input
                    type="number"
                    min="0"
                    value={cTitikSaklarTriple}
                    onChange={e => setCTitikSaklarTriple(e.target.value)}
                    placeholder="mis. 0"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">Stop Kontak</label>
                  <input
                    type="number"
                    min="0"
                    value={cTitikStopKontak}
                    onChange={e => setCTitikStopKontak(e.target.value)}
                    placeholder="mis. 4"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-paper-600 uppercase mb-1">SK Khusus / AC</label>
                  <input
                    type="number"
                    min="0"
                    value={cTitikStopKontakAC}
                    onChange={e => setCTitikStopKontakAC(e.target.value)}
                    placeholder="mis. 0"
                    className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-display font-semibold text-xs shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  + Tambah Grup Sirkuit ke Daftar
                </button>

                <div className="text-[11px] text-amber-900/80 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Panjang kabel dihitung otomatis termasuk waste standar 10%.</span>
                </div>
              </div>
            </form>

            {/* Circuit Table */}
            <div className="mt-5 border-t border-paper-200 pt-4 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-paper-300 text-paper-600 text-[11px] uppercase">
                    <th className="py-2 px-3 font-sans">Grup Sirkuit</th>
                    <th className="py-2 px-3">Jenis Kabel</th>
                    <th className="py-2 px-3">MCB</th>
                    <th className="py-2 px-3">Panjang Kabel</th>
                    <th className="py-2 px-3">Konduit</th>
                    <th className="py-2 px-3">Titik Beban</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {daftarSirkuit.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-paper-500 font-sans italic">
                        Belum ada sirkuit listrik ditambahkan. Gunakan formulir di atas untuk menambahkan grup sirkuit.
                      </td>
                    </tr>
                  ) : (
                    daftarSirkuit.map(c => (
                      <tr key={c.id} className="hover:bg-paper-50">
                        <td className="py-2.5 px-3 font-sans font-bold text-paper-900">
                          {c.nama}
                        </td>
                        <td className="py-2.5 px-3 text-amber-900 font-semibold uppercase">
                          {c.jenisKabel.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-paper-700 font-bold">
                          {c.mcbAmp} A
                        </td>
                        <td className="py-2.5 px-3 text-amber-950 font-bold">
                          {formatNumber(c.panjangKabelRaw, 1)} m
                        </td>
                        <td className="py-2.5 px-3 text-paper-700 font-mono">
                          {Math.ceil(c.panjangKabelRaw / 3.0)} btg
                        </td>
                        <td className="py-2.5 px-3 text-paper-700">
                          {c.titikLampu > 0 && <span>{c.titikLampu} Lampu </span>}
                          {(c.titikSaklarTunggal + c.titikSaklarGanda + c.titikSaklarTriple) > 0 && (
                            <span>· {c.titikSaklarTunggal + c.titikSaklarGanda + c.titikSaklarTriple} Saklar </span>
                          )}
                          {(c.titikStopKontak + c.titikStopKontakAC) > 0 && (
                            <span>· {c.titikStopKontak + c.titikStopKontakAC} SK</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSirkuit(c.id)}
                            className="p-1 text-paper-400 hover:text-red-600"
                            title="Hapus sirkuit ini"
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

          {/* 02. REKAPITULASI MATERIAL ELEKTRIKAL */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Rekapitulasi Kebutuhan Material Elektrikal (MEP)
              </h2>
            </div>

            {daftarSirkuit.length === 0 ? (
              <p className="text-xs text-paper-500 font-sans italic py-4 text-center">
                Tambahkan minimal satu grup sirkuit listrik di atas untuk melihat rekapitulasi kebutuhan bahan.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold block">
                    Total Panjang Kabel
                  </span>
                  <span className="font-heading text-2xl font-bold text-amber-950 block mt-1">
                    {formatNumber(mepSummary.totalKabelAll, 1)} m
                  </span>
                  <p className="text-[11px] text-amber-800 font-mono mt-1">
                    ≈ {Math.ceil(mepSummary.totalKabelAll / 50)} roll (@50m)
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200 mt-2">
                    Termasuk waste 10%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                    Pipa Konduit PVC 20mm
                  </span>
                  <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                    {mepSummary.totalBatangKonduit} btg
                  </span>
                  <p className="text-[11px] text-paper-600 font-mono mt-1">
                    Total {formatNumber(mepSummary.totalKabelAll, 0)} m konduit
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                    Standar batang 3.0 m
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                    Saklar & Stop Kontak
                  </span>
                  <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                    {mepSummary.totalInbowDus} unit
                  </span>
                  <p className="text-[11px] text-paper-600 font-mono mt-1">
                    + {mepSummary.totalTDus} T-Dus percabangan
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                    {mepSummary.totalInbowDus} Inbow dus tanam
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                    Panel Box & MCB
                  </span>
                  <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                    {mepSummary.totalMcbAll} MCB
                  </span>
                  <p className="text-[11px] text-paper-600 font-mono mt-1">
                    1 Box + {mepSummary.totalMcbGrup} Grup + 1 Utama
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                    MCB Box 4-8 Group
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 03. HARGA SATUAN BAHAN MEP */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
                <span>Harga Satuan Bahan Elektrikal (MEP)</span>
                <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
                  opsional untuk diisi (default 0)
                </span>
              </h2>
            </div>
            <p className="text-xs text-paper-600 mb-4 ml-8.5">
              Isi estimasi harga satuan per meter / batang / buah untuk menghitung anggaran material MEP.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kabel 2x1.5 (Rp/m)</label>
                <input
                  type="number"
                  value={hargaKabel2x15}
                  onChange={e => setHargaKabel2x15(e.target.value)}
                  placeholder="8900"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kabel 3x1.5 (Rp/m)</label>
                <input
                  type="number"
                  value={hargaKabel3x15}
                  onChange={e => setHargaKabel3x15(e.target.value)}
                  placeholder="12500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kabel 3x2.5 (Rp/m)</label>
                <input
                  type="number"
                  value={hargaKabel3x25}
                  onChange={e => setHargaKabel3x25(e.target.value)}
                  placeholder="18900"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kabel 3x4 Feeder (Rp/m)</label>
                <input
                  type="number"
                  value={hargaKabel3x4}
                  onChange={e => setHargaKabel3x4(e.target.value)}
                  placeholder="28500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa Konduit (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaKonduit}
                  onChange={e => setHargaPipaKonduit(e.target.value)}
                  placeholder="11000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Saklar Tunggal (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaSaklarTunggal}
                  onChange={e => setHargaSaklarTunggal(e.target.value)}
                  placeholder="17500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Saklar Ganda (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaSaklarGanda}
                  onChange={e => setHargaSaklarGanda(e.target.value)}
                  placeholder="23500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Saklar Triple (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaSaklarTriple}
                  onChange={e => setHargaSaklarTriple(e.target.value)}
                  placeholder="29500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Stop Kontak (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaStopKontak}
                  onChange={e => setHargaStopKontak(e.target.value)}
                  placeholder="19500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Stop Kontak AC (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaStopKontakAC}
                  onChange={e => setHargaStopKontakAC(e.target.value)}
                  placeholder="38000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Fitting Downlight (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaFittingLampu}
                  onChange={e => setHargaFittingLampu(e.target.value)}
                  placeholder="22000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Lampu LED 10W (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaLampuLED}
                  onChange={e => setHargaLampuLED(e.target.value)}
                  placeholder="28000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Box MCB Pre-Wired (Rp)</label>
                <input
                  type="number"
                  value={hargaMcbBox}
                  onChange={e => setHargaMcbBox(e.target.value)}
                  placeholder="145000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">MCB Unit / Group (Rp)</label>
                <input
                  type="number"
                  value={hargaMcbUnit}
                  onChange={e => setHargaMcbUnit(e.target.value)}
                  placeholder="65000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Inbow Dus (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaInbowDus}
                  onChange={e => setHargaInbowDus(e.target.value)}
                  placeholder="4500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">T-Dus Cabang (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaTDus}
                  onChange={e => setHargaTDus(e.target.value)}
                  placeholder="5500"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">SDP Box Lt.2 (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaSdp}
                  onChange={e => setHargaSdp(e.target.value)}
                  placeholder="450000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">KWH Meter PLN (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaKwh}
                  onChange={e => setHargaKwh(e.target.value)}
                  placeholder="1250000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>
            </div>

            {mepSummary.totalEstimasiMep > 0 && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-mono">
                <span className="text-xs font-semibold text-emerald-900 font-sans">Estimasi Total Biaya Material Elektrikal (MEP):</span>
                <span className="font-heading text-lg font-bold text-emerald-800">
                  Rp {formatNumber(mepSummary.totalEstimasiMep, 0)}
                </span>
              </div>
            )}
          </div>

          {/* 04. KIRIM HASIL MEP KE BOQ */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-400 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-amber-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-amber-950">
                Kirim Hasil ke BoQ (Kategori MEP)
              </h2>
            </div>
            <p className="text-xs text-amber-900/80 mb-4 ml-8.5">
              Item yang dicentang akan dikirim ke antrian BoQ kategori <b>Pekerjaan MEP</b> secara akumulatif.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-4 rounded-xl border border-amber-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendKabel}
                  onChange={e => setSendKabel(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>
                  Kabel Listrik NYM — <b className="font-mono text-amber-950">
                    {kabelSatuanMode === 'roll50'
                      ? `${Math.ceil(mepSummary.totalKabelAll / 50)} Roll (@50m) [${formatNumber(mepSummary.totalKabelAll, 0)}m]`
                      : kabelSatuanMode === 'roll100'
                      ? `${Math.ceil(mepSummary.totalKabelAll / 100)} Roll (@100m) [${formatNumber(mepSummary.totalKabelAll, 0)}m]`
                      : `${formatNumber(mepSummary.totalKabelAll, 0)} meter`}
                  </b>
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendKonduit}
                  onChange={e => setSendKonduit(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>Pipa Konduit PVC 20mm — <b className="font-mono text-amber-950">{mepSummary.totalBatangKonduit} batang</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendSaklarSK}
                  onChange={e => setSendSaklarSK(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>Saklar & Stop Kontak — <b className="font-mono text-amber-950">{mepSummary.totalInbowDus} buah</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendLampu}
                  onChange={e => setSendLampu(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>Fitting & Lampu LED 10W — <b className="font-mono text-amber-950">{mepSummary.totalTitikLampu} buah</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendMcbPanel}
                  onChange={e => setSendMcbPanel(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>MCB Box + MCB Unit — <b className="font-mono text-amber-950">{mepSummary.totalMcbAll} MCB</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendDusAksesoris}
                  onChange={e => setSendDusAksesoris(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>Inbow Dus & T-Dus — <b className="font-mono text-amber-950">{mepSummary.totalInbowDus + mepSummary.totalTDus} buah</b></span>
              </label>
            </div>

            {/* Selector Satuan Pasaran Kabel */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs">
              <span className="font-bold text-amber-950 font-mono">Satuan Jual Kabel ke BoQ:</span>
              <div className="inline-flex rounded-lg bg-white p-0.5 border border-amber-300 text-xs">
                <button
                  type="button"
                  onClick={() => setKabelSatuanMode('meter')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${kabelSatuanMode === 'meter' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'}`}
                >
                  Meter (m) — Eceran
                </button>
                <button
                  type="button"
                  onClick={() => setKabelSatuanMode('roll50')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${kabelSatuanMode === 'roll50' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'}`}
                >
                  Roll (50m) — Kemasan Toko
                </button>
                <button
                  type="button"
                  onClick={() => setKabelSatuanMode('roll100')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${kabelSatuanMode === 'roll100' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'}`}
                >
                  Roll (100m)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendMepToBoQ}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-display font-semibold text-xs shadow-md shadow-amber-950/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Send className="w-4 h-4" />
              Kirim Material MEP ke BoQ
            </button>
          </div>

        </div>
      )}

      {/* =========================================================================
       * 💧 VIEW MODE B: PLUMBING & SANITASI
       * ========================================================================= */}
      {activeMode === 'sanitasi' && (
        <div className="space-y-6 animate-fadeIn">
          


          {/* =========================================================================
           * 📐 GAMBAR PENJELAS PARAMETER PLUMBING & SANITASI (STATIC SVG TECHNICAL DIAGRAM)
           * ========================================================================= */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-sky-700 text-white font-mono text-xs font-bold flex items-center justify-center">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
              <div>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                  Panduan Visual Jaringan Pipa & Sanitasi
                </h2>
                <p className="text-xs text-paper-600">
                  Gambar penjelas skema distribusi air bersih dan saluran pembuangan air kotor/bekas.
                </p>
              </div>
            </div>

            {/* Static Clean Plumbing Schematic Diagram */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-white overflow-x-auto custom-scrollbar">
              <svg viewBox="0 0 820 250" className="w-full min-w-[680px] h-auto font-sans" xmlns="http://www.w3.org/2000/svg">
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="sanitasiStaticGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="820" height="250" fill="#090d16" />
                <rect width="820" height="250" fill="url(#sanitasiStaticGrid)" />

                {/* 1. Tandon Air Bersih / Sumber */}
                <rect x="50" y="30" width="50" height="60" rx="8" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
                <text x="75" y="60" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">TANDON</text>
                <text x="75" y="72" fill="#7dd3fc" fontSize="8" fontFamily="monospace" textAnchor="middle">TOREN AIR</text>

                {/* Pipa Utama Air Bersih */}
                <path d="M 100 60 L 320 60" fill="none" stroke="#38bdf8" strokeWidth="3.5" />
                <rect x="150" y="40" width="130" height="18" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
                <text x="215" y="53" fill="#e0f2fe" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">① Pipa Utama AW 3/4" / 1"</text>

                {/* Cabang Saniter Air Bersih */}
                <path d="M 320 60 L 320 120" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                <path d="M 320 60 L 520 60" fill="none" stroke="#38bdf8" strokeWidth="3" />
                <path d="M 520 60 L 520 120" fill="none" stroke="#38bdf8" strokeWidth="2.5" />

                <rect x="360" y="45" width="120" height="18" rx="4" fill="#075985" stroke="#7dd3fc" strokeWidth="1" />
                <text x="420" y="58" fill="#e0f2fe" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">② Cabang AW 1/2"</text>

                {/* Fixture Kran & Shower */}
                <circle cx="320" cy="130" r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="320" y="134" fill="#ffffff" fontSize="10" textAnchor="middle">🚿</text>
                <text x="320" y="156" fill="#7dd3fc" fontSize="9" fontWeight="bold" textAnchor="middle">Shower/Kran</text>

                {/* Fixture Kloset */}
                <circle cx="520" cy="130" r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="520" y="134" fill="#ffffff" fontSize="10" textAnchor="middle">🚽</text>
                <text x="520" y="156" fill="#7dd3fc" fontSize="9" fontWeight="bold" textAnchor="middle">Kloset</text>

                {/* Saluran Air Kotor (Pipa 4" dr Kloset -> Septic Tank) */}
                <path d="M 520 165 L 520 200 L 730 200" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="6 3" />
                <rect x="560" y="185" width="135" height="18" rx="4" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
                <text x="627" y="198" fill="#fef08a" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">③ Pipa Air Kotor 4" (Slope)</text>

                {/* Septic Tank / Biofil Unit */}
                <rect x="730" y="170" width="60" height="55" rx="6" fill="#451a03" stroke="#f59e0b" strokeWidth="2" />
                <text x="760" y="195" fill="#fef08a" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">SEPTIC</text>
                <text x="760" y="208" fill="#fed7aa" fontSize="8" fontFamily="monospace" textAnchor="middle">TANK BIO</text>

                {/* Saluran Air Bekas (Floor Drain -> Bak Kontrol) */}
                <path d="M 320 165 L 320 220 L 460 220" fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="4 2" />
                <rect x="345" y="210" width="95" height="18" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                <text x="392" y="223" fill="#f1f5f9" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">④ Pipa Bekas 2"/3"</text>

                {/* Bak Kontrol Unit */}
                <rect x="460" y="205" width="35" height="30" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="477" y="224" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle">BAK</text>
              </svg>
            </div>

            {/* 3 Parameter Explanations Cards for Sanitasi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                <span className="font-mono font-bold text-sky-900 text-[11px] block mb-1">
                  ① Pipa Utama vs Cabang Air Bersih
                </span>
                <p className="text-sky-800 text-[11px] leading-relaxed">
                  Pipa utama (3/4" atau 1") menyalurkan air dari tandon, lalu dibagi melalui cabang 1/2" ke tiap kran/shower.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="font-mono font-bold text-amber-900 text-[11px] block mb-1">
                  ② Pipa Air Kotor 4" (Black Water)
                </span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Pipa buangan feses dari kloset langsung menuju septic tank dengan kemiringan (slope) standar 1-2%.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-300">
                <span className="font-mono font-bold text-slate-900 text-[11px] block mb-1">
                  ③ Pipa Air Bekas 2"/3" & Bak Kontrol
                </span>
                <p className="text-slate-800 text-[11px] leading-relaxed">
                  Saluran air buangan sabun dari floor drain dan wastafel dialirkan menuju bak kontrol sebelum ke drainase kota.
                </p>
              </div>
            </div>
          </div>

          {/* 01. JARINGAN AIR BERSIH & TITIK SANITER */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-sky-700 text-white font-mono text-xs font-bold flex items-center justify-center">01</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Jaringan Pipa Air Bersih & Titik Saniter
              </h2>
            </div>
            <p className="text-xs text-paper-600 mb-4 ml-8.5">
              Tentukan jarak dari tandon/sumber air ke area kamar mandi, dan jumlah titik kran/shower/kloset.
            </p>

            {/* Jalur Air Bersih Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono p-4 rounded-xl bg-sky-50/60 border border-sky-200 mb-4">
              <div>
                <label className="block text-[10px] text-sky-900 uppercase mb-1 font-bold">
                  Jarak Jalur Utama dari Tandon/PDAM (m)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={pdamTorenDist}
                  onChange={e => setPdamTorenDist(e.target.value)}
                  placeholder="mis. 15"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-sky-900 uppercase mb-1 font-bold">
                  Diameter Pipa Utama
                </label>
                <select
                  value={pipaUtamaDia}
                  onChange={e => setPipaUtamaDia(e.target.value)}
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                >
                  <option value="3/4">PVC AW 3/4 Inch (20mm) — Standar</option>
                  <option value="1">PVC AW 1 Inch (25mm) — Debit Tinggi</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-sky-900 uppercase mb-1 font-bold">
                  Rata-rata Cabang 1/2" per Titik (m)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={cabangDistPerTitik}
                  onChange={e => setCabangDistPerTitik(e.target.value)}
                  placeholder="mis. 2.5"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
            </div>

            {/* Fixture Saniter Inputs */}
            <span className="text-xs font-mono font-bold uppercase text-paper-700 block mb-2">
              Jumlah Titik Fixture Saniter:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kran Dinding</label>
                <input
                  type="number"
                  min="0"
                  value={qtyKranDinding}
                  onChange={e => setQtyKranDinding(e.target.value)}
                  placeholder="mis. 3"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Shower Set</label>
                <input
                  type="number"
                  min="0"
                  value={qtyShower}
                  onChange={e => setQtyShower(e.target.value)}
                  placeholder="mis. 2"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Wastafel</label>
                <input
                  type="number"
                  min="0"
                  value={qtyWastafel}
                  onChange={e => setQtyWastafel(e.target.value)}
                  placeholder="mis. 2"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Closet Duduk</label>
                <input
                  type="number"
                  min="0"
                  value={qtyClosetDuduk}
                  onChange={e => setQtyClosetDuduk(e.target.value)}
                  placeholder="mis. 2"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Closet Jongkok</label>
                <input
                  type="number"
                  min="0"
                  value={qtyClosetJongkok}
                  onChange={e => setQtyClosetJongkok(e.target.value)}
                  placeholder="mis. 0"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Sink Dapur</label>
                <input
                  type="number"
                  min="0"
                  value={qtySinkDapur}
                  onChange={e => setQtySinkDapur(e.target.value)}
                  placeholder="mis. 1"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Mesin Cuci</label>
                <input
                  type="number"
                  min="0"
                  value={qtyMesinCuci}
                  onChange={e => setQtyMesinCuci(e.target.value)}
                  placeholder="mis. 1"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 02. AIR KOTOR, AIR BEKAS & SEPTIC TANK */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-sky-700 text-white font-mono text-xs font-bold flex items-center justify-center">02</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Saluran Air Kotor, Air Bekas & Septic Tank
              </h2>
            </div>
            <p className="text-xs text-paper-600 mb-4 ml-8.5">
              Perhitungan jalur buangan kotoran ke septic tank dan air buangan sabun ke bak kontrol kota.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono p-4 rounded-xl bg-slate-50 border border-slate-300 mb-4">
              <div>
                <label className="block text-[10px] text-slate-800 uppercase mb-1 font-bold">
                  Jarak ke Septic Tank (m)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={distSepticTank}
                  onChange={e => setDistSepticTank(e.target.value)}
                  placeholder="mis. 12"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
                <span className="text-[10px] text-paper-500">Pipa PVC 4" Kloset</span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-800 uppercase mb-1 font-bold">
                  Jarak Saluran Air Bekas (m)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={distGreyWater}
                  onChange={e => setDistGreyWater(e.target.value)}
                  placeholder="mis. 18"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
                <span className="text-[10px] text-paper-500">Pipa PVC 2"/3" Floor Drain & Wastafel</span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-800 uppercase mb-1 font-bold">
                  Jumlah Bak Kontrol (pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtyBakKontrol}
                  onChange={e => setQtyBakKontrol(e.target.value)}
                  placeholder="mis. 2"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-white"
                />
                <span className="text-[10px] text-paper-500">Bak kontrol 40x40cm</span>
              </div>
            </div>
          </div>

          {/* 03. PIPA RISER TEGAK, TOREN & BOOSTER PUMP */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-sky-700 text-white font-mono text-xs font-bold flex items-center justify-center">
                <Building className="w-3.5 h-3.5" />
              </span>
              <div>
                <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                  Pipa Riser Vertikal (Antar Lantai), Toren Air & Booster Pump
                </h2>
                <p className="text-xs text-paper-600">
                  Parameter instalasi tegak shaft lantai 2, tangki penyimpanan toren air atas, dan sistem pompa booster.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              
              {/* Card 1: Pipa Riser Vertikal */}
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    🏢 Pipa Riser Vertikal (Shaft)
                  </span>
                  <input
                    type="checkbox"
                    checked={enableRiser}
                    onChange={e => setEnableRiser(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                  />
                </div>

                {enableRiser && (
                  <div className="space-y-2.5 text-xs font-mono">
                    <div>
                      <label className="block text-[10px] text-sky-900 uppercase mb-1 font-semibold">Tinggi Antar Lantai (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={inRiserTinggi}
                        onChange={e => setInRiserTinggi(e.target.value)}
                        placeholder="mis. 3.6"
                        className="w-full p-2 rounded-lg border border-sky-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-sky-900 uppercase mb-1 font-semibold">Jumlah Shaft Pipa</label>
                      <input
                        type="number"
                        step="1"
                        value={inRiserShafts}
                        onChange={e => setInRiserShafts(e.target.value)}
                        placeholder="mis. 1"
                        className="w-full p-2 rounded-lg border border-sky-200 bg-white"
                      />
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-sky-100 text-[10px] text-sky-900 space-y-0.5">
                      <p>• Pipa 4" Kotor: {((parseNum(inRiserTinggi) || 3.6) * (parseInt(inRiserShafts) || 1)).toFixed(1)} m</p>
                      <p>• Pipa 3" Bekas: {((parseNum(inRiserTinggi) || 3.6) * (parseInt(inRiserShafts) || 1)).toFixed(1)} m</p>
                      <p>• Pipa 3/4" Bersih: {((parseNum(inRiserTinggi) || 3.6) * (parseInt(inRiserShafts) || 1)).toFixed(1)} m</p>
                      <p>• Pipa 1.5" Vent: {(((parseNum(inRiserTinggi) || 3.6) + 1.0) * (parseInt(inRiserShafts) || 1)).toFixed(1)} m</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Roof Tank / Toren */}
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
                <span className="text-xs font-bold text-sky-950 block">
                  💧 Tangki Air Atas (Toren)
                </span>
                <div className="space-y-2.5 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-sky-900 uppercase mb-1 font-semibold">Kapasitas Toren</label>
                    <select
                      value={inRoofTank}
                      onChange={e => setInRoofTank(e.target.value)}
                      className="w-full p-2 rounded-lg border border-sky-200 bg-white"
                    >
                      <option value="none">Tanpa Toren Atas</option>
                      <option value="500">Toren 500 Liter</option>
                      <option value="1000">Toren 1.000 Liter (Rekomendasi)</option>
                      <option value="1500">Toren 1.500 Liter</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 pt-1">
                    <input
                      type="checkbox"
                      checked={inRadar}
                      onChange={e => setInRadar(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                    />
                    <span>Pelampung Otomatis Radar</span>
                  </label>
                </div>
              </div>

              {/* Card 3: Booster Pump & Biofil Cluster */}
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
                <span className="text-xs font-bold text-sky-950 block">
                  ⚙️ Booster & Biofil Cluster
                </span>
                <div className="space-y-2.5 text-xs font-mono">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={inBoosterPump}
                      onChange={e => setInBoosterPump(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                    />
                    <span>Pompa Booster Pendorong</span>
                  </label>
                  <div>
                    <label className="block text-[10px] text-sky-900 uppercase mb-1 font-semibold">Tipe Septic Tank Biofil</label>
                    <select
                      value={inBiofilType}
                      onChange={e => setInBiofilType(e.target.value)}
                      className="w-full p-2 rounded-lg border border-sky-200 bg-white"
                    >
                      <option value="individual">Biofil Individual (per pintu/unit)</option>
                      <option value="komunal">Biofil Komunal (1 tangki besar cluster)</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 04. REKAPITULASI SANITASI */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-md bg-sky-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
                Rekapitulasi Kebutuhan Pipa & Saniter
              </h2>
            </div>

            {(sanitasiSummary.btgPipaCabang12 + sanitasiSummary.btgPipaUtama + sanitasiSummary.btgPipaKotor + sanitasiSummary.btgPipaBekas + sanitasiSummary.totalTitikAirBersih) === 0 ? (
              <p className="text-xs text-paper-500 font-sans italic py-4 text-center">
                Isi parameter jaringan pipa air bersih atau pembuangan di atas untuk melihat rekapitulasi kebutuhan bahan.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-800 font-bold block">
                    Pipa Air Bersih AW (4m)
                  </span>
                  <span className="font-heading text-2xl font-bold text-sky-950 block mt-1">
                    {sanitasiSummary.btgPipaCabang12 + sanitasiSummary.btgPipaUtama} btg
                  </span>
                  <p className="text-[11px] text-sky-800 font-mono mt-1">
                    {sanitasiSummary.btgPipaCabang12} btg (1/2") + {sanitasiSummary.btgPipaUtama} btg ({pipaUtamaDia}")
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-sky-800 border border-sky-200 mt-2">
                    Total {formatNumber(sanitasiSummary.totalMeterPipaCabang + sanitasiSummary.totalMeterPipaUtama, 1)} m
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                    Pipa Air Kotor 4" (4m)
                  </span>
                  <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                    {sanitasiSummary.btgPipaKotor} btg
                  </span>
                  <p className="text-[11px] text-paper-600 font-mono mt-1">
                    Total {formatNumber(sanitasiSummary.totalMeterPipaKotor, 1)} m ke Septic Tank
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                    Kemiringan slope 1-2%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                    Pipa Air Bekas 2"/3" (4m)
                  </span>
                  <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                    {sanitasiSummary.btgPipaBekas} btg
                  </span>
                  <p className="text-[11px] text-paper-600 font-mono mt-1">
                    Total {formatNumber(sanitasiSummary.totalMeterPipaBekas, 1)} m ke Bak Kontrol
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                    + {sanitasiSummary.btgPipaVent} btg vent udara
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper-100 border border-paper-300">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-paper-700 font-bold block">
                    Fitting & Aksesoris
                  </span>
                  <span className="font-heading text-2xl font-bold text-paper-900 block mt-1">
                    {sanitasiSummary.totalKddKuningan} KDD
                  </span>
                  <p className="text-[11px] text-paper-600 font-mono mt-1">
                    KDD Kuningan + {sanitasiSummary.totalFittingTeeElbow} Tee/Elbow
                  </p>
                  <span className="inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-white text-paper-700 border border-paper-300 mt-2">
                    {sanitasiSummary.totalBakKontrol > 0 ? `${sanitasiSummary.totalBakKontrol} Bak Kontrol` : 'Standar SNI'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 04. HARGA SATUAN BAHAN SANITASI */}
          <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">04</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900 flex items-center gap-2">
                <span>Harga Satuan Bahan Plumbing & Sanitasi</span>
                <span className="text-[10px] font-mono font-normal lowercase bg-paper-100 text-paper-600 px-2 py-0.5 rounded border border-paper-300">
                  opsional untuk diisi (default 0)
                </span>
              </h2>
            </div>
            <p className="text-xs text-paper-600 mb-4 ml-8.5">
              Isi estimasi harga satuan per batang / buah untuk menghitung anggaran material sanitasi.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa AW 1/2" (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaAW12}
                  onChange={e => setHargaPipaAW12(e.target.value)}
                  placeholder="30400"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa AW 3/4" (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaAW34}
                  onChange={e => setHargaPipaAW34(e.target.value)}
                  placeholder="37400"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa AW 1" (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaAW1}
                  onChange={e => setHargaPipaAW1(e.target.value)}
                  placeholder="48000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa D 2" Bekas (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaD2}
                  onChange={e => setHargaPipaD2(e.target.value)}
                  placeholder="52000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa D 3" Kotor (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaD3}
                  onChange={e => setHargaPipaD3(e.target.value)}
                  placeholder="95000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Pipa D 4" Kotor (Rp/btg)</label>
                <input
                  type="number"
                  value={hargaPipaD4}
                  onChange={e => setHargaPipaD4(e.target.value)}
                  placeholder="165000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Kran Air 1/2" (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaKranAir}
                  onChange={e => setHargaKranAir(e.target.value)}
                  placeholder="38000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Shower Set (Rp/set)</label>
                <input
                  type="number"
                  value={hargaShower}
                  onChange={e => setHargaShower(e.target.value)}
                  placeholder="220000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Floor Drain (Rp/bh)</label>
                <input
                  type="number"
                  value={hargaFloorDrainUnit}
                  onChange={e => setHargaFloorDrainUnit(e.target.value)}
                  placeholder="45000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Closet Duduk (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaClosetDudukUnit}
                  onChange={e => setHargaClosetDudukUnit(e.target.value)}
                  placeholder="1450000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Closet Jongkok (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaClosetJongkokUnit}
                  onChange={e => setHargaClosetJongkokUnit(e.target.value)}
                  placeholder="285000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Wastafel Set (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaWastafelUnit}
                  onChange={e => setHargaWastafelUnit(e.target.value)}
                  placeholder="450000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Septictank Biofil (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaBiotankUnit}
                  onChange={e => setHargaBiotankUnit(e.target.value)}
                  placeholder="2850000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Bak Kontrol (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaBakKontrolUnit}
                  onChange={e => setHargaBakKontrolUnit(e.target.value)}
                  placeholder="185000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Toren Air (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaRoofTank}
                  onChange={e => setHargaRoofTank(e.target.value)}
                  placeholder="1150000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Booster Pump (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaBoosterPump}
                  onChange={e => setHargaBoosterPump(e.target.value)}
                  placeholder="750000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-600 uppercase mb-1">Radar Toren (Rp/unit)</label>
                <input
                  type="number"
                  value={hargaRadar}
                  onChange={e => setHargaRadar(e.target.value)}
                  placeholder="85000"
                  className="w-full p-2 rounded-lg border border-paper-300 bg-paper-50"
                />
              </div>
            </div>

            {sanitasiSummary.totalEstimasiSanitasi > 0 && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-mono">
                <span className="text-xs font-semibold text-emerald-900 font-sans">Estimasi Total Biaya Material Sanitasi:</span>
                <span className="font-heading text-lg font-bold text-emerald-800">
                  Rp {formatNumber(sanitasiSummary.totalEstimasiSanitasi, 0)}
                </span>
              </div>
            )}
          </div>

          {/* 05. KIRIM HASIL SANITASI KE BOQ */}
          <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-dashed border-sky-400 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-sky-700 text-white font-mono text-xs font-bold flex items-center justify-center">05</span>
              <h2 className="font-heading text-base font-bold uppercase tracking-wide text-sky-950">
                Kirim Hasil ke BoQ (Kategori Sanitasi)
              </h2>
            </div>
            <p className="text-xs text-sky-900/80 mb-4 ml-8.5">
              Item yang dicentang akan dikirim ke antrian BoQ kategori <b>Pekerjaan Sanitasi</b> secara akumulatif.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 bg-white p-4 rounded-xl border border-sky-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendPipaAirBersih}
                  onChange={e => setSendPipaAirBersih(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                />
                <span>Pipa Air Bersih AW — <b className="font-mono text-sky-950">{formatNumber(sanitasiSummary.totalMeterPipaCabang + sanitasiSummary.totalMeterPipaUtama, 0)} m</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendPipaAirKotor}
                  onChange={e => setSendPipaAirKotor(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                />
                <span>Pipa Air Kotor 4" (Kloset) — <b className="font-mono text-sky-950">{formatNumber(sanitasiSummary.totalMeterPipaKotor, 0)} m</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendPipaAirBekas}
                  onChange={e => setSendPipaAirBekas(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                />
                <span>Pipa Air Bekas 2"/3" — <b className="font-mono text-sky-950">{formatNumber(sanitasiSummary.totalMeterPipaBekas, 0)} m</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendSaniterKran}
                  onChange={e => setSendSaniterKran(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                />
                <span>Kran, Shower & Floor Drain — <b className="font-mono text-sky-950">{((parseInt(qtyKranDinding,10)||0) + (parseInt(qtyShower,10)||0) + (parseInt(qtyFloorDrain,10)||0))} unit</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendSaniterKloset}
                  onChange={e => setSendSaniterKloset(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                />
                <span>Kloset & Wastafel — <b className="font-mono text-sky-950">{sanitasiSummary.totalCloset + (parseInt(qtyWastafel,10)||0)} unit</b></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-paper-800">
                <input
                  type="checkbox"
                  checked={sendSepticTank}
                  onChange={e => setSendSepticTank(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                />
                <span>Septictank Biofil & Bak Kontrol — <b className="font-mono text-sky-950">{sanitasiSummary.totalBakKontrol > 0 ? `1 Biotank + ${sanitasiSummary.totalBakKontrol} Bak` : '1 Set Biotank'}</b></span>
              </label>
            </div>

            {/* Selector Satuan Pasaran Pipa */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-sky-50/80 border border-sky-200 text-xs">
              <span className="font-bold text-sky-950 font-mono">Satuan Jual Pipa ke BoQ:</span>
              <div className="inline-flex rounded-lg bg-white p-0.5 border border-sky-300 text-xs">
                <button
                  type="button"
                  onClick={() => setPipaSatuanMode('batang')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${pipaSatuanMode === 'batang' ? 'bg-sky-700 text-white shadow-xs' : 'text-sky-800 hover:bg-sky-100'}`}
                >
                  Batang (4m) — Standar Toko Pipa
                </button>
                <button
                  type="button"
                  onClick={() => setPipaSatuanMode('meter')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${pipaSatuanMode === 'meter' ? 'bg-sky-700 text-white shadow-xs' : 'text-sky-800 hover:bg-sky-100'}`}
                >
                  Meter (m) — Borongan Pasang
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendSanitasiToBoQ}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-display font-semibold text-xs shadow-md shadow-sky-950/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Send className="w-4 h-4" />
              Kirim Material Sanitasi ke BoQ
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

