import * as XLSX from 'xlsx';
import { toRoman } from './formatters.js';
import { calculateMaterialTakeoff } from './materialTakeoff.js';

const SCHEDULE_STORAGE_KEY = 'sr_boq_schedule_config_v2'; // harus sama dengan BoQContext

/**
 * Membaca konfigurasi jadwal aktif dari localStorage jika tidak disediakan langsung
 */
function getActiveScheduleConfig(passedConfig) {
  if (passedConfig && passedConfig.durationWeeks) {
    return passedConfig;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.durationWeeks) return parsed;
      }
    }
  } catch (e) {
    console.error("Gagal membaca jadwal dari storage:", e);
  }
  return {
    durationWeeks: 12,
    startDate: new Date().toISOString().slice(0, 10),
    categorySchedules: {},
    actualProgress: {}
  };
}

/**
 * Ekspor RAB ke Excel (.xlsx) dengan Live Dynamic Formulas & Multi-Sheet:
 * - Sheet 1: Rekapitulasi (dengan rumus live terhubung ke Sheet 2 & bobot %)
 * - Sheet 2: RAB Detail (dengan rumus live per baris D*E dan SUM subtotal)
 * - Sheet 3: Kurva S & Jadwal (bobot mingguan, kumulatif, deviasi)
 * - Sheet 4: Kebutuhan Material (BOM) (Semen 40kg, pasir, split, besi lonjor, HOK)
 */
