export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const source = new URL(request.url).searchParams.get('source') ?? 'crux';

  if (source === 'crux') {
    const r = await env.DB.prepare(`SELECT metric, p75_value, good_pct, needs_improvement_pct, poor_pct, fetch_date FROM crux_metrics WHERE url='*' ORDER BY fetch_date DESC LIMIT 3`).all();
    return new Response(JSON.stringify({ metrics: r.results }));
  }

  const days = parseInt(new URL(request.url).searchParams.get('days') ?? '28');
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const pages = await env.DB.prepare(`SELECT path, COUNT(*) as sample_size FROM beacon_events WHERE ts >= ? AND event_type = 'cwv' GROUP BY path ORDER BY sample_size DESC LIMIT 10`).bind(since).all();
  return new Response(JSON.stringify({ pages: pages.results }));
};
