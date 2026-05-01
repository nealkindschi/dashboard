interface Props {
  label: string;
  value: string;
  change?: number;
}

export default function KpiCard({ label, value, change }: Props) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {change !== undefined && (
        <div className={change >= 0 ? 'kpi-change-positive' : 'kpi-change-negative'} style={{ fontSize: 12, marginTop: 4 }}>
          {change >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(change).toFixed(0)}% WoW
        </div>
      )}
    </div>
  );
}
