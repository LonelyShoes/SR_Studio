import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { formatNumber, parseNum, formatRp } from '../../utils/formatters';
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
  Compass,
  Printer,
  Boxes,
  HelpCircle,
  Eye,
  Droplets,
  ShieldCheck,
  CheckSquare,
  Square,
  Wrench,
  SlidersHorizontal,
  Layers3
} from 'lucide-react';
import { usePersistentState } from '../../hooks/usePersistentCalculatorState';

// Master data spesifikasi Nok / Bubungan Puncak Atap
const NOK_TYPES = {
  metal_pasir: { 
    id: 'metal_pasir',
    name: 'Nok Bulat Metal Pasir', 
    len: 0.85, 
    unit: 'keping', 
    desc: 'Panjang 90cm (efektif 85cm overlap 5cm), cocok untuk genteng metal pasir' 
  },
  spandek: { 
    id: 'spandek',
    name: 'Nok C-Truss Zincalume Lipat', 
    len: 2.85, 
    unit: 'batang', 
    desc: 'Panjang 3.0m (efektif 2.85m overlap 15cm), cocok untuk atap spandek' 
  },
  genteng_beton: { 
    id: 'genteng_beton',
    name: 'Nok Segitiga Genteng Beton', 
    len: 0.30, 
    unit: 'keping', 
    desc: 'Kebutuhan standar ~3.3 keping per meter lari bubungan' 
  },
  genteng_keramik: { 
    id: 'genteng_keramik',
    name: 'Nok Bulat Keramik Glazur', 
    len: 0.31, 
    unit: 'keping', 
    desc: 'Kebutuhan standar ~3.2 keping per meter lari bubungan' 
  }
};

// Master data spesifikasi Lisplang GRC & Kayu
const LISPLANG_TYPES = {
  grc_single: { 
    id: 'grc_single',
    name: 'Lisplang GRC 1 Trap (20cm x 2.44m)', 
    len: 2.44, 
    unit: 'lembar',
    desc: 'Tahan air, anti rayap, tebal 8mm, finishing cat eksterior' 
  },
  grc_double: { 
    id: 'grc_double',
    name: 'Lisplang GRC 2 Trap Bertingkat (20/10cm x 2.44m)', 
    len: 2.44, 
    unit: 'lembar',
    desc: 'Tampilan klasik mewah kombinasi papan 20cm dan 10cm' 
  },
  kayu_meranti: { 
    id: 'kayu_meranti',
    name: 'Lisplang Kayu Kamper / Meranti (2/20cm x 4m)', 
    len: 4.0, 
    unit: 'batang',
    desc: 'Estetika natural kayu solid profil tahan cuaca' 
  },
  metal_zincalume: { 
    id: 'metal_zincalume',
    name: 'Lisplang Metal Zincalume (0.35mm x 3m)', 
    len: 3.0, 
    unit: 'batang',
    desc: 'Presisi pabrikasi, ringan, anti karat, cepat terpasang' 
  }
};

// Master data spesifikasi Talang Air Hujan & Seng Jurai
const TALANG_TYPES = {
  pvc_kotak: { 
    id: 'pvc_kotak',
    name: 'Talang PVC Kotak Standard (12cm x 4m)', 
    len: 4.0, 
    unit: 'batang',
    mat: 'PVC', 
    desc: 'Ekonomis, anti karat, ringan, cocok untuk perumahan' 
  },
  pvc_setengah: { 
    id: 'pvc_setengah',
    name: 'Talang PVC 1/2 Lingkaran (6" x 4m)', 
    len: 4.0, 
    unit: 'batang',
    mat: 'PVC', 
    desc: 'Aliran air hidrolik optimal, minim endapan daun' 
  },
  seng_jurai: { 
    id: 'seng_jurai',
    name: 'Talang Seng Jurai Dalam Galvalum (0.35mm x 3m)', 
    len: 3.0, 
    unit: 'batang',
    mat: 'Galvalum', 
    desc: 'Lipatan talang lembah jurai dalam penahan limpasan deras' 
  },
  metal_kotak: { 
    id: 'metal_kotak',
    name: 'Talang Metal Powder Coating (15cm x 3m)', 
    len: 3.0, 
    unit: 'batang',
    mat: 'Zincalume', 
    desc: 'Kapasitas debit besar, kokoh tahan benturan dan panas' 
  }
};

