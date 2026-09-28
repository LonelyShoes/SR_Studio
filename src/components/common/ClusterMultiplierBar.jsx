import React, { useState } from 'react';
import { Building, Layers, Check, Sparkles, ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';
import { useBoQ } from '../../context/BoQContext';

export function ClusterMultiplierBar({
  multiplier = 1,
  onChange,
  applyMode = 'multiplied', // 'multiplied' | 'single'
  onToggleApplyMode,
  unitLabel = 'Pintu / Kavling Cluster'
}) {
  const { 
    clusterTypology, 
    updateClusterTypology, 
    clusterRowUnits, 
    updateClusterRowUnits 
  } = useBoQ();

  const [showGuide, setShowGuide] = useState(false);

  const quickPresets = [1, 2, 4, 6, 8, 10, 12, 16, 20];
  const rowN = Math.max(2, clusterRowUnits || 4);
  const sharedSavingsPct = (((2 * rowN - (rowN + 1)) / (2 * rowN)) * 100).toFixed(0);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blueprint-950 rounded-3xl p-4 sm:p-6 text-white border border-slate-800 shadow-xl space-y-3.5 sm:space-y-4">
      
      {/* Tier 1: Title, Badge, Description, & Apply Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left Header Info */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner mt-0.5 sm:mt-0">
            <Building className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-heading font-black tracking-wide text-white uppercase whitespace-nowrap">
                Tipologi Cluster & Multi-Unit
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 whitespace-nowrap inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                &times;{multiplier} {unitLabel}
              </span>
              {clusterTypology === 'shared' && (
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap inline-flex items-center gap-1">
                  🤝 1 Dinding Bersama
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              {clusterTypology === 'shared'
                ? `Mode Dinding Bersama (Party Wall): Deret ${rowN} unit menghemat ~${sharedSavingsPct}% struktur dinding & sloof/kolom perbatasan.`
                : 'Mode Dinding Ganda (2 Dinding): Setiap unit mandiri 100% dengan dinding & struktur pemisah tersendiri.'}
            </p>
          </div>
        </div>

        {/* Right Toggle Button */}
        {onToggleApplyMode && (
          <button
            type="button"
            onClick={() => onToggleApplyMode(applyMode === 'multiplied' ? 'single' : 'multiplied')}
            className={`w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              applyMode === 'multiplied'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Toggle pelipatgandaan volume ke BoQ"
          >
            <span className={`w-2 h-2 rounded-full ${applyMode === 'multiplied' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="whitespace-nowrap">
              {applyMode === 'multiplied' ? `Mode: Total Cluster (\u00D7${multiplier} Unit)` : 'Mode: 1 Unit Saja'}
            </span>
          </button>
        )}
      </div>

      {/* Tier 2: Tipologi Konstruksi Dinding (Dinding Ganda vs Dinding Bersama) */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Sistem Dinding:
          </span>
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => updateClusterTypology('double')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                clusterTypology === 'double'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🧱 Dinding Ganda (2 Dinding)</span>
            </button>
            <button
              type="button"
              onClick={() => updateClusterTypology('shared')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                clusterTypology === 'shared'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🤝 Dinding Bersama (1 Dinding)</span>
            </button>
          </div>

          {/* Tombol Bantuan Pelajari Cara Kerja */}
          <button
            type="button"
            onClick={() => setShowGuide(prev => !prev)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5 transition-all hover:bg-slate-700 active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{showGuide ? 'Tutup Panduan' : '💡 Pelajari Cara Kerja'}</span>
          </button>
        </div>

        {/* Setting Deret jika Dinding Bersama */}
        {clusterTypology === 'shared' && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs text-emerald-300 self-start sm:self-auto">
            <span className="text-[11px] font-mono font-bold">Deret:</span>
            <input
              type="number"
              min="2"
              max="50"
              value={rowN}
              onChange={(e) => updateClusterRowUnits(e.target.value)}
              className="w-12 text-center font-mono font-black text-xs text-emerald-300 bg-slate-900 border border-emerald-500/40 rounded-lg py-0.5 focus:outline-none focus:border-emerald-400"
            />
            <span className="text-[11px] font-mono">Unit / Blok</span>
            <span className="text-[10px] text-emerald-400/90 font-mono hidden md:inline">
              (Faktor Batas: {((rowN + 1) / (2 * rowN)).toFixed(3)})
            </span>
          </div>
        )}
      </div>

      {/* Guide Drawer / Panduan Interaktif */}
      {showGuide && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/95 border border-slate-700 space-y-3.5 animate-fadeIn text-xs shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-heading font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Panduan Cara Kerja: Mengapa Perhitungan Berbeda di Tipologi Dinding Bersama?
            </span>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-slate-400 hover:text-white font-mono text-xs px-2 py-0.5 rounded bg-slate-800"
            >
              ✕ Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Dinding */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="font-bold text-amber-300 font-heading text-xs flex items-center gap-1.5">
                <span>🧱 1. Pekerjaan Pasangan Dinding</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Dinding Ganda (2 Dinding):</strong> Setiap rumah membangun dinding batasnya sendiri (ada 2 lapis bata yang berdiri berdampingan).
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Dinding Bersama (1 Dinding):</strong> Hanya <strong>1 bidang dinding bata</strong> dibangun di garis batas tanah dan dipakai bersama oleh 2 rumah tetangga. Pasangan bata samping dihemat hingga <strong>~38% s/d 45%</strong> se-cluster.
              </p>
            </div>

            {/* 2. Cor Beton */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-300 font-heading text-xs flex items-center gap-1.5">
                <span>🏢 2. Pekerjaan Cor Beton</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Dinding Ganda (2 Dinding):</strong> Di batas tanah terdapat 2 jalur sloof dan 2 baris kolom praktis mandiri.
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Dinding Bersama (1 Dinding):</strong> Di as perbatasan hanya <strong>dicor 1 baris sloof dan 1 kolom bersama</strong>. Saat input sloof/kolom, pilih <em>"Struktur Batas Kavling"</em> agar volumenya otomatis disesuaikan secara proporsional.
              </p>
            </div>

            {/* 3. Besi Tulangan */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="font-bold text-indigo-300 font-heading text-xs flex items-center gap-1.5">
                <span>✂️ 3. Pekerjaan Besi Tulangan</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Dinding Ganda (2 Dinding):</strong> Butuh besi tulangan untuk 2 set kolom dan sloof perbatasan mandiri.
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Dinding Bersama (1 Dinding):</strong> Pembesian sloof dan kolom batas tengah hanya dibuat 1 set. Jumlah lonjor 12m dan kilogram besi otomatis berkurang mengikuti pengurangan sloof & kolom bersama tersebut.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-[11.5px] text-emerald-300 flex items-start gap-2">
            <span className="text-base mt-0.5">💡</span>
            <div className="leading-relaxed">
              <strong>Rumus Deret Cluster:</strong> Untuk 1 deret berisi $N$ unit kavling, kebutuhan bidang dinding dan struktur batas samping adalah <strong>(N + 1) / (2 &times; N)</strong> per unit. Struktur dalam/fasad selalu dihitung 100% penuh untuk setiap unit.
            </div>
          </div>
        </div>
      )}

      {/* Tier 3: Controls Input Pengali + Presets */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Number Input */}
        <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 shrink-0 self-start sm:self-auto">
          <span className="text-[11px] font-mono font-bold text-slate-300">Pengali:</span>
          <input
            type="number"
            min="1"
            max="500"
            value={multiplier}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              if (onChange) onChange(val);
            }}
            className="w-14 text-center font-mono font-black text-xs text-amber-400 bg-slate-900/80 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-400 py-1"
          />
          <span className="text-[11px] font-mono text-slate-400">Unit</span>
        </div>

        {/* Quick Preset Buttons (Horizontal Scrollable on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar w-full sm:w-auto -mx-1 px-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1 hidden lg:inline shrink-0">
            Preset:
          </span>
          {quickPresets.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange && onChange(n)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition-all shrink-0 ${
                multiplier === n
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black ring-1 ring-amber-400'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white'
              }`}
            >
              &times;{n}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}
