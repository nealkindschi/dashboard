import { useTrafficData } from '../../hooks/useTrafficData';
import WorldHeatmap from '../charts/WorldHeatmap';
import HorizontalBar from '../charts/HorizontalBar';
import DonutChart from '../charts/DonutChart';
import PanelFallback from '../common/LoadingSkeleton';
import { BOT_CATEGORIES, BOT_CATEGORY_COLORS } from '../../lib/constants';

export default function TrafficCrawlers() {
  const { traffic, bots, loading } = useTrafficData();

  if (loading || !traffic || !bots) return <PanelFallback />;

  const browserData = [
    { label: 'Chrome', value: 64 },
    { label: 'Safari', value: 18 },
    { label: 'Firefox', value: 11 },
    { label: 'Other', value: 7 },
  ];
  const deviceData = [
    { label: 'Desktop', value: 58 },
    { label: 'Mobile', value: 36 },
    { label: 'Tablet', value: 6 },
  ];
  const osData = [
    { label: 'Windows', value: 42 },
    { label: 'macOS', value: 31 },
    { label: 'iOS', value: 18 },
    { label: 'Android', value: 9 },
  ];

  return (
    <div className="panel">
      <div className="panel-title">Traffic &amp; Crawlers</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Traffic by Country
          </h3>
          <WorldHeatmap data={traffic.countries} />
        </div>

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Crawler Activity
          </h3>
          {BOT_CATEGORIES.map(cat => {
            const catBots = bots.bots.filter(b => b.bot_category === cat).slice(0, 4);
            if (catBots.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{cat}</div>
                <HorizontalBar
                  data={catBots.map(b => ({ label: b.bot_name, value: b.count, color: BOT_CATEGORY_COLORS[cat] }))}
                  maxItems={4}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          AI Referral Traffic
        </h3>
        {bots.referers.length > 0 ? (
          <HorizontalBar
            data={bots.referers.slice(0, 6).map(r => ({ label: r.referer_host, value: r.count, color: 'var(--chart-2)' }))}
          />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No AI referral traffic detected.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: 'center', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Browser
          </h3>
          <DonutChart data={browserData} />
        </div>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: 'center', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Device
          </h3>
          <DonutChart data={deviceData} />
        </div>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: 'center', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            OS
          </h3>
          <DonutChart data={osData} />
        </div>
      </div>
    </div>
  );
}
