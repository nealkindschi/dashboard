import { useCwvData } from '../../hooks/useCwvData';
import ScoreCard from '../charts/ScoreCard';
import PanelFallback from '../common/LoadingSkeleton';
import { CWV_THRESHOLDS } from '../../lib/constants';
import { fmtMs } from '../../lib/formatters';

export default function CoreWebVitals() {
  const { metrics, pages, loading } = useCwvData();

  if (loading) return <PanelFallback />;

  const formatMetricValue = (metric: string, value: number): string => {
    if (metric === 'cls') return value.toFixed(3);
    return fmtMs(value);
  };

  const formatThreshold = (metric: string): string => {
    const t = CWV_THRESHOLDS[metric];
    if (!t) return '';
    if (metric === 'cls') return String(t.good);
    return `${t.good}ms`;
  };

  return (
    <div className="panel">
      <div className="panel-title">Core Web Vitals</div>

      {metrics && metrics.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {metrics.map(m => (
              <ScoreCard
                key={m.metric}
                label={CWV_THRESHOLDS[m.metric]?.label ?? m.metric.toUpperCase()}
                value={formatMetricValue(m.metric, m.p75_value)}
                good={m.good_pct}
                ni={m.needs_improvement_pct}
                poor={m.poor_pct}
                goodThreshold={formatThreshold(m.metric)}
              />
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          <p>No CrUX data available for this origin yet.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            CrUX data is pulled monthly. If this is a new site, data will appear after sufficient traffic.
          </p>
        </div>
      )}

      {pages && pages.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tracked Pages (RUM)
          </h3>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Samples</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 10).map((p, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.path}</td>
                  <td>{p.sample_size.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
