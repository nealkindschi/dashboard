const BASE = '/api';

async function fetchJSON<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export function getGscData(days: number, dimension = 'query') {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  return fetchJSON<{
    items: Array<{ name: string; clicks: number; impressions: number; ctr: number; position: number }>;
    trend: Array<{ date: string; clicks: number; impressions: number }>;
    movers: Array<{ query: string; clicks: number; change: number }>;
  }>(`${BASE}/gsc`, { start, end, dimension });
}

export function getTrafficData(hours: number) {
  return fetchJSON<{
    countries: Array<{ country: string; count: number }>;
    paths: Array<{ path: string; count: number }>;
  }>(`${BASE}/traffic`, { hours: String(hours) });
}

export function getBotsData(hours: number) {
  return fetchJSON<{
    bots: Array<{ bot_name: string; bot_category: string; count: number }>;
    referers: Array<{ referer_host: string; count: number }>;
  }>(`${BASE}/bots`, { hours: String(hours) });
}

export function getCwvData(source = 'crux') {
  return fetchJSON<{
    metrics?: Array<{ metric: string; p75_value: number; good_pct: number; needs_improvement_pct: number; poor_pct: number }>;
    pages?: Array<{ path: string; sample_size: number }>;
  }>(`${BASE}/cwv`, { source });
}

export function getGroups() {
  return fetchJSON<Array<{ id: number; name: string; patterns: string; area: string | null; language: string | null; members?: string[] }>>(`${BASE}/groups`);
}

export function createGroup(data: { name: string; patterns: string[]; area?: string; language?: string }) {
  return fetch(`${BASE}/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
}

export function deleteGroup(id: number) {
  return fetch(`${BASE}/groups?id=${id}`, { method: 'DELETE' }).then(r => r.json());
}

export function getSnapshots() {
  return fetchJSON<Array<{ id: number; crawled_at: string; total_pages: number }>>(`${BASE}/crawls`);
}

export function getCrawlChanges(from: number, to: number) {
  return fetchJSON<Array<{ change_category: string; field: string; url: string; old_value: string; new_value: string }>>(`${BASE}/crawls`, { from: String(from), to: String(to) });
}

export function getCrawlSummary(from: number, to: number) {
  return fetchJSON<{ summary: string; cached: boolean }>(`${BASE}/crawls`, { from: String(from), to: String(to), summary: '1' });
}
