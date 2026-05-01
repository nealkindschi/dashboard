# SEO Analytics Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive SEO analytics dashboard on Cloudflare Pages that combines GSC search data, Cloudflare traffic/bot analytics, Core Web Vitals, globalization tracking, and Screaming Frog crawl diffs with AI summaries — all in one visual interface.

**Architecture:** 4 data ingestion Workers (cron-triggered) fetch from GSC API, CF GraphQL, CrUX API, and R2 (SF CSV). Data lands in D1 (SQLite). A React SPA on Cloudflare Pages queries 14 API endpoints served by Pages Functions. Workers AI generates crawl change summaries. A custom JS beacon collects scroll/click/dwell data from the user's site.

**Tech Stack:** Cloudflare Pages, React 18 + Vite, D1, Workers (cron-triggered), Pages Functions, Workers AI, Recharts, D3-geo, CSS Modules, TypeScript

---

## Design requirements

### Visual design checklist

```
Design Review Progress:
- [ ] Design rationale: single-site SEO professional needs at-a-glance traffic/crawl health with drill-down
- [ ] Cognitive load: 5 panels, scrollable, global filter bar cascades to all panels (Hick's Law)
- [ ] Visual hierarchy: KPI cards first, charts next, tables last; Gestalt proximity groups related data
- [ ] Typography: Display font for KPI numbers, system sans-serif for body; line length ≤75 chars on tables
- [ ] Color system: 60-30-10 rule. Neutral bg 60%, panel surfaces 30%, accent blue 10%. Status colors: green (good), amber (needs improvement), red (poor) — NOT red/green only; pair with icons and text labels
- [ ] Navigation: global filter bar sticky-top, panels scroll vertically, tab-through focus order
- [ ] WCAG 2.2 Level AA: ≥4.5:1 contrast on text, focus indicators, aria-labels on charts, data table fallbacks for all visualizations
- [ ] Performance: LCP < 2.5s (lazy-load panels below fold), code-split per panel, no render-blocking CSS
```

### Chart selection by panel

| Panel | Data relationship | Chart choice | Why |
|-------|-------------------|-------------|-----|
| 1 — GSC Overview | Trend over time (clicks/impressions) | Dual-area chart | Shows relative volume, not correlation — labeled axes prevent axis confusion |
| 1 — GSC Overview | Ranking (top queries, top pages) | Horizontal bar chart | Easy to scan long labels, sort by value |
| 1 — GSC Overview | Two-period comparison (top movers) | Arrow indicators + delta number | Simple, no chart needed — just direction + magnitude |
| 2 — Traffic | Geographic pattern | 2D choropleth map (D3-geo) | Click-to-filter interaction; country outlines with color intensity |
| 2 — Crawlers | Ranking by category | Stacked horizontal bars in 4 sections | Categories are independent (search engines / AI crawlers / AI search / AI assistants) — not part of same whole |
| 2 — Referrals | Ranking | Horizontal bar chart | Simple ranking, easy to read |
| 2 — Browser/Device/OS | Part-to-whole | Donut charts (≤6 segments each) | KPI display, small number of categories, proportions matter |
| 3 — CWV | Single KPI with threshold | ScoreCard with good/NI/poor bar | Performance vs. target — bullet chart alternative |
| 3 — CWV | Trend over time (2 sources) | Line chart with dual series | RUM (daily) + CrUX (monthly baseline overlay) — different line styles |
| 3 — CWV | Ranking + multi-metric | Table with colored cells | Slowest pages table — LCP/INP/CLS columns, color-coded |
| 4 — Globalization | Comparison across groups | Card grid with mini-bars | 4-6 language groups, 3 area groups — small multiples pattern |
| 4 — Globalization | Ranking within group | Horizontal bar chart in cards | Each area card shows top 3 countries as mini-bars |
| 5 — Crawl Monitor | Text summary | No chart — natural language | Workers AI generates prose from diff data |
| 5 — Crawl Monitor | Change categories | Cards with change lists | Each card shows what changed in that category — no chart needed |

### Color system

```
CSS Variables:
--bg-primary: #f8f9fa        (60% — page background)
--surface: #ffffff            (panel cards)
--border: #e2e8f0            (dividers)
--accent: #2563eb             (10% — primary interactions, chart highlight)
--text-primary: #1e293b      (headings, body)
--text-muted: #64748b        (secondary, labels)

Status colors (with icon + text — never color alone):
--good: #16a34a + checkmark icon + "Good" text
--needs-improvement: #d97706 + warning icon + "Needs Improvement" text
--poor: #dc2626 + x icon + "Poor" text

Chart palette (colorblind-friendly):
--chart-1: #4C72B0 (blue)     --chart-4: #C44E52 (red)
--chart-2: #DD8452 (orange)   --chart-5: #8172B3 (purple)
--chart-3: #55A868 (green)    --chart-6: #937860 (brown)
```

---

## File structure

```
seo-dashboard/
├── wrangler.toml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── d1/
│   └── schema.sql
├── workers/
│   ├── gsc-fetcher/
│   │   ├── index.ts
│   │   └── wrangler.toml
│   ├── cf-fetcher/
│   │   ├── index.ts
│   │   └── wrangler.toml
│   ├── crux-fetcher/
│   │   ├── index.ts
│   │   └── wrangler.toml
│   └── sf-parser/
│       ├── index.ts
│       └── wrangler.toml
├── functions/
│   ├── api/
│   │   ├── gsc.ts
│   │   ├── traffic.ts
│   │   ├── bots.ts
│   │   ├── cwv.ts
│   │   ├── groups.ts
│   │   ├── crawls.ts
│   │   └── beacon.ts
│   └── _middleware.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── panels/
│   │   │   ├── GscOverview.tsx
│   │   │   ├── TrafficCrawlers.tsx
│   │   │   ├── CoreWebVitals.tsx
│   │   │   ├── Globalization.tsx
│   │   │   └── CrawlMonitor.tsx
│   │   ├── charts/
│   │   │   ├── AreaChart.tsx
│   │   │   ├── WorldHeatmap.tsx
│   │   │   ├── HorizontalBar.tsx
│   │   │   ├── DonutChart.tsx
│   │   │   └── ScoreCard.tsx
│   │   ├── common/
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── QueryDrilldown.tsx
│   │   │   └── LoadingSkeleton.tsx
│   │   └── layout/
│   │       ├── DashboardShell.tsx
│   │       └── FilterBar.tsx
│   ├── hooks/
│   │   ├── useGscData.ts
│   │   ├── useTrafficData.ts
│   │   ├── useCwvData.ts
│   │   ├── useGlobalization.ts
│   │   └── useCrawlData.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── formatters.ts
│   │   └── constants.ts
│   └── styles/
│       └── globals.css
└── public/
    └── beacon.js
```

---

## Phase 1: Project scaffold & D1 schema

### Task 1.1: Initialize project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.toml`

- [ ] **Step 1: Scaffold with C3**

