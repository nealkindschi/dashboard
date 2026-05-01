interface Props {
  days: number;
  onChange: (days: number) => void;
}

const PRESETS = [1, 7, 28, 90];

export default function DateRangePicker({ days, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {PRESETS.map(d => (
        <button key={d} onClick={() => onChange(d)}
          style={{
            padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)',
            background: days === d ? 'var(--accent)' : 'transparent',
            color: days === d ? '#fff' : 'var(--text-primary)',
            fontSize: 12, cursor: 'pointer',
          }}>
          {d === 1 ? '1d' : `${d}d`}
        </button>
      ))}
    </div>
  );
}
