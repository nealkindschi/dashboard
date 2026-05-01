interface Env {
  DB: D1Database;
  CF_API_TOKEN: string;
  CF_ZONE_TAG: string;
}

const BOT_UA_MAP: Record<string, { name: string; category: string }> = {
  'GPTBot': { name: 'GPTBot', category: 'AI Crawler' },
  'ChatGPT-User': { name: 'ChatGPT-User', category: 'AI Assistant' },
  'OAI-SearchBot': { name: 'OAI-SearchBot', category: 'AI Search' },
  'ClaudeBot': { name: 'ClaudeBot', category: 'AI Crawler' },
  'Claude-SearchBot': { name: 'Claude-SearchBot', category: 'AI Search' },
  'Claude-User': { name: 'Claude-User', category: 'AI Assistant' },
  'PerplexityBot': { name: 'PerplexityBot', category: 'AI Search' },
  'Perplexity-User': { name: 'Perplexity-User', category: 'AI Assistant' },
  'Googlebot': { name: 'Googlebot', category: 'Search Engine' },
  'Google-CloudVertexBot': { name: 'Google-CloudVertexBot', category: 'AI Crawler' },
  'bingbot': { name: 'BingBot', category: 'Search Engine' },
  'Bytespider': { name: 'Bytespider', category: 'AI Crawler' },
  'CCBot': { name: 'CCBot', category: 'AI Crawler' },
  'meta-externalagent': { name: 'Meta-Agent', category: 'AI Crawler' },
  'meta-externalfetcher': { name: 'Meta-Fetcher', category: 'AI Assistant' },
  'Applebot': { name: 'Applebot', category: 'AI Search' },
  'Amazonbot': { name: 'Amazonbot', category: 'AI Crawler' },
  'DuckAssistBot': { name: 'DuckAssistBot', category: 'AI Assistant' },
  'MistralAI-User': { name: 'MistralAI-User', category: 'AI Assistant' },
};

const AI_REFERER_DOMAINS = [
  'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com',
  'perplexity.ai', 'gemini.google.com',
];

function resolveBot(userAgent: string): { name: string; category: string } {
  const lower = userAgent.toLowerCase();
  for (const [pattern, info] of Object.entries(BOT_UA_MAP)) {
    if (lower.includes(pattern.toLowerCase())) return info;
  }
  return { name: userAgent.split(/[/\s]/)[0] || 'Unknown', category: 'Other' };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const windowEnd = new Date(Date.now() - 10 * 60000).toISOString();

    const checkpoint = await env.DB.prepare(
      "SELECT last_successful_date FROM fetch_checkpoints WHERE worker = 'cf'"
    ).first<{ last_successful_date: string }>();
    const windowStart = checkpoint?.last_successful_date ??
      new Date(Date.now() - 30 * 60000).toISOString();

    if (new Date(windowEnd) <= new Date(windowStart)) {
      console.log('No new data window');
      return;
    }

    const botFilters = Object.keys(BOT_UA_MAP)
      .map(ua => `{ userAgent_like: "%${ua}%" }`).join(', ');
    const refererFilters = AI_REFERER_DOMAINS
      .map(d => `{ clientRefererHost_like: "%.${d}" }, { clientRefererHost: "${d}" }`)
      .join(', ');

    const query = `{
      viewer {
        zones(filter: { zoneTag: "${env.CF_ZONE_TAG}" }) {
          traffic: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: "${windowStart}", datetime_lt: "${windowEnd}", requestSource: "eyeball" }
            limit: 10000 orderBy: [count_DESC]
          ) { count sum { visits edgeResponseBytes } dimensions { clientRequestPath clientCountryName } }
          bots: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: "${windowStart}", datetime_lt: "${windowEnd}", OR: [${botFilters}] }
            limit: 10000 orderBy: [count_DESC]
          ) { count sum { edgeResponseBytes } dimensions { clientRequestPath userAgent } }
          referers: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: "${windowStart}", datetime_lt: "${windowEnd}", requestSource: "eyeball", OR: [${refererFilters}] }
            limit: 10000 orderBy: [count_DESC]
          ) { count dimensions { clientRequestPath clientRefererHost } }
        }
      }
    }`;

    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const json = await res.json() as any;
    const zone = json?.data?.viewer?.zones?.[0];
    if (!zone) { console.log('No zone data'); return; }

    const ts = windowEnd;

    if (zone.traffic?.length) {
      const s = env.DB.prepare(
        "INSERT OR IGNORE INTO cf_traffic (ts, path, country, count, visits, bytes) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const b = zone.traffic.map((r: any) =>
        s.bind(ts, r.dimensions.clientRequestPath, r.dimensions.clientCountryName || 'Unknown', r.count, r.sum.visits, r.sum.edgeResponseBytes)
      );
      for (let i = 0; i < b.length; i += 100) await env.DB.batch(b.slice(i, i + 100));
    }

    if (zone.bots?.length) {
      const s = env.DB.prepare(
        "INSERT OR IGNORE INTO cf_bots (ts, path, user_agent, bot_name, bot_category, count, bytes) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      const b = zone.bots.map((r: any) => {
        const bot = resolveBot(r.dimensions.userAgent);
        return s.bind(ts, r.dimensions.clientRequestPath, r.dimensions.userAgent, bot.name, bot.category, r.count, r.sum.edgeResponseBytes);
      });
      for (let i = 0; i < b.length; i += 100) await env.DB.batch(b.slice(i, i + 100));
    }

    if (zone.referers?.length) {
      const s = env.DB.prepare(
        "INSERT OR IGNORE INTO cf_referers (ts, path, referer_host, count) VALUES (?, ?, ?, ?)"
      );
      const b = zone.referers.map((r: any) =>
        s.bind(ts, r.dimensions.clientRequestPath, r.dimensions.clientRefererHost, r.count)
      );
      for (let i = 0; i < b.length; i += 100) await env.DB.batch(b.slice(i, i + 100));
    }

    await env.DB.prepare(
      "INSERT OR REPLACE INTO fetch_checkpoints (worker, last_successful_date, last_run_at) VALUES ('cf', ?, ?)"
    ).bind(windowEnd, new Date().toISOString()).run();

    console.log(`CF fetch: ${windowStart} -> ${windowEnd}`);
  },
};