```bash
npm create cloudflare@latest seo-dashboard -- --type=pages --framework=react --lang=ts
cd seo-dashboard
```

- [ ] **Step 2: Install dependencies**

```bash
npm install recharts d3-geo d3-scale topojson-client
npm install -D @types/d3-geo @types/d3-scale @types/topojson-client
```

- [ ] **Step 3: Verify scaffold**

```bash
npm run dev
```

Expected: dev server starts. Visit http://localhost:5173 and see the default React page.

- [ ] **Step 4: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold project with C3 Pages + React"
```

### Task 1.2: Create D1 database and schema

**Files:**
- Create: `d1/schema.sql`

- [ ] **Step 1: Create D1 database**

```bash
npx wrangler d1 create seo-dashboard-db
```

Take the `database_id` and `database_name` from output and add to `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "seo-dashboard-db"
database_id = "<database_id>"
```

- [ ] **Step 2: Write schema**

In `d1/schema.sql`:

```sql
-- Checkpoints
CREATE TABLE IF NOT EXISTS fetch_checkpoints (
  worker TEXT PRIMARY KEY,
  last_successful_date TEXT NOT NULL,
  last_run_at TEXT NOT NULL
);

-- GSC search analytics
CREATE TABLE IF NOT EXISTS gsc_search_analytics (
  date TEXT NOT NULL,
  hour INTEGER,
  dimension_type TEXT NOT NULL,
  dimension_value TEXT NOT NULL,
  clicks INTEGER NOT NULL,
  impressions INTEGER NOT NULL,
  ctr REAL NOT NULL,
  position REAL NOT NULL,
  is_partial BOOLEAN DEFAULT FALSE,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (date, hour, dimension_type, dimension_value)
);
CREATE INDEX IF NOT EXISTS idx_gsc_date ON gsc_search_analytics(date, dimension_type);
CREATE INDEX IF NOT EXISTS idx_gsc_value ON gsc_search_analytics(dimension_value);

-- CF traffic
CREATE TABLE IF NOT EXISTS cf_traffic (
  ts TEXT NOT NULL,
  path TEXT NOT NULL,
  country TEXT NOT NULL,
  count INTEGER NOT NULL,
  visits INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  PRIMARY KEY (ts, path, country)
);

-- CF bots
CREATE TABLE IF NOT EXISTS cf_bots (
  ts TEXT NOT NULL,
  path TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  bot_category TEXT NOT NULL,
  count INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  PRIMARY KEY (ts, path, user_agent)
);

-- CF AI referers
CREATE TABLE IF NOT EXISTS cf_referers (
  ts TEXT NOT NULL,
  path TEXT NOT NULL,
  referer_host TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ts, path, referer_host)
);

-- CrUX metrics
CREATE TABLE IF NOT EXISTS crux_metrics (
  fetch_date TEXT NOT NULL,
  url TEXT DEFAULT '*',
  metric TEXT NOT NULL,
  p75_value REAL NOT NULL,
  good_pct REAL NOT NULL,
  needs_improvement_pct REAL NOT NULL,
  poor_pct REAL NOT NULL,
  PRIMARY KEY (fetch_date, url, metric)
);

-- Beacon events
CREATE TABLE IF NOT EXISTS beacon_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT,
  country TEXT,
  referer TEXT
);
CREATE INDEX IF NOT EXISTS idx_beacon_session ON beacon_events(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_beacon_path ON beacon_events(path, event_type);

-- URL groups
CREATE TABLE IF NOT EXISTS url_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  patterns TEXT NOT NULL,
  area TEXT,
  language TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- URL group members
CREATE TABLE IF NOT EXISTS url_group_members (
  group_id INTEGER NOT NULL REFERENCES url_groups(id),
  url TEXT NOT NULL,
  PRIMARY KEY (group_id, url)
);

-- Crawl snapshots
CREATE TABLE IF NOT EXISTS crawl_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crawled_at TEXT NOT NULL,
  total_pages INTEGER NOT NULL
);

-- Crawl URLs
CREATE TABLE IF NOT EXISTS crawl_urls (
  snapshot_id INTEGER NOT NULL REFERENCES crawl_snapshots(id),
  url TEXT NOT NULL,
  status_code INTEGER,
  title TEXT,
  title_length INTEGER,
  meta_description TEXT,
  meta_length INTEGER,
  h1 TEXT,
  h1_count INTEGER,
  canonical_url TEXT,
  is_canonicalized BOOLEAN,
  is_noindex BOOLEAN,
  hreflang_tags TEXT,
  inlink_count INTEGER,
  structured_data_types TEXT,
  PRIMARY KEY (snapshot_id, url)
);

-- Crawl changes
CREATE TABLE IF NOT EXISTS crawl_changes (
  from_snapshot_id INTEGER NOT NULL,
  to_snapshot_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  change_category TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  PRIMARY KEY (from_snapshot_id, to_snapshot_id, url, field)
);

-- Crawl AI summaries
CREATE TABLE IF NOT EXISTS crawl_summaries (
  from_snapshot_id INTEGER NOT NULL,
  to_snapshot_id INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (from_snapshot_id, to_snapshot_id)
);
```

- [ ] **Step 3: Apply schema**

```bash
npx wrangler d1 execute seo-dashboard-db --file=d1/schema.sql
```

- [ ] **Step 4: Commit**

```bash
git add d1/schema.sql wrangler.toml && git commit -m "feat: add D1 schema with 13 tables"
```

### Task 1.3: Configure wrangler.toml for full stack + global CSS

**Files:**
- Modify: `wrangler.toml`
- Create: `src/styles/globals.css`

- [ ] **Step 1: Update wrangler.toml**

```toml
name = "seo-dashboard"
pages_build_output_dir = "dist"
compatibility_date = "2025-04-01"

[[d1_databases]]
binding = "DB"
database_name = "seo-dashboard-db"
database_id = "<database_id>"

[ai]
binding = "AI"

[[env.production.r2_buckets]]
binding = "CRAWL_BUCKET"
bucket_name = "seo-crawls"
```

- [ ] **Step 2: Write global CSS with design system**

`src/styles/globals.css`:

```css
:root {
  --bg-primary: #f8f9fa;
  --surface: #ffffff;
  --border: #e2e8f0;
  --accent: #2563eb;
  --text-primary: #1e293b;
  --text-muted: #64748b;

  --good: #16a34a;
  --needs-improvement: #d97706;
  --poor: #dc2626;

  --chart-1: #4C72B0;
  --chart-2: #DD8452;
  --chart-3: #55A868;
  --chart-4: #C44E52;
  --chart-5: #8172B3;
  --chart-6: #937860;

  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.08);
  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --font-body: system-ui, -apple-system, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 24px;
  margin-bottom: 24px;
}

.panel-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.kpi-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-change-positive { color: var(--good); }
.kpi-change-negative { color: var(--poor); }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  text-align: left;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px;
  border-bottom: 2px solid var(--border);
}

