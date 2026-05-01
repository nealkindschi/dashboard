import { useState } from 'react';
import { useGscData } from '../../hooks/useGscData';
import AreaChart from '../charts/AreaChart';
import HorizontalBar from '../charts/HorizontalBar';
import KpiCard from '../common/KpiCard';
import QueryDrilldown from '../common/QueryDrilldown';
import PanelFallback from '../common/LoadingSkeleton';
import { fmtNum } from '../../lib/formatters';

export default function GscOverview() {
  const { data, loading } = useGscData();
  const [drillQuery, setDrillQuery] = useState<{ name: string; clicks: number; impressions: number; ctr: number; position: number } | null>(null);

  if (loading || !data) return <PanelFallback />;

  const totalClicks = data.trend.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions = data.trend.reduce((s, d) => s + d.impressions, 0);

  const topQueries = data.items.filter((_, i) => i < 5);
  const topPages = data.items.filter((_, i) => i >= 5 && i < 10);

  return (
    <div className="panel">
      <div className="panel-title">Search Performance</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Clicks" value={fmtNum(totalClicks)} />
        <KpiCard label="Impressions" value={fmtNum(totalImpressions)} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Top Movers</div>
          {data.movers.slice(0, 5).map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{m.query}</span>
              <span style={{ color: m.change >= 0 ? 'var(--good)' : 'var(--poor)', fontWeight: 600 }}>
                {m.change >= 0 ? '+' : ''}{m.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <AreaChart
          data={data.trend}
          series={[
            { key: 'clicks', color: 'var(--chart-1)', label: 'Clicks' },
            { key: 'impressions', color: 'var(--chart-2)', label: 'Impressions' },
          ]}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Top Queries
          </h3>
          <HorizontalBar
            data={topQueries.map(q => ({ label: q.name, value: q.clicks, color: 'var(--chart-1)' }))}
            maxItems={10}
          />
          <div style={{ marginTop: 12 }}>
            {topQueries.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', fontSize: 13 }}>
                <button
                  onClick={() => setDrillQuery(q)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent)', fontSize: 13, textAlign: 'left',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    textDecoration: 'underline', textUnderlineOffset: 2,
                  }}>
                  {q.name}
                </button>
                <span style={{ minWidth: 60, textAlign: 'right', fontWeight: 600 }}>{q.clicks.toLocaleString()}</span>
                <span style={{ minWidth: 50, textAlign: 'right', color: 'var(--text-muted)' }}>{q.ctr}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Top Pages
          </h3>
          <HorizontalBar
            data={topPages.map(p => ({ label: p.name, value: p.clicks, color: 'var(--chart-3)' }))}
            maxItems={10}
          />
        </div>
      </div>

      {drillQuery && (
        <QueryDrilldown
          query={drillQuery.name}
          clicks={drillQuery.clicks}
          impressions={drillQuery.impressions}
          ctr={drillQuery.ctr}
          position={drillQuery.position}
          onClose={() => setDrillQuery(null)}
        />
      )}
    </div>
  );
}
