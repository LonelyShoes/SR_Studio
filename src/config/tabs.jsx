import { lazy } from 'react';

// Poin 2: registry tab terpusat + lazy-load.
// Menambah kalkulator baru = tambah 1 baris di sini, tanpa menyentuh App.jsx.
export const DashboardView = lazy(() => import('../components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
export const BoQView = lazy(() => import('../components/boq/BoQView').then(m => ({ default: m.BoQView })));
export const ScheduleView = lazy(() => import('../components/schedule/ScheduleView').then(m => ({ default: m.ScheduleView })));
export const LibraryView = lazy(() => import('../components/library/LibraryView').then(m => ({ default: m.LibraryView })));
export const RebarCalculator = lazy(() => import('../components/calculators/RebarCalculator').then(m => ({ default: m.RebarCalculator })));
export const ConcreteCalculator = lazy(() => import('../components/calculators/ConcreteCalculator').then(m => ({ default: m.ConcreteCalculator })));
export const FloorCalculator = lazy(() => import('../components/calculators/FloorCalculator').then(m => ({ default: m.FloorCalculator })));
export const WallCalculator = lazy(() => import('../components/calculators/WallCalculator').then(m => ({ default: m.WallCalculator })));
export const CeilingCalculator = lazy(() => import('../components/calculators/CeilingCalculator').then(m => ({ default: m.CeilingCalculator })));
export const MepSanitationCalculator = lazy(() => import('../components/calculators/MepSanitationCalculator').then(m => ({ default: m.MepSanitationCalculator })));
export const FoundationCalculator = lazy(() => import('../components/calculators/FoundationCalculator').then(m => ({ default: m.FoundationCalculator })));
export const RoofCalculator = lazy(() => import('../components/calculators/RoofCalculator').then(m => ({ default: m.RoofCalculator })));
export const DoorWindowCalculator = lazy(() => import('../components/calculators/DoorWindowCalculator').then(m => ({ default: m.DoorWindowCalculator })));
export const InfrastructureCalculator = lazy(() => import('../components/calculators/InfrastructureCalculator').then(m => ({ default: m.InfrastructureCalculator })));

// NOTE: RoofTrussStudio dipakai di dalam RoofCalculator (sub-view), jadi tidak perlu tab sendiri.

export const TAB_COMPONENTS = {
  dashboard: DashboardView,
  boq: BoQView,
  schedule: ScheduleView,
  library: LibraryView,
  rebar: RebarCalculator,
  concrete: ConcreteCalculator,
  floor: FloorCalculator,
  wall: WallCalculator,
  plafond: CeilingCalculator,
  mep: MepSanitationCalculator,
  sanitasi: MepSanitationCalculator,
  foundation: FoundationCalculator,
  roof: RoofCalculator,
  doors: DoorWindowCalculator,
  infrastructure: InfrastructureCalculator,
};

export const TAB_KEYS_FOR = {
  mep: { key: 'mep-calculator', initialMode: 'mep' },
  sanitasi: { key: 'sanitasi-calculator', initialMode: 'sanitasi' },
};