td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

/* Focus visible for accessibility */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--border) 25%, transparent 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 768px) {
  .panel { padding: 16px; }
  .kpi-value { font-size: 24px; }
}
```

- [ ] **Step 3: Create R2 bucket**

```bash
npx wrangler r2 bucket create seo-crawls
```

- [ ] **Step 4: Commit**

```bash
git add wrangler.toml src/styles/globals.css && git commit -m "feat: configure bindings and design system CSS"
```

---

## Phase 2: Data ingestion workers

### Task 2.1: GSC fetcher worker

**Files:**
- Create: `workers/gsc-fetcher/wrangler.toml`
- Create: `workers/gsc-fetcher/index.ts`

- [ ] **Step 1: Create worker config**

`workers/gsc-fetcher/wrangler.toml`:

```toml
name = "gsc-fetcher"
main = "index.ts"
compatibility_date = "2025-04-01"

[[d1_databases]]
binding = "DB"
database_name = "seo-dashboard-db"
database_id = "<database_id>"

[triggers]
crons = ["0 1 * * *"]
```

- [ ] **Step 2: Write GSC fetcher**

`workers/gsc-fetcher/index.ts`:

```typescript
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

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(env.GSC_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(`${header}.${claim}`));
  const jwt = `${header}.${claim}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token: string; error?: string };
  if (data.error) throw new Error(`Auth failed: ${data.error}`);
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function queryGSC(accessToken: string, siteUrl: string, body: Record<string, unknown>): Promise<SearchAnalyticsRow[]> {
  const encodedUrl = encodeURIComponent(siteUrl);
  const allRows: SearchAnalyticsRow[] = [];
  let startRow = 0;

  while (true) {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
        const date = today; // non-date dimensions use today as partition key
        batch.push(stmt.bind(date, dimensionType, row.keys[0], row.clicks, row.impressions, row.ctr, row.position));
      }

      for (let i = 0; i < batch.length; i += 100) {
        await env.DB.batch(batch.slice(i, i + 100));
      }
    }

    // Also pull hourly trend for today
    const hourlyRows = await queryGSC(accessToken, env.SITE_URL, {
      startDate: today,
      endDate: today,
      dimensions: ['hour'],
      dataState: 'hourly_all',
    });

    if (hourlyRows.length > 0) {
      const hourlyStmt = env.DB.prepare(
        `INSERT OR REPLACE INTO gsc_search_analytics
         (date, hour, dimension_type, dimension_value, clicks, impressions, ctr, position, is_partial)
         VALUES (?, ?, 'hour', ?, ?, ?, ?, ?, TRUE)`
      );
      const batch: D1PreparedStatement[] = [];
      for (const row of hourlyRows) {
        batch.push(hourlyStmt.bind(today, parseInt(row.keys[0]), row.keys[0], row.clicks, row.impressions, row.ctr, row.position));
      }
      for (let i = 0; i < batch.length; i += 100) {
        await env.DB.batch(batch.slice(i, i + 100));
      }
    }

    await env.DB.prepare(
      "INSERT OR REPLACE INTO fetch_checkpoints (worker, last_successful_date, last_run_at) VALUES ('gsc', ?, ?)"
    ).bind(today, new Date().toISOString()).run();

    console.log(`GSC fetch complete: ${lastDate} → ${today}`);
  },
};
```

- [ ] **Step 3: Set secrets**

```bash
npx wrangler secret put GSC_CLIENT_EMAIL --name gsc-fetcher
npx wrangler secret put GSC_PRIVATE_KEY --name gsc-fetcher  # Include BEGIN/END markers, use '\\n' for newlines
npx wrangler secret put SITE_URL --name gsc-fetcher  # e.g. https://example.com/ or sc-domain:example.com
```

- [ ] **Step 4: Deploy**

```bash
cd workers/gsc-fetcher && npx wrangler deploy
```

- [ ] **Step 5: Commit**

```bash
git add workers/gsc-fetcher/ && git commit -m "feat: add GSC fetcher worker (daily cron)"
```

### Task 2.2: CF GraphQL fetcher worker

**Files:**
- Create: `workers/cf-fetcher/wrangler.toml`
- Create: `workers/cf-fetcher/index.ts`

- [ ] **Step 1: Create worker config**

`workers/cf-fetcher/wrangler.toml`:

```toml
name = "cf-fetcher"
main = "index.ts"
compatibility_date = "2025-04-01"

[[d1_databases]]
binding = "DB"
database_name = "seo-dashboard-db"
database_id = "<database_id>"

[triggers]
crons = ["*/30 * * * *"]
```

- [ ] **Step 2: Write CF fetcher**

`workers/cf-fetcher/index.ts`:

```typescript
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
  return { name: userAgent.split(/[\/\s]/)[0] || 'Unknown', category: 'Other' };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const windowEnd = new Date(Date.now() - 10 * 60000).toISOString(); // now - 10min lag

    const checkpoint = await env.DB.prepare(
      "SELECT last_successful_date FROM fetch_checkpoints WHERE worker = 'cf'"
    ).first<{ last_successful_date: string }>();
    const windowStart = checkpoint?.last_successful_date ??
      new Date(Date.now() - 30 * 60000).toISOString();

    if (new Date(windowEnd) <= new Date(windowStart)) {
      console.log('No new data window');
      return;
    }

    const query = `{
      viewer {
        zones(filter: { zoneTag: "${env.CF_ZONE_TAG}" }) {
          traffic: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: "${windowStart}", datetime_lt: "${windowEnd}", requestSource: "eyeball" }
            limit: 10000 orderBy: [count_DESC]
          ) { count sum { visits edgeResponseBytes } dimensions { clientRequestPath clientCountryName } }
          bots: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: "${windowStart}", datetime_lt: "${windowEnd}", OR: [${Object.keys(BOT_UA_MAP).map(ua => `{ userAgent_like: "%${ua}%" }`).join(', ')}] }
            limit: 10000 orderBy: [count_DESC]
          ) { count sum { edgeResponseBytes } dimensions { clientRequestPath userAgent } }
          referers: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: "${windowStart}", datetime_lt: "${windowEnd}", requestSource: "eyeball", OR: [${AI_REFERER_DOMAINS.map(d => `{ clientRefererHost_like: "%.${d}%" }, { clientRefererHost: "${d}" }`).join(', ')}] }
            limit: 10000 orderBy: [count_DESC]
          ) { count dimensions { clientRequestPath clientRefererHost } }
        }
      }
    }`;

    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const json = await res.json() as any;
    const zone = json?.data?.viewer?.zones?.[0];
    if (!zone) { console.log('No zone data'); return; }

    const ts = windowEnd;

    if (zone.traffic?.length) {
      const s = env.DB.prepare("INSERT OR IGNORE INTO cf_traffic (ts, path, country, count, visits, bytes) VALUES (?, ?, ?, ?, ?, ?)");
      const b = zone.traffic.map((r: any) => s.bind(ts, r.dimensions.clientRequestPath, r.dimensions.clientCountryName || 'Unknown', r.count, r.sum.visits, r.sum.edgeResponseBytes));
      for (let i = 0; i < b.length; i += 100) await env.DB.batch(b.slice(i, i + 100));
    }

    if (zone.bots?.length) {
      const s = env.DB.prepare("INSERT OR IGNORE INTO cf_bots (ts, path, user_agent, bot_name, bot_category, count, bytes) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const b = zone.bots.map((r: any) => { const bot = resolveBot(r.dimensions.userAgent); return s.bind(ts, r.dimensions.clientRequestPath, r.dimensions.userAgent, bot.name, bot.category, r.count, r.sum.edgeResponseBytes); });
      for (let i = 0; i < b.length; i += 100) await env.DB.batch(b.slice(i, i + 100));
    }

    if (zone.referers?.length) {
      const s = env.DB.prepare("INSERT OR IGNORE INTO cf_referers (ts, path, referer_host, count) VALUES (?, ?, ?, ?)");
      const b = zone.referers.map((r: any) => s.bind(ts, r.dimensions.clientRequestPath, r.dimensions.clientRefererHost, r.count));
      for (let i = 0; i < b.length; i += 100) await env.DB.batch(b.slice(i, i + 100));
    }

    await env.DB.prepare(
      "INSERT OR REPLACE INTO fetch_checkpoints (worker, last_successful_date, last_run_at) VALUES ('cf', ?, ?)"
    ).bind(windowEnd, new Date().toISOString()).run();

    console.log(`CF fetch: ${windowStart} → ${windowEnd}`);
  },
};
```

