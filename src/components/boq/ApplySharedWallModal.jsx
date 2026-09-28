import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  X, 
  Check, 
  Sparkles, 
  Info, 
  TrendingDown, 
  Building2, 
  Layers, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Sliders,
  Percent,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { formatRp, formatNumber, parseNum } from '../../utils/formatters';

export function ApplySharedWallModal({ isOpen, onClose }) {
  const { 
    state, 
    applySharedWallReduction, 
    clusterRowUnits, 
    clusterUnits 
  } = useBoQ();

  // Preset reduksi: default 25% (standar deret kavling 3-6 unit)
  const [reductionPercent, setReductionPercent] = useState('25');
  const [selectedItems, setSelectedItems] = useState({});

  // Deteksi item-item kandidat pasangan dinding & struktur batas
  const candidateItems = useMemo(() => {
    const list = [];
    const keywords = ['bata', 'hebel', 'batako', 'plester', 'aci', 'dinding', 'kolom praktis', 'ringbalk', 'sloof', 'pondasi'];
    const cats = Array.isArray(state?.categories) ? state.categories : [];

    cats.forEach(cat => {
      const items = Array.isArray(cat?.items) ? cat.items : [];
      items.forEach(item => {
        if (!item?.volume || item.volume <= 0) return;
        const text = (item?.uraian || '').toLowerCase();
        const isWallCat = cat?.id === 'dinding_plesteran';
        const matchesKeyword = keywords.some(kw => text.includes(kw));

        if (isWallCat || matchesKeyword) {
          const isFromClusterCalc = 
            text.includes('dinding bersama') ||
            text.includes('party wall') ||
            !!item?.sharedWallReduced;

          list.push({
            ...item,
            catId: cat?.id || '',
            catName: cat?.name || 'Kategori',
            isFromClusterCalc
          });
        }
      });
    });

    return list;
  }, [state?.categories]);

  // Inisialisasi seleksi saat modal dibuka dengan PROTEKSI ANTI-DOUBLE REDUCTION
  React.useEffect(() => {
    if (isOpen) {
      const initialMap = {};
      candidateItems.forEach(item => {
        // SISTEM PROTEKSI: Jangan centang otomatis item yang sudah dihitung di kalkulator cluster!
        initialMap[item.key] = !item.isFromClusterCalc;
      });
      setSelectedItems(initialMap);
    }
  }, [isOpen, candidateItems]);

  const toggleSelectAll = () => {
    const allSelected = candidateItems.every(it => selectedItems[it.key]);
    const nextMap = {};
    candidateItems.forEach(it => {
      nextMap[it.key] = !allSelected;
    });
    setSelectedItems(nextMap);
  };

  const pct = Math.max(1, Math.min(60, parseNum(reductionPercent) || 25));
  const factor = (100 - pct) / 100;

  // Hitung total penghematan yang akan diperoleh dari item yang dicentang
  const totalProjectedSavings = useMemo(() => {
    let savings = 0;
    candidateItems.forEach(it => {
      if (selectedItems[it.key]) {
        const orig = it.originalVolume !== undefined ? it.originalVolume : it.volume;
        const reducedVol = +(orig * factor).toFixed(2);
        const diffVol = orig - reducedVol;
        savings += diffVol * (it.harga || 0);
      }
    });
    return savings;
  }, [candidateItems, selectedItems, factor]);

  const handleApply = () => {
    applySharedWallReduction(selectedItems, pct);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-paper-300 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* ==================== MODAL HEADER ==================== */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-b border-amber-500/30 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base sm:text-lg uppercase tracking-wide text-white flex items-center gap-2">
                <span>Sinkronisasi Dinding Bersama ke BoQ</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Tipologi Cluster
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Alat bantu reduksi cepat untuk item pasangan manual ({clusterRowUnits || 4} unit per deret).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================== SISTEM PROTEKSI INFO BANNER ==================== */}
        <div className="bg-blue-50/90 border-b border-blue-200 p-3.5 px-4 sm:px-5 flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <b className="font-bold text-blue-950">🛡️ Proteksi Pencegah Pemotongan Ganda (Anti-Double Reduction):</b>
            <p className="text-blue-800 mt-0.5">
              Jika Anda sudah menghitung volume melalui <b>Kalkulator Dinding Cluster (1 Dinding Bersama)</b>, maka item tersebut <b>sudah tereduksi otomatis</b> dan tidak dicentang di bawah ini agar volume material di lapangan tidak tekor. Fitur ini khusus untuk item yang diinput manual.
            </p>
          </div>
        </div>

        {/* ==================== PARAMETER & PRESET DISKON ==================== */}
        <div className="bg-amber-50/70 border-b border-amber-200 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10.5px] font-mono uppercase font-bold text-amber-900 block">
                Faktor Reduksi Efisiensi Dinding Samping:
              </span>
              <p className="text-xs text-amber-800">
                Pilih persentase pemotongan volume dinding perbatasan kavling cluster.
              </p>
            </div>

            {/* Presets Button Group */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['15', '20', '25', '30'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setReductionPercent(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                    reductionPercent === val
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  -{val}%
                </button>
              ))}

              <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl px-2 py-1">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={reductionPercent}
                  onChange={e => setReductionPercent(e.target.value)}
                  className="w-10 text-center font-mono text-xs font-bold text-amber-950 focus:outline-none"
                />
                <span className="text-xs font-mono text-amber-800 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* KPI Projected Savings Banner */}
          <div className="p-3 rounded-2xl bg-white border border-amber-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-700">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span>Estimasi Penghematan BoQ:</span>
            </div>
            <div className="text-right">
              <span className="font-heading font-black text-base text-emerald-700">
                - {formatRp(totalProjectedSavings)}
              </span>
            </div>
          </div>
        </div>

        {/* ==================== CANDIDATE ITEMS CHECKLIST ==================== */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-slate-50">
          
          <div className="flex items-center justify-between pb-2 border-b border-paper-200">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-amber-800"
            >
              {candidateItems.every(it => selectedItems[it.key]) ? (
                <CheckSquare className="w-4 h-4 text-amber-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Pilih Semua Item ({candidateItems.length} Terdeteksi)</span>
            </button>

            <span className="text-[11px] font-mono text-slate-500">
              {Object.values(selectedItems).filter(Boolean).length} dipilih
            </span>
          </div>

          {candidateItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              Tidak ditemukan item pasangan dinding atau struktur di BoQ yang dapat direduksi.
            </div>
          ) : (
            <div className="space-y-2.5">
              {candidateItems.map(item => {
                const isChecked = !!selectedItems[item.key];
                const origVol = item.originalVolume !== undefined ? item.originalVolume : item.volume;
                const newVol = +(origVol * factor).toFixed(2);
                const diffVol = +(origVol - newVol).toFixed(2);
                const itemSavings = diffVol * (item.harga || 0);

                return (
                  <div
                    key={item.key}
                    onClick={() => setSelectedItems(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked 
                        ? 'bg-white border-amber-300 shadow-xs ring-1 ring-amber-400/30' 
                        : item.isFromClusterCalc
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-600'
                          : 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div
                        className="w-4 h-4 text-amber-600 rounded shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-heading font-bold text-xs text-slate-900 truncate">
                            {item.uraian}
                          </p>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {item.catName}
                          </span>

                          {/* Proteksi Badge */}
                          {item.isFromClusterCalc && (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold shrink-0">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Sudah Tereduksi di Kalkulator
                            </span>
                          )}
                        </div>

                        <p className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                          Harga Satuan: {formatRp(item.harga || 0)} / {item.satuan}
                        </p>

                        {/* Peringatan jika pengguna tetap mencentang item kalkulator cluster */}
                        {item.isFromClusterCalc && isChecked && (
                          <p className="text-[10px] text-amber-700 font-mono font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            Perhatian: Item ini sudah tereduksi di kalkulator. Mencentang ulang akan memotong volume 2x.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Volume Comparison Pill */}
                    <div className="text-right shrink-0 font-mono text-xs">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-slate-500 line-through text-[11px]">{formatNumber(origVol)}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-amber-900">{formatNumber(newVol)} {item.satuan}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                        Hemat {formatRp(itemSavings)} (-{pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ==================== MODAL FOOTER ==================== */}
        <div className="p-4 bg-white border-t border-paper-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            {Object.values(selectedItems).filter(Boolean).length} item terpilih untuk diskon -{pct}%
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={Object.values(selectedItems).filter(Boolean).length === 0}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-heading font-bold shadow-md shadow-amber-900/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Terapkan Efisiensi ke BoQ (-{formatRp(totalProjectedSavings)})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
