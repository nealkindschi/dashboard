export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const hours = parseInt(new URL(request.url).searchParams.get('hours') ?? '24');
  const since = new Date(Date.now() - hours * 3600000).toISOString();

  const [bots, referers] = await Promise.all([
    env.DB.prepare(`SELECT bot_name, bot_category, SUM(count) as count FROM cf_bots WHERE ts >= ? GROUP BY bot_name, bot_category ORDER BY count DESC`).bind(since).all(),
    env.DB.prepare(`SELECT referer_host, SUM(count) as count FROM cf_referers WHERE ts >= ? GROUP BY referer_host ORDER BY count DESC`).bind(since).all(),
  ]);

  return new Response(JSON.stringify({ bots: bots.results, referers: referers.results }));
};
