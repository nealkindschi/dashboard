import { useState } from 'react';
import { useGlobalization } from '../../hooks/useGlobalization';
import PanelFallback from '../common/LoadingSkeleton';
import { fmtNum } from '../../lib/formatters';

export default function Globalization() {
  const { groups, areas, loading } = useGlobalization();
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  if (loading) return <PanelFallback />;

  return (
    <div className="panel">
      <div className="panel-title">Globalization</div>

      {groups.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Language Groups
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {groups.map(g => (
              <div key={g.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12,
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {(g.members?.length ?? 0)} pages
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {JSON.parse(g.patterns || '[]').join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Areas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {areas.map(area => (
            <div key={area.name} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, fontFamily: 'var(--font-display)' }}>
                {area.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                {fmtNum(area.totalClicks)} clicks
              </div>
              {area.countries.map(c => {
                const maxClicks = Math.max(...area.countries.map(x => x.clicks), 1);
                return (
                  <div key={c.country} style={{ marginBottom: 6 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 4, padding: '2px 0' }}
                      onClick={() => setExpandedCountry(expandedCountry === c.country ? null : c.country)}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 28 }}>{c.country}</span>
                      <div style={{ flex: 1, height: 14, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(c.clicks / maxClicks) * 100}%`, height: '100%',
                          background: 'var(--accent)', borderRadius: 4, opacity: 0.7,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, minWidth: 50, textAlign: 'right' }}>{fmtNum(c.clicks)}</span>
                    </div>

                    {expandedCountry === c.country && (
                      <div style={{
                        marginTop: 8, marginLeft: 36, padding: 12,
                        background: 'var(--bg-primary)', borderRadius: 6, fontSize: 13,
                      }}>
                        <div>{fmtNum(c.clicks)} clicks &middot; {fmtNum(c.impressions)} impressions</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                          Click a country bar to expand details. Crawler and referral data will appear here when available.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
