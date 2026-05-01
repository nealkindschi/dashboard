import type { FilterState } from './DashboardShell';

const PERIODS = [
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '28d', days: 28 },
  { label: '90d', days: 90 },
];

export default function FilterBar({ filters, onChange }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginRight: 24,
      }}>
        SEO Dashboard
      </h1>
      {PERIODS.map(p => (
        <button key={p.days} onClick={() => onChange({ ...filters, days: p.days })}
          style={{
            padding: '6px 14px', borderRadius: 6,
            border: '1px solid var(--border)',
            background: filters.days === p.days ? 'var(--accent)' : 'transparent',
            color: filters.days === p.days ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >{p.label}</button>
      ))}
    </nav>
  );
}
