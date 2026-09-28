import React, { useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  Printer, 
  X, 
  TrendingUp, 
  Calendar, 
  Building2, 
  Layers, 
  Clock,
  Sparkles
} from 'lucide-react';
import { formatRp, toRoman } from '../../utils/formatters';

export function ScheduleDocumentModal() {
  const { scheduleModalOpen } = useBoQ();
  // Hooks di komponen isi hanya dipanggil saat modal terbuka (rules-of-hooks).
  if (!scheduleModalOpen) return null;
  return <ScheduleDocumentModalContent />;
}

function ScheduleDocumentModalContent() {
  const { 
    state, 
    subtotal, 
    scheduleConfig, 
    setScheduleModalOpen 
  } = useBoQ();

  const durationWeeks = scheduleConfig.durationWeeks || 12;
  const startDateStr = scheduleConfig.startDate || state.project.date || new Date().toISOString().slice(0, 10);

  // Kategori aktif dengan biaya > 0
  const activeCategories = useMemo(() => {
    const cats = Array.isArray(state?.categories) ? state.categories : [];
    const withCost = cats
      .map(cat => ({
        ...cat,
        subtotal: (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0)
      }))
      .filter(cat => cat.subtotal > 0);

    return withCost.length > 0
      ? withCost
      : cats.map(cat => ({
          ...cat,
          subtotal: (Array.isArray(cat?.items) ? cat.items : []).reduce((s, it) => s + (Number(it?.harga) || 0) * (Number(it?.volume) || 0), 0)
        }));
  }, [state?.categories]);

  // Bobot per divisi
  const categoriesWithWeight = useMemo(() => {
    return activeCategories.map((cat, idx) => {
      const weight = subtotal > 0 ? (cat.subtotal / subtotal) * 100 : 0;
      const sched = scheduleConfig.categorySchedules?.[cat.id] || {
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
  }, [activeCategories, subtotal, scheduleConfig, durationWeeks]);

  // Kalkulasi data mingguan
  const scheduleData = useMemo(() => {
    const weeks = [];
    let runningPlannedCum = 0;
    let runningActualCum = 0;
    const startDateObj = new Date(startDateStr);

    for (let w = 1; w <= durationWeeks; w++) {
      let planWeekly = 0;
      categoriesWithWeight.forEach(cat => {
        if (w >= cat.startWeek && w <= cat.endWeek) {
          planWeekly += cat.weeklyWeight;
        }
      });

      runningPlannedCum += planWeekly;
      if (w === durationWeeks && Math.abs(runningPlannedCum - 100) < 0.5) {
        planWeekly += (100 - runningPlannedCum);
        runningPlannedCum = 100;
      }

      const actualVal = scheduleConfig.actualProgress?.[w];
      let actualWeekly = null;
      let actualCum = null;
      let deviasi = null;

      if (actualVal !== undefined && actualVal !== null && actualVal !== '') {
        actualWeekly = parseFloat(actualVal) || 0;
        runningActualCum += actualWeekly;
        actualCum = runningActualCum;
        deviasi = actualCum - runningPlannedCum;
      }

      const wStart = new Date(startDateObj);
      wStart.setDate(wStart.getDate() + (w - 1) * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      const dateLabel = `${wStart.getDate()}/${wStart.getMonth() + 1} - ${wEnd.getDate()}/${wEnd.getMonth() + 1}`;

      weeks.push({
        weekNum: w,
        dateLabel,
        planWeekly,
        planCum: Math.min(100, runningPlannedCum),
        actualWeekly,
        actualCum,
        deviasi
      });
    }

    return { weeks };
  }, [categoriesWithWeight, durationWeeks, startDateStr, scheduleConfig.actualProgress]);

  // Target Selesai
  const targetCompletionDate = useMemo(() => {
    try {
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + (durationWeeks * 7) - 1);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  }, [startDateStr, durationWeeks]);

  const handlePrint = () => {
    window.print();
  };

  // SVG Chart Geometry A4 Landscape (Compact)
  const chartW = 980;
  const chartH = 220;
  const padL = 45;
  const padR = 25;
  const padT = 20;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const getX = (weekNum) => {
    if (durationWeeks <= 1) return padL;
    return padL + ((weekNum - 1) / (durationWeeks - 1)) * plotW;
  };

  const getY = (percentage) => {
    const clamped = Math.max(0, Math.min(100, percentage));
    return padT + plotH - (clamped / 100) * plotH;
  };

  const planPath = useMemo(() => {
    if (scheduleData.weeks.length === 0) return '';
    return scheduleData.weeks.reduce((path, w, i) => {
      const x = getX(w.weekNum);
      const y = getY(w.planCum);
      if (i === 0) return `M ${x} ${y}`;
      const prevW = scheduleData.weeks[i - 1];
      const prevX = getX(prevW.weekNum);
      const prevY = getY(prevW.planCum);
      const cx = (prevX + x) / 2;
      return `${path} C ${cx} ${prevY}, ${cx} ${y}, ${x} ${y}`;
    }, '');
  }, [scheduleData.weeks, durationWeeks]);

  const actualPath = useMemo(() => {
    const actualWeeks = scheduleData.weeks.filter(w => w.actualCum !== null);
    if (actualWeeks.length === 0) return '';
    return actualWeeks.reduce((path, w, i) => {
      const x = getX(w.weekNum);
      const y = getY(w.actualCum);
      if (i === 0) return `M ${x} ${y}`;
      return `${path} L ${x} ${y}`;
    }, '');
  }, [scheduleData.weeks, durationWeeks]);

  return (
    <div className="schedule-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      
      {/* Modal Container */}
      <div className="schedule-modal-card relative w-full max-w-6xl bg-paper-100 rounded-3xl shadow-2xl border border-paper-400 my-auto flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* ==================== TOOLBAR (NO-PRINT) ==================== */}
        <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-heading font-bold text-white flex items-center gap-2">
                Pratinjau Time Schedule & Kurva "S" Berkop Resmi
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  A4 Landscape
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Dokumen resmi lampiran kontrak pelaksanaan fisik konstruksi berstandar tender.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/40 transition-all transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== A4 LANDSCAPE DOCUMENT CANVAS ==================== */}
        <div className="schedule-modal-body flex-1 overflow-y-auto p-3 sm:p-6 bg-paper-200 custom-scrollbar block">
          
          {/* A4 Landscape Paper Sheet (297mm width) */}
          <div className="schedule-paper-sheet mx-auto w-full max-w-[297mm] bg-white shadow-2xl rounded-xl px-7 py-6 border border-paper-300 text-slate-900 font-sans leading-normal min-h-fit mb-10">

            {/* 1. KOP SURAT RESMI SR STUDIO */}
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
                    className="w-14 h-14 object-contain rounded"
                  />
                </div>

                <div className="text-right flex-1 pl-2">
                  <h1 className="font-heading text-xl font-black tracking-tight text-slate-950 uppercase leading-none">
                    SR STUDIO
                  </h1>
                  <p className="text-[10px] font-bold tracking-wide text-slate-800 uppercase mt-0.5">
                    ARCHITECTURE DESIGN &bull; CIVIL CONTRACTOR &bull; COST ESTIMATOR
                  </p>
                  <p className="text-[9px] text-slate-600 leading-tight mt-0.5">
                    Studio Perancangan Bangunan, Pengawasan Konstruksi & Penyusunan Rencana Anggaran Biaya (RAB)
                  </p>
                  <p className="text-[8.5px] font-mono text-slate-500 mt-0.5">
                    Semarang, Jawa Tengah &bull; WhatsApp: +62 858-6825-2639 &bull; Email: muhrafi118b@gmail.com
                  </p>
                </div>
              </div>
              <div className="mt-1.5 pt-0.5 border-t border-slate-950"></div>
            </div>

            {/* 2. INFORMASI ADMINISTRASI PROYEK */}
            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] border-b border-slate-300 gap-2">
              <div>
                <h3 className="font-heading text-xs font-black uppercase text-slate-950 tracking-wide">
                  JADWAL WAKTU PELAKSANAAN PEKERJAAN (TIME SCHEDULE) & KURVA "S"
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-slate-700 mt-1">
                  <span><strong>Proyek:</strong> {state.project.name || 'Proyek Konstruksi'}</span>
                  <span><strong>Lokasi:</strong> {state.project.location || '-'}</span>
                  <span><strong>Klien:</strong> {state.project.client || '-'}</span>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono text-[9.5px] text-slate-600 space-y-0.5">
                <div>Waktu Pelaksanaan: <strong>{durationWeeks} Minggu ({durationWeeks * 7} Hari)</strong></div>
                <div>Target PHO: <strong>{targetCompletionDate}</strong></div>
              </div>
            </div>

            {/* 3. KURVA S CHART CETAK (COMPACT HIGH-DENSITY) */}
            <div className="my-2 border border-slate-300 rounded p-2 bg-slate-50/50 print-break-inside-avoid">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 mb-1 px-1">
                <span>PROGRESS BOBOT KUMULATIF (%)</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-blue-700">
                    <span className="w-3 h-0.5 bg-blue-600 inline-block"></span> Rencana
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span> Realisasi Lapangan
                  </span>
                </div>
              </div>

              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto max-h-[160px]">
                {/* Horizontal gridlines */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = getY(pct);
                  return (
                    <g key={pct}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 3" />
                      <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fontFamily="monospace" fill="#64748b">
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Week vertical lines */}
                {scheduleData.weeks.map((w) => {
                  const x = getX(w.weekNum);
                  return (
                    <g key={w.weekNum}>
                      <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#e2e8f0" strokeWidth="0.8" />
                      <text x={x} y={padT + plotH + 14} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="#475569">
                        M{w.weekNum}
                      </text>
                    </g>
                  );
                })}

                {/* Plan Curve */}
                {planPath && (
                  <path d={planPath} fill="none" stroke="#2563eb" strokeWidth="2.5" />
                )}

                {/* Actual Curve */}
                {actualPath && (
                  <path d={actualPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                )}

                {/* Points on Plan */}
                {scheduleData.weeks.map(w => (
                  <circle key={w.weekNum} cx={getX(w.weekNum)} cy={getY(w.planCum)} r="3" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                ))}
              </svg>
            </div>

            {/* 4. MATRIKS TABEL TIME SCHEDULE (GANTT TABLE) */}
            <div className="my-2 print-break-inside-avoid overflow-x-auto">
              <table className="w-full text-[9px] border border-slate-900 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold uppercase text-[8.5px]">
                    <th className="py-1 px-1 border-r border-slate-900 w-8 text-center">No</th>
                    <th className="py-1 px-2 border-r border-slate-900 text-left">Uraian Divisi Pekerjaan</th>
                    <th className="py-1 px-1.5 border-r border-slate-900 w-16 text-right">Bobot (%)</th>
                    {scheduleData.weeks.map(w => (
                      <th key={w.weekNum} className="py-1 px-0.5 border-r border-slate-900 text-center font-mono">
                        M{w.weekNum}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {categoriesWithWeight.map(cat => (
                    <tr key={cat.id}>
                      <td className="py-0.5 px-1 text-center border-r border-slate-300 font-mono font-bold">
                        {cat.romanNo}
                      </td>
                      <td className="py-0.5 px-2 border-r border-slate-300 font-semibold text-slate-900 truncate">
                        {cat.name.toUpperCase()}
                      </td>
                      <td className="py-0.5 px-1.5 text-right border-r border-slate-300 font-mono font-bold text-slate-900">
                        {cat.weight.toFixed(2)}%
                      </td>
                      {scheduleData.weeks.map(w => {
                        const isActive = w.weekNum >= cat.startWeek && w.weekNum <= cat.endWeek;
                        return (
                          <td 
                            key={w.weekNum} 
                            className={`py-0.5 px-0.5 text-center border-r border-slate-300 font-mono text-[8px] ${
                              isActive ? 'bg-slate-200 font-bold text-slate-950' : 'text-slate-300'
                            }`}
                          >
                            {isActive ? `${cat.weeklyWeight.toFixed(2)}` : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-900 font-bold text-[8.5px]">
                  {/* Rencana Mingguan */}
                  <tr className="bg-slate-100">
                    <td colSpan={2} className="py-0.5 px-2 text-right uppercase border-r border-slate-900">
                      Rencana Mingguan (%) :
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-900">
                      100.00%
                    </td>
                    {scheduleData.weeks.map(w => (
                      <td key={w.weekNum} className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900">
                        {w.planWeekly.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  {/* Kumulatif Rencana */}
                  <tr className="bg-slate-200">
                    <td colSpan={2} className="py-0.5 px-2 text-right uppercase border-r border-slate-900">
                      Kumulatif Rencana (%) :
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-900">
                      100.00%
                    </td>
                    {scheduleData.weeks.map(w => (
                      <td key={w.weekNum} className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 font-black">
                        {w.planCum.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  {/* Realisasi Mingguan */}
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="py-0.5 px-2 text-right uppercase border-r border-slate-900 text-slate-700">
                      Realisasi Mingguan (%) :
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-900 text-slate-700">
                      -
                    </td>
                    {scheduleData.weeks.map(w => (
                      <td key={w.weekNum} className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 text-slate-700">
                        {w.actualWeekly !== null ? w.actualWeekly.toFixed(2) : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Kumulatif Realisasi */}
                  <tr className="bg-slate-100">
                    <td colSpan={2} className="py-0.5 px-2 text-right uppercase border-r border-slate-900">
                      Kumulatif Realisasi (%) :
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-900">
                      -
                    </td>
                    {scheduleData.weeks.map(w => (
                      <td key={w.weekNum} className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 font-bold">
                        {w.actualCum !== null ? w.actualCum.toFixed(2) : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Deviasi */}
                  <tr className="bg-slate-200">
                    <td colSpan={2} className="py-0.5 px-2 text-right uppercase border-r border-slate-900">
                      Deviasi (+/- %) :
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-900">
                      -
                    </td>
                    {scheduleData.weeks.map(w => (
                      <td key={w.weekNum} className="py-0.5 px-0.5 text-center font-mono border-r border-slate-900 font-black">
                        {w.deviasi !== null ? (w.deviasi >= 0 ? `+${w.deviasi.toFixed(2)}` : `${w.deviasi.toFixed(2)}`) : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. LEMBAR PENGESAHAN 3 PIHAK */}
            <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] print-break-inside-avoid">
              <div className="grid grid-cols-3 gap-4 text-center">
                
                {/* Pihak 1: Pemberi Tugas */}
                <div className="flex flex-col justify-between h-20">
                  <div>
                    <p className="text-slate-600 text-[9px]">Menyetujui,</p>
                    <p className="font-bold text-slate-950 uppercase text-[9.5px]">
                      PEMBERI TUGAS / KLIEN
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-950 underline text-[10.5px]">
                      {state.project.client || '( ............................................... )'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Klien / Pemilik Proyek</p>
                  </div>
                </div>

                {/* Pihak 2: Konsultan Perencana & Estimator */}
                <div className="flex flex-col justify-between h-20">
                  <div>
                    <p className="text-slate-600 text-[9px]">Semarang, {new Date(startDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold text-slate-950 uppercase text-[9.5px]">
                      SR STUDIO ARCHITECTURE
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-950 underline text-[10.5px]">
                      Muhammad Rafi F., S.Ars.
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Principal Architect & Lead Estimator</p>
                  </div>
                </div>

                {/* Pihak 3: Kontraktor / Pelaksana Lapangan */}
                <div className="flex flex-col justify-between h-20">
                  <div>
                    <p className="text-slate-600 text-[9px]">Mengetahui & Melaksanakan,</p>
                    <p className="font-bold text-slate-950 uppercase text-[9.5px]">
                      PELAKSANA LAPANGAN / SITE MANAGER
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-950 underline text-[10.5px]">
                      ( ............................................... )
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Site Engineer / Project Manager</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-mono">
              <span>SR Studio BoQ Tools &bull; Dokumen Time Schedule & Kurva S Resmi</span>
              <span>Halaman 1 dari 1 (A4 Landscape)</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
