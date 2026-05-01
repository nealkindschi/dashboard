import { useState, useEffect, useContext } from 'react';
import { getGscData } from '../lib/api';
import { FilterContext } from '../components/layout/DashboardShell';

interface GscItem {
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscData {
  items: GscItem[];
  trend: Array<{ date: string; clicks: number; impressions: number }>;
  movers: Array<{ query: string; clicks: number; change: number }>;
}

export function useGscData() {
  const { days } = useContext(FilterContext);
  const [data, setData] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getGscData(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  return { data, loading };
}
