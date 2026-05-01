import { useState, useEffect, useCallback } from 'react';
import { getSnapshots, getCrawlChanges, getCrawlSummary } from '../lib/api';

interface Snapshot {
  id: number;
  crawled_at: string;
  total_pages: number;
}

interface Change {
  change_category: string;
  field: string;
  url: string;
  old_value: string;
  new_value: string;
}

export function useCrawlData() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    getSnapshots()
      .then(s => {
        setSnapshots(s);
        if (s.length >= 2) {
          setFromId(s[1].id);
          setToId(s[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const compare = useCallback(async (from: number, to: number) => {
    setComparing(true);
    setSummary(null);
    try {
      const [c, s] = await Promise.all([
        getCrawlChanges(from, to),
        getCrawlSummary(from, to),
      ]);
      setChanges(c);
      setSummary(s.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  }, []);

  useEffect(() => {
    if (fromId && toId) {
      compare(fromId, toId);
    }
  }, [fromId, toId, compare]);

  return { snapshots, fromId, setFromId, toId, setToId, changes, summary, loading, comparing };
}
