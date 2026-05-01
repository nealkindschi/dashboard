export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const start = url.searchParams.get('start') ?? new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
  const end = url.searchParams.get('end') ?? new Date().toISOString().split('T')[0];
  const dimension = url.searchParams.get('dimension') ?? 'query';

  const [items, trend, movers] = await Promise.all([
    env.DB.prepare(`
      SELECT dimension_value as name, SUM(clicks) as clicks, SUM(impressions) as impressions,
             ROUND(AVG(ctr) * 100, 1) as ctr, ROUND(AVG(position), 1) as position
      FROM gsc_search_analytics WHERE dimension_type = ? AND date >= ? AND date <= ? AND is_partial = FALSE
      GROUP BY dimension_value ORDER BY clicks DESC LIMIT 20
    `).bind(dimension, start, end).all(),
    env.DB.prepare(`
      SELECT date, SUM(clicks) as clicks, SUM(impressions) as impressions
      FROM gsc_search_analytics WHERE dimension_type = 'date' AND date >= ? AND date <= ? AND is_partial = FALSE
      GROUP BY date ORDER BY date ASC
    `).bind(start, end).all(),
    env.DB.prepare(`
      WITH curr AS (
        SELECT dimension_value, SUM(clicks) as c FROM gsc_search_analytics
        WHERE dimension_type = 'query' AND date >= ? AND date <= ? AND is_partial = FALSE GROUP BY dimension_value
      ), prev AS (
        SELECT dimension_value, SUM(clicks) as c FROM gsc_search_analytics
        WHERE dimension_type = 'query' AND date >= ? AND date <= ? AND is_partial = FALSE GROUP BY dimension_value
      )
      SELECT COALESCE(c.dimension_value, p.dimension_value) as query,
             COALESCE(c.c, 0) as clicks, COALESCE(c.c, 0) - COALESCE(p.c, 0) as change
      FROM curr c LEFT JOIN prev p ON c.dimension_value = p.dimension_value
      ORDER BY ABS(change) DESC LIMIT 10
    `).bind(end, end, start, start).all(),
  ]);

  return new Response(JSON.stringify({ items: items.results, trend: trend.results, movers: movers.results }));
};
