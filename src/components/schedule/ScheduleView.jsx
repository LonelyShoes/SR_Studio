import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileSpreadsheet, 
  Layers, 
  ChevronRight, 
  Sliders, 
  Sparkles,
  Info,
  CalendarDays,
  Percent,
  CircleDollarSign
} from 'lucide-react';
import { formatRp, formatNumber, toRoman } from '../../utils/formatters';

export function ScheduleView() {
  const { 
    state, 
    subtotal, 
    grandTotal, 
    scheduleConfig, 
    updateScheduleDuration, 
    updateScheduleStartDate, 
    updateCategorySchedule, 
    updateActualProgress, 
    resetScheduleToDefault,
    setScheduleModalOpen,
    setActiveTab
  } = useBoQ();

  const [hoveredWeek, setHoveredWeek] = useState(null);
  const [activeViewMode, setActiveViewMode] = useState('both'); // 'both' | 'chart' | 'matrix'

  const durationWeeks = scheduleConfig.durationWeeks || 12;
  const startDateStr = scheduleConfig.startDate || state.project.date || new Date().toISOString().slice(0, 10);

  // Kategori aktif yang memiliki subtotal biaya > 0
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

  // Kalkulasi Bobot (%) masing-masing kategori
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

  // Kalkulasi Rencana Mingguan & Kumulatif
  const scheduleData = useMemo(() => {
    const weeks = [];
    let runningPlannedCum = 0;
    let runningActualCum = 0;
    let hasActualData = false;

    // Kalkulasi tanggal tiap minggu
    const startDateObj = new Date(startDateStr);

    for (let w = 1; w <= durationWeeks; w++) {
      // Sum rencana minggu ke-w
      let planWeekly = 0;
      categoriesWithWeight.forEach(cat => {
        if (w >= cat.startWeek && w <= cat.endWeek) {
          planWeekly += cat.weeklyWeight;
        }
      });

      runningPlannedCum += planWeekly;

      // Adjust rounding pada minggu terakhir agar tepat 100%
      if (w === durationWeeks && Math.abs(runningPlannedCum - 100) < 0.5) {
        planWeekly += (100 - runningPlannedCum);
        runningPlannedCum = 100;
      }

      // Input aktual minggu ke-w
      const actualVal = scheduleConfig.actualProgress?.[w];
      let actualWeekly = null;
      let actualCum = null;
      let deviasi = null;

      if (actualVal !== undefined && actualVal !== null && actualVal !== '') {
        actualWeekly = parseFloat(actualVal) || 0;
        runningActualCum += actualWeekly;
        actualCum = runningActualCum;
        deviasi = actualCum - runningPlannedCum;
        hasActualData = true;
      }

      // Hitung range tanggal minggu
      const wStart = new Date(startDateObj);
      wStart.setDate(wStart.getDate() + (w - 1) * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);

      const dateLabel = `${wStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${wEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;

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

    return { weeks, hasActualData };
  }, [categoriesWithWeight, durationWeeks, startDateStr, scheduleConfig.actualProgress]);

  // Target Tanggal Selesai (PHO)
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

  // Deviasi Terakhir
  const latestDeviasi = useMemo(() => {
    const filled = scheduleData.weeks.filter(w => w.deviasi !== null);
    if (filled.length === 0) return null;
    return filled[filled.length - 1];
  }, [scheduleData]);

  // SVG Chart Geometry
  const chartW = 920;
  const chartH = 340;
  const padL = 55;
  const padR = 35;
  const padT = 30;
  const padB = 45;
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

  // SVG Paths
  const planPath = useMemo(() => {
    if (scheduleData.weeks.length === 0) return '';
    return scheduleData.weeks.reduce((path, w, i) => {
      const x = getX(w.weekNum);
      const y = getY(w.planCum);
      if (i === 0) return `M ${x} ${y}`;
      // Smooth curve with quadratic bezier
      const prevW = scheduleData.weeks[i - 1];
      const prevX = getX(prevW.weekNum);
      const prevY = getY(prevW.planCum);
      const cx = (prevX + x) / 2;
      return `${path} C ${cx} ${prevY}, ${cx} ${y}, ${x} ${y}`;
    }, '');
  }, [scheduleData.weeks, durationWeeks]);

  const planAreaPath = useMemo(() => {
    if (!planPath) return '';
    const lastX = getX(durationWeeks);
    const firstX = getX(1);
    const bottomY = getY(0);
    return `${planPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [planPath, durationWeeks]);

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

  // Temukan minggu perkiraan Termin
  const termin1Week = useMemo(() => {
    const match = scheduleData.weeks.find(w => w.planCum >= 50);
    return match ? match.weekNum : Math.round(durationWeeks * 0.5);
  }, [scheduleData.weeks, durationWeeks]);

  const termin2Week = useMemo(() => {
    const match = scheduleData.weeks.find(w => w.planCum >= 80);
    return match ? match.weekNum : Math.round(durationWeeks * 0.8);
  }, [scheduleData.weeks, durationWeeks]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      
      {/* ==================== 1. EXECUTIVE HERO BANNER ==================== */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-5 sm:p-7 border border-slate-800 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>TIME SCHEDULE & S-CURVE GENERATOR TA 2026</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-black tracking-tight text-white">
              Kurva S & Jadwal Pelaksanaan Proyek
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Distribusi bobot terintegrasi langsung dari BoQ. Susun waktu pelaksanaan tiap divisi, pantau progres fisik mingguan, dan cetak dokumen resmi berkop SR Studio.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Proyek: {state.project.name || 'Proyek Belum Dinamai'}
              </span>
              <span>&bull;</span>
              <span>Klien: {state.project.client || '-'}</span>
              <span>&bull;</span>
              <span>Total RAB: {formatRp(grandTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Time Schedule & Kurva S</span>
            </button>

            <button
              type="button"
              onClick={resetScheduleToDefault}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all"
              title="Reset ke urutan sekuensial standar konstruksi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('boq')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Edit BoQ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. EXECUTIVE KPI CARDS & TIME CONFIG ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Durasi Pelaksanaan */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-paper-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Durasi Proyek</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">{durationWeeks}</span>
              <span className="text-xs font-bold text-slate-600 uppercase">Minggu</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Setara {durationWeeks * 7} Hari Kalender
            </p>
          </div>

          {/* Durasi Quick Switch */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">Pilihan Cepat:</span>
            <div className="inline-flex gap-1">
              {[8, 12, 16, 24].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => updateScheduleDuration(w)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    durationWeeks === w 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w}M
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Periode Kalender */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-paper-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Target Waktu (PHO)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <span className="text-sm sm:text-base font-bold text-slate-900 block truncate">
              {targetCompletionDate}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mulai: {new Date(startDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Start Date Picker Input */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">Mulai Kerja:</span>
            <input 
              type="date" 
              value={startDateStr} 
              onChange={(e) => updateScheduleStartDate(e.target.value)}
              className="text-[11px] font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Card 3: Rencana vs Aktual Terakhir */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-paper-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progres Fisik</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Rencana</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-blue-600">
                  {latestDeviasi ? latestDeviasi.planCum.toFixed(2) : scheduleData.weeks[0]?.planCum.toFixed(2)}%
                </span>
              </div>
              <span className="text-slate-300 text-xl font-light">/</span>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Aktual</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                  {latestDeviasi && latestDeviasi.actualCum !== null ? latestDeviasi.actualCum.toFixed(2) : '0.00'}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Minggu Berjalan:</span>
            <span className="font-bold text-slate-800">
              {latestDeviasi ? `Minggu ke-${latestDeviasi.weekNum}` : 'Minggu ke-1'}
            </span>
          </div>
        </div>

        {/* Card 4: Deviasi Waktu (Ahead/Behind) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-paper-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status Deviasi Waktu</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              !latestDeviasi || latestDeviasi.deviasi === 0
                ? 'bg-blue-500/10 text-blue-600'
                : latestDeviasi.deviasi > 0
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-rose-500/10 text-rose-600'
            }`}>
              {!latestDeviasi || latestDeviasi.deviasi === 0 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : latestDeviasi.deviasi > 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>

          <div className="my-2">
            {!latestDeviasi ? (
              <div>
                <span className="text-base sm:text-lg font-black text-slate-800">Tepat Waktu</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Belum ada deviasi tercatat</p>
              </div>
            ) : latestDeviasi.deviasi > 0 ? (
              <div>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                  +{latestDeviasi.deviasi.toFixed(2)}%
                </span>
                <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Proyek Lebih Cepat (Ahead)</p>
              </div>
            ) : latestDeviasi.deviasi < 0 ? (
              <div>
                <span className="text-xl sm:text-2xl font-black font-mono text-rose-600">
                  {latestDeviasi.deviasi.toFixed(2)}%
                </span>
                <p className="text-[10px] text-rose-700 font-semibold mt-0.5">Proyek Terlambat (Behind)</p>
              </div>
            ) : (
              <div>
                <span className="text-xl sm:text-2xl font-black font-mono text-blue-600">0.00%</span>
                <p className="text-[10px] text-blue-700 font-semibold mt-0.5">Tepat Sesuai Rencana</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Toleransi Kritis: &plusmn;5%</span>
            <span className="text-slate-600 font-mono">Standar PU</span>
          </div>
        </div>

      </div>

      {/* ==================== 3. INTERACTIVE SVG S-CURVE CHART ==================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-paper-300 shadow-xl relative">
        
        {/* Chart Header & Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              Grafik Kurva "S" Pelaksanaan Pekerjaan
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-50 text-blue-700 border border-blue-200">
                0% - 100%
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi laju penyerapan bobot kumulatif rencana (biru) dibandingkan realisasi progres fisik lapangan (hijau/merah).
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></span>
              <span className="font-semibold text-slate-700">Rencana Kumulatif</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-emerald-500 rounded-full border border-emerald-600"></span>
              <span className="font-semibold text-slate-700">Realisasi Lapangan</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Titik Termin (TOP)</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="relative overflow-x-auto custom-scrollbar pt-2">
          <svg 
            viewBox={`0 0 ${chartW} ${chartH}`} 
            className="w-full h-auto min-w-[700px] select-none"
          >
            <defs>
              {/* Gradient Area Rencana */}
              <linearGradient id="planAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>

              {/* Gradient Garis Rencana */}
              <linearGradient id="planStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines (Y-Axis: 0%, 20%, 40%, 60%, 80%, 100%) */}
            {[0, 20, 40, 60, 80, 100].map((pct) => {
              const y = getY(pct);
              return (
                <g key={pct}>
                  <line 
                    x1={padL} 
                    y1={y} 
                    x2={chartW - padR} 
                    y2={y} 
                    stroke="#e2e8f0" 
                    strokeWidth={pct === 0 || pct === 100 ? "1.5" : "1"} 
                    strokeDasharray={pct === 0 || pct === 100 ? "none" : "4 4"}
                  />
                  <text 
                    x={padL - 10} 
                    y={y + 4} 
                    textAnchor="end" 
                    fontSize="11" 
                    fontFamily="monospace" 
                    fill="#64748b"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Vertical Week Guidelines (X-Axis) */}
            {scheduleData.weeks.map((w) => {
              const x = getX(w.weekNum);
              return (
                <g key={w.weekNum}>
                  <line 
                    x1={x} 
                    y1={padT} 
                    x2={x} 
                    y2={padT + plotH} 
                    stroke="#f1f5f9" 
                    strokeWidth="1"
                  />
                  <text 
                    x={x} 
                    y={padT + plotH + 20} 
                    textAnchor="middle" 
                    fontSize="11" 
                    fontWeight="600" 
                    fontFamily="monospace" 
                    fill={hoveredWeek?.weekNum === w.weekNum ? "#0f172a" : "#64748b"}
                  >
                    M{w.weekNum}
                  </text>
                </g>
              );
            })}

            {/* Area Fill Kurva Rencana */}
            {planAreaPath && (
              <path d={planAreaPath} fill="url(#planAreaGradient)" />
            )}

            {/* Garis Kurva Rencana */}
            {planPath && (
              <path 
                d={planPath} 
                fill="none" 
                stroke="url(#planStrokeGradient)" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            )}

            {/* Garis Kurva Realisasi Lapangan */}
            {actualPath && (
              <path 
                d={actualPath} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                strokeDasharray="1 0"
              />
            )}

            {/* Marker Titik Termin Pembayaran (TOP) */}
            {/* Termin 1: 50% */}
            <g>
              <line 
                x1={getX(termin1Week)} 
                y1={getY(0)} 
                x2={getX(termin1Week)} 
                y2={getY(50)} 
                stroke="#f59e0b" 
                strokeWidth="1.5" 
                strokeDasharray="3 3"
              />
              <circle cx={getX(termin1Week)} cy={getY(50)} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x={getX(termin1Week)} y={getY(50) - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#b45309">
                Termin I (50%)
              </text>
            </g>

            {/* Termin 2: 80% */}
            <g>
              <line 
                x1={getX(termin2Week)} 
                y1={getY(0)} 
                x2={getX(termin2Week)} 
                y2={getY(80)} 
                stroke="#f59e0b" 
                strokeWidth="1.5" 
                strokeDasharray="3 3"
              />
              <circle cx={getX(termin2Week)} cy={getY(80)} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x={getX(termin2Week)} y={getY(80) - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#b45309">
                Termin II (80%)
              </text>
            </g>

            {/* Interactive Points on Kurva Rencana */}
            {scheduleData.weeks.map((w) => {
              const x = getX(w.weekNum);
              const y = getY(w.planCum);
              const isHovered = hoveredWeek?.weekNum === w.weekNum;

              return (
                <g 
                  key={w.weekNum}
                  onMouseEnter={() => setHoveredWeek(w)}
                  onMouseLeave={() => setHoveredWeek(null)}
                  className="cursor-pointer"
                >
                  {/* Invisible broad hitbox */}
                  <circle cx={x} cy={y} r="18" fill="transparent" />
                  
                  {/* Visual Point */}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={isHovered ? "6" : "4"} 
                    fill="#ffffff" 
                    stroke="#2563eb" 
                    strokeWidth={isHovered ? "3" : "2"} 
                    className="transition-all"
                  />

                  {/* Point for Actual if exists */}
                  {w.actualCum !== null && (
                    <circle 
                      cx={x} 
                      cy={getY(w.actualCum)} 
                      r={isHovered ? "6" : "4"} 
                      fill="#10b981" 
                      stroke="#ffffff" 
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover HUD Tooltip */}
          {hoveredWeek && (
            <div 
              className="absolute z-20 bg-slate-950/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 pointer-events-none text-xs backdrop-blur-md min-w-[220px]"
              style={{
                left: `${Math.max(10, Math.min(85, (hoveredWeek.weekNum / durationWeeks) * 100))}%`,
                top: '15px'
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-heading font-black text-amber-400">
                  Minggu ke-{hoveredWeek.weekNum}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {hoveredWeek.dateLabel}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Rencana Mingguan:</span>
                  <span className="font-mono font-bold text-blue-300">{hoveredWeek.planWeekly.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kumulatif Rencana:</span>
                  <span className="font-mono font-black text-blue-400">{hoveredWeek.planCum.toFixed(2)}%</span>
                </div>
                
                {hoveredWeek.actualCum !== null && (
                  <>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1">
                      <span className="text-slate-400">Realisasi Aktual:</span>
                      <span className="font-mono font-bold text-emerald-300">{hoveredWeek.actualCum.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Deviasi:</span>
                      <span className={`font-mono font-bold ${
                        hoveredWeek.deviasi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {hoveredWeek.deviasi >= 0 ? `+${hoveredWeek.deviasi.toFixed(2)}%` : `${hoveredWeek.deviasi.toFixed(2)}%`}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t border-slate-800 pt-1 flex justify-between text-[10px]">
                  <span className="text-slate-500">Nilai Fisik (Rp):</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {formatRp(grandTotal * (hoveredWeek.planCum / 100))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ==================== 4. TIME SCHEDULE MATRIX & GANTT TABLE ==================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-paper-300 shadow-xl">
        
        {/* Table Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              Matriks Penjadwalan Kerja & Distribusi Bobot
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700">
                {categoriesWithWeight.length} Divisi Aktif
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Atur minggu mulai dan selesai tiap divisi. Sistem membagi bobot secara proporsional dan menjamin kumulatif tepat 100%.
            </p>
          </div>

          {/* Quick Info & Helper */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium text-[11px]">
              <Info className="w-3.5 h-3.5" />
              Ketik realisasi mingguan di baris tabel bawah
            </span>
          </div>
        </div>

        {/* Scrollable Matrix Table */}
        <div className="overflow-x-auto custom-scrollbar mt-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-heading uppercase text-[11px] tracking-wider">
                <th className="py-2.5 px-2 border-r border-slate-800 text-center w-10 sticky left-0 z-10 bg-slate-900">No</th>
                <th className="py-2.5 px-3 border-r border-slate-800 text-left min-w-[200px] sticky left-10 z-10 bg-slate-900">Uraian Divisi Pekerjaan</th>
                <th className="py-2.5 px-2.5 border-r border-slate-800 text-right w-20 sticky left-[250px] z-10 bg-slate-900">Bobot (%)</th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-center w-24">Rentang Waktu</th>

                {/* Kolom Minggu W1 .. WN */}
                {scheduleData.weeks.map(w => (
                  <th key={w.weekNum} className="py-2 px-1.5 border-r border-slate-800 text-center min-w-[48px]">
                    <div className="font-bold font-mono">W{w.weekNum}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {categoriesWithWeight.map((cat) => {
                return (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    {/* No */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-mono font-bold text-slate-600 sticky left-0 bg-white z-10">
                      {cat.romanNo}
                    </td>

                    {/* Uraian Pekerjaan */}
                    <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900 sticky left-10 bg-white z-10 truncate max-w-[220px]">
                      {cat.name}
                    </td>

                    {/* Bobot % */}
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-bold text-blue-600 sticky left-[250px] bg-white z-10">
                      {cat.weight.toFixed(2)}%
                    </td>

                    {/* Start & End Week Selectors */}
                    <td className="py-1.5 px-1.5 border-r border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={cat.startWeek}
                          onChange={(e) => updateCategorySchedule(cat.id, e.target.value, cat.endWeek)}
                          className="bg-slate-100 border border-slate-300 rounded text-[10px] font-mono px-1 py-0.5 focus:outline-none focus:border-blue-500"
                        >
                          {Array.from({ length: durationWeeks }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w}>W{w}</option>
                          ))}
                        </select>
                        <span className="text-slate-400 font-light">-</span>
                        <select
                          value={cat.endWeek}
                          onChange={(e) => updateCategorySchedule(cat.id, cat.startWeek, e.target.value)}
                          className="bg-slate-100 border border-slate-300 rounded text-[10px] font-mono px-1 py-0.5 focus:outline-none focus:border-blue-500"
                        >
                          {Array.from({ length: durationWeeks }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w} disabled={w < cat.startWeek}>W{w}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Gantt Bar Cells across weeks */}
                    {scheduleData.weeks.map(w => {
                      const isActive = w.weekNum >= cat.startWeek && w.weekNum <= cat.endWeek;

                      return (
                        <td 
                          key={w.weekNum} 
                          className={`py-1.5 px-1 text-center border-r border-slate-200 font-mono text-[10px] transition-colors ${
                            isActive 
                              ? 'bg-blue-50/80 font-bold text-blue-900' 
                              : 'text-slate-300'
                          }`}
                        >
                          {isActive ? (
                            <div className="py-1 rounded bg-blue-500/20 text-blue-700 border border-blue-500/30">
                              {cat.weeklyWeight.toFixed(2)}%
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Table Summary & Actual Tracking Rows */}
            <tfoot className="border-t-2 border-slate-900 font-bold">
              
              {/* Row 1: Rencana Mingguan (%) */}
              <tr className="bg-slate-100 text-slate-900">
                <td colSpan={2} className="py-2 px-3 text-right uppercase sticky left-0 bg-slate-100 z-10 border-r border-slate-300">
                  Rencana Mingguan (%) :
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-blue-600 sticky left-[250px] bg-slate-100 z-10 border-r border-slate-300">
                  100.00%
                </td>
                <td className="border-r border-slate-300 bg-slate-100"></td>
                {scheduleData.weeks.map(w => (
                  <td key={w.weekNum} className="py-2 px-1 text-center font-mono text-slate-800 border-r border-slate-300 text-[10.5px]">
                    {w.planWeekly.toFixed(2)}%
                  </td>
                ))}
              </tr>

              {/* Row 2: Kumulatif Rencana (%) */}
              <tr className="bg-blue-50 text-blue-950">
                <td colSpan={2} className="py-2 px-3 text-right uppercase sticky left-0 bg-blue-50 z-10 border-r border-slate-300">
                  Kumulatif Rencana (%) :
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-blue-700 sticky left-[250px] bg-blue-50 z-10 border-r border-slate-300">
                  100.00%
                </td>
                <td className="border-r border-slate-300 bg-blue-50"></td>
                {scheduleData.weeks.map(w => (
                  <td key={w.weekNum} className="py-2 px-1 text-center font-mono font-black text-blue-700 border-r border-slate-300 text-[10.5px]">
                    {w.planCum.toFixed(2)}%
                  </td>
                ))}
              </tr>

              {/* Row 3: Realisasi Mingguan (%) Input */}
              <tr className="bg-emerald-50 text-emerald-950">
                <td colSpan={2} className="py-2 px-3 text-right uppercase sticky left-0 bg-emerald-50 z-10 border-r border-slate-300">
                  Input Realisasi Fisik Mingguan (%) :
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-emerald-700 sticky left-[250px] bg-emerald-50 z-10 border-r border-slate-300">
                  {latestDeviasi && latestDeviasi.actualCum !== null ? latestDeviasi.actualCum.toFixed(2) : '0.00'}%
                </td>
                <td className="border-r border-slate-300 bg-emerald-50"></td>
                {scheduleData.weeks.map(w => (
                  <td key={w.weekNum} className="py-1 px-1 text-center border-r border-slate-300">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      value={scheduleConfig.actualProgress?.[w.weekNum] ?? ''}
                      onChange={(e) => updateActualProgress(w.weekNum, e.target.value)}
                      className="w-full text-center font-mono font-bold text-[10.5px] bg-white border border-emerald-300 rounded py-1 px-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-emerald-900"
                    />
                  </td>
                ))}
              </tr>

              {/* Row 4: Kumulatif Realisasi (%) */}
              <tr className="bg-emerald-100/70 text-emerald-950">
                <td colSpan={2} className="py-2 px-3 text-right uppercase sticky left-0 bg-emerald-100/70 z-10 border-r border-slate-300">
                  Kumulatif Realisasi (%) :
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-emerald-800 sticky left-[250px] bg-emerald-100/70 z-10 border-r border-slate-300">
                  {latestDeviasi && latestDeviasi.actualCum !== null ? latestDeviasi.actualCum.toFixed(2) : '0.00'}%
                </td>
                <td className="border-r border-slate-300 bg-emerald-100/70"></td>
                {scheduleData.weeks.map(w => (
                  <td key={w.weekNum} className="py-2 px-1 text-center font-mono font-black text-emerald-800 border-r border-slate-300 text-[10.5px]">
                    {w.actualCum !== null ? `${w.actualCum.toFixed(2)}%` : '-'}
                  </td>
                ))}
              </tr>

              {/* Row 5: Deviasi Proyek (+/- %) */}
              <tr className="bg-slate-200 text-slate-950">
                <td colSpan={2} className="py-2 px-3 text-right uppercase sticky left-0 bg-slate-200 z-10 border-r border-slate-300">
                  Deviasi (+/- %) :
                </td>
                <td className="py-2 px-2.5 text-right font-mono sticky left-[250px] bg-slate-200 z-10 border-r border-slate-300">
                  {latestDeviasi ? (
                    <span className={latestDeviasi.deviasi >= 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                      {latestDeviasi.deviasi >= 0 ? `+${latestDeviasi.deviasi.toFixed(2)}%` : `${latestDeviasi.deviasi.toFixed(2)}%`}
                    </span>
                  ) : '-'}
                </td>
                <td className="border-r border-slate-300 bg-slate-200"></td>
                {scheduleData.weeks.map(w => (
                  <td 
                    key={w.weekNum} 
                    className={`py-2 px-1 text-center font-mono font-black border-r border-slate-300 text-[10.5px] ${
                      w.deviasi === null
                        ? 'text-slate-400'
                        : w.deviasi >= 0
                        ? 'text-emerald-700 bg-emerald-100/50'
                        : 'text-rose-700 bg-rose-100/50'
                    }`}
                  >
                    {w.deviasi !== null ? (w.deviasi >= 0 ? `+${w.deviasi.toFixed(2)}%` : `${w.deviasi.toFixed(2)}%`) : '-'}
                  </td>
                ))}
              </tr>

            </tfoot>
          </table>
        </div>

      </div>

    </div>
  );
}
