import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { BoQProvider, useBoQ } from './context/BoQContext';
import { Navbar } from './components/layout/Navbar';
import { TAB_COMPONENTS, TAB_KEYS_FOR } from './config/tabs';
import { ToastNotification } from './components/common/ToastNotification';
import { LandingPage } from './components/auth/LandingPage';

const lazyNamed = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));

const OfficialDocumentModal = lazyNamed(() => import('./components/document/OfficialDocumentModal'), 'OfficialDocumentModal');
const ScheduleDocumentModal = lazyNamed(() => import('./components/schedule/ScheduleDocumentModal'), 'ScheduleDocumentModal');
const MaterialTakeoffModal = lazyNamed(() => import('./components/boq/MaterialTakeoffModal'), 'MaterialTakeoffModal');
const SendToBoQModal = lazyNamed(() => import('./components/common/SendToBoQModal'), 'SendToBoQModal');
const SaveToLibraryModal = lazyNamed(() => import('./components/library/SaveToLibraryModal'), 'SaveToLibraryModal');
const CloudSyncModal = lazyNamed(() => import('./components/library/CloudSyncModal'), 'CloudSyncModal');
const OtpVerificationModal = lazyNamed(() => import('./components/library/OtpVerificationModal'), 'OtpVerificationModal');

function ModuleFallback() {
  return (
    <div className="p-8 text-center text-sm text-paper-500" role="status">
      Memuat modul…
    </div>
  );
}

/** Lapisan tunggu saat dokumen proyek sedang diambil dari cloud (belum ada salinan di perangkat). */
function DocumentLoadingOverlay() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm no-print"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-paper-900 shadow-2xl">
        <Loader2 className="h-5 w-5 animate-spin text-blueprint-600" />
        <span>Memuat proyek dari cloud…</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { activeTab, sessionRole, isDocLoading } = useBoQ();

  if (!sessionRole) {
    return (
      <>
        <LandingPage />
        <ToastNotification />
      </>
    );
  }

  const ActiveView = TAB_COMPONENTS[activeTab] || TAB_COMPONENTS.dashboard;
  const tabExtra = TAB_KEYS_FOR[activeTab] || {};

  return (
    <div className="min-h-screen bg-paper-200 text-paper-900 flex flex-col selection:bg-blueprint-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        <Suspense fallback={<ModuleFallback />}>
          <ActiveView
            key={tabExtra.key || activeTab}
            {...(tabExtra.initialMode ? { initialMode: tabExtra.initialMode } : {})}
          />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <OfficialDocumentModal />
        <ScheduleDocumentModal />
        <MaterialTakeoffModal />
        <SendToBoQModal />
        <SaveToLibraryModal />
        <CloudSyncModal />
        <OtpVerificationModal />
      </Suspense>
      <ToastNotification />
      {isDocLoading && <DocumentLoadingOverlay />}

      <footer className="py-6 border-t border-paper-300 bg-paper-100 text-center text-xs text-paper-600 no-print">
        <p className="font-display font-medium">
          SR Studio Tools © 2026 — Rencana Anggaran Biaya & Kalkulator Bantu Konstruksi Berdasarkan Standarisasi Resmi.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BoQProvider>
      <AppContent />
    </BoQProvider>
  );
}
