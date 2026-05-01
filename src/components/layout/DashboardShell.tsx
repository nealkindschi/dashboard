import { useState, createContext, Suspense, lazy } from 'react';
import FilterBar from './FilterBar';
import PanelFallback from '../common/LoadingSkeleton';

export interface FilterState {
  days: number;
  country: string | null;
  device: string | null;
}

export const FilterContext = createContext<FilterState>({ days: 28, country: null, device: null });

const GscOverview = lazy(() => import('../panels/GscOverview'));
const TrafficCrawlers = lazy(() => import('../panels/TrafficCrawlers'));
const CoreWebVitals = lazy(() => import('../panels/CoreWebVitals'));
const Globalization = lazy(() => import('../panels/Globalization'));
const CrawlMonitor = lazy(() => import('../panels/CrawlMonitor'));

export default function DashboardShell() {
  const [filters, setFilters] = useState<FilterState>({ days: 28, country: null, device: null });

  return (
    <FilterContext.Provider value={filters}>
      <FilterBar filters={filters} onChange={setFilters} />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
        <Suspense fallback={<PanelFallback />}><GscOverview /></Suspense>
        <Suspense fallback={<PanelFallback />}><TrafficCrawlers /></Suspense>
        <Suspense fallback={<PanelFallback />}><CoreWebVitals /></Suspense>
        <Suspense fallback={<PanelFallback />}><Globalization /></Suspense>
        <Suspense fallback={<PanelFallback />}><CrawlMonitor /></Suspense>
      </main>
    </FilterContext.Provider>
  );
}
