import { useState, useEffect, useContext } from 'react';
import { getTrafficData, getBotsData } from '../lib/api';
import { FilterContext } from '../components/layout/DashboardShell';

interface TrafficData {
  countries: Array<{ country: string; count: number }>;
  paths: Array<{ path: string; count: number }>;
}

interface BotsData {
  bots: Array<{ bot_name: string; bot_category: string; count: number }>;
  referers: Array<{ referer_host: string; count: number }>;
}

export function useTrafficData() {
  const { days } = useContext(FilterContext);
  const hours = days <= 1 ? 24 : days * 24;
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [bots, setBots] = useState<BotsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTrafficData(hours), getBotsData(hours)])
      .then(([t, b]) => { setTraffic(t); setBots(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  return { traffic, bots, loading };
}
