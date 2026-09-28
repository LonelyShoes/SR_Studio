import React from 'react';
import { useBoQ } from '../../context/BoQContext';
import { CheckCircle2, Info, X } from 'lucide-react';

export function ToastNotification() {
  const { toastMessage, showToast } = useBoQ();

  if (!toastMessage) return null;

  const isSuccess = toastMessage.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideUp max-w-sm w-full no-print">
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
        isSuccess 
          ? 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/40' 
          : 'bg-blueprint-900/95 text-white border-blueprint-500/50 shadow-blueprint-950/40'
      }`}>
        <div className={`p-1 rounded-lg shrink-0 ${
          isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blueprint-500/20 text-blueprint-300'
        }`}>
          {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div className="flex-1 text-xs leading-relaxed font-sans">
          <p className="font-bold text-[13px] mb-0.5 text-white">
            {isSuccess ? "Berhasil Disimpan" : "Informasi Proyek"}
          </p>
          <p className="text-paper-200">
            {toastMessage.text}
          </p>
        </div>
      </div>
    </div>
  );
}
