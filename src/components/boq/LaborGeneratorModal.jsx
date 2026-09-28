import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBoQ } from '../../context/BoQContext';
import { calculateMaterialTakeoff } from '../../utils/materialTakeoff';
import { 
  Users, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Coins, 
  HardHat, 
  Hammer, 
  Info, 
  ArrowRight,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

export default function LaborGeneratorModal({ isOpen, onClose }) {
  const { state, applyLaborTakeoff, showToast } = useBoQ();
  const [targetCategory, setTargetCategory] = useState('upah_tenaga');
  const [isApplying, setIsApplying] = useState(false);

  // Hitung dekomposisi upah tenaga kerja secara reaktif dari state BoQ
  const takeoffData = useMemo(() => {
    return calculateMaterialTakeoff(state);
  }, [state]);

  if (!isOpen) return null;

  const laborList = takeoffData.labor || [];
  const totalLaborCost = takeoffData.summary?.totalLaborCost || 0;
  const totalLaborHok = takeoffData.summary?.totalLaborHok || 0;
  const totalMaterialCost = takeoffData.summary?.totalEstimatedCost || 0;
  const totalCombined = totalLaborCost + totalMaterialCost;
  const laborRatio = totalCombined > 0 ? (totalLaborCost / totalCombined) * 100 : 0;

  const handleApply = () => {
    setIsApplying(true);
    try {
      const count = applyLaborTakeoff(laborList, targetCategory);
      showToast(`Berhasil menerapkan ${count} klasifikasi upah tenaga kerja (Total ${totalLaborHok.toFixed(1)} OH) ke BoQ!`, 'success');
      setIsApplying(false);
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Gagal menerapkan upah tenaga kerja ke BoQ.', 'error');
      setIsApplying(false);
    }
  };

  const formatRp = (val) => {
    if (!val || isNaN(val)) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn text-slate-100 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shadow-inner shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm sm:text-base text-white uppercase tracking-wide">
                  Alokasi Upah Tenaga Kerja Otomatis
                </h3>
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Standar HOK SNI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dekomposisi kebutuhan Hari Orang Kerja (OH) dari seluruh volume pekerjaan di BoQ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1 min-h-0 bg-slate-900 text-xs">
          
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* KPI 1: Total Upah */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-800/80 to-slate-900 border border-amber-500/30 flex flex-col justify-between">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> Total Alokasi Upah
              </span>
              <div className="my-2">
                <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formatRp(totalLaborCost)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Estimasi upah seluruh tukang & pekerja
              </span>
            </div>

            {/* KPI 2: Total HOK */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 via-slate-800/80 to-slate-900 border border-blue-500/30 flex flex-col justify-between">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Total Hari Orang Kerja
              </span>
              <div className="my-2">
                <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight">
                  {totalLaborHok.toFixed(1)} <span className="text-sm font-sans font-normal text-blue-300">OH</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Akumulasi mandays (1 OH = 8 jam kerja)
              </span>
            </div>

            {/* KPI 3: Rasio Upah */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-800/80 to-slate-900 border border-emerald-500/30 flex flex-col justify-between">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Rasio Biaya Tenaga
              </span>
              <div className="my-2">
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-300 tracking-tight">
                  {laborRatio.toFixed(1)}% <span className="text-xs font-sans text-slate-400">dari total</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Rasio ideal konstruksi: 25% - 40%
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-white">Standar Acuan Koefisien: </strong>
              Dihitung berdasarkan koefisien resmi <strong>AHSP SNI / Permen PUPR & Standarisasi Upah Kota Semarang TA 2026</strong>. 
              Saat diterapkan, sistem akan otomatis membuat atau memperbarui baris item <strong>Upah Tenaga Kerja</strong> di tabel BoQ Anda.
            </div>
          </div>

          {/* Labor Breakdown Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 overflow-hidden shadow-inner">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                Rincian Kebutuhan Tenaga Kerja ({laborList.length} Profesi)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Satuan: OH (Orang Hari)
              </span>
            </div>

            {laborList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 italic">
                Belum ada volume pekerjaan yang terisi di BoQ untuk didekomposisi. Silakan isi volume pekerjaan terlebih dahulu.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3.5">Klasifikasi Profesi</th>
                      <th className="py-2.5 px-3 text-center w-20">Satuan</th>
                      <th className="py-2.5 px-3 text-right w-28">Kebutuhan (OH)</th>
                      <th className="py-2.5 px-3 text-right w-36">Upah Dasar (Rp)</th>
                      <th className="py-2.5 px-3.5 text-right w-40">Subtotal Biaya (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {laborList.map((lab, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <p className="font-bold text-slate-100">{lab.name}</p>
                          {lab.sources && lab.sources.length > 0 && (
                            <p className="text-[10px] text-slate-400 truncate max-w-sm" title={lab.sources.join(', ')}>
                              Dari: {lab.sources.slice(0, 2).join(', ')}{lab.sources.length > 2 ? ` (+${lab.sources.length - 2} lainnya)` : ''}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {lab.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                          {lab.quantity.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {formatRp(lab.priceDefault || 145000)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-white">
                          {formatRp(lab.estimatedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950 font-bold border-t border-slate-800 text-slate-200">
                      <td className="py-3 px-3.5" colSpan={2}>
                        TOTAL ALOKASI UPAH TENAGA KERJA:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300">
                        {totalLaborHok.toFixed(2)} OH
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 font-mono text-[10px]">
                        Rata-rata HOK
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-base text-emerald-400">
                        {formatRp(totalLaborCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Data tersinkronisasi otomatis dengan standar RAB.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs font-semibold"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={laborList.length === 0 || isApplying}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wide shadow-md shadow-amber-950/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isApplying ? 'Menerapkan...' : '✨ Terapkan ke BoQ / RAB'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
