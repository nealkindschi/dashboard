interface Props {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  onClose: () => void;
}

export default function QueryDrilldown({ query, clicks, impressions, ctr, position, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 32, maxWidth: 600, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{query}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4,
          }}>&times;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="kpi-value">{clicks.toLocaleString()}</div>
            <div className="kpi-label">Clicks</div>
          </div>
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="kpi-value">{impressions.toLocaleString()}</div>
            <div className="kpi-label">Impressions</div>
          </div>
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="kpi-value">{ctr}%</div>
            <div className="kpi-label">CTR</div>
          </div>
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="kpi-value">{position}</div>
            <div className="kpi-label">Avg Position</div>
          </div>
        </div>
      </div>
    </div>
  );
}