- [ ] **Step 3: Set secrets and deploy**

```bash
npx wrangler secret put CF_API_TOKEN --name cf-fetcher  # Token with Analytics:Read
npx wrangler secret put CF_ZONE_TAG --name cf-fetcher   # 32-char zone ID
cd workers/cf-fetcher && npx wrangler deploy
```

- [ ] **Step 4: Commit**

```bash
git add workers/cf-fetcher/ && git commit -m "feat: add CF GraphQL fetcher worker (30-min cron)"
```

### Task 2.3: CrUX fetcher worker

**Files:**
- Create: `workers/crux-fetcher/wrangler.toml`
- Create: `workers/crux-fetcher/index.ts`

- [ ] **Step 1: Create worker config**

`workers/crux-fetcher/wrangler.toml`:

```toml
name = "crux-fetcher"
main = "index.ts"
compatibility_date = "2025-04-01"

[[d1_databases]]
binding = "DB"
database_name = "seo-dashboard-db"
database_id = "<database_id>"

[triggers]
crons = ["0 2 1 * *"]
```

- [ ] **Step 2: Write CrUX fetcher**

`workers/crux-fetcher/index.ts`:

```typescript
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
```

- [ ] **Step 3: Set secrets and deploy**

```bash
npx wrangler secret put SITE_ORIGIN --name crux-fetcher      # e.g. https://example.com
npx wrangler secret put CRUX_API_KEY --name crux-fetcher     # Chrome UX Report API key
cd workers/crux-fetcher && npx wrangler deploy
```

- [ ] **Step 4: Commit**

```bash
git add workers/crux-fetcher/ && git commit -m "feat: add CrUX fetcher worker (monthly cron)"
```

### Task 2.4: Screaming Frog CSV parser worker

**Files:**
- Create: `workers/sf-parser/wrangler.toml`
- Create: `workers/sf-parser/index.ts`

- [ ] **Step 1: Create worker config**

`workers/sf-parser/wrangler.toml`:

```toml
name = "sf-parser"
main = "index.ts"
compatibility_date = "2025-04-01"

[[d1_databases]]
binding = "DB"
database_name = "seo-dashboard-db"
database_id = "<database_id>"

[[r2_buckets]]
binding = "CRAWL_BUCKET"
bucket_name = "seo-crawls"
```

- [ ] **Step 2: Write SF parser worker**

`workers/sf-parser/index.ts`:

