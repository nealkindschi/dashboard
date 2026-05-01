import { useCrawlData } from '../../hooks/useCrawlData';
import PanelFallback from '../common/LoadingSkeleton';

const CATEGORY_LABELS: Record<string, string> = {
  page_element: 'Page Elements',
  hreflang: 'Hreflang',
  indexing: 'Indexing',
  links: 'Internal Links',
  structured_data: 'Structured Data',
};

export default function CrawlMonitor() {
  const { snapshots, fromId, setFromId, toId, setToId, changes, summary, loading, comparing } = useCrawlData();

  if (loading) return <PanelFallback />;

  if (snapshots.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Crawl Monitor</div>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          <p>No crawl data uploaded yet.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Upload a Screaming Frog CSV export to begin tracking crawl changes.
          </p>
        </div>
      </div>
    );
  }

  const grouped = changes.reduce<Record<string, Array<{ url: string; field: string; old_value: string; new_value: string }>>>((acc, c) => {
    if (!acc[c.change_category]) acc[c.change_category] = [];
    acc[c.change_category].push(c);
    return acc;
  }, {});

  return (
    <div className="panel">
      <div className="panel-title">Crawl Monitor</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <select value={fromId ?? ''} onChange={e => setFromId(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)' }}>
          {snapshots.map(s => (
            <option key={s.id} value={s.id}>{new Date(s.crawled_at).toLocaleDateString()} ({s.total_pages} pages)</option>
          ))}
        </select>
        <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
        <select value={toId ?? ''} onChange={e => setToId(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)' }}>
          {snapshots.map(s => (
            <option key={s.id} value={s.id}>{new Date(s.crawled_at).toLocaleDateString()} ({s.total_pages} pages)</option>
          ))}
        </select>
      </div>

      {comparing && <PanelFallback />}

      {!comparing && summary && (
        <div style={{
          background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8,
          padding: 16, marginBottom: 24, fontSize: 14, lineHeight: 1.7,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            AI Summary
          </div>
          {summary}
        </div>
      )}

      {!comparing && changes.length === 0 && !summary && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No changes detected between these crawl snapshots.
        </div>
      )}

      {!comparing && changes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                {CATEGORY_LABELS[category] ?? category}
              </div>
              {items.slice(0, 10).map((c, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, marginBottom: 2 }}>
                    {c.url.length > 50 ? c.url.slice(-50) : c.url}
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>{c.field}: </span>
                  <span style={{ color: 'var(--poor)', textDecoration: 'line-through' }}>{c.old_value?.slice(0, 40) ?? '—'}</span>
                  <span style={{ color: 'var(--text-muted)' }}> &rarr; </span>
                  <span style={{ color: 'var(--good)' }}>{c.new_value?.slice(0, 40) ?? '—'}</span>
                </div>
              ))}
              {items.length > 10 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  +{items.length - 10} more changes
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
