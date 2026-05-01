interface Props {
  data: Array<{ country: string; count: number }>;
  onCountryClick?: (country: string) => void;
}

export default function WorldHeatmap({ data, onCountryClick }: Props) {
  const items = data.filter(d => d.country !== 'Unknown');
  const max = Math.max(...items.map(d => d.count), 1);

  return (
    <div>
      {items.slice(0, 15).map(d => (
        <div key={d.country} onClick={() => onCountryClick?.(d.country)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', borderRadius: 4 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <span style={{ width: 40, fontSize: 13, fontWeight: 500 }}>{d.country}</span>
          <div style={{ flex: 1, height: 16, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.count / max) * 100}%`, height: '100%',
              background: 'var(--accent)', borderRadius: 4,
            }} />
          </div>
          <span style={{ fontSize: 13 }}>{d.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
