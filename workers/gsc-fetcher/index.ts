interface Env {
  DB: D1Database;
  GSC_CLIENT_EMAIL: string;
  GSC_PRIVATE_KEY: string;
  SITE_URL: string;
}

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function getAccessToken(env: Env): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: env.GSC_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const keyData = pemToArrayBuffer(env.GSC_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(`${header}.${claim}`)
  );
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const jwt = `${header}.${claim}.${sigStr}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token: string; error?: string };
  if (data.error) throw new Error(`GSC auth failed: ${data.error}`);
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function queryGSC(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>
): Promise<SearchAnalyticsRow[]> {
  const encodedUrl = encodeURIComponent(siteUrl);
  const allRows: SearchAnalyticsRow[] = [];
  let startRow = 0;

  while (true) {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, rowLimit: 25000, startRow }),
      }
    );
    const data = await res.json() as { rows?: SearchAnalyticsRow[] };
    if (!data.rows || data.rows.length === 0) break;
    allRows.push(...data.rows);
    if (data.rows.length < 25000) break;
    startRow += 25000;
  }

  return allRows;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const checkpoint = await env.DB.prepare(
      "SELECT last_successful_date FROM fetch_checkpoints WHERE worker = 'gsc'"
    ).first<{ last_successful_date: string }>();
    const lastDate = checkpoint?.last_successful_date ?? sevenDaysAgo;

    const accessToken = await getAccessToken(env);

    const dimensions: string[][] = [['query'], ['page'], ['country'], ['device']];

    for (const dim of dimensions) {
      const rows = await queryGSC(accessToken, env.SITE_URL, {
        startDate: lastDate,
        endDate: today,
        dimensions: dim,
        dataState: 'final',
      });

      const dimensionType = dim[0];
      const stmt = env.DB.prepare(
        `INSERT OR REPLACE INTO gsc_search_analytics
         (date, hour, dimension_type, dimension_value, clicks, impressions, ctr, position, is_partial)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, FALSE)`
      );

      const batch: D1PreparedStatement[] = [];
      for (const row of rows) {
        batch.push(stmt.bind(
          today,
          dimensionType,
          row.keys[0],
          row.clicks,
          row.impressions,
          row.ctr,
          row.position
        ));
      }

      for (let i = 0; i < batch.length; i += 100) {
        await env.DB.batch(batch.slice(i, i + 100));
      }
    }

    await env.DB.prepare(
      "INSERT OR REPLACE INTO fetch_checkpoints (worker, last_successful_date, last_run_at) VALUES ('gsc', ?, ?)"
    ).bind(today, new Date().toISOString()).run();

    console.log(`GSC fetch complete: ${lastDate} -> ${today}`);
  },
};