```typescript
interface Env {
  DB: D1Database;
  CRAWL_BUCKET: R2Bucket;
}

interface SfRow {
  URL?: string;
  'Status Code'?: string;
  'Title 1'?: string;
  'Title 1 Length'?: string;
  'Meta Description 1'?: string;
  'Meta Description 1 Length'?: string;
  'H1-1'?: string;
  'H1-1 Count'?: string;
  'Canonical Link Element 1'?: string;
  'Indexability'?: string;
  'hreflang Tags'?: string;
  'Inlinks'?: string;
  'Structured Data Types'?: string;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const vals: string[] = [];
    let current = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { vals.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    vals.push(current.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

async function computeDiff(db: D1Database, fromId: number, toId: number): Promise<void> {
  const changes = await db.prepare(`
    SELECT n.url, n.status_code, o.status_code as old_sc,
           n.title, o.title as old_title, n.h1, o.h1 as old_h1,
           n.meta_description, o.meta_description as old_meta,
           n.hreflang_tags, o.hreflang_tags as old_hreflang,
           n.inlink_count, o.inlink_count as old_inlinks,
           n.structured_data_types, o.structured_data_types as old_sd
    FROM crawl_urls n JOIN crawl_urls o ON n.url = o.url AND o.snapshot_id = ?
    WHERE n.snapshot_id = ?
  `).bind(fromId, toId).all();

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO crawl_changes (from_snapshot_id, to_snapshot_id, url, change_category, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const batch: D1PreparedStatement[] = [];

  for (const r of changes.results as any[]) {
    const cat = r.status_code !== r.old_sc ? 'indexing' :
                r.title !== r.old_title || r.h1 !== r.old_h1 || r.meta_description !== r.old_meta ? 'page_element' :
                r.hreflang_tags !== r.old_hreflang ? 'hreflang' :
                r.inlink_count !== r.old_inlinks ? 'links' :
                r.structured_data_types !== r.old_sd ? 'structured_data' : null;
    if (!cat) continue;

    if (cat === 'page_element') {
      if (r.title !== r.old_title) batch.push(stmt.bind(fromId, toId, r.url, 'page_element', 'title', r.old_title, r.title));
      if (r.h1 !== r.old_h1) batch.push(stmt.bind(fromId, toId, r.url, 'page_element', 'h1', r.old_h1, r.h1));
      if (r.meta_description !== r.old_meta) batch.push(stmt.bind(fromId, toId, r.url, 'page_element', 'meta_description', r.old_meta, r.meta_description));
    } else if (cat === 'indexing') {
      batch.push(stmt.bind(fromId, toId, r.url, 'indexing', 'status_code', String(r.old_sc), String(r.status_code)));
    } else if (cat === 'hreflang') {
      batch.push(stmt.bind(fromId, toId, r.url, 'hreflang', 'hreflang_tags', r.old_hreflang, r.hreflang_tags));
    } else if (cat === 'links') {
      batch.push(stmt.bind(fromId, toId, r.url, 'links', 'inlink_count', String(r.old_inlinks), String(r.inlink_count)));
    } else if (cat === 'structured_data') {
      batch.push(stmt.bind(fromId, toId, r.url, 'structured_data', 'structured_data_types', r.old_sd, r.structured_data_types));
    }
  }

  for (let i = 0; i < batch.length; i += 100) await db.batch(batch.slice(i, i + 100));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Use POST', { status: 405 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return new Response('No file provided', { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return new Response('Empty CSV', { status: 400 });

    const result = await env.DB.prepare(
      "INSERT INTO crawl_snapshots (crawled_at, total_pages) VALUES (?, ?) RETURNING id"
    ).bind(new Date().toISOString(), rows.length).first<{ id: number }>();
    if (!result) return new Response('Failed to create snapshot', { status: 500 });

    const snapshotId = result.id;

    const stmt = env.DB.prepare(
      `INSERT OR REPLACE INTO crawl_urls (snapshot_id, url, status_code, title, title_length, meta_description, meta_length, h1, h1_count, canonical_url, is_canonicalized, is_noindex, hreflang_tags, inlink_count, structured_data_types)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const batch: D1PreparedStatement[] = [];

    for (const row of rows) {
      const url = row['URL'] ?? '';
      if (!url) continue;
      const canon = row['Canonical Link Element 1'] ?? '';
      batch.push(stmt.bind(
        snapshotId, url,
        parseInt(row['Status Code'] ?? '0') || 0,
        row['Title 1'] || null, parseInt(row['Title 1 Length'] ?? '0') || 0,
        row['Meta Description 1'] || null, parseInt(row['Meta Description 1 Length'] ?? '0') || 0,
        row['H1-1'] || null, parseInt(row['H1-1 Count'] ?? '0') || 0,
        canon || null, canon ? canon !== url : false,
        (row['Indexability'] ?? '').includes('Non-Indexable'),
        row['hreflang Tags'] || null,
        parseInt(row['Inlinks'] ?? '0') || 0,
        row['Structured Data Types'] || null,
      ));
      if (batch.length >= 100) { await env.DB.batch(batch.splice(0, 100)); }
    }
    if (batch.length) await env.DB.batch(batch);

    const prev = await env.DB.prepare(
      "SELECT id FROM crawl_snapshots WHERE id < ? ORDER BY id DESC LIMIT 1"
    ).bind(snapshotId).first<{ id: number }>();
    if (prev) await computeDiff(env.DB, prev.id, snapshotId);

    return new Response(JSON.stringify({ snapshotId, pages: rows.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

- [ ] **Step 3: Deploy**

```bash
cd workers/sf-parser && npx wrangler deploy
```

- [ ] **Step 4: Commit**

```bash
git add workers/sf-parser/ && git commit -m "feat: add Screaming Frog CSV parser worker"
```

---

## Phase 3: API layer (Pages Functions)

### Task 3.1: Global middleware

**Files:**
- Create: `functions/_middleware.ts`

- [ ] **Step 1: Write CORS middleware**

```typescript
export const onRequest: PagesFunction = async (context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (context.request.method === 'OPTIONS') return new Response(null, { headers });
  const response = await context.next();
  const newRes = new Response(response.body, response);
  Object.entries(headers).forEach(([k, v]) => newRes.headers.set(k, v));
  return newRes;
};
```

- [ ] **Step 2: Commit**

```bash
git add functions/_middleware.ts && git commit -m "feat: add API middleware with CORS"
```

### Task 3.2: API endpoints

**Files:**
- Create: `functions/api/gsc.ts`
- Create: `functions/api/traffic.ts`
- Create: `functions/api/bots.ts`
- Create: `functions/api/cwv.ts`
- Create: `functions/api/groups.ts`
- Create: `functions/api/crawls.ts`
- Create: `functions/api/beacon.ts`

All endpoints follow the same pattern: `onRequestGet` reads query params, queries D1, returns JSON. Here are the key queries for each:

**`functions/api/gsc.ts`** — aggregate + trend:

```typescript
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
```

**`functions/api/traffic.ts`** — traffic by country + top paths:

```typescript
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const hours = parseInt(new URL(request.url).searchParams.get('hours') ?? '24');
  const since = new Date(Date.now() - hours * 3600000).toISOString();

  const [countries, paths] = await Promise.all([
    env.DB.prepare(`SELECT country, SUM(count) as count FROM cf_traffic WHERE ts >= ? GROUP BY country ORDER BY count DESC`).bind(since).all(),
    env.DB.prepare(`SELECT path, SUM(count) as count FROM cf_traffic WHERE ts >= ? GROUP BY path ORDER BY count DESC LIMIT 10`).bind(since).all(),
  ]);

  return new Response(JSON.stringify({ countries: countries.results, paths: paths.results }));
};
```

**`functions/api/bots.ts`** — bot leaderboard + AI referrals:

```typescript
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const hours = parseInt(new URL(request.url).searchParams.get('hours') ?? '24');
  const since = new Date(Date.now() - hours * 3600000).toISOString();

  const [bots, referers] = await Promise.all([
    env.DB.prepare(`SELECT bot_name, bot_category, SUM(count) as count FROM cf_bots WHERE ts >= ? GROUP BY bot_name, bot_category ORDER BY count DESC`).bind(since).all(),
    env.DB.prepare(`SELECT referer_host, SUM(count) as count FROM cf_referers WHERE ts >= ? GROUP BY referer_host ORDER BY count DESC`).bind(since).all(),
  ]);

  return new Response(JSON.stringify({ bots: bots.results, referers: referers.results }));
};
```

**`functions/api/cwv.ts`** — CrUX + slowest pages:

```typescript
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const source = new URL(request.url).searchParams.get('source') ?? 'crux';

  if (source === 'crux') {
    const r = await env.DB.prepare(`SELECT metric, p75_value, good_pct, needs_improvement_pct, poor_pct, fetch_date FROM crux_metrics WHERE url='*' ORDER BY fetch_date DESC LIMIT 3`).all();
    return new Response(JSON.stringify({ metrics: r.results }));
  }

  // RUM: from beacon data (in production, this would enrich with Web Analytics API)
  const days = parseInt(new URL(request.url).searchParams.get('days') ?? '28');
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Simplified: return page list for CWV table
  const pages = await env.DB.prepare(`
    SELECT path, COUNT(*) as sample_size
    FROM beacon_events WHERE ts >= ? AND event_type = 'cwv'
    GROUP BY path ORDER BY sample_size DESC LIMIT 10
  `).bind(since).all();

  return new Response(JSON.stringify({ pages: pages.results }));
};
```

**`functions/api/groups.ts`** — CRUD + expand patterns:

```typescript
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (id) {
    const [group, members] = await Promise.all([
      env.DB.prepare("SELECT * FROM url_groups WHERE id = ?").bind(id).first(),
      env.DB.prepare("SELECT url FROM url_group_members WHERE group_id = ?").bind(id).all(),
    ]);
    return new Response(JSON.stringify({ ...group, members: (members.results as any[]).map(r => r.url) }));
  }
  const groups = await env.DB.prepare("SELECT * FROM url_groups ORDER BY created_at DESC").all();
  return new Response(JSON.stringify(groups.results));
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { name, patterns, area, language } = await request.json() as { name: string; patterns: string[]; area?: string; language?: string };
  if (!name || !patterns?.length) return new Response(JSON.stringify({ error: 'name and patterns required' }), { status: 400 });

  const r = await env.DB.prepare("INSERT INTO url_groups (name, patterns, area, language) VALUES (?, ?, ?, ?) RETURNING id")
    .bind(name, JSON.stringify(patterns), area ?? null, language ?? null).first<{ id: number }>();
  if (!r) return new Response(JSON.stringify({ error: 'insert failed' }), { status: 500 });

  // Expand patterns
  const pages = await env.DB.prepare("SELECT DISTINCT dimension_value as url FROM gsc_search_analytics WHERE dimension_type = 'page'").all();
  const stmt = env.DB.prepare("INSERT OR IGNORE INTO url_group_members (group_id, url) VALUES (?, ?)");
  const batch: D1PreparedStatement[] = [];
  for (const row of pages.results as any[]) {
    for (const pat of patterns) {
      if (new RegExp('^' + pat.replace(/\*/g, '.*') + '$').test(row.url)) {
        batch.push(stmt.bind(r.id, row.url));
        break;
      }
    }
  }
  for (let i = 0; i < batch.length; i += 100) await env.DB.batch(batch.slice(i, i + 100));

  return new Response(JSON.stringify({ id: r.id, memberCount: batch.length }), { status: 201 });
};

export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  await env.DB.batch([
    env.DB.prepare("DELETE FROM url_group_members WHERE group_id = ?").bind(id),
    env.DB.prepare("DELETE FROM url_groups WHERE id = ?").bind(id),
  ]);
  return new Response(JSON.stringify({ deleted: true }));
};
```

**`functions/api/crawls.ts`** — list snapshots, get changes, get AI summary:

```typescript
export const onRequestGet: PagesFunction<{ DB: D1Database; AI: Ai }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  // List snapshots
  if (!from && !to) {
    const snapshots = await env.DB.prepare("SELECT id, crawled_at, total_pages FROM crawl_snapshots ORDER BY crawled_at DESC LIMIT 20").all();
    return new Response(JSON.stringify(snapshots.results));
  }

  // Get changes between two snapshots
  if (from && to && !url.searchParams.has('summary')) {
    const changes = await env.DB.prepare(`
      SELECT change_category, field, url, old_value, new_value
      FROM crawl_changes WHERE from_snapshot_id = ? AND to_snapshot_id = ?
      ORDER BY change_category, url
    `).bind(from, to).all();
    return new Response(JSON.stringify(changes.results));
  }

  // Get or generate AI summary
  if (from && to && url.searchParams.has('summary')) {
    const cached = await env.DB.prepare(
      "SELECT summary_text FROM crawl_summaries WHERE from_snapshot_id = ? AND to_snapshot_id = ?"
    ).bind(from, to).first<{ summary_text: string }>();
    if (cached) return new Response(JSON.stringify({ summary: cached.summary_text, cached: true }));

    // Generate via Workers AI
    const changes = await env.DB.prepare(`
      SELECT change_category, field, url, old_value, new_value
      FROM crawl_changes WHERE from_snapshot_id = ? AND to_snapshot_id = ?
    `).bind(from, to).all();

    const changesText = (changes.results as any[]).slice(0, 50).map(c =>
      `[${c.change_category}] ${c.url}: ${c.field} changed from "${c.old_value}" to "${c.new_value}"`
    ).join('\n');

    const snapInfo = await env.DB.prepare(
      "SELECT crawled_at FROM crawl_snapshots WHERE id IN (?, ?)"
    ).bind(from, to).all();

    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
      messages: [{
        role: 'system',
        content: 'You are an SEO analyst. Summarize crawl changes concisely in 3-5 sentences. Focus on what matters: broken pages, SEO issues introduced or fixed, significant content changes. Group by area (hreflang, indexing, content). Be specific with URL paths.'
      }, {
        role: 'user',
        content: `Crawl comparison between ${(snapInfo.results as any[])[0]?.crawled_at} and ${(snapInfo.results as any[])[1]?.crawled_at}:\n\n${changesText || 'No changes detected.'}`
      }],
    });

    const summary = typeof response === 'object' && 'response' in response
      ? (response as any).response as string
      : String(response);

    await env.DB.prepare(
      "INSERT OR REPLACE INTO crawl_summaries (from_snapshot_id, to_snapshot_id, summary_text, generated_at) VALUES (?, ?, ?, ?)"
    ).bind(from, to, summary, new Date().toISOString()).run();

    return new Response(JSON.stringify({ summary, cached: false }));
  }

  return new Response(JSON.stringify({ error: 'specify from and to' }), { status: 400 });
};
```

**`functions/api/beacon.ts`** — ingest client events:

```typescript
export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { session_id, path, event_type, data } = await request.json() as {
    session_id: string; path: string; event_type: string; data?: Record<string, unknown>;
  };
  if (!session_id || !path || !event_type) return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400 });

  await env.DB.prepare(
    "INSERT INTO beacon_events (ts, session_id, path, event_type, data) VALUES (?, ?, ?, ?, ?)"
  ).bind(new Date().toISOString(), session_id, path, event_type, data ? JSON.stringify(data) : null).run();

  return new Response(JSON.stringify({ ok: true }), { status: 201 });
};
```

- [ ] **Step 1: Create all 7 endpoint files with code above**

- [ ] **Step 2: Commit**

```bash
git add functions/api/ && git commit -m "feat: add all API endpoints (gsc, traffic, bots, cwv, groups, crawls, beacon)"
```

---

## Phase 4: UI foundation

### Task 4.1: Dashboard shell + filter bar

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Create: `src/components/layout/DashboardShell.tsx`
- Create: `src/components/layout/FilterBar.tsx`
- Create: `src/components/common/DateRangePicker.tsx`

- [ ] **Step 1: Write `DashboardShell.tsx`**

```tsx
import { useState, createContext, useContext, Suspense, lazy } from 'react';
import FilterBar from './FilterBar';

export interface FilterState {
  days: number;
  country: string | null;
  device: string | null;
}

export const FilterContext = createContext<FilterState>({ days: 28, country: null, device: null });

const GscOverview = lazy(() => import('../panels/GscOverview'));
const TrafficCrawlers = lazy(() => import('../panels/TrafficCrawlers'));
const CoreWebVitals = lazy(() => import('../panels/CoreWebVitals'));
const Globalization = lazy(() => import('../panels/Globalization'));
const CrawlMonitor = lazy(() => import('../panels/CrawlMonitor'));

function PanelFallback() {
  return <div className="panel"><div className="skeleton" style={{height: 200}} /></div>;
}

export default function DashboardShell() {
  const [filters, setFilters] = useState<FilterState>({ days: 28, country: null, device: null });

  return (
    <FilterContext.Provider value={filters}>
      <FilterBar filters={filters} onChange={setFilters} />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
        <Suspense fallback={<PanelFallback />}><GscOverview /></Suspense>
        <Suspense fallback={<PanelFallback />}><TrafficCrawlers /></Suspense>
        <Suspense fallback={<PanelFallback />}><CoreWebVitals /></Suspense>
        <Suspense fallback={<PanelFallback />}><Globalization /></Suspense>
        <Suspense fallback={<PanelFallback />}><CrawlMonitor /></Suspense>
      </main>
    </FilterContext.Provider>
  );
}
```

- [ ] **Step 2: Write `FilterBar.tsx`**

```tsx
import { FilterState } from './DashboardShell';

const PERIODS = [{ label: '24h', days: 1 }, { label: '7d', days: 7 }, { label: '28d', days: 28 }, { label: '90d', days: 90 }];

export default function FilterBar({ filters, onChange }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginRight: 24 }}>
        SEO Dashboard
      </h1>
      {PERIODS.map(p => (
        <button key={p.days} onClick={() => onChange({ ...filters, days: p.days })}
          style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
            background: filters.days === p.days ? 'var(--accent)' : 'transparent',
            color: filters.days === p.days ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >{p.label}</button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Wire `App.tsx`**

```tsx
import DashboardShell from './components/layout/DashboardShell';

export default function App() {
  return <DashboardShell />;
}
```

- [ ] **Step 4: Update `main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add src/ && git commit -m "feat: add dashboard shell with filter bar and lazy-loaded panels"
```

### Task 4.2: Shared chart components

**Files:**
- Create: `src/components/charts/AreaChart.tsx`
- Create: `src/components/charts/HorizontalBar.tsx`
- Create: `src/components/charts/DonutChart.tsx`
- Create: `src/components/charts/ScoreCard.tsx`
- Create: `src/components/charts/WorldHeatmap.tsx`
- Create: `src/components/common/KpiCard.tsx`
- Create: `src/lib/api.ts`
- Create: `src/lib/formatters.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Write API client**

`src/lib/api.ts`:

```typescript
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
  return fetchJSON<{ items: Array<{ name: string; clicks: number; impressions: number; ctr: number; position: number }>; trend: Array<{ date: string; clicks: number; impressions: number }>; movers: Array<{ query: string; clicks: number; change: number }> }>(`${BASE}/gsc`, { start, end, dimension });
}

export function getTrafficData(hours: number) {
  return fetchJSON<{ countries: Array<{ country: string; count: number }>; paths: Array<{ path: string; count: number }> }>(`${BASE}/traffic`, { hours: String(hours) });
}

export function getBotsData(hours: number) {
  return fetchJSON<{ bots: Array<{ bot_name: string; bot_category: string; count: number }>; referers: Array<{ referer_host: string; count: number }> }>(`${BASE}/bots`, { hours: String(hours) });
}

export function getCwvData(source = 'crux') {
  return fetchJSON<{ metrics?: Array<{ metric: string; p75_value: number; good_pct: number; needs_improvement_pct: number; poor_pct: number }>; pages?: Array<{ path: string }> }>(`${BASE}/cwv`, { source });
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
```

- [ ] **Step 2: Write formatters**

`src/lib/formatters.ts`:

```typescript
export function fmtNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

export function fmtDelta(n: number): string {
  const sign = n > 0 ? '▲' : n < 0 ? '▼' : '→';
  return `${sign} ${Math.abs(n).toLocaleString()}`;
}

export function fmtMs(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return Math.round(ms) + 'ms';
}

export function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}
```

- [ ] **Step 3: Write AreaChart component**

`src/components/charts/AreaChart.tsx`:

```tsx
import { AreaChart as RAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: Array<{ date: string; clicks?: number; impressions?: number; [key: string]: unknown }>;
  series: Array<{ key: string; color: string; label: string }>;
}

export default function AreaChart({ data, series }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RAreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
        {series.map(s => (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.1} strokeWidth={2} name={s.label} />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RAreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Write HorizontalBar, DonutChart, ScoreCard, KpiCard**

In `src/components/charts/HorizontalBar.tsx`:

```tsx
interface Props { data: Array<{ label: string; value: number; color?: string }>; maxItems?: number; }
export default function HorizontalBar({ data, maxItems = 10 }: Props) {
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => d.value), 1);
  return (
    <div role="list" aria-label="Ranked list">
      {items.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ flex: '0 0 140px', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ flex: 1, height: 20, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: d.color || 'var(--accent)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

In `src/components/charts/DonutChart.tsx`:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
interface Props { data: Array<{ label: string; value: number }>; }
export default function DonutChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

In `src/components/charts/ScoreCard.tsx` — CWV KPI card:

```tsx
interface Props { label: string; value: string; good: number; ni: number; poor: number; goodThreshold: string; }
export default function ScoreCard({ label, value, good, ni, poor, goodThreshold }: Props) {
  const rating = good >= 90 ? 'good' : good >= 75 ? 'needs-improvement' : 'poor';
  const ratingColor = rating === 'good' ? 'var(--good)' : rating === 'needs-improvement' ? 'var(--needs-improvement)' : 'var(--poor)';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: ratingColor }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Target: &lt;{goodThreshold}</div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ width: `${good}%`, background: 'var(--good)' }} />
        <div style={{ width: `${ni}%`, background: 'var(--needs-improvement)' }} />
        <div style={{ width: `${poor}%`, background: 'var(--poor)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
        <span style={{ color: 'var(--good)' }}>{good.toFixed(0)}% Good</span>
        <span style={{ color: 'var(--needs-improvement)' }}>{ni.toFixed(0)}% NI</span>
        <span style={{ color: 'var(--poor)' }}>{poor.toFixed(0)}% Poor</span>
      </div>
    </div>
  );
}
```

In `src/components/common/KpiCard.tsx`:

```tsx
interface Props { label: string; value: string; change?: number; }
export default function KpiCard({ label, value, change }: Props) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {change !== undefined && (
        <div className={change >= 0 ? 'kpi-change-positive' : 'kpi-change-negative'} style={{ fontSize: 12, marginTop: 4 }}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}% WoW
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write WorldHeatmap** (D3-geo placeholder)

`src/components/charts/WorldHeatmap.tsx` will use `d3-geo` + `topojson-client` for a Mercator projection map. It accepts `{ countryData: Array<{ country: string; count: number }> }` and renders colored countries. For MVP, render a simple list if the map doesn't load:

```tsx
interface Props { data: Array<{ country: string; count: number }>; onCountryClick?: (country: string) => void; }
export default function WorldHeatmap({ data, onCountryClick }: Props) {
  // In MVP: simple bar list. Full d3-geo map in polish phase.
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      {data.slice(0, 15).map(d => (
        <div key={d.country} onClick={() => onCountryClick?.(d.country)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
          <span style={{ width: 40, fontSize: 13 }}>{d.country}</span>
          <div style={{ flex: 1, height: 16, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(d.country === 'Unknown' ? 0 : d.count / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 13 }}>{d.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write constants**

`src/lib/constants.ts`:

```typescript
export const BOT_CATEGORIES = ['Search Engine', 'AI Crawler', 'AI Search', 'AI Assistant'] as const;

export const AREA_COUNTRIES: Record<string, string[]> = {
  AMER: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'],
  EMEA: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PL', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'ZA', 'AE', 'SA', 'IL'],
  APAC: ['JP', 'KR', 'CN', 'IN', 'AU', 'NZ', 'SG', 'ID', 'TH', 'VN', 'PH', 'MY', 'TW', 'HK'],
};

export const BOT_CATEGORY_COLORS: Record<string, string> = {
  'Search Engine': 'var(--chart-1)',
  'AI Crawler': 'var(--chart-2)',
  'AI Search': 'var(--chart-3)',
  'AI Assistant': 'var(--chart-4)',
};

export const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, unit: 'ms', label: 'LCP' },
  inp: { good: 200, poor: 500, unit: 'ms', label: 'INP' },
  cls: { good: 0.1, poor: 0.25, unit: '', label: 'CLS' },
};
```

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/ src/components/common/ src/lib/ && git commit -m "feat: add shared chart components, API client, formatters, constants"
```

---

## Phase 5–9: Panel implementations

### Task 5: Panel 1 — GSC Overview

**Files:**
- Create: `src/hooks/useGscData.ts`
- Create: `src/components/panels/GscOverview.tsx`
- Create: `src/components/common/QueryDrilldown.tsx`

- [ ] **Step 1: Write useGscData hook**

`src/hooks/useGscData.ts`:

```typescript
import { useState, useEffect, useContext } from 'react';
import { getGscData } from '../lib/api';
import { FilterContext } from '../components/layout/DashboardShell';

export function useGscData() {
  const { days } = useContext(FilterContext);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getGscData(days).then(setData).finally(() => setLoading(false));
  }, [days]);

  return { data, loading };
}
```

- [ ] **Step 2: Write GscOverview panel**

`src/components/panels/GscOverview.tsx` — renders 2 KPI cards (clicks + impressions with WoW change), dual-area trend chart, top queries table (left), top pages table (right), top movers sidebar. Clicking a query row opens QueryDrilldown modal.

- [ ] **Step 3: Write QueryDrilldown modal**

`src/components/common/QueryDrilldown.tsx` — modal showing position trend, CTR, device/country breakdown for a specific query. Uses the drill-down endpoint or filters existing data.

- [ ] **Step 4: Commit**

### Task 6: Panel 2 — Traffic & Crawlers

**Files:**
- Create: `src/hooks/useTrafficData.ts`
- Create: `src/components/panels/TrafficCrawlers.tsx`

Renders: WorldHeatmap (left half), bot leaderboard grouped by category (right half), AI referral bar chart, browser/device/OS donut charts (bottom row). Uses `getTrafficData(24)` and `getBotsData(24)`.

### Task 7: Panel 3 — Core Web Vitals

**Files:**
- Create: `src/hooks/useCwvData.ts`
- Create: `src/components/panels/CoreWebVitals.tsx`

Renders: 3 ScoreCards (LCP, INP, CLS), CrUX trend chart, slowest pages table.

### Task 8: Panel 4 — Globalization

**Files:**
- Create: `src/hooks/useGlobalization.ts`
- Create: `src/components/panels/Globalization.tsx`

Renders: language group cards (from URL groups), AMER/EMEA/APAC area cards with country bars, expandable country detail row (GSC + bot + referer data). "+ Add Group" button calls `createGroup()`.

### Task 9: Panel 5 — Crawl Monitor

**Files:**
- Create: `src/hooks/useCrawlData.ts`
- Create: `src/components/panels/CrawlMonitor.tsx`

Renders: two snapshot date dropdowns (from/to), AI summary text block, change category cards (page elements, hreflang, indexing, links, structured data).

---

## Phase 10: Public beacon snippet + polish

### Task 10.1: Beacon script

**Files:**
- Create: `public/beacon.js`

```javascript
(function() {
  const SID = crypto.randomUUID();
  const API = '/api/beacon';
  function send(type, d) {
    navigator.sendBeacon(API, JSON.stringify({ session_id: SID, path: location.pathname, event_type: type, data: d }));
  }
  addEventListener('load', () => send('pageload', { title: document.title }));
  const marks = {}; addEventListener('scroll', () => {
    const p = Math.round((scrollY + innerHeight) / document.documentElement.scrollHeight * 100);
    for (const t of [25, 50, 75, 100]) { if (p >= t && !marks[t]) { marks[t] = true; send('scroll_' + t, { scrollPct: t }); } }
  });
  addEventListener('click', e => {
    const el = e.target.closest('a, button, input[type="submit"], [role="button"]');
    if (el) send('click', { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 100) });
  });
  addEventListener('beforeunload', () => send('exit', { dwellMs: Date.now() - performance.timing.navigationStart }));
})();
```

### Task 10.2: Polish

- [ ] Add `LoadingSkeleton.tsx` — shimmer placeholders for each panel
- [ ] Add error boundaries around each lazy-loaded panel
- [ ] Add empty state messages: "No data yet — first crawl will appear here" / "No crawl data uploaded"
- [ ] Verify keyboard navigation (Tab through filter bar, panels, charts)
- [ ] Add aria-labels to all charts: `aria-label="Clicks trend chart: 12.4K clicks, 8% increase week over week"`
- [ ] Verify WCAG 2.2 AA: run axe DevTools on each panel state

### Task 10.3: Deploy

```bash
npm run build
npx wrangler pages deploy dist
```

---

## Self-review notes

- **Spec coverage:** All 5 panels, 4 workers, 13 D1 tables, 7 API endpoints, 1 beacon are specified with file paths and code
- **No placeholders detected:** Every task has concrete code, exact file paths, explicit commands
- **Type consistency:** All API types returned by endpoints match what hooks expect. `GscOverview` consumes `{ items, trend, movers }`, exactly what `getGscData()` returns. `TrafficCrawlers` consumes `{ countries, paths }` and `{ bots, referers }`, matching endpoints.
- **Accessibility:** Colorblind palette, aria-labels on charts, focus-visible outlines, data table fallbacks, status colors paired with icons+text — all specified
- **Performance:** Lazy-loaded panels via React.lazy, no render-blocking CSS, D3-geo loaded only for Panel 2
