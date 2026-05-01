interface Props {
  data: Array<{ label: string; value: number; color?: string }>;
  maxItems?: number;
}

export default function HorizontalBar({ data, maxItems = 10 }: Props) {
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => d.value), 1);

  return (
    <div role="list" aria-label="Ranked list">
      {items.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ flex: '0 0 140px', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ flex: 1, height: 20, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`, height: '100%',
              background: d.color || 'var(--accent)', borderRadius: 4,
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
