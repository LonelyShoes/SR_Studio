import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Layers, 
  Download, 
  Sparkles,
  Filter,
  FileText,
  TrendingUp,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { formatRp, formatNumber, toRoman, terbilang } from '../../utils/formatters';

export function OfficialDocumentModal() {
  const { 
    state, 
    documentModalOpen, 
    setDocumentModalOpen, 
    subtotal, 
    ppnAmount, 
    grandTotal,
    scheduleConfig
  } = useBoQ();

  // Mode cetak: 'summary' (SPH 1 Lembar Bersih) atau 'dossier' (Berkas Proposal Lengkap / Multi-Page)
  const [printMode, setPrintMode] = useState('summary'); 
  const [includeBoQDetails, setIncludeBoQDetails] = useState(true);
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [onlyFilledCategories, setOnlyFilledCategories] = useState(true);

  // Form input metadata surat
  const [docNumber, setDocNumber] = useState('024/SPH-EST/SR-STU/VIII/2026');
  const [leadEstimator, setLeadEstimator] = useState('Muhammad Rafi F., S.Ars.');
  const [leadTitle, setLeadTitle] = useState('Principal Architect & Lead Estimator');

  if (!documentModalOpen) return null;

  // Filter divisi yang memiliki nilai anggaran riil
  const rawCats = Array.isArray(state?.categories) ? state.categories : [];
  const categoriesWithCost = rawCats
    .map(cat => {
      const items = Array.isArray(cat?.items) ? cat.items : [];
      return {
        ...cat,
        subtotal: items.reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0),
        items: items.filter(it => {
          const u = typeof it?.uraian === 'string' ? it.uraian : (it?.uraian?.uraian || String(it?.uraian || ''));
          return (Number(it?.volume) || 0) > 0 && u && u.trim() !== '';
        })
      };
    })
    .filter(cat => cat.subtotal > 0);

  // Kategori yang ditampilkan di tabel rekapitulasi SPH
  const displayedCategories = (onlyFilledCategories && categoriesWithCost.length > 0)
    ? categoriesWithCost
    : rawCats.map(cat => ({
        ...cat,
        subtotal: (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0)
      }));

  // ==================== KALKULASI JADWAL UNTUK LAMPIRAN II ====================
  const durationWeeks = scheduleConfig?.durationWeeks || 12;
  const startDateStr = scheduleConfig?.startDate || state?.project?.date || new Date().toISOString().slice(0, 10);

  const scheduleActiveCategories = categoriesWithCost.length > 0
    ? categoriesWithCost
    : rawCats.map(cat => ({
        ...cat,
        subtotal: (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0)
      }));

  const scheduleCategoriesWithWeight = scheduleActiveCategories.map((cat, idx) => {
    const weight = subtotal > 0 ? (cat.subtotal / subtotal) * 100 : 0;
    const sched = scheduleConfig?.categorySchedules?.[cat.id] || {
      startWeek: 1,
      endWeek: durationWeeks
    };
    
    const startW = Math.max(1, Math.min(durationWeeks, sched.startWeek || 1));
    const endW = Math.max(startW, Math.min(durationWeeks, sched.endWeek || durationWeeks));
    const spanWeeks = Math.max(1, endW - startW + 1);
    const weeklyWeight = weight / spanWeeks;

    return {
      ...cat,
      index: idx,
      romanNo: toRoman(idx + 1),
      weight,
      startWeek: startW,
      endWeek: endW,
      spanWeeks,
      weeklyWeight
    };
  });

  const scheduleWeeklySummary = [];
  let runningPlannedCum = 0;

  for (let w = 1; w <= durationWeeks; w++) {
    let planWeekly = 0;
    scheduleCategoriesWithWeight.forEach(cat => {
      if (w >= cat.startWeek && w <= cat.endWeek) {
        planWeekly += cat.weeklyWeight;
      }
    });

    runningPlannedCum += planWeekly;
    if (w === durationWeeks && Math.abs(runningPlannedCum - 100) < 0.5) {
      planWeekly += (100 - runningPlannedCum);
      runningPlannedCum = 100;
    }

    scheduleWeeklySummary.push({
      weekNum: w,
      planWeekly,
      planCum: Math.min(100, runningPlannedCum)
    });
  }

  const handlePrint = () => {
    window.print();
  };

  // Format tanggal Indonesia
  const formatDateIndonesia = (dateStr) => {
    if (!dateStr) return 'Semarang, 27 Agustus 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="official-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      
      {/* Container Preview */}
      <div className="official-modal-card relative w-full max-w-5xl bg-paper-100 rounded-3xl shadow-2xl border border-paper-400 my-auto flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* ==================== MODAL ACTION TOOLBAR (NO-PRINT) ==================== */}
        <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-heading font-bold text-white flex items-center gap-2">
                <span>Penerbitan Proposal & Dokumen SPH Resmi</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Standar A4
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Pilih format 1 lembar ringkas atau berkas proposal lengkap (*Dossier*) untuk tender resmi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Mode Selector */}
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintMode('summary')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                  printMode === 'summary' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>SPH 1 Halaman</span>
              </button>

              <button
                type="button"
                onClick={() => { setPrintMode('dossier'); setIncludeBoQDetails(true); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                  printMode === 'dossier' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Proposal Lengkap (Dossier)</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/40 transition-all transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDocumentModalOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== SUB-TOOLBAR KUSTOMISASI LAMPIRAN (NO-PRINT) ==================== */}
        <div className="no-print px-4 py-2 bg-slate-800/90 border-b border-slate-700 text-white text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
              Opsi Lampiran Berkas:
            </span>

            {/* Checkbox Lampiran 1 (BoQ Details) - Active in Dossier mode */}
            {printMode === 'dossier' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={includeBoQDetails}
                  onChange={e => setIncludeBoQDetails(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>Lampiran I: Rincian BoQ Detail</span>
              </label>
            )}

            {/* Checkbox Lampiran 2 (Schedule) - Active in Dossier mode */}
            {printMode === 'dossier' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={includeSchedule}
                  onChange={e => setIncludeSchedule(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-0"
                />
                <span>Lampiran II: Jadwal Pelaksanaan (Time Schedule)</span>
              </label>
            )}

            {/* Checkbox Syarat & Ketentuan */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white select-none">
              <input
                type="checkbox"
                checked={showTerms}
                onChange={e => setShowTerms(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span>Syarat & Ketentuan</span>
            </label>

            {/* Checkbox Tanda Tangan */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={e => setShowSignatures(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span>Tanda Tangan & Legalitas</span>
            </label>
          </div>

          {/* Toggle Hanya Divisi Terisi */}
          <label className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={onlyFilledCategories}
              onChange={(e) => setOnlyFilledCategories(e.target.checked)}
              className="rounded text-amber-500 focus:ring-0"
            />
            <span>Sembunyikan Kategori Rp 0 ({categoriesWithCost.length} divisi aktif)</span>
          </label>
        </div>

        {/* ==================== A4 DOCUMENT CANVAS ==================== */}
        <div className="official-modal-body flex-1 overflow-y-auto p-3 sm:p-8 bg-paper-200 custom-scrollbar block">
          
          {/* A4 Sheet Container */}
          <div className={`official-paper-sheet ${printMode === 'summary' ? 'sph-single-sheet' : ''} mx-auto w-full max-w-[210mm] bg-white shadow-2xl rounded-xl px-6 py-6 sm:px-10 sm:py-8 border border-paper-300 text-slate-900 font-sans leading-normal min-h-fit mb-10`}>

            {/* ==================== LEMBAR 1: SURAT PENAWARAN HARGA (SPH) RESMI ==================== */}
            <div>
              {/* Kop Surat Resmi SR Studio */}
              <div className="pb-2 border-b-2 border-slate-950">
                <div className="flex items-center justify-between gap-3">
                  <div className="shrink-0 flex items-center">
                    <img 
                      src="/LOGO-Model_1.jpg" 
                      alt="SR Studio Logo" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/icon.png';
                      }}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded"
                    />
                  </div>

                  <div className="text-right flex-1 pl-2">
                    <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase leading-none">
                      SR STUDIO
                    </h1>
                    <p className="text-[11px] sm:text-xs font-bold tracking-wide text-slate-800 uppercase mt-0.5">
                      ARCHITECTURE DESIGN &bull; CIVIL CONTRACTOR &bull; COST ESTIMATOR
                    </p>
                    <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                      Studio Perancangan Bangunan, Pengawasan Konstruksi & Penyusunan Rencana Anggaran Biaya (RAB)
                    </p>
                    <p className="text-[9.5px] sm:text-[10px] font-mono text-slate-600 mt-1">
                      Semarang, Jawa Tengah &bull; WhatsApp: +62 858-6825-2639 &bull; Email: muhrafi118b@gmail.com
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 pt-0.5 border-t border-slate-950"></div>
              </div>

              {/* Informasi Formal Surat */}
              <div className="pt-3 pb-2 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between text-[11px] gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-16 text-slate-500 font-mono">Nomor :</span>
                      <input 
                        type="text" 
                        value={docNumber} 
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="font-mono font-semibold text-slate-900 border-b border-dashed border-slate-300 focus:border-slate-800 focus:outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-16 text-slate-500 font-mono">Lampiran :</span>
                      <span className="font-medium text-slate-800">
                        {printMode === 'dossier'
                          ? `1 (Satu) Berkas Proposal [${includeBoQDetails ? 'Lampiran I: Rincian BoQ' : ''}${includeBoQDetails && includeSchedule ? ' + ' : ''}${includeSchedule ? 'Lampiran II: Jadwal Waktu' : ''}]`
                          : '1 (Satu) Lembar Rekapitulasi Penawaran'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-16 text-slate-500 font-mono">Perihal :</span>
                      <span className="font-bold text-slate-900 uppercase underline">
                        Surat Penawaran Harga (SPH) & Rencana Anggaran Biaya
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] shrink-0">
                    <span className="font-medium text-slate-700">
                      Semarang, {formatDateIndonesia(state.project.date)}
                    </span>
                  </div>
                </div>

                <div className="pt-0.5 text-[11px]">
                  <p className="text-slate-500 text-[10px]">Kepada Yth :</p>
                  <p className="font-bold text-slate-950 text-xs">
                    {state.project.client || 'Bapak / Ibu Pemberi Tugas'}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Di {state.project.location || 'Tempat'}
                  </p>
                </div>

                <p className="text-[10.5px] text-slate-700 text-justify leading-relaxed">
                  Dengan hormat, sehubungan dengan rencana pelaksanaan pekerjaan konstruksi bangunan <strong>{state.project.name || 'Proyek Konstruksi'}</strong> yang berlokasi di <strong>{state.project.location || 'Semarang'}</strong>, bersama surat ini kami sampaikan rincian penawaran harga dan estimasi anggaran biaya pekerjaan sebagai berikut:
                </p>
              </div>

              {/* Tabel Rekapitulasi Divisi Pekerjaan SPH */}
              <div className="pt-1 pb-2">
                <table className="w-full text-[10.5px] border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono text-[9.5px] uppercase tracking-wider">
                      <th className="py-1 px-2.5 w-10 text-center border-r border-slate-700">No</th>
                      <th className="py-1 px-3 text-left border-r border-slate-700">Uraian Divisi Pekerjaan</th>
                      <th className="py-1 px-2.5 w-16 text-right border-r border-slate-700">Bobot</th>
                      <th className="py-1 px-3 w-32 text-right">Jumlah Harga (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {displayedCategories.map((cat, idx) => {
                      const weightPct = subtotal > 0 ? (cat.subtotal / subtotal) * 100 : 0;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50">
                          <td className="py-0.8 px-2.5 text-center font-mono font-bold text-slate-700 border-r border-slate-300 text-[10px]">
                            {toRoman(idx + 1)}
                          </td>
                          <td className="py-0.8 px-3 font-semibold text-slate-900 border-r border-slate-300">
                            {cat.name.toUpperCase()}
                          </td>
                          <td className="py-0.8 px-2.5 text-right font-mono text-slate-600 border-r border-slate-300 text-[10px]">
                            {weightPct.toFixed(2)}%
                          </td>
                          <td className="py-0.8 px-3 text-right font-mono font-bold text-slate-950">
                            {formatRp(cat.subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-[11px]">
                      <td colSpan={2} className="py-1 px-2.5 text-right uppercase border-r border-slate-900">
                        Sub Total :
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono border-r border-slate-900 text-[10.5px]">
                        100.00%
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono text-slate-950">
                        {formatRp(subtotal)}
                      </td>
                    </tr>

                    {state.ppn && (
                      <tr className="bg-slate-50 border-t border-slate-300 font-bold text-[10.5px]">
                        <td colSpan={3} className="py-1 px-2.5 text-right uppercase border-r border-slate-900 text-slate-700">
                          Pajak Pertambahan Nilai (PPN 11%) :
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-800">
                          {formatRp(ppnAmount)}
                        </td>
                      </tr>
                    )}

                    <tr className="bg-slate-200 border-t-2 border-slate-900 font-bold text-xs sm:text-sm">
                      <td colSpan={3} className="py-1.5 px-2.5 text-right uppercase border-r border-slate-900 text-slate-950">
                        TOTAL NILAI PENAWARAN :
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-950 text-sm">
                        {formatRp(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Terbilang Box */}
                <div className="mt-1.5 p-1.5 px-2.5 rounded bg-slate-50 border border-slate-300 text-[10.5px] leading-tight">
                  <span className="font-semibold text-slate-500 uppercase text-[9px] font-mono block">
                    Terbilang :
                  </span>
                  <span className="font-bold italic text-slate-950">
                    "{terbilang(grandTotal)}"
                  </span>
                </div>

                {/* Multi-Unit & HPP Summary Box */}
                {state.project.clusterUnits > 1 && (
                  <div className="mt-1.5 p-2 rounded bg-slate-50 border border-slate-300 text-[10px] space-y-1">
                    <div className="flex flex-wrap items-center justify-between font-semibold text-slate-800">
                      <span>
                        🏡 Ringkasan Proyek Multi-Unit ({state.project.clusterUnits} Unit Kavling &bull; Tipe {state.project.buildingAreaPerUnit || 36} m²)
                      </span>
                      <span className="font-mono text-slate-950 font-bold">
                        HPP: {formatRp(grandTotal / state.project.clusterUnits)} / Unit
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-slate-600 text-[9.5px]">
                      <span>
                        Sistem Konstruksi: <strong>{state.project.clusterTypology === 'shared' ? `1 Dinding Bersama (Blok Deret ${state.project.clusterRowUnits || 4} Unit)` : 'Dinding Ganda (2 Dinding Mandiri)'}</strong>
                      </span>
                      <span>
                        Biaya Rata-rata: <strong>{formatRp(grandTotal / (state.project.clusterUnits * (state.project.buildingAreaPerUnit || 36)))} / m²</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Syarat & Ketentuan */}
              {showTerms && (
                <div className="pt-2 text-[10px] text-slate-700 leading-tight border-t border-slate-200 print-break-inside-avoid">
                  <h4 className="font-bold text-slate-950 uppercase text-[10px] mb-1 tracking-wider">
                    Syarat & Ketentuan Pembayaran (Term of Payment) :
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-1">
                    <div>
                      <span className="font-semibold text-slate-900">1. Uang Muka (DP) 25%</span> : Saat penandatanganan SPK.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">4. Pelunasan 15%</span> : Serah Terima Pertama (PHO).
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">2. Termin I (35%)</span> : Progres fisik pekerjaan 50%.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">5. Masa Berlaku</span> : 14 hari kalender sejak diterbitkan.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">3. Termin II (25%)</span> : Progres fisik pekerjaan 80%.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">6. Pekerjaan Tambah/Kurang</span> : Melalui addendum resmi.
                    </div>
                  </div>
                </div>
              )}

              {/* Lembar Pengesahan Tanda Tangan */}
              {showSignatures && (
                <div className="mt-4 pt-2.5 border-t border-slate-300 text-[11px] print-break-inside-avoid">
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div className="flex flex-col justify-between h-20 sm:h-24">
                      <div>
                        <p className="text-slate-600 text-[10px]">Menyetujui & Mengesahkan,</p>
                        <p className="font-bold text-slate-950 uppercase text-[10.5px]">
                          PEMBERI TUGAS / KLIEN
                        </p>
                      </div>

                      <div>
                        <p className="font-bold text-slate-950 underline text-xs">
                          {state.project.client || '( ............................................... )'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Klien / Pemilik Proyek</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-20 sm:h-24">
                      <div>
                        <p className="text-slate-600 text-[10px]">Semarang, {formatDateIndonesia(state.project.date)}</p>
                        <p className="font-bold text-slate-950 uppercase text-[10.5px]">
                          SR STUDIO ARCHITECTURE
                        </p>
                      </div>

                      <div>
                        <input 
                          type="text" 
                          value={leadEstimator} 
                          onChange={(e) => setLeadEstimator(e.target.value)}
                          className="text-center font-bold text-slate-950 underline text-xs border-b border-dashed border-slate-300 focus:border-slate-800 focus:outline-none bg-transparent w-full"
                        />
                        <input 
                          type="text" 
                          value={leadTitle} 
                          onChange={(e) => setLeadTitle(e.target.value)}
                          className="text-center text-[10px] text-slate-500 focus:outline-none bg-transparent w-full mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Lembar 1 */}
              <div className="mt-3 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
                <span>SR Studio BoQ Tools &bull; Dokumen Penawaran Resmi Terstandarisasi</span>
                <span>Lembar 1 {printMode === 'dossier' ? '(Surat Pengantar SPH)' : 'dari 1'}</span>
              </div>
            </div>

            {/* ==================== LEMBAR 2: LAMPIRAN I - RINCIAN BOQ DETAIL ==================== */}
            {printMode === 'dossier' && includeBoQDetails && categoriesWithCost.length > 0 && (
              <div className="print-break-before mt-10 pt-6 border-t-2 border-slate-900 space-y-4">
                
                {/* Header Lampiran I */}
                <div className="pb-3 border-b-2 border-slate-900 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/icon.png" 
                      alt="SR Studio" 
                      className="w-10 h-10 object-contain"
                    />
                    <div>
                      <h2 className="font-heading font-black text-sm uppercase text-slate-950 tracking-wide">
                        LAMPIRAN I: RINCIAN RENCANA ANGGARAN BIAYA (BILL OF QUANTITIES)
                      </h2>
                      <p className="text-[10.5px] text-slate-700 font-medium">
                        Proyek: <strong>{state.project.name || '-'}</strong> &bull; Lokasi: {state.project.location || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px] text-slate-600 shrink-0">
                    <p>No. SPH: <strong>{docNumber}</strong></p>
                    <p>Standarisasi TA 2026</p>
                  </div>
                </div>

                {/* Tabel Rincian per Divisi */}
                <div className="space-y-4 pt-2">
                  {categoriesWithCost.map((cat, ci) => (
                    <div key={cat.id} className="print-break-inside-avoid">
                      
                      {/* Sub-header Divisi */}
                      <div className="bg-slate-200 py-1 px-2.5 border border-slate-900 font-bold text-[11px] text-slate-950 flex items-center justify-between">
                        <span>
                          {toRoman(ci + 1)}. {cat.name.toUpperCase()}
                        </span>
                        <span className="font-mono text-slate-900">
                          Subtotal: {formatRp(cat.subtotal)}
                        </span>
                      </div>

                      {/* Tabel Item Pekerjaan */}
                      <table className="w-full text-[10.5px] border-x border-b border-slate-900 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-400 text-slate-700 uppercase font-mono text-[9.5px]">
                            <th className="py-1 px-2 border-r border-slate-300 w-8 text-center">No</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-16 text-center">Kode</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-left">Uraian Pekerjaan & Spesifikasi Bahan</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-14 text-center">Satuan</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-14 text-right">Volume</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-24 text-right">Harga Satuan (Rp)</th>
                            <th className="py-1 px-2 w-28 text-right">Jumlah (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {cat.items.map((it, ii) => {
                            const itemTotal = (it.harga || 0) * (it.volume || 0);
                            return (
                              <tr key={it.key || ii} className="hover:bg-slate-50">
                                <td className="py-1 px-2 text-center border-r border-slate-300 font-mono text-slate-500 text-[10px]">
                                  {ii + 1}
                                </td>
                                <td className="py-1 px-2 text-center border-r border-slate-300 font-mono text-slate-500 text-[9.5px]">
                                  {it.code || '-'}
                                </td>
                                <td className="py-1 px-2 border-r border-slate-300 text-slate-900">
                                  {it.uraian}
                                  {it.sharedWallReduced && (
                                    <span className="ml-1.5 text-[9px] font-mono text-amber-800 font-bold">
                                      [Tereduksi Dinding Bersama -{it.sharedWallPercent}%]
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 px-2 text-center border-r border-slate-300 font-mono text-slate-600 text-[10px]">
                                  {it.satuan}
                                </td>
                                <td className="py-1 px-2 text-right border-r border-slate-300 font-mono font-semibold text-slate-900 text-[10.5px]">
                                  {formatNumber(it.volume, 2)}
                                </td>
                                <td className="py-1 px-2 text-right border-r border-slate-300 font-mono text-slate-700 text-[10.5px]">
                                  {formatRp(it.harga)}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 text-[10.5px]">
                                  {formatRp(itemTotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                    </div>
                  ))}
                </div>

                {/* Rekapitulasi Akhir Lampiran I */}
                <div className="pt-3 border-t-2 border-slate-900 flex justify-end print-break-inside-avoid">
                  <div className="w-72 bg-slate-100 border border-slate-900 p-2.5 text-xs font-mono space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Total Subtotal:</span>
                      <span>{formatRp(subtotal)}</span>
                    </div>
                    {state.ppn && (
                      <div className="flex justify-between text-slate-700 text-[11px]">
                        <span>PPN (11%):</span>
                        <span>{formatRp(ppnAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1 text-slate-950">
                      <span>Grand Total:</span>
                      <span>{formatRp(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[8.5px] text-slate-400 font-mono flex justify-between">
                  <span>Dokumen Proposal Lengkap &bull; Lampiran I Rincian BoQ</span>
                  <span>SR Studio Engineering Standard</span>
                </div>
              </div>
            )}

            {/* ==================== LEMBAR 3: LAMPIRAN II - JADWAL PELAKSANAAN PROYEK ==================== */}
            {printMode === 'dossier' && includeSchedule && (
              <div className="print-break-before mt-10 pt-6 border-t-2 border-slate-900 space-y-4">
                
                {/* Header Lampiran II */}
                <div className="pb-3 border-b-2 border-slate-900 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-heading font-black text-sm uppercase text-slate-950 tracking-wide">
                        LAMPIRAN II: JADWAL PELAKSANAAN PROYEK & RENCANA BOBOT (TIME SCHEDULE)
                      </h2>
                      <p className="text-[10.5px] text-slate-700 font-medium">
                        Durasi Pelaksanaan: <strong>{durationWeeks} Minggu Kalender</strong> &bull; Mulai: {formatDateIndonesia(startDateStr)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px] text-slate-600 shrink-0">
                    <p>No. SPH: <strong>{docNumber}</strong></p>
                    <p>Target Fisik: <strong>100.00%</strong></p>
                  </div>
                </div>

                {/* Matriks Time Schedule Mingguan */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-[9px] sm:text-[10px] border border-slate-900 border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-mono uppercase">
                        <th className="py-1.5 px-1.5 w-7 text-center border-r border-slate-700">No</th>
                        <th className="py-1.5 px-2 text-left border-r border-slate-700 min-w-[140px]">Divisi Pekerjaan</th>
                        <th className="py-1.5 px-1.5 w-12 text-right border-r border-slate-700">Bobot</th>
                        {scheduleWeeklySummary.map(w => (
                          <th key={w.weekNum} className="py-1.5 px-1 text-center border-r border-slate-700 w-8">
                            W{w.weekNum}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-mono">
                      {scheduleCategoriesWithWeight.map((cat, idx) => (
                        <tr key={cat.id} className="hover:bg-slate-50">
                          <td className="py-1 px-1 text-center font-bold border-r border-slate-300">
                            {cat.romanNo}
                          </td>
                          <td className="py-1 px-2 font-sans font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[150px]">
                            {cat.name}
                          </td>
                          <td className="py-1 px-1.5 text-right font-bold text-slate-900 border-r border-slate-300">
                            {cat.weight.toFixed(2)}%
                          </td>
                          {scheduleWeeklySummary.map(w => {
                            const isWorking = w.weekNum >= cat.startWeek && w.weekNum <= cat.endWeek;
                            return (
                              <td 
                                key={w.weekNum} 
                                className={`py-1 px-1 text-center border-r border-slate-200 text-[8.5px] ${
                                  isWorking ? 'bg-emerald-100 font-bold text-emerald-950' : 'text-slate-300'
                                }`}
                              >
                                {isWorking ? cat.weeklyWeight.toFixed(1) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-mono text-[9px] font-bold border-t-2 border-slate-900">
                      {/* Rencana Mingguan */}
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <td colSpan={2} className="py-1 px-2 text-right uppercase border-r border-slate-900">
                          Rencana Mingguan (%) :
                        </td>
                        <td className="py-1 px-1.5 text-right border-r border-slate-900">
                          100.00%
                        </td>
                        {scheduleWeeklySummary.map(w => (
                          <td key={w.weekNum} className="py-1 px-1 text-center border-r border-slate-300 text-slate-800">
                            {w.planWeekly.toFixed(1)}%
                          </td>
                        ))}
                      </tr>

                      {/* Rencana Kumulatif */}
                      <tr className="bg-slate-200 text-slate-950">
                        <td colSpan={2} className="py-1.5 px-2 text-right uppercase border-r border-slate-900">
                          Kumulatif Progres (%) :
                        </td>
                        <td className="py-1.5 px-1.5 text-right border-r border-slate-900">
                          100.00%
                        </td>
                        {scheduleWeeklySummary.map(w => (
                          <td key={w.weekNum} className="py-1.5 px-1 text-center border-r border-slate-300 font-black">
                            {w.planCum.toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tanda Tangan Pengesahan Jadwal */}
                <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-2 gap-6 text-center text-[10.5px] print-break-inside-avoid">
                  <div>
                    <p className="text-slate-600 text-[10px]">Menyetujui Time Schedule,</p>
                    <p className="font-bold text-slate-950 uppercase mt-0.5">PEMBERI TUGAS / KLIEN</p>
                    <div className="h-14"></div>
                    <p className="font-bold text-slate-950 underline">{state.project.client || '( ................................. )'}</p>
                  </div>

                  <div>
                    <p className="text-slate-600 text-[10px]">Semarang, {formatDateIndonesia(state.project.date)}</p>
                    <p className="font-bold text-slate-950 uppercase mt-0.5">PELAKSANA / ESTIMATOR</p>
                    <div className="h-14"></div>
                    <p className="font-bold text-slate-950 underline">{leadEstimator}</p>
                  </div>
                </div>

                <div className="pt-2 text-[8.5px] text-slate-400 font-mono flex justify-between">
                  <span>Dokumen Proposal Lengkap &bull; Lampiran II Jadwal Pelaksanaan</span>
                  <span>SR Studio Engineering Standard</span>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
