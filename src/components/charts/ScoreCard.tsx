interface Props {
  label: string;
  value: string;
  good: number;
  ni: number;
  poor: number;
  goodThreshold: string;
}

export default function ScoreCard({ label, value, good, ni, poor, goodThreshold }: Props) {
  const rating = good >= 90 ? 'good' : good >= 75 ? 'needs-improvement' : 'poor';
  const ratingColor = rating === 'good' ? 'var(--good)' : rating === 'needs-improvement' ? 'var(--needs-improvement)' : 'var(--poor)';

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: ratingColor }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Target: &lt;{goodThreshold}</div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ width: `${good}%`, background: 'var(--good)' }} />
        <div style={{ width: `${ni}%`, background: 'var(--needs-improvement)' }} />
        <div style={{ width: `${poor}%`, background: 'var(--poor)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
        <span style={{ color: 'var(--good)' }}>{good.toFixed(0)}% Good</span>
        <span style={{ color: 'var(--needs-improvement)' }}>{ni.toFixed(0)}% NI</span>
        <span style={{ color: 'var(--poor)' }}>{poor.toFixed(0)}% Poor</span>
      </div>
    </div>
  );
}