export function exportBoQToExcel(state, options = {}) {
  const cats = Array.isArray(state?.categories) ? state.categories : [];
  const filledCats = cats
    .map(cat => ({
      id: cat?.id || '',
      name: cat?.name || 'Kategori',
      items: (Array.isArray(cat?.items) ? cat.items : []).filter(it => {
        const u = typeof it?.uraian === 'string' ? it.uraian : (it?.uraian?.uraian || String(it?.uraian || ''));
        return (parseFloat(it?.volume) || 0) > 0 && u && u.trim() !== '';
      })
    }))
    .filter(cat => cat.items.length > 0);

  if (filledCats.length === 0) {
    alert("Belum ada item dengan volume terisi. Isi volume minimal satu item sebelum export.");
    return false;
  }

  const subtotal = filledCats.reduce(
    (s, cat) => s + (Array.isArray(cat?.items) ? cat.items : []).reduce((s2, it) => s2 + (parseFloat(it?.harga) || 0) * (parseFloat(it?.volume) || 0), 0),
    0
  );
  const ppnAmount = state?.ppn ? subtotal * 0.11 : 0;
  const grandTotal = subtotal + ppnAmount;

  const projectName = state.project?.name || "Proyek Bangunan";
  const projectLocation = state.project?.location || "-";
  const projectClient = state.project?.client || "-";
  const projectDate = state.project?.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const scheduleConfig = getActiveScheduleConfig(options.scheduleConfig);
  const takeoffData = calculateMaterialTakeoff(state, { cementPackWeight: 40 });

  /* =========================================================================
   * SHEET 2 DULU DIKALKULASI (AGAR SHEET 1 BISA MERUJUK CELL SHEET 2 DENGAN TEPAT)
   * ========================================================================= */
  const det = [];
  det.push(["RENCANA ANGGARAN BIAYA (RAB) — RINCIAN PEKERJAAN LENGKAP"]);
  det.push(["Nama Proyek", projectName]);
  det.push(["Lokasi", projectLocation]);
  det.push(["Pemilik / Klien", projectClient]);
  det.push(["Tanggal", projectDate]);
  det.push([]);
  det.push(["No", "Uraian Pekerjaan", "Satuan", "Volume", "Harga Satuan (Rp)", "Jumlah Harga (Rp)"]);

  const catSubtotalRows = []; // Menyimpan letak nomor baris subtotal tiap divisi di Sheet 2

  filledCats.forEach((cat, ci) => {
    // Header Kategori
    det.push([toRoman(ci + 1), cat.name.toUpperCase(), "", "", "", ""]);

    const itemStartRow = det.length + 1;

    // Baris Item-item
    cat.items.forEach((it, ii) => {
      const vol = parseFloat(it.volume) || 0;
      const hrg = parseFloat(it.harga) || 0;
      const lineCost = vol * hrg;
      const rowNum = det.length + 1;

      det.push([
        ii + 1,
        it.uraian,
        it.satuan,
        vol,
        hrg,
        { t: 'n', f: `D${rowNum}*E${rowNum}`, v: lineCost, z: '#,##0' }
      ]);
    });

    const itemEndRow = det.length;
    const catSubtotal = (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (parseFloat(it?.harga) || 0) * (parseFloat(it?.volume) || 0), 0);
    const subtotalRowNum = det.length + 1;
    catSubtotalRows.push({ catName: cat.name, rowNum: subtotalRowNum, value: catSubtotal });

    // Baris Subtotal Kategori dengan Live SUM Formula
    det.push([
      "",
      `Sub Total ${cat.name}`,
      "",
      "",
      "",
      { t: 'n', f: `SUM(F${itemStartRow}:F${itemEndRow})`, v: catSubtotal, z: '#,##0' }
    ]);
  });

  // Grand Totals di Sheet 2
  det.push([]);

  const detailSubtotalRowNum = det.length + 1;
  const subtotalSumFormula = catSubtotalRows.map(c => `F${c.rowNum}`).join('+');

  det.push([
    "",
    "",
    "",
    "",
    "SUB TOTAL",
    { t: 'n', f: subtotalSumFormula, v: subtotal, z: '#,##0' }
  ]);

  let detailPpnRowNum = null;
  if (state.ppn) {
    detailPpnRowNum = det.length + 1;
    det.push([
      "",
      "",
      "",
      "",
      "PPN 11%",
      { t: 'n', f: `F${detailSubtotalRowNum}*0.11`, v: ppnAmount, z: '#,##0' }
    ]);
  }

  const grandTotalFormula = detailPpnRowNum 
    ? `F${detailSubtotalRowNum}+F${detailPpnRowNum}` 
    : `F${detailSubtotalRowNum}`;

  det.push([
    "",
    "",
    "",
    "",
    "TOTAL BIAYA KONSTRUKSI",
    { t: 'n', f: grandTotalFormula, v: grandTotal, z: '#,##0' }
  ]);

  const wsDet = XLSX.utils.aoa_to_sheet(det);
  wsDet["!cols"] = [
    { wch: 6 },
    { wch: 46 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 }
  ];
  wsDet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
  ];
  applyCurrencyFormat(wsDet, [3, 4, 5]);

  /* =========================================================================
   * SHEET 1: REKAPITULASI BIAYA (LIVE FORMULA MERUJUK KE SHEET 2 & BOBOT %)
   * ========================================================================= */
  const rekap = [];
  rekap.push(["KONSULTAN PERENCANA & ESTIMATOR: SR STUDIO"]);
  rekap.push(["REKAPITULASI RENCANA ANGGARAN BIAYA (RAB)"]);
  rekap.push([]);
  rekap.push(["Nama Proyek", projectName]);
  rekap.push(["Lokasi", projectLocation]);
  rekap.push(["Pemilik / Klien", projectClient]);
  rekap.push(["Tanggal", projectDate]);
  rekap.push(["Mata Uang", "Indonesian Rupiah (IDR)"]);
  rekap.push([]);
  rekap.push(["No", "Uraian Pekerjaan / Divisi", "Bobot (%)", "Jumlah Harga (Rp)"]);

  const rekapStartRow = rekap.length + 1; // Baris data pertama di Excel (1-indexed)
  const rekapSubtotalRow = rekapStartRow + filledCats.length; // Baris Sub Total

  filledCats.forEach((cat, i) => {
    const rowNum = rekap.length + 1;
    const catDetailRef = catSubtotalRows[i];
    const catCost = catDetailRef ? catDetailRef.value : 0;
    const detailRow = catDetailRef ? catDetailRef.rowNum : 8;

    rekap.push([
      toRoman(i + 1),
      cat.name,
      // Formula Bobot (%): =D{row}/$D${subtotalRow}
      { t: 'n', f: `D${rowNum}/$D$${rekapSubtotalRow}`, v: subtotal > 0 ? catCost / subtotal : 0, z: '0.00%' },
      // Formula Live Cell Reference: ='RAB Detail'!F{detailRow}
      { t: 'n', f: `'RAB Detail'!F${detailRow}`, v: catCost, z: '#,##0' }
    ]);
  });

  const lastCatRow = rekap.length;

  // Baris Subtotal Rekapitulasi
  rekap.push([
    "",
    "SUB TOTAL PEKERJAAN",
    { t: 'n', f: `SUM(C${rekapStartRow}:C${lastCatRow})`, v: 1.0, z: '0.00%' },
    { t: 'n', f: `SUM(D${rekapStartRow}:D${lastCatRow})`, v: subtotal, z: '#,##0' }
  ]);

  let rekapPpnRow = null;
  if (state.ppn) {
    rekapPpnRow = rekap.length + 1;
    rekap.push([
      "",
      "PAJAK PERTAMBAHAN NILAI (PPN 11%)",
      "",
      { t: 'n', f: `D${rekapSubtotalRow}*0.11`, v: ppnAmount, z: '#,##0' }
    ]);
  }

  const rekapTotalRow = rekap.length + 1;
  const rekapTotalFormula = rekapPpnRow 
    ? `D${rekapSubtotalRow}+D${rekapPpnRow}` 
    : `D${rekapSubtotalRow}`;

  rekap.push([
    "",
    "TOTAL BIAYA KONSTRUKSI",
    "",
    { t: 'n', f: rekapTotalFormula, v: grandTotal, z: '#,##0' }
  ]);

  rekap.push([
    "",
    "DIBULATKAN",
    "",
    { t: 'n', f: `ROUND(D${rekapTotalRow}, -3)`, v: Math.round(grandTotal / 1000) * 1000, z: '#,##0' }
  ]);

  // Kolom Tanda Tangan Resmi di Rekapitulasi
  rekap.push([]);
  rekap.push([]);
  rekap.push(["", "Diajukan Oleh:", "", "Disetujui Oleh:"]);
  rekap.push(["", "Konsultan Estimator / SR Studio", "", "Pemberi Tugas / Klien"]);
  rekap.push([]);
  rekap.push([]);
  rekap.push(["", "( _______________________ )", "", "( _______________________ )"]);

  const wsRekap = XLSX.utils.aoa_to_sheet(rekap);
  wsRekap["!cols"] = [
    { wch: 6 },
    { wch: 48 },
    { wch: 14 },
    { wch: 24 }
  ];
  wsRekap["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
  ];
  applyCurrencyFormat(wsRekap, [3]);

  /* =========================================================================
   * SHEET 3: JADWAL PELAKSANAAN & KURVA S (TIME SCHEDULE)
   * ========================================================================= */
  const durationWeeks = Math.max(4, Math.min(52, scheduleConfig.durationWeeks || 12));
  const categorySchedules = scheduleConfig.categorySchedules || {};
  const actualProgress = scheduleConfig.actualProgress || {};

  const scheduleSheet = [];
  scheduleSheet.push(["JADWAL PELAKSANAAN PEKERJAAN & KURVA S (TIME SCHEDULE)"]);
  scheduleSheet.push(["Nama Proyek", projectName]);
  scheduleSheet.push(["Durasi Pelaksanaan", `${durationWeeks} Minggu`]);
  scheduleSheet.push(["Tanggal Mulai", scheduleConfig.startDate || projectDate]);
  scheduleSheet.push([]);

  // Header Kolom Jadwal
  const scheduleHeader = ["No", "Uraian Divisi Pekerjaan", "Bobot (%)"];
  for (let w = 1; w <= durationWeeks; w++) {
    scheduleHeader.push(`Mg ${w}`);
  }
  scheduleSheet.push(scheduleHeader);

  const schedStartRow = scheduleSheet.length + 1; // Baris data jadwal (1-indexed)
  const weekSums = new Array(durationWeeks).fill(0);

  filledCats.forEach((cat, idx) => {
    const catCost = (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (parseFloat(it?.harga) || 0) * (parseFloat(it?.volume) || 0), 0);
    const weight = subtotal > 0 ? (catCost / subtotal) : 0;
    const catSched = categorySchedules[cat.id] || { 
      startWeek: Math.max(1, Math.round(((idx) / filledCats.length) * (durationWeeks - 1)) + 1),
      endWeek: Math.min(durationWeeks, Math.max(1, Math.round(((idx + 2) / filledCats.length) * durationWeeks)))
    };

    const sWeek = Math.max(1, Math.min(durationWeeks, catSched.startWeek || 1));
    const eWeek = Math.max(sWeek, Math.min(durationWeeks, catSched.endWeek || sWeek));
    const activeSpan = Math.max(1, (eWeek - sWeek + 1));
    const weeklyWeight = weight / activeSpan;

    const row = [
      toRoman(idx + 1),
      cat.name,
      { t: 'n', f: `'Rekapitulasi'!C${rekapStartRow + idx}`, v: weight, z: '0.00%' }
    ];

    for (let w = 1; w <= durationWeeks; w++) {
      if (w >= sWeek && w <= eWeek) {
        row.push({ t: 'n', v: weeklyWeight, z: '0.00%' });
        weekSums[w - 1] += weeklyWeight;
      } else {
        row.push("");
      }
    }

    scheduleSheet.push(row);
  });

  const lastSchedCatRow = scheduleSheet.length;

  // Baris Rencana Progress Mingguan (%)
  const rencanaMingguanRow = [
    "",
    "RENCANA MINGGUAN (%)",
    { t: 'n', f: `SUM(C${schedStartRow}:C${lastSchedCatRow})`, v: 1.0, z: '0.00%' }
  ];
  const rencanaMingguanRowNum = scheduleSheet.length + 1;

  for (let w = 1; w <= durationWeeks; w++) {
    const colLetter = XLSX.utils.encode_col(2 + w); // Col D adalah w=1
    rencanaMingguanRow.push({
      t: 'n',
      f: `SUM(${colLetter}${schedStartRow}:${colLetter}${lastSchedCatRow})`,
      v: weekSums[w - 1],
      z: '0.00%'
    });
  }
  scheduleSheet.push(rencanaMingguanRow);

  // Baris Rencana Kumulatif (%)
  const rencanaKumulatifRow = [
    "",
    "RENCANA KUMULATIF (%)",
    ""
  ];
  const rencanaKumulatifRowNum = scheduleSheet.length + 1;

  let runningPlan = 0;
  for (let w = 1; w <= durationWeeks; w++) {
    runningPlan += weekSums[w - 1];
    const colLetter = XLSX.utils.encode_col(2 + w);
    const startColLetter = XLSX.utils.encode_col(3); // Col D
    rencanaKumulatifRow.push({
      t: 'n',
      f: w === 1 ? `${colLetter}${rencanaMingguanRowNum}` : `SUM($${startColLetter}$${rencanaMingguanRowNum}:${colLetter}${rencanaMingguanRowNum})`,
      v: Math.min(1.0, runningPlan),
      z: '0.00%'
    });
  }
  scheduleSheet.push(rencanaKumulatifRow);

  // Baris Realisasi Kumulatif (%)
  const realisasiRow = [
    "",
    "REALISASI KUMULATIF (%)",
    ""
  ];
  const realisasiRowNum = scheduleSheet.length + 1;

  for (let w = 1; w <= durationWeeks; w++) {
    const actVal = actualProgress[w];
    if (actVal !== undefined && actVal !== null && actVal !== '') {
      realisasiRow.push({ t: 'n', v: (parseFloat(actVal) || 0) / 100, z: '0.00%' });
    } else {
      realisasiRow.push("");
    }
  }
  scheduleSheet.push(realisasiRow);

  // Baris Deviasi Progres (+/-)
  const deviasiRow = [
    "",
    "DEVIASI PROGRESS (+/-)",
    ""
  ];
  for (let w = 1; w <= durationWeeks; w++) {
    const colLetter = XLSX.utils.encode_col(2 + w);
    const actVal = actualProgress[w];
    if (actVal !== undefined && actVal !== null && actVal !== '') {
      deviasiRow.push({
        t: 'n',
        f: `${colLetter}${realisasiRowNum}-${colLetter}${rencanaKumulatifRowNum}`,
        v: ((parseFloat(actVal) || 0) / 100) - (weekSums.slice(0, w).reduce((a, b) => a + b, 0)),
        z: '+0.00%;-0.00%;0.00%'
      });
    } else {
      deviasiRow.push("");
    }
  }
  scheduleSheet.push(deviasiRow);

  const wsSchedule = XLSX.utils.aoa_to_sheet(scheduleSheet);
  const schedCols = [
    { wch: 6 },
    { wch: 40 },
    { wch: 12 }
  ];
  for (let w = 1; w <= durationWeeks; w++) {
    schedCols.push({ wch: 10 });
  }
  wsSchedule["!cols"] = schedCols;
  wsSchedule["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 + durationWeeks } }
  ];

  /* =========================================================================
   * SHEET 4: REKAPITULASI KEBUTUHAN MATERIAL & LOGISTIK (BOM)
   * ========================================================================= */
  const bomSheet = [];
  bomSheet.push(["DAFTAR REKAPITULASI KEBUTUHAN MATERIAL BANGUNAN (BOM) & HOK"]);
  bomSheet.push(["Nama Proyek", projectName]);
  bomSheet.push(["Lokasi", projectLocation]);
  bomSheet.push(["Tanggal", projectDate]);
  bomSheet.push(["Standar Kemasan Semen", "Sak @40 kg (Baku Tunggal)"]);
  bomSheet.push([]);

  // Ringkasan Logistik Utama
  bomSheet.push(["RINGKASAN LOGISTIK UTAMA PROYEK"]);
  bomSheet.push(["Total Sak Semen (@40kg)", takeoffData.summary.semenSack40kg, "sak"]);
  bomSheet.push(["Total Pasir Pasang & Beton", takeoffData.summary.totalPasirM3, "m³", `≈ ${takeoffData.summary.truckPasirRits} Rit Dump Truck`]);
  bomSheet.push(["Total Batu Split / Kerikil 1-2", takeoffData.summary.totalSplitM3, "m³", `≈ ${takeoffData.summary.truckSplitRits} Rit Dump Truck`]);
  bomSheet.push(["Total Besi Tulangan Rebar", takeoffData.summary.totalRebarKg, "kg", `≈ ${takeoffData.summary.totalRebarLonjor} Lonjor (12m)`]);
  bomSheet.push(["Estimasi Belanja Bahan", takeoffData.summary.totalMaterialCost]);
  bomSheet.push(["Alokasi Upah Tenaga (HOK)", takeoffData.summary.totalLaborCost]);
  bomSheet.push([]);

  // Tabel Rincian Belanja Bahan
  bomSheet.push(["I. DAFTAR BAHAN & MATERIAL BANGUNAN TOKO"]);
  bomSheet.push(["No", "Nama Bahan Bangunan & Spesifikasi", "Kelompok", "Volume", "Satuan", "Estimasi Harga (Rp)", "Jumlah Biaya (Rp)", "Keterangan Pos"]);

  const bomMatStartRow = bomSheet.length + 1;
  takeoffData.materials.forEach((mat, mi) => {
    const rowNum = bomSheet.length + 1;
    const unitPrice = mat.quantity > 0 && mat.estimatedCost > 0 ? Math.round(mat.estimatedCost / mat.quantity) : 0;
    const ket = mat.note && mat.sources?.length ? `${mat.note} (Pos: ${mat.sources.slice(0, 1).join(', ')})` : (mat.note || (mat.sources && mat.sources[0]) || "");

    bomSheet.push([
      mi + 1,
      mat.name,
      mat.group,
      mat.quantity,
      mat.unit,
      unitPrice,
      { t: 'n', f: `D${rowNum}*F${rowNum}`, v: mat.estimatedCost, z: '#,##0' },
      ket
    ]);
  });

  const bomMatEndRow = bomSheet.length;

  bomSheet.push([
    "",
    "SUB TOTAL ESTIMASI BAHAN MATERIAL",
    "",
    "",
    "",
    "",
    { t: 'n', f: `SUM(G${bomMatStartRow}:G${bomMatEndRow})`, v: takeoffData.summary.totalMaterialCost, z: '#,##0' },
    ""
  ]);

  bomSheet.push([]);
  bomSheet.push(["II. ALOKASI HARI ORANG KERJA (HOK) TENAGA KERJA SNI"]);
  bomSheet.push(["No", "Klasifikasi Tenaga Kerja", "Satuan", "Volume HOK", "Upah Standar (Rp)", "Total Upah (Rp)", "Deskripsi"]);

  const laborStartRow = bomSheet.length + 1;
  takeoffData.labor.forEach((lab, li) => {
    const rowNum = bomSheet.length + 1;
    const unitPrice = lab.quantity > 0 && lab.estimatedCost > 0 ? lab.estimatedCost / lab.quantity : 0;

    bomSheet.push([
      li + 1,
      lab.name,
      lab.unit,
      lab.quantity,
      unitPrice,
      { t: 'n', f: `D${rowNum}*E${rowNum}`, v: lab.estimatedCost, z: '#,##0' },
      "Tenaga kerja konstruksi standar SNI PUPR"
    ]);
  });

  const laborEndRow = bomSheet.length;
  bomSheet.push([
    "",
    "SUB TOTAL ALOKASI UPAH TENAGA KERJA",
    "",
    "",
    "",
    { t: 'n', f: `SUM(F${laborStartRow}:F${laborEndRow})`, v: takeoffData.summary.totalLaborCost, z: '#,##0' },
    ""
  ]);

  const wsBOM = XLSX.utils.aoa_to_sheet(bomSheet);
  wsBOM["!cols"] = [
    { wch: 6 },
    { wch: 42 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 }
  ];
  wsBOM["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }
  ];
  applyCurrencyFormat(wsBOM, [5, 6]);

  /* =========================================================================
   * GABUNGKAN SEMUA 4 SHEET KE DALAM WORKBOOK EXCEL
   * ========================================================================= */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsRekap, "Rekapitulasi");
  XLSX.utils.book_append_sheet(wb, wsDet, "RAB Detail");
  XLSX.utils.book_append_sheet(wb, wsSchedule, "Kurva S & Jadwal");
  XLSX.utils.book_append_sheet(wb, wsBOM, "Kebutuhan Material BOM");

  const safeName = (projectName || "RAB").trim().replace(/[^a-zA-Z0-9_-]+/g, "_") || "RAB";
  XLSX.writeFile(wb, `${safeName}_SR_Studio.xlsx`);
  return true;
}

/**
 * Memformat kolom cell tertentu agar memiliki number format rupiah tanpa desimal (#,##0)
 */
function applyCurrencyFormat(ws, cols) {
  if (!ws["!ref"]) return;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; R++) {
    cols.forEach(C => {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref];
      if (cell && cell.t === "n" && !cell.z) {
        cell.z = "#,##0";
      }
    });
  }
}
