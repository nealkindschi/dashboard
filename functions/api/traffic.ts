export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const hours = parseInt(new URL(request.url).searchParams.get('hours') ?? '24');
  const since = new Date(Date.now() - hours * 3600000).toISOString();

  const [countries, paths] = await Promise.all([
    env.DB.prepare(`SELECT country, SUM(count) as count FROM cf_traffic WHERE ts >= ? GROUP BY country ORDER BY count DESC`).bind(since).all(),
    env.DB.prepare(`SELECT path, SUM(count) as count FROM cf_traffic WHERE ts >= ? GROUP BY path ORDER BY count DESC LIMIT 10`).bind(since).all(),
  ]);

  return new Response(JSON.stringify({ countries: countries.results, paths: paths.results }));
};
