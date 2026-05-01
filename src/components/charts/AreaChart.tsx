import { AreaChart as RAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: Array<Record<string, unknown>>;
  series: Array<{ key: string; color: string; label: string }>;
}

export default function AreaChart({ data, series }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RAreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
        {series.map(s => (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.1} strokeWidth={2} name={s.label} />
        ))}
      </RAreaChart>
    </ResponsiveContainer>
  );
}
