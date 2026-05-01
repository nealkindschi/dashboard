interface Env {
  DB: D1Database;
  SITE_ORIGIN: string;
  CRUX_API_KEY: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${env.CRUX_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: env.SITE_ORIGIN,
          metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'],
        }),
      }
    );

    const json = await res.json() as any;
    const metrics = json?.record?.metrics;
    if (!metrics) { console.log('No CrUX data for origin'); return; }

    const today = new Date().toISOString().split('T')[0];
    const metricMap: Record<string, string> = {
      largest_contentful_paint: 'lcp',
      interaction_to_next_paint: 'inp',
      cumulative_layout_shift: 'cls',
    };

    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO crux_metrics (fetch_date, url, metric, p75_value, good_pct, needs_improvement_pct, poor_pct) VALUES (?, '*', ?, ?, ?, ?, ?)"
    );
    const batch: D1PreparedStatement[] = [];

    for (const [fullName, shortName] of Object.entries(metricMap)) {
      const m = metrics[fullName];
      if (!m) continue;
      const p75 = m.percentiles?.p75 ?? 0;
      const histogram = m.histogram ?? [];
      batch.push(stmt.bind(
        today, shortName, p75,
        (histogram[0]?.density ?? 0) * 100,
        (histogram[1]?.density ?? 0) * 100,
        (histogram[2]?.density ?? 0) * 100,
      ));
    }

    if (batch.length) await env.DB.batch(batch);

    await env.DB.prepare(
      "INSERT OR REPLACE INTO fetch_checkpoints (worker, last_successful_date, last_run_at) VALUES ('crux', ?, ?)"
    ).bind(today, new Date().toISOString()).run();

    console.log(`CrUX fetch complete for ${today}`);
  },
};
