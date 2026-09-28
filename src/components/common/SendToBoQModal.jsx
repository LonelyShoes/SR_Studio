import React from 'react';
import { useBoQ } from '../../context/BoQContext';
import { CheckCircle2, ArrowRight, RotateCcw, X, Layers } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

export function SendToBoQModal() {
  const { modalPendingData, closePendingModal, setActiveTab, applyAllPendingItems } = useBoQ();

  if (!modalPendingData || !modalPendingData.isOpen) return null;

  const { items = [], resetFn } = modalPendingData;

  const handleBackToBoQ = () => {
    closePendingModal();
    if (resetFn) resetFn();
    setActiveTab('boq');
  };

  const handleApplyDirectlyAndGo = () => {
    applyAllPendingItems({});
    closePendingModal();
    if (resetFn) resetFn();
    setActiveTab('boq');
  };

  const handleStay = () => {
    closePendingModal();
    if (resetFn) resetFn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-paper-400 max-w-lg w-full overflow-hidden transform transition-all animate-scaleUp"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blueprint-700 to-blueprint-900 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold tracking-wide">Data Terkirim ke BoQ</h3>
              <p className="text-xs text-blueprint-200">
                {items.length} usulan volume material berhasil dimasukkan ke antrian BoQ.
              </p>
            </div>
          </div>
          <button 
            onClick={closePendingModal}
            className="text-blueprint-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 max-h-60 overflow-y-auto custom-scrollbar border-b border-paper-300 bg-paper-100/50">
          <p className="text-xs font-mono font-semibold uppercase text-paper-700 mb-2.5 flex items-center justify-between">
            <span>Daftar Material yang Dikirim:</span>
            <span className="text-[11px] text-paper-500 font-sans normal-case font-normal">({items.length} item)</span>
          </p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-paper-300 text-xs shadow-sm hover:border-blueprint-300 transition-colors">
                <div>
                  <p className="font-semibold text-paper-900">{item.label}</p>
                  <p className="text-[11px] text-paper-600 font-sans">{item.source}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-blueprint-700 bg-blueprint-50 px-2 py-0.5 rounded border border-blueprint-200">
                    {formatNumber(item.jumlah, 3)} {item.satuan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-paper-50 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            type="button"
            onClick={handleStay}
            className="px-3.5 py-2.5 rounded-xl border border-paper-400 bg-white hover:bg-paper-100 text-paper-800 text-xs font-semibold font-display transition-all flex items-center justify-center gap-1.5 order-3 sm:order-1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-paper-600" />
            Lanjut Hitung
          </button>

          <button
            type="button"
            onClick={handleBackToBoQ}
            className="px-3.5 py-2.5 rounded-xl border border-blueprint-300 bg-blueprint-50 hover:bg-blueprint-100 text-blueprint-800 text-xs font-semibold font-display transition-all flex items-center justify-center gap-1.5 order-2 sm:order-2"
          >
            <Layers className="w-3.5 h-3.5 text-blueprint-700" />
            Atur di Antrian BoQ
          </button>

          <button
            type="button"
            onClick={handleApplyDirectlyAndGo}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold font-display shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-1.5 order-1 sm:order-3"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terapkan & Buka BoQ
          </button>
        </div>

      </div>
    </div>
  );
}
