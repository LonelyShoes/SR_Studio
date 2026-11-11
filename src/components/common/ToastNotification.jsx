import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useBoQ } from '../../context/BoQContext';

const VARIANTS = {
  success: {
    title: 'Berhasil',
    Icon: CheckCircle2,
    box: 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/40',
    icon: 'bg-emerald-500/20 text-emerald-400',
  },
  info: {
    title: 'Informasi',
    Icon: Info,
    box: 'bg-blueprint-900/95 border-blueprint-500/50 shadow-blueprint-950/40',
    icon: 'bg-blueprint-500/20 text-blueprint-300',
  },
  warning: {
    title: 'Perhatian',
    Icon: AlertTriangle,
    box: 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/40',
    icon: 'bg-amber-500/20 text-amber-400',
  },
  error: {
    title: 'Gagal',
    Icon: XCircle,
    box: 'bg-slate-900/95 border-rose-500/60 shadow-rose-950/40',
    icon: 'bg-rose-500/20 text-rose-400',
  },
};

export function ToastNotification() {
  const { toastMessage } = useBoQ();
  if (!toastMessage) return null;

  const variant = VARIANTS[toastMessage.type] || VARIANTS.info;
  const { Icon } = variant;

  return (
    <div
      className="fixed bottom-6 right-6 left-6 sm:left-auto z-[80] animate-slideUp sm:max-w-sm sm:w-full no-print"
      role={toastMessage.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md text-white ${variant.box}`}>
        <div className={`p-1 rounded-lg shrink-0 ${variant.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs leading-relaxed font-sans">
          <p className="font-bold text-[13px] mb-0.5 text-white">{variant.title}</p>
          <p className="text-paper-200">{toastMessage.text}</p>
        </div>
      </div>
    </div>
  );
}
