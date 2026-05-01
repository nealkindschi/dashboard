import { useState, useEffect } from 'react';
import { getCwvData } from '../lib/api';

interface CwvMetric {
  metric: string;
  p75_value: number;
  good_pct: number;
  needs_improvement_pct: number;
  poor_pct: number;
}

interface CwvPage {
  path: string;
  sample_size: number;
}

export function useCwvData() {
  const [metrics, setMetrics] = useState<CwvMetric[] | null>(null);
  const [pages, setPages] = useState<CwvPage[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCwvData('crux')
      .then(d => { if (d.metrics) setMetrics(d.metrics); if (d.pages) setPages(d.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { metrics, pages, loading };
}