export function RoofTrussStudio() {
  const { 
    queueCalculatedItems, 
    showToast, 
    clusterUnits, 
    setActiveTab 
  } = useBoQ();

  // ==================== PARAMETER GEOMETRI KUDA-KUDA ====================
  const [span, setSpan] = usePersistentState('sr_calc_rts_span', '8.0');                 // Bentang bersih L (meter)
  const [pitch, setPitch] = usePersistentState('sr_calc_rts_pitch', '30');              // Sudut kemiringan derajat
  const [overhang, setOverhang] = usePersistentState('sr_calc_rts_overhang', '0.8');       // Overstek tritisan (meter)
  const [buildingLength, setBuildingLength] = usePersistentState('sr_calc_rts_length', '12.0'); // Panjang bangunan P (meter)
  const [trussSpacing, setTrussSpacing] = usePersistentState('sr_calc_rts_spacing', '1.2');      // Jarak antar kuda-kuda (meter)
  
  // Tipe Profil Kuda-Kuda: 'fink' | 'howe' | 'pratt' | 'king_post' | 'queen_post' | 'monopitch'
  const [trussType, setTrussType] = usePersistentState('sr_calc_rts_type', 'fink');

  // Penutup Atap
  const [coveringType, setCoveringType] = usePersistentState('sr_calc_rts_covering', 'metal_pasir');

  // ==================== 1. NOK / BUBUNGAN PUNCAK ATAP ====================
  const [nokMode, setNokMode] = usePersistentState('sr_calc_rts_nok_mode', 'auto');         // 'auto' | 'manual'
  const [nokType, setNokType] = usePersistentState('sr_calc_rts_nok_type', 'metal_pasir'); // key of NOK_TYPES
  const [nokManual, setNokManual] = usePersistentState('sr_calc_rts_nok_manual', '13.2');   // meter lari manual
  const [hargaNok, setHargaNok] = usePersistentState('sr_calc_rts_h_nok', '25700');         // Rp / m' atau keping

  // ==================== 2. LISPLANG GRC / KAYU ====================
  const [lisplangActive, setLisplangActive] = usePersistentState('sr_calc_rts_lisplang_active', true);
  const [lisplangMode, setLisplangMode] = usePersistentState('sr_calc_rts_lisplang_mode', 'auto'); // 'auto' | 'manual'
  const [lisplangType, setLisplangType] = usePersistentState('sr_calc_rts_lisplang_type', 'grc_single');
  const [lisplangManual, setLisplangManual] = usePersistentState('sr_calc_rts_lisplang_manual', '26.4');
  const [lisplangSisiDepan, setLisplangSisiDepan] = usePersistentState('sr_calc_rts_lisplang_depan', true);
  const [lisplangSisiBelakang, setLisplangSisiBelakang] = usePersistentState('sr_calc_rts_lisplang_belakang', true);
  const [lisplangSisiKiri, setLisplangSisiKiri] = usePersistentState('sr_calc_rts_lisplang_kiri', true);
  const [lisplangSisiKanan, setLisplangSisiKanan] = usePersistentState('sr_calc_rts_lisplang_kanan', true);
  const [hargaLisplang, setHargaLisplang] = usePersistentState('sr_calc_rts_h_lisplang', '65000'); // Rp / lembar atau batang

  // ==================== 3. TALANG AIR HUJAN / SENG JURAI ====================
  const [talangActive, setTalangActive] = usePersistentState('sr_calc_rts_talang_active', true);
  const [talangType, setTalangType] = usePersistentState('sr_calc_rts_talang_type', 'pvc_kotak');
  const [talangLoc, setTalangLoc] = usePersistentState('sr_calc_rts_talang_loc', 'both_eaves'); // 'both_eaves' | 'front_only' | 'back_only' | 'manual'
  const [talangManual, setTalangManual] = usePersistentState('sr_calc_rts_talang_manual', '24.0');
  const [hargaTalang, setHargaTalang] = usePersistentState('sr_calc_rts_h_talang', '85000'); // Rp / batang

  // ==================== 4. SEKRUP / BAUT ROOFING ====================
  const [sekrupUnit, setSekrupUnit] = usePersistentState('sr_calc_rts_sekrup_unit', 'buah'); // 'buah' | 'dus'
  const [hargaSekrup, setHargaSekrup] = usePersistentState('sr_calc_rts_h_sekrup', '450');    // Rp / pcs

  // Harga Material Rangka & Penutup (Rp)
  const [hargaC75, setHargaC75] = usePersistentState('sr_calc_rts_h_c75', '99700');     // Rp / Batang (6m)
  const [hargaReng, setHargaReng] = usePersistentState('sr_calc_rts_h_reng', '45000');    // Rp / Batang (6m)
  const [hargaPenutup, setHargaPenutup] = usePersistentState('sr_calc_rts_h_penutup', '35000'); // Rp / m2

  // Checkbox dispatch ke BoQ
  const [sendC75, setSendC75] = usePersistentState('sr_calc_rts_send_c75', true);
  const [sendReng, setSendReng] = usePersistentState('sr_calc_rts_send_reng', true);
  const [sendCover, setSendCover] = usePersistentState('sr_calc_rts_send_cover', true);
  const [sendNok, setSendNok] = usePersistentState('sr_calc_rts_send_nok', true);
  const [sendLisplang, setSendLisplang] = usePersistentState('sr_calc_rts_send_lisplang', true);
  const [sendTalang, setSendTalang] = usePersistentState('sr_calc_rts_send_talang', true);
  const [sendSekrup, setSendSekrup] = usePersistentState('sr_calc_rts_send_sekrup', true);

  // Tab View Kanvas: 'elevation' (Tampak Muka Elevasi Rangka 2D) | 'plan' (Tampak Atas Denah Kuda-Kuda & Talang Air)
  const [activeViewTab, setActiveViewTab] = usePersistentState('sr_calc_rts_view_tab', 'elevation');

  // Mode Skala Kanvas: 'fixed' (Skala CAD Tetap - Bebas Pusing) | 'fit' (Auto-Fit Lebar)
  const [viewMode, setViewMode] = usePersistentState('sr_calc_rts_view_mode', 'fixed');

  // Sub-Tab Konfigurasi Input: 'geometry' | 'roofing' | 'fascia' | 'gutter' | 'hardware'
  const [activeConfigTab, setActiveConfigTab] = useState('geometry');

  // Hover state
  const [hoveredMember, setHoveredMember] = useState(null);
  const [hoveredPlanItem, setHoveredPlanItem] = useState(null);

  // Parsing parameter dasar
  const L = Math.max(3, Math.min(20, parseNum(span) || 8));
  const alpha = Math.max(15, Math.min(60, parseNum(pitch) || 30));
  const O = Math.max(0, Math.min(2, parseNum(overhang) || 0.8));
  const P = Math.max(2, Math.min(100, parseNum(buildingLength) || 12));
  const S = Math.max(0.6, Math.min(2.5, parseNum(trussSpacing) || 1.2));

  // ==================== ENGINE GEOMETRI KUDA-KUDA (ELEVASI) ====================
  const trussGeometry = useMemo(() => {
    const rad = (alpha * Math.PI) / 180;
    const isMonopitch = trussType === 'monopitch';

    // Tinggi puncak kuda-kuda (H)
    const H = isMonopitch ? L * Math.tan(rad) : (L / 2) * Math.tan(rad);

    // Titik tumpuan dinding: (0, 0) dan (L, 0)
    // Titik overstek: (-O, -O*tan(rad)) dan (L+O, -O*tan(rad))
    const eaveDrop = O * Math.tan(rad);

    const members = []; // { id, name, role: 'top' | 'bottom' | 'web', x1, y1, x2, y2, len }

    const addMember = (id, name, role, x1, y1, x2, y2) => {
      const len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      members.push({ id, name, role, x1, y1, x2, y2, len });
    };

    if (isMonopitch) {
      // ---------------- MONOPITCH / ATAP SANDAR ----------------
      const eaveLeft = { x: -O, y: -eaveDrop };
      const nodeSupportLeft = { x: 0, y: 0 };
      const nodeSupportRight = { x: L, y: 0 };
      const peakRight = { x: L, y: H };
      const eaveRight = { x: L + O, y: H + eaveDrop };

      // Batang Atas (Top Chord / Rafter)
      addMember('tc-mono-left', 'Overstek Tritisan Bawah', 'top', eaveLeft.x, eaveLeft.y, nodeSupportLeft.x, nodeSupportLeft.y);
      addMember('tc-mono-main', 'Rafter Utama Sandar', 'top', nodeSupportLeft.x, nodeSupportLeft.y, peakRight.x, peakRight.y);
      addMember('tc-mono-right', 'Overstek Tritisan Atas', 'top', peakRight.x, peakRight.y, eaveRight.x, eaveRight.y);

      // Batang Bawah (Bottom Chord / Tie Beam)
      addMember('bc-mono', 'Batang Tarik Bawah (Bottom Chord)', 'bottom', nodeSupportLeft.x, 0, nodeSupportRight.x, 0);

      // Batang Vertikal Kanan (Tiang Kolom Sandar)
      addMember('wb-mono-col', 'Tiang Kolom Puncak Sandar', 'web', nodeSupportRight.x, 0, peakRight.x, peakRight.y);

      // Batang Pengisi (Webs): 3 Tiang Vertikal + 3 Diagonal
      const nDiv = 4;
      for (let i = 1; i < nDiv; i++) {
        const xVal = (L / nDiv) * i;
        const yTop = xVal * Math.tan(rad);
        addMember(`wb-mono-v${i}`, `Tiang Vertikal Web ${i}`, 'web', xVal, 0, xVal, yTop);

        const xPrev = (L / nDiv) * (i - 1);
        addMember(`wb-mono-d${i}`, `Diagonal Pengaku Web ${i}`, 'web', xPrev, 0, xVal, yTop);
      }

    } else {
      // ---------------- ATAP SIMETRIS (DUAL PITCH / PELANA) ----------------
      const eaveLeft = { x: -O, y: -eaveDrop };
      const nodeSupportLeft = { x: 0, y: 0 };
      const peak = { x: L / 2, y: H };
      const nodeSupportRight = { x: L, y: 0 };
      const eaveRight = { x: L + O, y: -eaveDrop };

      // Top Chords
      addMember('tc-left-eave', 'Overstek Tritisan Kiri', 'top', eaveLeft.x, eaveLeft.y, nodeSupportLeft.x, nodeSupportLeft.y);
      addMember('tc-left-main', 'Rafter Kiri (Top Chord Left)', 'top', nodeSupportLeft.x, nodeSupportLeft.y, peak.x, peak.y);
      addMember('tc-right-main', 'Rafter Kanan (Top Chord Right)', 'top', peak.x, peak.y, nodeSupportRight.x, nodeSupportRight.y);
      addMember('tc-right-eave', 'Overstek Tritisan Kanan', 'top', nodeSupportRight.x, nodeSupportRight.y, eaveRight.x, eaveRight.y);

      // Bottom Chord
      addMember('bc-main', 'Batang Tarik Bawah (Tie Beam)', 'bottom', nodeSupportLeft.x, 0, nodeSupportRight.x, 0);

      // Center bottom node
      const centerBottom = { x: L / 2, y: 0 };

      if (trussType === 'king_post') {
        // KING POST: Tiang vertikal tengah + 2 strut penyangga
        addMember('wb-king-v', 'Tiang Raja (King Post Vertikal)', 'web', centerBottom.x, 0, peak.x, peak.y);
        addMember('wb-king-s1', 'Strut Kiri King Post', 'web', centerBottom.x, 0, L / 4, H / 2);
        addMember('wb-king-s2', 'Strut Kanan King Post', 'web', centerBottom.x, 0, (3 * L) / 4, H / 2);

      } else if (trussType === 'queen_post') {
        // QUEEN POST: Dua tiang vertikal penopang
        const q1 = { x: L / 3, y: (2 * H) / 3 };
        const q2 = { x: (2 * L) / 3, y: (2 * H) / 3 };

        addMember('wb-queen-v1', 'Tiang Queen Post Kiri', 'web', L / 3, 0, q1.x, q1.y);
        addMember('wb-queen-v2', 'Tiang Queen Post Kanan', 'web', (2 * L) / 3, 0, q2.x, q2.y);
        addMember('wb-queen-col', 'Balok Penjepit Atas (Collar Beam)', 'web', q1.x, q1.y, q2.x, q2.y);
        addMember('wb-queen-d1', 'Diagonal Pengaku Kiri', 'web', 0, 0, q1.x, q1.y);
        addMember('wb-queen-d2', 'Diagonal Pengaku Kanan', 'web', L, 0, q2.x, q2.y);

      } else if (trussType === 'howe') {
        // HOWE TRUSS: 5 Tiang Vertikal, Diagonal miring NAIK ke arah puncak
        const x1 = L / 6;
        const x2 = (2 * L) / 6;
        const x3 = L / 2;
        const x4 = (4 * L) / 6;
        const x5 = (5 * L) / 6;

        const y1 = x1 * Math.tan(rad);
        const y2 = x2 * Math.tan(rad);
        const y4 = y2;
        const y5 = y1;

        addMember('wb-howe-v1', 'Vertikal Howe Kiri 1', 'web', x1, 0, x1, y1);
        addMember('wb-howe-v2', 'Vertikal Howe Kiri 2', 'web', x2, 0, x2, y2);
        addMember('wb-howe-v3', 'King Post Vertikal Tengah', 'web', x3, 0, x3, H);
        addMember('wb-howe-v4', 'Vertikal Howe Kanan 2', 'web', x4, 0, x4, y4);
        addMember('wb-howe-v5', 'Vertikal Howe Kanan 1', 'web', x5, 0, x5, y5);

        // Diagonals HOWE: Miring NAIK ke puncak
        addMember('wb-howe-d1', 'Diagonal Howe Kiri 1', 'web', 0, 0, x1, y1);
        addMember('wb-howe-d2', 'Diagonal Howe Kiri 2', 'web', x1, 0, x2, y2);
        addMember('wb-howe-d3', 'Diagonal Howe Kanan 2', 'web', x5, 0, x4, y4);
        addMember('wb-howe-d4', 'Diagonal Howe Kanan 1', 'web', L, 0, x5, y5);

      } else if (trussType === 'pratt') {
        // PRATT TRUSS: 5 Tiang Vertikal, Diagonal miring TURUN ke arah tengah
        const x1 = L / 6;
        const x2 = (2 * L) / 6;
        const x3 = L / 2;
        const x4 = (4 * L) / 6;
        const x5 = (5 * L) / 6;

        const y1 = x1 * Math.tan(rad);
        const y2 = x2 * Math.tan(rad);
        const y4 = y2;
        const y5 = y1;

        addMember('wb-pratt-v1', 'Vertikal Pratt Kiri 1', 'web', x1, 0, x1, y1);
        addMember('wb-pratt-v2', 'Vertikal Pratt Kiri 2', 'web', x2, 0, x2, y2);
        addMember('wb-pratt-v3', 'King Post Vertikal Tengah', 'web', x3, 0, x3, H);
        addMember('wb-pratt-v4', 'Vertikal Pratt Kanan 2', 'web', x4, 0, x4, y4);
        addMember('wb-pratt-v5', 'Vertikal Pratt Kanan 1', 'web', x5, 0, x5, y5);

        // Diagonals PRATT: Miring TURUN ke tengah
        addMember('wb-pratt-d1', 'Diagonal Pratt Kiri 1', 'web', x1, y1, x2, 0);
        addMember('wb-pratt-d2', 'Diagonal Pratt Kiri 2', 'web', x2, y2, x3, 0);
        addMember('wb-pratt-d3', 'Diagonal Pratt Kanan 2', 'web', x4, y4, x3, 0);
        addMember('wb-pratt-d4', 'Diagonal Pratt Kanan 1', 'web', x5, y5, x4, 0);

      } else {
        // FINK TRUSS (W-TRUSS) - Standar baja ringan paling efisien
        const midTopL = { x: L / 4, y: H / 2 };
        const midTopR = { x: (3 * L) / 4, y: H / 2 };
        const thirdBottomL = { x: L / 3, y: 0 };
        const thirdBottomR = { x: (2 * L) / 3, y: 0 };

        // 4 Batang Web membentuk W
        addMember('wb-fink-w1', 'Web Fink Kiri 1', 'web', thirdBottomL.x, 0, midTopL.x, midTopL.y);
        addMember('wb-fink-w2', 'Web Fink Kiri 2 ke Puncak', 'web', thirdBottomL.x, 0, peak.x, peak.y);
        addMember('wb-fink-w3', 'Web Fink Kanan 1 ke Puncak', 'web', thirdBottomR.x, 0, peak.x, peak.y);
        addMember('wb-fink-w4', 'Web Fink Kanan 2', 'web', thirdBottomR.x, 0, midTopR.x, midTopR.y);
        addMember('wb-fink-v', 'Web Pengikat Tengah (King Post)', 'web', centerBottom.x, 0, peak.x, peak.y);
      }
    }

    // Hitung total panjang per elemen kuda-kuda (1 unit)
    const lenTopChord = members.filter(m => m.role === 'top').reduce((s, m) => s + m.len, 0);
    const lenBottomChord = members.filter(m => m.role === 'bottom').reduce((s, m) => s + m.len, 0);
    const lenWeb = members.filter(m => m.role === 'web').reduce((s, m) => s + m.len, 0);
    const lenTotalSingleTruss = lenTopChord + lenBottomChord + lenWeb;

    return {
      H,
      rad,
      members,
      lenTopChord,
      lenBottomChord,
      lenWeb,
      lenTotalSingleTruss
    };
  }, [L, alpha, O, trussType]);

  // ==================== KALKULASI KEBUTUHAN MATERIAL KESELURUHAN ====================
  const materialTakeoff = useMemo(() => {
    // 1. Jumlah Kuda-Kuda Utama
    const trussCount = Math.floor(P / S) + 1;

    // 2. Panjang Lereng Bidang Atap (Rafter Slope Length)
    const slopeLength = trussType === 'monopitch'
      ? (L + O) / Math.cos(trussGeometry.rad)
      : ((L / 2) + O) / Math.cos(trussGeometry.rad);

    // 3. Kanal C-75.75 Rangka Kuda-Kuda + Bracing Pengaku
    // Bracing longitudinal (ikatan angin & pengaku horizontal) ≈ 4 lajur sepanjang P
    const bracingLength = 4 * P;
    // X-Bracing di bay modul ujung
    const xBraceBayLength = Math.sqrt(Math.pow(S, 2) + Math.pow(slopeLength / 2, 2)) * 4;
    const totalTrussC75Meters = (trussGeometry.lenTotalSingleTruss * trussCount) + bracingLength + xBraceBayLength;
    const c75Batang = Math.ceil((totalTrussC75Meters * 1.05) / 6.0);

    // 4. Kebutuhan Reng R-32
    let rengSpacing = 0.385; // default metal pasir
    if (coveringType === 'spandek') rengSpacing = 0.60;
    if (coveringType === 'genteng_beton') rengSpacing = 0.33;
    if (coveringType === 'genteng_keramik') rengSpacing = 0.26;

    const rengLinesPerSlope = Math.ceil(slopeLength / rengSpacing) + 1;
    const totalRengLines = trussType === 'monopitch' ? rengLinesPerSlope : rengLinesPerSlope * 2;
    // Panjang atap + overstek gabel samping (2 x 0.6m)
    const effectiveRoofLength = P + 1.2;
    const totalRengMeters = totalRengLines * effectiveRoofLength;
    const rengBatang = Math.ceil((totalRengMeters * 1.05) / 6.0);

    // 5. Luas Penutup Atap
    const roofArea = trussType === 'monopitch'
      ? slopeLength * effectiveRoofLength
      : 2 * slopeLength * effectiveRoofLength;

    // 6. Nok / Bubungan Puncak Atap
    let ridgeMeters = 0;
    if (nokMode === 'manual') {
      ridgeMeters = Math.max(0, parseNum(nokManual) || 0);
    } else {
      ridgeMeters = trussType === 'monopitch' ? 0 : effectiveRoofLength;
    }
    const currentNok = NOK_TYPES[nokType] || NOK_TYPES.metal_pasir;
    let nokPieces = 0;
    if (nokType === 'genteng_beton') {
      nokPieces = Math.ceil(ridgeMeters * 3.3 * 1.05);
    } else if (nokType === 'genteng_keramik') {
      nokPieces = Math.ceil(ridgeMeters * 3.2 * 1.05);
    } else {
      nokPieces = Math.ceil((ridgeMeters * 1.05) / currentNok.len);
    }

    // 7. Lisplang GRC / Kayu
    let lisplangMeters = 0;
    const lenDepan = lisplangSisiDepan ? effectiveRoofLength : 0;
    const lenBelakang = trussType === 'monopitch' ? 0 : (lisplangSisiBelakang ? effectiveRoofLength : 0);
    const gableSingle = trussType === 'monopitch' ? slopeLength : 2 * slopeLength;
    const lenKiri = lisplangSisiKiri ? gableSingle : 0;
    const lenKanan = lisplangSisiKanan ? gableSingle : 0;
    const autoLisplangMeters = lenDepan + lenBelakang + lenKiri + lenKanan;

    if (lisplangActive) {
      if (lisplangMode === 'manual') {
        lisplangMeters = Math.max(0, parseNum(lisplangManual) || 0);
      } else {
        lisplangMeters = autoLisplangMeters;
      }
    } else {
      lisplangMeters = 0;
    }

    const currentLisplang = LISPLANG_TYPES[lisplangType] || LISPLANG_TYPES.grc_single;
    let lisplangLembar = 0;
    if (lisplangMeters > 0) {
      if (lisplangType === 'grc_double') {
        lisplangLembar = Math.ceil((lisplangMeters * 1.05) / 2.44) * 2;
      } else {
        lisplangLembar = Math.ceil((lisplangMeters * 1.05) / currentLisplang.len);
      }
    }

    // 8. Talang Air Hujan / Seng Jurai
    let talangMeters = 0;
    const currentTalang = TALANG_TYPES[talangType] || TALANG_TYPES.pvc_kotak;
    if (talangActive) {
      if (talangLoc === 'manual') {
        talangMeters = Math.max(0, parseNum(talangManual) || 0);
      } else if (talangLoc === 'front_only' || talangLoc === 'back_only') {
        talangMeters = effectiveRoofLength;
      } else {
        // both_eaves
        talangMeters = trussType === 'monopitch' ? effectiveRoofLength : 2 * effectiveRoofLength;
      }
    } else {
      talangMeters = 0;
    }

    const talangBatang = talangMeters > 0 ? Math.ceil((talangMeters * 1.05) / currentTalang.len) : 0;
    const talangBracket = talangMeters > 0 ? Math.ceil(talangMeters / 0.8) + talangBatang : 0;
    const minCorong = talangLoc === 'both_eaves' && trussType !== 'monopitch' ? 2 : 1;
    const talangCorong = talangMeters > 0 ? Math.max(minCorong, Math.ceil(talangMeters / 7)) : 0;
    const numGutterLines = talangLoc === 'both_eaves' && trussType !== 'monopitch' ? 2 : 1;
    const talangSambungan = Math.max(0, talangBatang - numGutterLines);
    const talangTutup = talangMeters > 0 ? numGutterLines * 2 : 0;

    // 9. Sekrup / Baut Fastener SDS Baja Ringan
    const nodesCount = trussGeometry.members.length + 2;
    const screwsTruss = (trussCount * nodesCount * 4) + 32;
    const screwsReng = totalRengLines * trussCount * 2;

    let screwsPerM2Roof = 7;
    if (coveringType === 'spandek') screwsPerM2Roof = 6;
    if (coveringType === 'genteng_beton' || coveringType === 'genteng_keramik') screwsPerM2Roof = 3;
    const screwsRoof = Math.ceil(roofArea * screwsPerM2Roof);

    const screwsLisplang = lisplangLembar * 6;
    const screwsTalang = talangBracket * 3;
    const dynaboltRingbalk = trussCount * (trussType === 'monopitch' ? 2 : 4);

    const rawTotalScrews = screwsTruss + screwsReng + screwsRoof + screwsLisplang + screwsTalang;
    const totalScrews = Math.ceil(rawTotalScrews * 1.05);
    const sekrupDus = Math.ceil(totalScrews / 1000);

    return {
      trussCount,
      totalTrussC75Meters,
      c75Batang,
      slopeLength,
      rengSpacing,
      totalRengLines,
      totalRengMeters,
      rengBatang,
      roofArea,
      effectiveRoofLength,
      // Nok
      ridgeMeters,
      nokPieces,
      nokUnitLabel: currentNok.unit,
      nokTypeName: currentNok.name,
      // Lisplang
      lisplangMeters,
      lisplangLembar,
      lisplangUnitLabel: lisplangType === 'kayu_meranti' || lisplangType === 'metal_zincalume' ? 'batang' : 'lembar',
      lisplangTypeName: currentLisplang.name,
      // Talang
      talangMeters,
      talangBatang,
      talangBracket,
      talangCorong,
      talangSambungan,
      talangTutup,
      talangTypeName: currentTalang.name,
      // Sekrup breakdown
      screwsTruss,
      screwsReng,
      screwsRoof,
      screwsLisplang,
      screwsTalang,
      dynaboltRingbalk,
      totalScrews,
      sekrupDus
    };
  }, [
    P, S, L, O, coveringType, trussType, trussGeometry,
    nokMode, nokType, nokManual,
    lisplangActive, lisplangMode, lisplangType, lisplangManual, lisplangSisiDepan, lisplangSisiBelakang, lisplangSisiKiri, lisplangSisiKanan,
    talangActive, talangType, talangLoc, talangManual
  ]);

  // ==================== DISPATCH KE BOQ ====================
  const handleSendToBoQ = () => {
    const pC75 = parseNum(hargaC75) || 99700;
    const pReng = parseNum(hargaReng) || 45000;
    const pCover = parseNum(hargaPenutup) || 35000;
    const pNok = parseNum(hargaNok) || 25700;
    const pLisplang = parseNum(hargaLisplang) || 65000;
    const pTalang = parseNum(hargaTalang) || 85000;
    const pSekrup = parseNum(hargaSekrup) || 450;

    const mult = clusterUnits > 1 ? clusterUnits : 1;
    const suffix = mult > 1 ? ` [Total ${mult} Unit Cluster]` : '';
    const itemsToSend = [];

    // 1. Kanal C-75
    if (sendC75 && materialTakeoff.c75Batang > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Kanal C-75.75 Rangka Baja Ringan (Profil ${trussType.toUpperCase()} Bentang ${L}m)${suffix}`,
        satuan: 'Batang',
        jumlah: materialTakeoff.c75Batang * mult,
        harga: pC75,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    // 2. Reng R-32
    if (sendReng && materialTakeoff.rengBatang > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Reng Asimetris R-32.45 Baja Ringan (Jarak ${Math.round(materialTakeoff.rengSpacing * 100)}cm)${suffix}`,
        satuan: 'Batang',
        jumlah: materialTakeoff.rengBatang * mult,
        harga: pReng,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    // 3. Penutup Atap (Standar Toko: Lembar / Keping)
    if (sendCover && materialTakeoff.roofArea > 0) {
      const isSheet = coveringType === 'metal_pasir' || coveringType === 'spandek';
      const storeUnit = isSheet ? 'Lembar' : 'Keping';
      const storeQty = coveringType === 'metal_pasir'
        ? Math.ceil(materialTakeoff.roofArea * 1.62)
        : coveringType === 'spandek'
        ? Math.ceil(materialTakeoff.roofArea / 6)
        : coveringType === 'genteng_beton'
        ? Math.ceil(materialTakeoff.roofArea * 10.5)
        : Math.ceil(materialTakeoff.roofArea * 14.0);

      const storePrice = pCover > 0
        ? (coveringType === 'spandek' ? pCover * 6 : (coveringType === 'metal_pasir' ? Math.round(pCover / 1.62) : Math.round(pCover / (coveringType === 'genteng_beton' ? 10.5 : 14))))
        : pCover;

      itemsToSend.push({
        category: 'atap',
        label: `Penutup Atap ${coveringType.replace('_', ' ').toUpperCase()} (${formatNumber(materialTakeoff.roofArea, 1)} m²)${suffix}`,
        satuan: storeUnit,
        jumlah: storeQty * mult,
        harga: storePrice,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    // 4. Nok / Bubungan (Standar Toko: Keping / Batang)
    if (sendNok && materialTakeoff.ridgeMeters > 0) {
      const nokUnitToko = materialTakeoff.nokUnitLabel === 'batang' ? 'Batang' : 'Keping';
      itemsToSend.push({
        category: 'atap',
        label: `Bubungan / Nok Atap: ${materialTakeoff.nokTypeName} (${formatNumber(materialTakeoff.ridgeMeters, 1)} m')${suffix}`,
        satuan: nokUnitToko,
        jumlah: materialTakeoff.nokPieces * mult,
        harga: pNok,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    // 5. Lisplang GRC / Kayu
    if (sendLisplang && materialTakeoff.lisplangMeters > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Lisplang Atap: ${materialTakeoff.lisplangTypeName} (${formatNumber(materialTakeoff.lisplangMeters, 1)} m' ≈ ${materialTakeoff.lisplangLembar} ${materialTakeoff.lisplangUnitLabel})${suffix}`,
        satuan: materialTakeoff.lisplangUnitLabel === 'lembar' ? 'Lembar' : 'Batang',
        jumlah: materialTakeoff.lisplangLembar * mult,
        harga: pLisplang,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    // 6. Talang Air Hujan / Seng Jurai
    if (sendTalang && materialTakeoff.talangMeters > 0) {
      itemsToSend.push({
        category: 'atap',
        label: `Talang Air Hujan: ${materialTakeoff.talangTypeName} incl. ${materialTakeoff.talangBracket} Bracket & ${materialTakeoff.talangCorong} Corong Pipa Turun (${formatNumber(materialTakeoff.talangMeters, 1)} m')${suffix}`,
        satuan: 'Batang',
        jumlah: materialTakeoff.talangBatang * mult,
        harga: pTalang,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    // 7. Sekrup / Baut SDS Baja Ringan
    if (sendSekrup && materialTakeoff.totalScrews > 0) {
      const isDus = sekrupUnit === 'dus';
      const screwQty = isDus ? materialTakeoff.sekrupDus * mult : materialTakeoff.totalScrews * mult;
      const screwPrice = isDus ? (pSekrup * 1000) : pSekrup;

      itemsToSend.push({
        category: 'atap',
        label: `Baut Sekrup SDS (Self-Drilling Screw) Baja Ringan & Roofing Hex Head${suffix}`,
        satuan: isDus ? 'Dus' : 'Buah',
        jumlah: screwQty,
        harga: screwPrice,
        source: 'Studio Rangka Kuda-Kuda'
      });
    }

    if (itemsToSend.length === 0) {
      showToast("Pilih minimal satu item material untuk dikirim ke BoQ.", "warning");
      return;
    }

    queueCalculatedItems(itemsToSend, () => {
      showToast("Hasil rancangan geometri kuda-kuda, nok, lisplang, talang air & sekrup berhasil dikirim ke antrian BoQ!", "success");
    });
  };

  // ==================== SVG ELEVASI 2D SCALER ====================
  const elevSvgWidth = 840;
  const elevAvailWidth = 660;
  const elevBaselineY = 280;
  const elevCenterX = elevSvgWidth / 2;
  const totalWidth = L + 2 * O;

  const elevPPM = viewMode === 'fixed'
    ? 44
    : elevAvailWidth / Math.max(totalWidth, 3);

  const scaleElevX = (x) => elevCenterX + (x - L / 2) * elevPPM;
  const scaleElevY = (y) => elevBaselineY - y * elevPPM;

  const peakY = scaleElevY(trussGeometry.H);
  const minTopY = Math.min(20, Math.floor(peakY - 35));
  const elevViewHeight = Math.max(360, (elevBaselineY + 95) - minTopY);

  // ==================== SVG DENAH TAMPAK ATAS 2D SCALER ====================
  const planSvgWidth = 840;
  const planSvgHeight = 490;
  const planCenterX = planSvgWidth / 2;
  const planCenterY = planSvgHeight / 2;

  // Dimensi bidang atap di denah (Panjang X: P + gable overhang 2x0.6m; Lebar Y: L + eave overhang 2xO)
  const gableOverhang = 0.6;
  const roofTotalLengthX = P + (2 * gableOverhang);
  const roofTotalWidthY = L + (2 * O);

  const planPPM = viewMode === 'fixed'
    ? 30
    : Math.min(680 / roofTotalLengthX, 360 / roofTotalWidthY);

  const planX = (x) => planCenterX + (x - P / 2) * planPPM;
  const planY = (y) => planCenterY + (y - L / 2) * planPPM;

  // Daftar posisi koordinat X kuda-kuda
  const trussPositions = useMemo(() => {
    const list = [];
    const count = materialTakeoff.trussCount;
    for (let i = 0; i < count; i++) {
      let xPos = i * S;
      if (i === count - 1) xPos = P; // kunci kuda-kuda terakhir persis di ujung dinding ringbalk
      list.push({ index: i + 1, x: xPos });
    }
    return list;
  }, [P, S, materialTakeoff.trussCount]);

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ==================== CONTROL & INPUT PARAMETERS ==================== */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-paper-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-900/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base sm:text-lg uppercase tracking-wide text-paper-900 flex items-center gap-2">
                <span>Studio Geometri Kuda-Kuda Interaktif</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">
                  BOM Komprehensif SNI
                </span>
              </h2>
              <p className="text-xs text-paper-600">
                Hitung struktur kuda-kuda, nok bubungan, lisplang, talang air hujan, dan sekrup roofing dengan visualisasi 2D Muka & Atap.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-700 bg-paper-100 px-3 py-1.5 rounded-xl border border-paper-200">
              Tinggi Puncak H: {formatNumber(trussGeometry.H, 2)} m
            </span>
            <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-200">
              {materialTakeoff.trussCount} Kuda-Kuda
            </span>
          </div>
        </div>

        {/* Sub-Tab Navigasi Konfigurasi Input */}
        <div className="flex items-center gap-1.5 p-1 bg-paper-100/80 rounded-2xl border border-paper-200 overflow-x-auto text-xs font-mono">
          {[
            { id: 'geometry', label: '1. Geometri & Profil Rangka', icon: Compass },
            { id: 'roofing', label: '2. Penutup & Nok Bubungan', icon: Layers },
            { id: 'fascia', label: '3. Lisplang GRC / Kayu', icon: Layers3 },
            { id: 'gutter', label: '4. Talang Air Hujan', icon: Droplets },
            { id: 'hardware', label: '5. Sekrup & Aksesoris', icon: Wrench }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeConfigTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveConfigTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-bold whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-cyan-800 shadow-xs border border-paper-300'
                    : 'text-paper-600 hover:text-paper-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-paper-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GEOMETRI & PROFIL RANGKA */}
        {activeConfigTab === 'geometry' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Tipe Profil Kuda-Kuda */}
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-paper-700 mb-2">
                Pilih Tipe Profil Kuda-Kuda:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {[
                  { id: 'fink', name: 'Fink (W-Truss)', desc: 'Standar Baja Ringan' },
                  { id: 'howe', name: 'Howe Truss', desc: 'Vertikal Tekan Zigzag' },
                  { id: 'pratt', name: 'Pratt Truss', desc: 'Diagonal Tarik' },
                  { id: 'king_post', name: 'King Post', desc: 'Bentang Kecil / Kanopi' },
                  { id: 'queen_post', name: 'Queen Post', desc: 'Dua Tiang Penopang' },
                  { id: 'monopitch', name: 'Monopitch (Sandar)', desc: 'Atap Miring 1 Arah' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTrussType(t.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      trussType === t.id
                        ? 'bg-cyan-50 border-cyan-600 ring-2 ring-cyan-500/20 text-cyan-950 font-bold shadow-xs'
                        : 'bg-paper-50 border-paper-200 text-paper-700 hover:bg-white hover:border-paper-300'
                    }`}
                  >
                    <span className="font-heading text-xs uppercase block">{t.name}</span>
                    <span className="text-[10px] font-mono text-paper-500 block mt-1">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Geometri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono bg-paper-50/70 p-4 rounded-2xl border border-paper-200">
              {/* Bentang Bersih L */}
              <div>
                <div className="flex justify-between font-bold text-paper-700 mb-1">
                  <span>Bentang Bersih (L)</span>
                  <span className="text-cyan-700">{L} m</span>
                </div>
                <input 
                  type="range"
                  min="4"
                  max="16"
                  step="0.5"
                  value={span}
                  onChange={e => setSpan(e.target.value)}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <input 
                  type="number"
                  min="3"
                  max="20"
                  step="0.1"
                  value={span}
                  onChange={e => setSpan(e.target.value)}
                  className="mt-1 w-full p-1.5 rounded-lg border border-paper-300 bg-white text-center font-bold"
                />
              </div>

              {/* Kemiringan Derajat Pitch */}
              <div>
                <div className="flex justify-between font-bold text-paper-700 mb-1">
                  <span>Kemiringan (Sudut)</span>
                  <span className="text-cyan-700">{alpha}°</span>
                </div>
                <input 
                  type="range"
                  min="15"
                  max="50"
                  step="1"
                  value={pitch}
                  onChange={e => setPitch(e.target.value)}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <input 
                  type="number"
                  min="15"
                  max="60"
                  value={pitch}
                  onChange={e => setPitch(e.target.value)}
                  className="mt-1 w-full p-1.5 rounded-lg border border-paper-300 bg-white text-center font-bold"
                />
              </div>

              {/* Overhang Tritisan */}
              <div>
                <div className="flex justify-between font-bold text-paper-700 mb-1">
                  <span>Overstek Tritisan (O)</span>
                  <span className="text-cyan-700">{O} m</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={overhang}
                  onChange={e => setOverhang(e.target.value)}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <input 
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={overhang}
                  onChange={e => setOverhang(e.target.value)}
                  className="mt-1 w-full p-1.5 rounded-lg border border-paper-300 bg-white text-center font-bold"
                />
              </div>

              {/* Panjang Bangunan P */}
              <div>
                <div className="flex justify-between font-bold text-paper-700 mb-1">
                  <span>Panjang Bangunan (P)</span>
                  <span className="text-cyan-700">{P} m</span>
                </div>
                <input 
                  type="range"
                  min="4"
                  max="30"
                  step="1"
                  value={buildingLength}
                  onChange={e => setBuildingLength(e.target.value)}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <input 
                  type="number"
                  min="2"
                  max="60"
                  step="0.5"
                  value={buildingLength}
                  onChange={e => setBuildingLength(e.target.value)}
                  className="mt-1 w-full p-1.5 rounded-lg border border-paper-300 bg-white text-center font-bold"
                />
              </div>

              {/* Jarak Antar Kuda-Kuda S */}
              <div>
                <div className="flex justify-between font-bold text-paper-700 mb-1">
                  <span>Jarak Kuda-Kuda (S)</span>
                  <span className="text-cyan-700">{S} m</span>
                </div>
                <input 
                  type="range"
                  min="0.8"
                  max="1.8"
                  step="0.1"
                  value={trussSpacing}
                  onChange={e => setTrussSpacing(e.target.value)}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <div className="mt-1 p-1.5 rounded-lg bg-white border border-paper-300 text-center font-bold text-slate-800">
                  {materialTakeoff.trussCount} Unit Kuda-Kuda
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PENUTUP ATAP & NOK BUBUNGAN */}
        {activeConfigTab === 'roofing' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box Penutup Atap */}
              <div className="p-4 rounded-2xl bg-paper-50 border border-paper-200 space-y-3 font-mono text-xs">
                <span className="font-bold text-paper-800 uppercase block flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  Spesifikasi Penutup Atap
                </span>

                <div>
                  <label className="block text-[10.5px] text-paper-600 uppercase mb-1">Jenis Lembar Penutup Atap</label>
                  <select
                    value={coveringType}
                    onChange={e => setCoveringType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-paper-300 bg-white font-bold text-slate-800"
                  >
                    <option value="metal_pasir">Genteng Metal Pasir (Jarak Reng 38.5cm)</option>
                    <option value="spandek">Spandek / Zincalume (Jarak Reng 60cm)</option>
                    <option value="genteng_beton">Genteng Beton (Jarak Reng 33cm)</option>
                    <option value="genteng_keramik">Genteng Keramik (Jarak Reng 26cm)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-paper-500 uppercase">Luas Bidang Atap</label>
                    <span className="font-bold text-paper-900 text-sm">{formatNumber(materialTakeoff.roofArea, 2)} m²</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-paper-500 uppercase">Panjang Rafter</label>
                    <span className="font-bold text-paper-900 text-sm">{formatNumber(materialTakeoff.slopeLength, 2)} m</span>
                  </div>
                </div>
              </div>

              {/* Box Nok Bubungan */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Nok / Bubungan Puncak Atap
                  </span>

                  {/* Mode Auto / Manual Toggle */}
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-amber-300 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setNokMode('auto')}
                      className={`px-2 py-0.5 rounded ${nokMode === 'auto' ? 'bg-amber-600 text-white font-bold' : 'text-amber-800'}`}
                    >
                      Auto Geometri
                    </button>
                    <button
                      type="button"
                      onClick={() => setNokMode('manual')}
                      className={`px-2 py-0.5 rounded ${nokMode === 'manual' ? 'bg-amber-600 text-white font-bold' : 'text-amber-800'}`}
                    >
                      Manual (m')
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-amber-800 uppercase mb-1">Tipe Profil Nok</label>
                    <select
                      value={nokType}
                      onChange={e => setNokType(e.target.value)}
                      className="w-full p-2 rounded-xl border border-amber-300 bg-white font-bold text-slate-800 text-xs"
                    >
                      {Object.values(NOK_TYPES).map(n => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>

                  {nokMode === 'manual' ? (
                    <div>
                      <label className="block text-[10px] text-amber-800 uppercase mb-1">Panjang Manual (m')</label>
                      <input 
                        type="number"
                        step="0.5"
                        value={nokManual}
                        onChange={e => setNokManual(e.target.value)}
                        className="w-full p-2 rounded-xl border border-amber-300 bg-white font-bold text-amber-900"
                        placeholder="Contoh: 14.5"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] text-amber-800 uppercase mb-1">Panjang Bubungan Efektif</label>
                      <div className="p-2 rounded-xl bg-amber-100/70 border border-amber-300 font-bold text-amber-950">
                        {formatNumber(materialTakeoff.ridgeMeters, 2)} meter lari
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-[11px] text-amber-950 flex items-center justify-between">
                  <span>Hasil Estimasi Kebutuhan Nok:</span>
                  <span className="font-bold text-amber-800">
                    {materialTakeoff.nokPieces} {materialTakeoff.nokUnitLabel} ({formatNumber(materialTakeoff.ridgeMeters, 1)} m')
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LISPLANG GRC / KAYU */}
        {activeConfigTab === 'fascia' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkLisplangActive"
                    checked={lisplangActive}
                    onChange={e => setLisplangActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="chkLisplangActive" className="font-bold text-emerald-950 uppercase cursor-pointer flex items-center gap-1.5">
                    <Layers3 className="w-4 h-4 text-emerald-700" />
                    Pasang Lisplang Tepian Atap (Fascia Board)
                  </label>
                </div>

                <div className="flex items-center bg-white p-0.5 rounded-lg border border-emerald-300 text-[10px]">
                  <button
                    type="button"
                    disabled={!lisplangActive}
                    onClick={() => setLisplangMode('auto')}
                    className={`px-2 py-0.5 rounded ${lisplangMode === 'auto' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-800'}`}
                  >
                    Auto Keliling
                  </button>
                  <button
                    type="button"
                    disabled={!lisplangActive}
                    onClick={() => setLisplangMode('manual')}
                    className={`px-2 py-0.5 rounded ${lisplangMode === 'manual' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-800'}`}
                  >
                    Manual Meter
                  </button>
                </div>
              </div>

              {lisplangActive ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-emerald-800 uppercase mb-1">Tipe Material Lisplang</label>
                      <select
                        value={lisplangType}
                        onChange={e => setLisplangType(e.target.value)}
                        className="w-full p-2 rounded-xl border border-emerald-300 bg-white font-bold text-slate-800 text-xs"
                      >
                        {Object.values(LISPLANG_TYPES).map(lp => (
                          <option key={lp.id} value={lp.id}>{lp.name}</option>
                        ))}
                      </select>
                    </div>

                    {lisplangMode === 'manual' ? (
                      <div>
                        <label className="block text-[10px] text-emerald-800 uppercase mb-1">Panjang Lisplang Manual (m')</label>
                        <input 
                          type="number"
                          step="0.5"
                          value={lisplangManual}
                          onChange={e => setLisplangManual(e.target.value)}
                          className="w-full p-2 rounded-xl border border-emerald-300 bg-white font-bold text-emerald-900"
                        />
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-emerald-800 uppercase mb-1">Sisi Pemasangan Lisplang (Keliling)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-emerald-200 cursor-pointer">
                            <input type="checkbox" checked={lisplangSisiDepan} onChange={e => setLisplangSisiDepan(e.target.checked)} className="rounded text-emerald-600" />
                            <span>Tritis Depan</span>
                          </label>
                          {trussType !== 'monopitch' && (
                            <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-emerald-200 cursor-pointer">
                              <input type="checkbox" checked={lisplangSisiBelakang} onChange={e => setLisplangSisiBelakang(e.target.checked)} className="rounded text-emerald-600" />
                              <span>Tritis Belakang</span>
                            </label>
                          )}
                          <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-emerald-200 cursor-pointer">
                            <input type="checkbox" checked={lisplangSisiKiri} onChange={e => setLisplangSisiKiri(e.target.checked)} className="rounded text-emerald-600" />
                            <span>Sopi Kiri</span>
                          </label>
                          <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-emerald-200 cursor-pointer">
                            <input type="checkbox" checked={lisplangSisiKanan} onChange={e => setLisplangSisiKanan(e.target.checked)} className="rounded text-emerald-600" />
                            <span>Sopi Kanan</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-emerald-900">Total Kebutuhan Lisplang:</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {materialTakeoff.lisplangLembar} {materialTakeoff.lisplangUnitLabel} &bull; Total {formatNumber(materialTakeoff.lisplangMeters, 1)} m'
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-paper-500 italic">
                  Lisplang dinonaktifkan. Centang opsi di atas untuk mengaktifkan perhitungan dan visualisasi.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TALANG AIR HUJAN & SENG JURAI */}
        {activeConfigTab === 'gutter' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkTalangActive"
                    checked={talangActive}
                    onChange={e => setTalangActive(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 cursor-pointer"
                  />
                  <label htmlFor="chkTalangActive" className="font-bold text-cyan-950 uppercase cursor-pointer flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-cyan-600" />
                    Pasang Talang Air Hujan / Seng Jurai Atap
                  </label>
                </div>

                <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold border border-cyan-200">
                  {talangActive ? 'Aktif di Tampak Atas' : 'Nonaktif'}
                </span>
              </div>

              {talangActive ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-cyan-800 uppercase mb-1">Tipe Profil Talang</label>
                      <select
                        value={talangType}
                        onChange={e => setTalangType(e.target.value)}
                        className="w-full p-2 rounded-xl border border-cyan-300 bg-white font-bold text-slate-800 text-xs"
                      >
                        {Object.values(TALANG_TYPES).map(tl => (
                          <option key={tl.id} value={tl.id}>{tl.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-cyan-800 uppercase mb-1">Posisi / Sisi Talang</label>
                      <select
                        value={talangLoc}
                        onChange={e => setTalangLoc(e.target.value)}
                        className="w-full p-2 rounded-xl border border-cyan-300 bg-white font-bold text-slate-800 text-xs"
                      >
                        {trussType !== 'monopitch' ? (
                          <>
                            <option value="both_eaves">Kedua Sisi Tritisan (Depan & Belakang)</option>
                            <option value="front_only">Sisi Depan Saja</option>
                            <option value="back_only">Sisi Belakang Saja</option>
                          </>
                        ) : (
                          <option value="front_only">Sisi Tritisan Bawah Sandar</option>
                        )}
                        <option value="manual">Custom Panjang Manual (m')</option>
                      </select>
                    </div>

                    {talangLoc === 'manual' && (
                      <div>
                        <label className="block text-[10px] text-cyan-800 uppercase mb-1">Panjang Talang Manual (m')</label>
                        <input 
                          type="number"
                          step="0.5"
                          value={talangManual}
                          onChange={e => setTalangManual(e.target.value)}
                          className="w-full p-2 rounded-xl border border-cyan-300 bg-white font-bold text-cyan-900"
                        />
                      </div>
                    )}
                  </div>

                  {/* Rincian Komponen Talang Air */}
                  <div className="p-3 rounded-2xl bg-white border border-cyan-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2 rounded-xl bg-cyan-50/50">
                      <span className="text-[10px] text-cyan-700 block uppercase">Batang Talang</span>
                      <span className="text-base font-bold text-cyan-950">{materialTakeoff.talangBatang} btg</span>
                      <span className="text-[9.5px] text-cyan-600 block">Total {formatNumber(materialTakeoff.talangMeters, 1)} m'</span>
                    </div>

                    <div className="p-2 rounded-xl bg-cyan-50/50">
                      <span className="text-[10px] text-cyan-700 block uppercase">Bracket Gantungan</span>
                      <span className="text-base font-bold text-cyan-950">{materialTakeoff.talangBracket} unit</span>
                      <span className="text-[9.5px] text-cyan-600 block">Interval ~0.8m</span>
                    </div>

                    <div className="p-2 rounded-xl bg-cyan-50/50">
                      <span className="text-[10px] text-cyan-700 block uppercase">Corong Drop Outlet</span>
                      <span className="text-base font-bold text-cyan-950">{materialTakeoff.talangCorong} unit</span>
                      <span className="text-[9.5px] text-cyan-600 block">Pipa Tegak Ø3"</span>
                    </div>

                    <div className="p-2 rounded-xl bg-cyan-50/50">
                      <span className="text-[10px] text-cyan-700 block uppercase">Aksesoris Tutup & Sambung</span>
                      <span className="text-base font-bold text-cyan-950">{materialTakeoff.talangTutup} Tutup / {materialTakeoff.talangSambungan} Sok</span>
                      <span className="text-[9.5px] text-cyan-600 block">End cap & joint</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-paper-500 italic">
                  Talang air dinonaktifkan. Centang checkbox di atas untuk mengaktifkan kalkulasi dan visualisasi denah atas.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SEKRUP & FASTENER ROOFING */}
        {activeConfigTab === 'hardware' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-700" />
                  Rincian Kebutuhan Baut Sekrup SDS (Self-Drilling Screw) Baja Ringan
                </span>

                <div className="flex items-center gap-2">
                  <label className="text-[10.5px] text-amber-800">Satuan Output:</label>
                  <select
                    value={sekrupUnit}
                    onChange={e => setSekrupUnit(e.target.value)}
                    className="p-1 rounded-lg border border-amber-300 bg-white font-bold text-amber-950 text-xs"
                  >
                    <option value="buah">Buah (Pcs)</option>
                    <option value="dus">Dus (@1.000 pcs)</option>
                  </select>
                </div>
              </div>

              {/* Rincian Komponen Baut */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-paper-500 uppercase block">Rangka Truss C75</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{materialTakeoff.screwsTruss} pcs</span>
                  <span className="text-[9px] text-paper-400 block">Hex 10x19 / 12x20</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-paper-500 uppercase block">Reng Asimetris</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{materialTakeoff.screwsReng} pcs</span>
                  <span className="text-[9px] text-paper-400 block">Wafer Head 10x16</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-paper-500 uppercase block">Penutup Atap</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{materialTakeoff.screwsRoof} pcs</span>
                  <span className="text-[9px] text-paper-400 block">Hex + EPDM Washer</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-paper-500 uppercase block">Lisplang</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{materialTakeoff.screwsLisplang} pcs</span>
                  <span className="text-[9px] text-paper-400 block">Sekrup GRC / Kayu</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="text-[10px] text-paper-500 uppercase block">Bracket Talang</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{materialTakeoff.screwsTalang} pcs</span>
                  <span className="text-[9px] text-paper-400 block">Pengunci Gantungan</span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-100/60 border border-amber-300">
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">Grand Total</span>
                  <span className="text-sm font-black text-amber-950 mt-0.5 block">
                    {sekrupUnit === 'dus' ? `${materialTakeoff.sekrupDus} Dus` : `${materialTakeoff.totalScrews} Pcs`}
                  </span>
                  <span className="text-[9px] text-amber-700 block">Safety loss +5%</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==================== REAL-TIME INTERACTIVE SVG BLUEPRINT CANVAS ==================== */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5 sm:p-7 shadow-2xl text-white space-y-4 overflow-hidden relative">
        
        {/* Canvas Toolbar & Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 min-h-[44px]">
          {/* Switcher Tampak Muka 2D vs Tampak Atas 2D */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveViewTab('elevation')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold ${
                activeViewTab === 'elevation'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📐 Tampak Muka 2D (Elevasi Kuda-Kuda)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('plan')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold ${
                activeViewTab === 'plan'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏠 Tampak Atas 2D (Layout Kuda-Kuda & Talang Air)</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
            {/* View Mode Toggle: Skala Tetap vs Auto-Fit */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10.5px]">
              <button
                type="button"
                onClick={() => setViewMode('fixed')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'fixed'
                    ? 'bg-cyan-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Skala CAD Tetap: Kamera diam dan tidak bergetar saat mengubah bentang (anti motion sickness)"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Skala Tetap</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('fit')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'fit'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Auto-Fit: Memperbesar rangka agar selalu memenuhi lebar layar"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Auto-Fit</span>
              </button>
            </div>

            {/* Hover Info Tooltip Bar */}
            <div className="h-8 flex items-center">
              {activeViewTab === 'elevation' ? (
                hoveredMember ? (
                  <div className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shrink-0" />
                    <span><strong>{hoveredMember.name}</strong>: {formatNumber(hoveredMember.len, 2)} meter</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic px-3 py-1 flex items-center text-[11px]">
                    Arahkan kursor pada batang rangka untuk melihat panjang
                  </span>
                )
              ) : (
                hoveredPlanItem ? (
                  <div className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shrink-0" />
                    <span><strong>{hoveredPlanItem.title}</strong>: {hoveredPlanItem.desc}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic px-3 py-1 flex items-center text-[11px]">
                    Arahkan kursor pada kuda-kuda, nok, lisplang, atau talang air
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: ELEVASI MUKA 2D (ELEVATION VIEW)                  */}
        {/* ========================================================= */}
        {activeViewTab === 'elevation' && (
          <div className="w-full overflow-x-auto custom-scrollbar flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800/80 p-2">
            <svg 
              viewBox={`0 ${minTopY} ${elevSvgWidth} ${elevViewHeight}`} 
              className="w-full max-w-[850px] h-auto select-none"
            >
              <defs>
                <pattern id="cadGridElev" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect x="0" y={minTopY} width={elevSvgWidth} height={elevViewHeight} fill="url(#cadGridElev)" className="pointer-events-none" />

              {/* Dinding Penopang Ringbalk */}
              <rect 
                x={scaleElevX(0) - 10} 
                y={scaleElevY(0)} 
                width="20" 
                height="40" 
                fill="#334155" 
                stroke="#64748b" 
                strokeWidth="1.5" 
                className="pointer-events-none"
              />
              <rect 
                x={scaleElevX(L) - 10} 
                y={scaleElevY(0)} 
                width="20" 
                height="40" 
                fill="#334155" 
                stroke="#64748b" 
                strokeWidth="1.5" 
                className="pointer-events-none"
              />

              {/* Label Dinding */}
              <text x={scaleElevX(0)} y={scaleElevY(0) + 52} fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle" className="pointer-events-none">
                Ringbalk Kiri
              </text>
              <text x={scaleElevX(L)} y={scaleElevY(0) + 52} fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle" className="pointer-events-none">
                Ringbalk Kanan
              </text>

              {/* Garis Ukur Bentang L */}
              <line 
                x1={scaleElevX(0)} 
                y1={scaleElevY(0) + 25} 
                x2={scaleElevX(L)} 
                y2={scaleElevY(0) + 25} 
                stroke="#38bdf8" 
                strokeWidth="1.2" 
                strokeDasharray="4 2"
                className="pointer-events-none"
              />
              <text 
                x={(scaleElevX(0) + scaleElevX(L)) / 2} 
                y={scaleElevY(0) + 22} 
                fill="#38bdf8" 
                fontSize="11" 
                fontFamily="monospace" 
                fontWeight="bold" 
                textAnchor="middle"
                className="pointer-events-none"
              >
                Bentang Bersih (L) = {L.toFixed(2)} m
              </text>

              {/* Garis Ukur Tinggi H */}
              {trussType !== 'monopitch' ? (
                <>
                  <line 
                    x1={scaleElevX(L / 2)} 
                    y1={scaleElevY(0)} 
                    x2={scaleElevX(L / 2)} 
                    y2={scaleElevY(trussGeometry.H)} 
                    stroke="#fbbf24" 
                    strokeWidth="1" 
                    strokeDasharray="3 3"
                    className="pointer-events-none"
                  />
                  <text 
                    x={scaleElevX(L / 2) + 8} 
                    y={(scaleElevY(0) + scaleElevY(trussGeometry.H)) / 2} 
                    fill="#fbbf24" 
                    fontSize="10" 
                    fontFamily="monospace" 
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    H = {trussGeometry.H.toFixed(2)} m
                  </text>
                </>
              ) : (
                <>
                  <line 
                    x1={scaleElevX(L) + 25} 
                    y1={scaleElevY(0)} 
                    x2={scaleElevX(L) + 25} 
                    y2={scaleElevY(trussGeometry.H)} 
                    stroke="#fbbf24" 
                    strokeWidth="1" 
                    strokeDasharray="3 3"
                    className="pointer-events-none"
                  />
                  <text 
                    x={scaleElevX(L) + 32} 
                    y={(scaleElevY(0) + scaleElevY(trussGeometry.H)) / 2} 
                    fill="#fbbf24" 
                    fontSize="10" 
                    fontFamily="monospace" 
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    H = {trussGeometry.H.toFixed(2)} m
                  </text>
                </>
              )}

              {/* Indikator Sudut Kemiringan Atap */}
              <text 
                x={scaleElevX(0) + 30} 
                y={scaleElevY(0) - 8} 
                fill="#4ade80" 
                fontSize="10" 
                fontFamily="monospace" 
                fontWeight="bold"
                className="pointer-events-none"
              >
                α = {alpha}°
              </text>

              {/* Indikator Posisi Talang Air di Ujung Tritisan (Jika Aktif) */}
              {talangActive && (
                <>
                  {/* Talang Kiri */}
                  <g className="pointer-events-none">
                    <circle cx={scaleElevX(-O)} cy={scaleElevY(-O * Math.tan(trussGeometry.rad))} r="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x={scaleElevX(-O) - 10} y={scaleElevY(-O * Math.tan(trussGeometry.rad)) + 14} fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="end">
                      Talang Air
                    </text>
                  </g>
                  {/* Talang Kanan */}
                  {trussType !== 'monopitch' && (
                    <g className="pointer-events-none">
                      <circle cx={scaleElevX(L + O)} cy={scaleElevY(-O * Math.tan(trussGeometry.rad))} r="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x={scaleElevX(L + O) + 10} y={scaleElevY(-O * Math.tan(trussGeometry.rad)) + 14} fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="start">
                        Talang Air
                      </text>
                    </g>
                  )}
                </>
              )}

              {/* BATANG-BATANG RANGKA (MEMBERS) */}
              {trussGeometry.members.map((m) => {
                const isHovered = hoveredMember?.id === m.id;
                let strokeColor = '#38bdf8'; // top chord
                let strokeW = 3.5;

                if (m.role === 'bottom') {
                  strokeColor = '#60a5fa'; // bottom chord
                  strokeW = 3.5;
                } else if (m.role === 'web') {
                  strokeColor = '#f59e0b'; // amber web
                  strokeW = 2.5;
                }

                if (isHovered) {
                  strokeColor = '#ffffff';
                  strokeW = 5.5;
                }

                return (
                  <g 
                    key={m.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredMember(m)}
                    onMouseLeave={() => setHoveredMember(null)}
                  >
                    <line 
                      x1={scaleElevX(m.x1)} 
                      y1={scaleElevY(m.y1)} 
                      x2={scaleElevX(m.x2)} 
                      y2={scaleElevY(m.y2)} 
                      stroke="transparent" 
                      strokeWidth="22" 
                    />
                    <line 
                      x1={scaleElevX(m.x1)} 
                      y1={scaleElevY(m.y1)} 
                      x2={scaleElevX(m.x2)} 
                      y2={scaleElevY(m.y2)} 
                      stroke={strokeColor} 
                      strokeWidth={strokeW} 
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* TITIK SIMPUL (NODES) */}
              {trussGeometry.members.map((m) => (
                <React.Fragment key={`node-${m.id}`}>
                  <circle cx={scaleElevX(m.x1)} cy={scaleElevY(m.y1)} r="3.5" fill="#f8fafc" stroke="#0284c7" strokeWidth="1.5" className="pointer-events-none" />
                  <circle cx={scaleElevX(m.x2)} cy={scaleElevY(m.y2)} r="3.5" fill="#f8fafc" stroke="#0284c7" strokeWidth="1.5" className="pointer-events-none" />
                </React.Fragment>
              ))}

            </svg>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: DENAH TAMPAK ATAS 2D (TOP-DOWN PLAN VIEW)         */}
        {/* ========================================================= */}
        {activeViewTab === 'plan' && (
          <div className="w-full overflow-x-auto custom-scrollbar flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800/80 p-2">
            <svg 
              viewBox={`0 0 ${planSvgWidth} ${planSvgHeight}`} 
              className="w-full max-w-[850px] h-auto select-none"
            >
              <defs>
                <pattern id="cadGridPlan" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
                {/* Crosshatch untuk denah dinding ringbalk */}
                <pattern id="planWallHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#334155" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="0" y="0" width={planSvgWidth} height={planSvgHeight} fill="url(#cadGridPlan)" className="pointer-events-none" />

              {/* 1. DINDING RINGBALK PENUMPU (BEARING WALL OUTLINE) */}
              <g 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPlanItem({
                  title: 'Ringbalk Dinding Penumpu',
                  desc: `Luas Bangunan ${P}m × ${L}m = ${(P * L).toFixed(1)} m² (Penopang Kuda-Kuda)`
                })}
                onMouseLeave={() => setHoveredPlanItem(null)}
              >
                <rect 
                  x={planX(0)} 
                  y={planY(0)} 
                  width={P * planPPM} 
                  height={L * planPPM} 
                  fill="url(#planWallHatch)"
                  stroke="#64748b" 
                  strokeWidth="1.8" 
                  strokeDasharray="6 4"
                />
                <text 
                  x={planX(P / 2)} 
                  y={planY(L / 2) + 20} 
                  fill="#64748b" 
                  fontSize="10" 
                  fontFamily="monospace" 
                  fontWeight="bold" 
                  textAnchor="middle" 
                  className="pointer-events-none select-none opacity-80"
                >
                  DENAH RINGBALK DINDING PENUMPU ({P}m × {L}m)
                </text>
              </g>

              {/* 2. TEPIAN BIDANG ATAP & LISPLANG KELILING (ROOF PERIMETER) */}
              <g 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPlanItem({
                  title: 'Lisplang Keliling Bidang Atap',
                  desc: lisplangActive 
                    ? `${materialTakeoff.lisplangTypeName} (${formatNumber(materialTakeoff.lisplangMeters, 1)} m' ≈ ${materialTakeoff.lisplangLembar} ${materialTakeoff.lisplangUnitLabel})`
                    : 'Lisplang Nonaktif'
                })}
                onMouseLeave={() => setHoveredPlanItem(null)}
              >
                <rect 
                  x={planX(-gableOverhang)} 
                  y={planY(-O)} 
                  width={roofTotalLengthX * planPPM} 
                  height={roofTotalWidthY * planPPM} 
                  fill="none" 
                  stroke={lisplangActive ? '#10b981' : '#475569'} 
                  strokeWidth={lisplangActive ? '2.8' : '1.5'} 
                  strokeDasharray={lisplangActive ? 'none' : '4 2'}
                />
              </g>

              {/* 3. LAJUR RENG ASIMETRIS R-32 (PURLIN LINES) */}
              {Array.from({ length: Math.min(16, materialTakeoff.totalRengLines) }).map((_, rIdx) => {
                const stepY = (roofTotalWidthY / (materialTakeoff.totalRengLines + 1));
                const yPos = -O + (rIdx + 1) * stepY;
                return (
                  <line 
                    key={`reng-${rIdx}`}
                    x1={planX(-gableOverhang)}
                    y1={planY(yPos)}
                    x2={planX(P + gableOverhang)}
                    y2={planY(yPos)}
                    stroke="#334155"
                    strokeWidth="0.9"
                    opacity="0.5"
                    className="pointer-events-none"
                  />
                );
              })}

              {/* 4. IKATAN ANGIN (X-BRACING) DI BAY UJUNG KIRI & KANAN */}
              {trussPositions.length >= 2 && (
                <g className="pointer-events-none opacity-70">
                  {/* Bay Ujung Kiri */}
                  <line x1={planX(0)} y1={planY(-O)} x2={planX(trussPositions[1].x)} y2={planY(L / 2)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1={planX(0)} y1={planY(L / 2)} x2={planX(trussPositions[1].x)} y2={planY(-O)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1={planX(0)} y1={planY(L / 2)} x2={planX(trussPositions[1].x)} y2={planY(L + O)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1={planX(0)} y1={planY(L + O)} x2={planX(trussPositions[1].x)} y2={planY(L / 2)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />

                  {/* Bay Ujung Kanan */}
                  {trussPositions.length > 2 && (
                    <>
                      <line x1={planX(trussPositions[trussPositions.length - 2].x)} y1={planY(-O)} x2={planX(P)} y2={planY(L / 2)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                      <line x1={planX(trussPositions[trussPositions.length - 2].x)} y1={planY(L / 2)} x2={planX(P)} y2={planY(-O)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                      <line x1={planX(trussPositions[trussPositions.length - 2].x)} y1={planY(L / 2)} x2={planX(P)} y2={planY(L + O)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                      <line x1={planX(trussPositions[trussPositions.length - 2].x)} y1={planY(L + O)} x2={planX(P)} y2={planY(L / 2)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                    </>
                  )}
                </g>
              )}

              {/* 5. GARIS KUDA-KUDA UTAMA (TRUSSES K1 ... KN) */}
              {trussPositions.map((tp) => {
                const isHovered = hoveredPlanItem?.type === 'truss' && hoveredPlanItem.index === tp.index;
                return (
                  <g 
                    key={`truss-plan-${tp.index}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPlanItem({
                      type: 'truss',
                      index: tp.index,
                      title: `Kuda-Kuda K-${tp.index}`,
                      desc: `Profil ${trussType.toUpperCase()} | Bentang L=${L}m | Posisi x=${tp.x.toFixed(2)}m`
                    })}
                    onMouseLeave={() => setHoveredPlanItem(null)}
                  >
                    {/* Hit area tebal */}
                    <line 
                      x1={planX(tp.x)} 
                      y1={planY(-O)} 
                      x2={planX(tp.x)} 
                      y2={planY(L + O)} 
                      stroke="transparent" 
                      strokeWidth="18" 
                    />
                    {/* Batang Kuda-Kuda Rangka Utama */}
                    <line 
                      x1={planX(tp.x)} 
                      y1={planY(-O)} 
                      x2={planX(tp.x)} 
                      y2={planY(L + O)} 
                      stroke={isHovered ? '#ffffff' : '#38bdf8'} 
                      strokeWidth={isHovered ? '5' : '3.2'} 
                      strokeLinecap="round"
                    />

                    {/* Tumpuan Dynabolt di batas ringbalk (kotak kecil) */}
                    <rect x={planX(tp.x) - 3} y={planY(0) - 3} width="6" height="6" fill="#0284c7" stroke="#f8fafc" strokeWidth="1" className="pointer-events-none" />
                    <rect x={planX(tp.x) - 3} y={planY(L) - 3} width="6" height="6" fill="#0284c7" stroke="#f8fafc" strokeWidth="1" className="pointer-events-none" />

                    {/* Label Kuda-Kuda (K1, K2, ...) */}
                    <text 
                      x={planX(tp.x)} 
                      y={planY(-O) - 10} 
                      fill={isHovered ? '#ffffff' : '#38bdf8'} 
                      fontSize="9" 
                      fontFamily="monospace" 
                      fontWeight="bold" 
                      textAnchor="middle" 
                      className="pointer-events-none"
                    >
                      K{tp.index}
                    </text>
                  </g>
                );
              })}

              {/* 6. GARIS NOK / BUBUNGAN PUNCAK ATAP (RIDGE LINE) */}
              {trussType !== 'monopitch' ? (
                <g 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPlanItem({
                    type: 'ridge',
                    title: 'Nok / Bubungan Puncak Atap',
                    desc: `${materialTakeoff.nokTypeName} (${formatNumber(materialTakeoff.ridgeMeters, 1)} m' ≈ ${materialTakeoff.nokPieces} ${materialTakeoff.nokUnitLabel})`
                  })}
                  onMouseLeave={() => setHoveredPlanItem(null)}
                >
                  {/* Hit area tebal */}
                  <line 
                    x1={planX(-gableOverhang)} 
                    y1={planY(L / 2)} 
                    x2={planX(P + gableOverhang)} 
                    y2={planY(L / 2)} 
                    stroke="transparent" 
                    strokeWidth="20" 
                  />
                  {/* Garis Nok Kuning Emas Bersinar */}
                  <line 
                    x1={planX(-gableOverhang)} 
                    y1={planY(L / 2)} 
                    x2={planX(P + gableOverhang)} 
                    y2={planY(L / 2)} 
                    stroke="#fbbf24" 
                    strokeWidth="4.5" 
                    strokeDasharray="12 4"
                    strokeLinecap="round"
                  />
                  {/* Badge Label Nok di Tengah */}
                  <rect 
                    x={planX(P / 2) - 100} 
                    y={planY(L / 2) - 9} 
                    width="200" 
                    height="18" 
                    rx="9" 
                    fill="#1e1b4b" 
                    stroke="#fbbf24" 
                    strokeWidth="1.2" 
                    className="pointer-events-none"
                  />
                  <text 
                    x={planX(P / 2)} 
                    y={planY(L / 2) + 3.5} 
                    fill="#fbbf24" 
                    fontSize="9" 
                    fontFamily="monospace" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    className="pointer-events-none"
                  >
                    NOK / BUBUNGAN ({formatNumber(materialTakeoff.ridgeMeters, 1)} m')
                  </text>
                </g>
              ) : (
                /* Atap Sandar: Nok berada di dinding atas */
                <g 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPlanItem({
                    type: 'ridge',
                    title: 'Flashing Puncak Atap Sandar',
                    desc: `Flashing Seng Penutup Dinding Puncak (${P} m')`
                  })}
                  onMouseLeave={() => setHoveredPlanItem(null)}
                >
                  <line 
                    x1={planX(-gableOverhang)} 
                    y1={planY(L + O)} 
                    x2={planX(P + gableOverhang)} 
                    y2={planY(L + O)} 
                    stroke="#fbbf24" 
                    strokeWidth="4" 
                    strokeDasharray="8 3" 
                  />
                </g>
              )}

              {/* 7. TALANG AIR HUJAN (RAIN GUTTER & VALLEYS) DENGAN CORONG PIPA */}
              {talangActive && materialTakeoff.talangMeters > 0 ? (
                <g 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPlanItem({
                    type: 'gutter',
                    title: 'Talang Air Hujan & Aksesoris',
                    desc: `${materialTakeoff.talangTypeName} | ${formatNumber(materialTakeoff.talangMeters, 1)} m' (${materialTakeoff.talangBatang} btg) | ${materialTakeoff.talangBracket} Bracket | ${materialTakeoff.talangCorong} Corong Pipa Turun`
                  })}
                  onMouseLeave={() => setHoveredPlanItem(null)}
                >
                  {/* SISI BAWAH / DEPAN */}
                  {(talangLoc === 'both_eaves' || talangLoc === 'front_only' || talangLoc === 'manual' || trussType === 'monopitch') && (
                    <>
                      {/* U-Channel Backdrop */}
                      <line 
                        x1={planX(-gableOverhang)} 
                        y1={planY(L + O)} 
                        x2={planX(P + gableOverhang)} 
                        y2={planY(L + O)} 
                        stroke="#0369a1" 
                        strokeWidth="10" 
                        strokeLinecap="square"
                      />
                      {/* Central Gutter Flow Line Cyan Neon */}
                      <line 
                        x1={planX(-gableOverhang)} 
                        y1={planY(L + O)} 
                        x2={planX(P + gableOverhang)} 
                        y2={planY(L + O)} 
                        stroke="#22d3ee" 
                        strokeWidth="3.5" 
                        strokeDasharray="8 4"
                      />

                      {/* Bracket gantungan di pertemuan dengan kaki kuda-kuda */}
                      {trussPositions.map(tp => (
                        <line 
                          key={`gb-b-${tp.index}`}
                          x1={planX(tp.x)} 
                          y1={planY(L + O) - 6} 
                          x2={planX(tp.x)} 
                          y2={planY(L + O) + 6} 
                          stroke="#ffffff" 
                          strokeWidth="1.8" 
                          className="pointer-events-none"
                        />
                      ))}

                      {/* Corong Pipa Turun Tegak (Drop Outlets) Kiri & Kanan */}
                      <circle cx={planX(-gableOverhang)} cy={planY(L + O)} r="7" fill="#0891b2" stroke="#ffffff" strokeWidth="1.8" className="pointer-events-none" />
                      <text x={planX(-gableOverhang)} y={planY(L + O) + 3} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">↓</text>
                      
                      <circle cx={planX(P + gableOverhang)} cy={planY(L + O)} r="7" fill="#0891b2" stroke="#ffffff" strokeWidth="1.8" className="pointer-events-none" />
                      <text x={planX(P + gableOverhang)} y={planY(L + O) + 3} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">↓</text>

                      {/* Label Teks Talang Sisi Depan */}
                      <text 
                        x={planX(P / 2)} 
                        y={planY(L + O) + 16} 
                        fill="#38bdf8" 
                        fontSize="9" 
                        fontFamily="monospace" 
                        fontWeight="bold" 
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        TALANG AIR HUJAN DEPAN ({materialTakeoff.talangTypeName}) &bull; ↓ Corong Pipa Ø3"
                      </text>
                    </>
                  )}

                  {/* SISI ATAS / BELAKANG (HANYA PELANA) */}
                  {trussType !== 'monopitch' && (talangLoc === 'both_eaves' || talangLoc === 'back_only') && (
                    <>
                      <line 
                        x1={planX(-gableOverhang)} 
                        y1={planY(-O)} 
                        x2={planX(P + gableOverhang)} 
                        y2={planY(-O)} 
                        stroke="#0369a1" 
                        strokeWidth="10" 
                        strokeLinecap="square"
                      />
                      <line 
                        x1={planX(-gableOverhang)} 
                        y1={planY(-O)} 
                        x2={planX(P + gableOverhang)} 
                        y2={planY(-O)} 
                        stroke="#22d3ee" 
                        strokeWidth="3.5" 
                        strokeDasharray="8 4"
                      />

                      {trussPositions.map(tp => (
                        <line 
                          key={`gb-t-${tp.index}`}
                          x1={planX(tp.x)} 
                          y1={planY(-O) - 6} 
                          x2={planX(tp.x)} 
                          y2={planY(-O) + 6} 
                          stroke="#ffffff" 
                          strokeWidth="1.8" 
                          className="pointer-events-none"
                        />
                      ))}

                      <circle cx={planX(-gableOverhang)} cy={planY(-O)} r="7" fill="#0891b2" stroke="#ffffff" strokeWidth="1.8" className="pointer-events-none" />
                      <text x={planX(-gableOverhang)} y={planY(-O) + 3} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">↓</text>
                      
                      <circle cx={planX(P + gableOverhang)} cy={planY(-O)} r="7" fill="#0891b2" stroke="#ffffff" strokeWidth="1.8" className="pointer-events-none" />
                      <text x={planX(P + gableOverhang)} y={planY(-O) + 3} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">↓</text>

                      <text 
                        x={planX(P / 2)} 
                        y={planY(-O) - 18} 
                        fill="#38bdf8" 
                        fontSize="9" 
                        fontFamily="monospace" 
                        fontWeight="bold" 
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        TALANG AIR HUJAN BELAKANG ({materialTakeoff.talangTypeName}) &bull; ↓ Corong Pipa Ø3"
                      </text>
                    </>
                  )}
                </g>
              ) : (
                /* Indikator Jika Talang Nonaktif */
                <text 
                  x={planX(P / 2)} 
                  y={planY(L + O) + 16} 
                  fill="#64748b" 
                  fontSize="8.5" 
                  fontFamily="monospace" 
                  fontStyle="italic" 
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  Tritisan Terbuka Tanpa Talang Air (Aktifkan di Tab "4. Talang Air Hujan")
                </text>
              )}

              {/* 8. DIMENSI UKUR DENAH CAD */}
              {/* Garis Ukur Panjang P */}
              <line 
                x1={planX(0)} 
                y1={planY(-O) - 32} 
                x2={planX(P)} 
                y2={planY(-O) - 32} 
                stroke="#38bdf8" 
                strokeWidth="1.2" 
                strokeDasharray="4 2"
                className="pointer-events-none"
              />
              <text 
                x={planX(P / 2)} 
                y={planY(-O) - 36} 
                fill="#38bdf8" 
                fontSize="10" 
                fontFamily="monospace" 
                fontWeight="bold" 
                textAnchor="middle"
                className="pointer-events-none"
              >
                Panjang Bangunan P = {P.toFixed(2)} m
              </text>

              {/* Garis Ukur Jarak Antar Kuda-Kuda S (antara K1 & K2) */}
              {trussPositions.length >= 2 && (
                <text 
                  x={(planX(trussPositions[0].x) + planX(trussPositions[1].x)) / 2} 
                  y={planY(0) + 14} 
                  fill="#4ade80" 
                  fontSize="8.5" 
                  fontFamily="monospace" 
                  fontWeight="bold" 
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  S = {S.toFixed(1)}m
                </text>
              )}

              {/* Kompas CAD (Arah Utara) di Sudut Kanan Atas */}
              <g transform={`translate(${planSvgWidth - 55}, 45)`} className="pointer-events-none opacity-85">
                <circle cx="0" cy="0" r="18" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                <path d="M 0 -14 L 5 2 L 0 -1 L -5 2 Z" fill="#ef4444" />
                <path d="M 0 14 L 5 -2 L 0 1 L -5 -2 Z" fill="#94a3b8" />
                <text x="0" y="-17" fill="#ef4444" fontSize="9" fontWeight="black" fontFamily="monospace" textAnchor="middle">U</text>
              </g>

            </svg>
          </div>
        )}

        {/* Legend Batang & Elemen Kanvas */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono pt-1 text-slate-300 gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 rounded inline-block" /> Kuda-Kuda Utama (C-75): <strong>{materialTakeoff.trussCount} unit</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-400 rounded inline-block" /> Nok Bubungan: <strong>{formatNumber(materialTakeoff.ridgeMeters, 1)} m'</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-400 rounded inline-block" /> Lisplang: <strong>{materialTakeoff.lisplangActive ? `${formatNumber(materialTakeoff.lisplangMeters, 1)} m'` : 'Nonaktif'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-sky-400 rounded inline-block" /> Talang Air: <strong>{materialTakeoff.talangActive ? `${formatNumber(materialTakeoff.talangMeters, 1)} m'` : 'Nonaktif'}</strong>
            </span>
          </div>

          <div className="text-cyan-300 font-bold">
            Total Batang C-75: {materialTakeoff.c75Batang} btg &bull; Reng: {materialTakeoff.rengBatang} btg
          </div>
        </div>

      </div>

      {/* ==================== BILL OF MATERIALS (BOM) & TAKEOFF ==================== */}
      <div className="rounded-3xl bg-white border border-paper-300 p-5 sm:p-6 shadow-sm space-y-6">
        
        <div className="flex items-center justify-between pb-3 border-b border-paper-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">03</span>
            <h2 className="font-heading text-base font-bold uppercase tracking-wide text-paper-900">
              Kebutuhan Material Hasil Rancangan Kuda-Kuda & Aksesoris Atap
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
            {materialTakeoff.trussCount} Unit Kuda-Kuda (P={P}m &bull; S={S}m)
          </span>
        </div>

        {/* 6 Kartu KPI Hasil Takeoff */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Kanal C-75 */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200 font-mono">
            <span className="text-[10px] font-bold uppercase text-cyan-800 block">Kanal C-75.75</span>
            <span className="text-xl font-black text-cyan-950 mt-1 block">
              {materialTakeoff.c75Batang} <span className="text-xs font-normal">btg</span>
            </span>
            <p className="text-[10px] text-cyan-700 mt-1">
              Total {formatNumber(materialTakeoff.totalTrussC75Meters, 1)} m (incl. bracing)
            </p>
          </div>

          {/* 2. Reng R-32 */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 font-mono">
            <span className="text-[10px] font-bold uppercase text-blue-800 block">Reng Asimetris</span>
            <span className="text-xl font-black text-blue-950 mt-1 block">
              {materialTakeoff.rengBatang} <span className="text-xs font-normal">btg</span>
            </span>
            <p className="text-[10px] text-blue-700 mt-1">
              {materialTakeoff.totalRengLines} lajur &bull; {formatNumber(materialTakeoff.totalRengMeters, 1)} m
            </p>
          </div>

          {/* 3. Penutup Atap */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 font-mono">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Penutup Atap</span>
            <span className="text-xl font-black text-emerald-950 mt-1 block">
              {formatNumber(materialTakeoff.roofArea, 1)} <span className="text-xs font-normal">m²</span>
            </span>
            <p className="text-[10px] text-emerald-700 mt-1">
              {coveringType.replace('_', ' ').toUpperCase()}
            </p>
          </div>

          {/* 4. Nok Bubungan */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 font-mono">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Nok / Bubungan</span>
            <span className="text-xl font-black text-amber-950 mt-1 block">
              {formatNumber(materialTakeoff.ridgeMeters, 1)} <span className="text-xs font-normal">m'</span>
            </span>
            <p className="text-[10px] text-amber-700 mt-1">
              {materialTakeoff.nokPieces} {materialTakeoff.nokUnitLabel}
            </p>
          </div>

          {/* 5. Lisplang */}
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 font-mono">
            <span className="text-[10px] font-bold uppercase text-teal-800 block">Lisplang Keliling</span>
            <span className="text-xl font-black text-teal-950 mt-1 block">
              {materialTakeoff.lisplangActive ? materialTakeoff.lisplangLembar : 0} <span className="text-xs font-normal">{materialTakeoff.lisplangUnitLabel}</span>
            </span>
            <p className="text-[10px] text-teal-700 mt-1">
              {materialTakeoff.lisplangActive ? `${formatNumber(materialTakeoff.lisplangMeters, 1)} m'` : 'Nonaktif'}
            </p>
          </div>

          {/* 6. Talang & Sekrup */}
          <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 font-mono">
            <span className="text-[10px] font-bold uppercase text-sky-800 block">Talang & Sekrup</span>
            <span className="text-xl font-black text-sky-950 mt-1 block">
              {materialTakeoff.talangActive ? `${materialTakeoff.talangBatang} btg` : `${materialTakeoff.totalScrews} pcs`}
            </span>
            <p className="text-[10px] text-sky-700 mt-1">
              {materialTakeoff.talangActive ? `${materialTakeoff.talangCorong} Corong & ${materialTakeoff.talangBracket} Brkt` : `${materialTakeoff.sekrupDus} Dus Sekrup`}
            </p>
          </div>
        </div>

        {/* Input Harga Satuan Referensi Material */}
        <div className="p-4 rounded-2xl bg-paper-50 border border-paper-200 space-y-3">
          <span className="text-xs font-mono font-bold uppercase text-paper-700 block">
            Harga Satuan Acuan BoQ (Rp):
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs font-mono">
            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">C-75 / Btg</label>
              <input 
                type="number"
                value={hargaC75}
                onChange={e => setHargaC75(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">Reng / Btg</label>
              <input 
                type="number"
                value={hargaReng}
                onChange={e => setHargaReng(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">Penutup / m²</label>
              <input 
                type="number"
                value={hargaPenutup}
                onChange={e => setHargaPenutup(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">Nok / m'</label>
              <input 
                type="number"
                value={hargaNok}
                onChange={e => setHargaNok(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">Lisplang / Lbr</label>
              <input 
                type="number"
                value={hargaLisplang}
                onChange={e => setHargaLisplang(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">Talang / Btg</label>
              <input 
                type="number"
                value={hargaTalang}
                onChange={e => setHargaTalang(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-paper-600 uppercase mb-1">Sekrup / Pcs</label>
              <input 
                type="number"
                value={hargaSekrup}
                onChange={e => setHargaSekrup(e.target.value)}
                className="w-full p-2 rounded-xl border border-paper-300 bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Checklist Pengiriman ke BoQ */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-wrap text-xs">
            <span className="font-mono text-paper-600 font-bold uppercase text-[10px]">Item Dikirim ke BoQ:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input type="checkbox" checked={sendC75} onChange={e => setSendC75(e.target.checked)} className="rounded text-cyan-600" />
              <span>Kanal C-75 ({materialTakeoff.c75Batang} btg)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input type="checkbox" checked={sendReng} onChange={e => setSendReng(e.target.checked)} className="rounded text-cyan-600" />
              <span>Reng R-32 ({materialTakeoff.rengBatang} btg)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input type="checkbox" checked={sendCover} onChange={e => setSendCover(e.target.checked)} className="rounded text-cyan-600" />
              <span>Penutup ({formatNumber(materialTakeoff.roofArea, 1)} m²)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input type="checkbox" checked={sendNok} onChange={e => setSendNok(e.target.checked)} className="rounded text-cyan-600" />
              <span>Nok ({formatNumber(materialTakeoff.ridgeMeters, 1)} m')</span>
            </label>

            {materialTakeoff.lisplangActive && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input type="checkbox" checked={sendLisplang} onChange={e => setSendLisplang(e.target.checked)} className="rounded text-cyan-600" />
                <span>Lisplang ({materialTakeoff.lisplangLembar} {materialTakeoff.lisplangUnitLabel})</span>
              </label>
            )}

            {materialTakeoff.talangActive && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input type="checkbox" checked={sendTalang} onChange={e => setSendTalang(e.target.checked)} className="rounded text-cyan-600" />
                <span>Talang Air ({materialTakeoff.talangBatang} btg)</span>
              </label>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input type="checkbox" checked={sendSekrup} onChange={e => setSendSekrup(e.target.checked)} className="rounded text-cyan-600" />
              <span>Sekrup ({sekrupUnit === 'dus' ? `${materialTakeoff.sekrupDus} dus` : `${materialTakeoff.totalScrews} pcs`})</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSendToBoQ}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-heading font-bold text-xs shadow-md shadow-cyan-900/30 transition-all transform hover:-translate-y-0.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Rangka & Aksesoris ke BoQ</span>
          </button>
        </div>

      </div>

    </div>
  );
}
