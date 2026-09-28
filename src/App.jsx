import React, { Suspense, lazy } from 'react';
import { BoQProvider, useBoQ } from './context/BoQContext';
import { Navbar } from './components/layout/Navbar';
import { TAB_COMPONENTS, TAB_KEYS_FOR } from './config/tabs';
const OfficialDocumentModal = lazy(() => import('./components/document/OfficialDocumentModal').then(m => ({ default: m.OfficialDocumentModal })));
const ScheduleDocumentModal = lazy(() => import('./components/schedule/ScheduleDocumentModal').then(m => ({ default: m.ScheduleDocumentModal })));
const MaterialTakeoffModal = lazy(() => import('./components/boq/MaterialTakeoffModal').then(m => ({ default: m.MaterialTakeoffModal })));
const SendToBoQModal = lazy(() => import('./components/common/SendToBoQModal').then(m => ({ default: m.SendToBoQModal })));
const SaveToLibraryModal = lazy(() => import('./components/library/SaveToLibraryModal').then(m => ({ default: m.SaveToLibraryModal })));
const CloudSyncModal = lazy(() => import('./components/library/CloudSyncModal').then(m => ({ default: m.CloudSyncModal })));
const OtpVerificationModal = lazy(() => import('./components/library/OtpVerificationModal').then(m => ({ default: m.OtpVerificationModal })));
import { ToastNotification } from './components/common/ToastNotification';
import { LandingPage } from './components/auth/LandingPage';

function AppContent() {
  const { activeTab, sessionRole } = useBoQ();

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
      {/* Top Navbar */}
      <Navbar />

      {/* Main View Area */}
      <main className="flex-1">
        <Suspense fallback={<div className="p-8 text-center text-sm text-paper-500">Memuat modul…</div>}>
          <ActiveView key={tabExtra.key || activeTab} {...(tabExtra.initialMode ? { initialMode: tabExtra.initialMode } : {})} />
        </Suspense>
      </main>

      {/* Modals & Real-time Toasts */}
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

      {/* Footer */}
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
