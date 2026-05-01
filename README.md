# SEO Analytics Dashboard

An interactive, single-page analytics dashboard that unifies Google Search Console data, Cloudflare traffic and crawler intelligence, Core Web Vitals, globalization tracking, and Screaming Frog crawl diffs into one visual interface. Built end-to-end on the Cloudflare platform.

---

## Data sources

| Source | What it provides | Collection method |
|--------|-----------------|-------------------|
| **Google Search Console API** | Clicks, impressions, CTR, position by query, page, country, and device. Hourly and finalized daily data. | `gsc-fetcher` Worker, daily cron, OAuth 2.0 service account |
| **Cloudflare GraphQL Analytics** | HTTP traffic by country and path. Bot crawler hits from 19+ identified crawlers across four categories. AI platform referral traffic (ChatGPT, Perplexity, Claude). | `cf-fetcher` Worker, every 30 minutes |
| **Chrome UX Report API** | Origin-level Core Web Vitals (LCP, INP, CLS) with p75 values and good/needs-improvement/poor distribution. Updated monthly. | `crux-fetcher` Worker, first of each month |
| **Screaming Frog SEO Spider** | Per-page crawl data: status codes, titles, meta descriptions, H1s, canonicals, hreflang tags, inlink counts, structured data types. | `sf-parser` Worker, on-demand CSV upload via HTTP POST |
| **Custom analytics beacon** | Client-side real user monitoring: page loads, scroll depth (25/50/75/100%), element clicks, session dwell time. | `beacon.js` snippet embedded on the tracked site, posting to `POST /api/beacon` |

---

## Panels

### 1. Search Performance (Google Search Console)

- Two KPI cards: total clicks and total impressions with week-over-week change indicators
- Dual-axis area chart showing clicks and impressions over time
- Top 10 queries ranked by clicks, each clickable to open a drill-down modal showing CTR, average position, and per-query detail
- Top 10 pages ranked by clicks
- "Top movers" sidebar listing queries with the largest click deltas versus the previous period

### 2. Traffic and Crawlers (Cloudflare)

- Traffic by country displayed as a ranked bar list (click a country to filter)
- Bot crawler activity grouped into four categories:
  - **Search Engine** — Googlebot, BingBot, others
  - **AI Crawler** — GPTBot, ClaudeBot, CCBot, Bytespider, Meta Agent, Amazonbot
  - **AI Search** — PerplexityBot, Applebot, OAI-SearchBot, Claude-SearchBot
  - **AI Assistant** — ChatGPT-User, Perplexity-User, Claude-User, MistralAI-User, DuckAssistBot
- AI referral traffic from chatgpt.com, perplexity.ai, claude.ai, and others
- Browser, device type, and operating system distribution as donut charts

### 3. Core Web Vitals

- Three ScoreCards for Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS)
- Each card displays the p75 value with color-coded rating (green/amber/red), the good/needs-improvement/poor distribution as a stacked bar, and the target threshold
- Tracked pages table from real user monitoring data
- Empty state when no CrUX data is available (new sites or insufficient traffic)

### 4. Globalization

- **Language groups** — user-defined URL pattern groups (e.g. `/de/*`, `/es/*`) displayed as cards. Created via the API and auto-expanded against known GSC pages.
- **Area cards** — AMER, EMEA, and APAC aggregations with per-country bar charts ranked by clicks
- **Country detail** — click any country bar to expand a detail row showing clicks, impressions, and page counts for that country

### 5. Crawl Monitor

- Two snapshot selector dropdowns to choose any pair of Screaming Frog crawl uploads for comparison
- **AI-generated summary** — Workers AI (Llama 3.3 70B) produces a natural language summary of what changed between the two crawls, grouped by area (hreflang, indexing, content)
- **Change category cards** — indexed by category (page elements, hreflang, indexing, internal links, structured data), each showing per-URL before/after diffs
- Results are cached in D1 so subsequent views of the same comparison pair are instant
- Empty state when no crawls have been uploaded

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA INGESTION                           │
│                                                             │
│  gsc-fetcher (daily)     cf-fetcher (30-min)                │
│  crux-fetcher (monthly)  sf-parser (on-demand POST)        │
│        │                       │                            │
│        └───────────┬───────────┘                            │
│                    ▼                                         │
│              ┌──────────┐                                    │
│              │    D1    │  13 tables, SQLite                 │
│              └────┬─────┘                                    │
│                   │                                          │
├───────────────────┼──────────────────────────────────────────┤
│               API LAYER                                      │
│  Pages Functions (7 endpoints)                               │
│  /api/gsc  /api/traffic  /api/bots  /api/cwv                 │
│  /api/groups  /api/crawls  /api/beacon                       │
│                   │                                          │
├───────────────────┼──────────────────────────────────────────┤
│               UI LAYER                                       │
│  React 19 SPA (Vite, Recharts, D3-geo)                       │
│  5 code-split panels, lazy-loaded                            │
└──────────────────────────────────────────────────────────────┘
```

The ingestion workers are independent Cloudflare Workers with cron triggers. They write directly to D1. The API layer is a set of Pages Functions that read from D1 and return JSON. The UI is a React single-page application built with Vite, deployed to Cloudflare Pages. Workers AI is called on-demand from the `/api/crawls` endpoint to generate crawl comparison summaries.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Charts | Recharts, D3-geo, D3-scale, topojson-client |
| Styling | CSS custom properties (design system), CSS Modules |
| API | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| Ingest workers | Cloudflare Workers (cron-triggered) |
| AI | Workers AI (Llama 3.3 70B Instruct) |
| Object storage | Cloudflare R2 |
| Deployment | Wrangler CLI, Cloudflare Pages |

---

## Prerequisites

- **Cloudflare account** with:
  - Workers Paid plan (required for cron triggers and D1)
  - D1 database created
  - R2 bucket created (for Screaming Frog CSV uploads)
  - Workers AI enabled (for crawl change summaries)
- **Google Cloud project** with:
  - Search Console API enabled
  - Service account with domain-level access to your Search Console property
  - Chrome UX Report API key (free tier sufficient)
- **Screaming Frog SEO Spider** (licensed version) installed on a machine capable of scheduled execution, if using the crawl monitor feature
- **Node.js** 18+ and **npm** 9+

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/nealkindschi/dashboard.git
cd dashboard
npm install
```

### 2. Create the D1 database

```bash
npx wrangler d1 create seo-dashboard-db
```

Copy the `database_id` from the output. Update `wrangler.toml` with the ID if it differs from the pre-configured value.

### 3. Apply the schema

```bash
npx wrangler d1 execute seo-dashboard-db --file=d1/schema.sql
```

### 4. Create the R2 bucket

```bash
npx wrangler r2 bucket create seo-crawls
```

### 5. Configure secrets for each worker

#### GSC fetcher

```bash
cd workers/gsc-fetcher
npx wrangler secret put GSC_CLIENT_EMAIL    # service account email
npx wrangler secret put GSC_PRIVATE_KEY     # PEM private key (include BEGIN/END lines, use \n for newlines)
npx wrangler secret put SITE_URL            # e.g. https://example.com/ or sc-domain:example.com
```

#### CF GraphQL fetcher

```bash
cd workers/cf-fetcher
npx wrangler secret put CF_API_TOKEN        # Cloudflare API token with Analytics:Read
npx wrangler secret put CF_ZONE_TAG         # 32-character zone ID
```

#### CrUX fetcher

```bash
cd workers/crux-fetcher
npx wrangler secret put SITE_ORIGIN         # e.g. https://example.com
npx wrangler secret put CRUX_API_KEY        # Chrome UX Report API key
```

### 6. Deploy the ingestion workers

```bash
cd workers/gsc-fetcher && npx wrangler deploy
cd ../cf-fetcher && npx wrangler deploy
cd ../crux-fetcher && npx wrangler deploy
cd ../sf-parser && npx wrangler deploy
```

### 7. Verify cron schedules

```bash
npx wrangler schedules   # Lists all cron triggers
npx wrangler schedules --name gsc-fetcher  # Verify daily cron
npx wrangler schedules --name cf-fetcher   # Verify 30-minute cron
npx wrangler schedules --name crux-fetcher # Verify monthly cron
```

---

## Development

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # TypeScript check + production build
npm run preview   # Preview production build locally
npm run deploy    # Deploy to Cloudflare Pages
```

During development, the frontend runs against the local Vite server. API calls to `/api/*` are served by Pages Functions when running `wrangler pages dev dist` or they will 404 during pure Vite dev — the frontend handles this gracefully with error states.

For local API testing against D1:

```bash
npx wrangler pages dev dist --d1=DB
```

---

## Deploying the dashboard

```bash
npm run build
npx wrangler pages deploy dist
```

The first deployment will prompt you to create a Pages project. Subsequent deployments use the existing project. The `wrangler.toml` configures D1, AI, and R2 bindings automatically.

---

## Automation guide

### Screaming Frog CSV upload

The Crawl Monitor panel (Panel 5) depends on Screaming Frog crawl data. To automate daily uploads:

1. **Windows**: Use Task Scheduler to run the SF CLI:

```
screamingfrogseospider.exe --crawl https://example.com --headless --output-format csv --output-folder C:\crawls\
```

2. **macOS / Linux**: Use cron to run the SF CLI:

```
0 3 * * * /Applications/ScreamingFrogSEOSpider.app/Contents/MacOS/ScreamingFrogSEOSpider --crawl https://example.com --headless --output-format csv --output-folder /tmp/crawls/
```

3. Upload the CSV to the parser worker:

```bash
curl -X POST https://sf-parser.your-subdomain.workers.dev \
  -F "file=@/path/to/crawl_export.csv"
```

The parser worker:
- Creates a new snapshot in D1
- Parses and stores per-URL data (status codes, titles, meta, H1s, canonicals, hreflang, inlinks, structured data)
- Automatically computes a diff against the most recent prior snapshot
- Returns the snapshot ID and page count

### Client-side tracking beacon

Add to your site's HTML, before the closing `</body>` tag:

```html
<script src="https://your-dashboard.pages.dev/beacon.js"></script>
```

The beacon collects page loads, scroll depth at 25/50/75/100% thresholds, clicks on interactive elements (links, buttons, form inputs), and session dwell time. No cookies. No personal data.

---

## API reference

All endpoints return JSON. CORS is enabled globally.

### `GET /api/gsc`

Search Console search analytics data.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `start` | 28 days ago | Start date (YYYY-MM-DD) |
| `end` | today | End date (YYYY-MM-DD) |
| `dimension` | `query` | Grouping dimension: `query`, `page`, `country`, or `device` |

Response:

```json
{
  "items": [{ "name": "seo tips", "clicks": 2100, "impressions": 34000, "ctr": 6.2, "position": 4.3 }],
  "trend": [{ "date": "2026-04-01", "clicks": 380, "impressions": 6100 }],
  "movers": [{ "query": "seo audit", "clicks": 412, "change": 412 }]
}
```

### `GET /api/traffic`

Cloudflare traffic by country and top paths.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `hours` | `24` | Lookback window in hours |

### `GET /api/bots`

Bot crawler activity and AI referral traffic.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `hours` | `24` | Lookback window in hours |

### `GET /api/cwv`

Core Web Vitals data.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `source` | `crux` | Data source: `crux` (Chrome UX Report) or `rum` (Web Analytics RUM beacon) |

### `GET /api/groups` | `POST /api/groups` | `DELETE /api/groups`

CRUD for URL pattern groups used in the Globalization panel.

```json
// POST body
{ "name": "German Pages", "patterns": ["/de/*", "/de-de/*"], "language": "de" }
```

### `GET /api/crawls`

Crawl snapshots, changes, and AI summaries.

| Parameter | Description |
|-----------|-------------|
| *(none)* | List all crawl snapshots |
| `from` + `to` | Get changes between two snapshot IDs |
| `from` + `to` + `summary=1` | Get or generate AI summary of changes |

### `POST /api/beacon`

Ingest client-side tracking events.

```json
{ "session_id": "uuid", "path": "/blog/post", "event_type": "scroll_50", "data": { "scrollPct": 50 } }
```

---

## D1 schema

13 tables across 4 domains:

**Ingestion checkpoints** — `fetch_checkpoints` tracks the last successful run date for each worker, enabling gap-free incremental pulls.

**Search Console** — `gsc_search_analytics` stores clicks, impressions, CTR, and position partitioned by date and dimension type (query, page, country, device, hour). Finalized data is marked `is_partial = FALSE`.

**Cloudflare traffic** — `cf_traffic` (path + country traffic), `cf_bots` (identified crawler hits with bot name and category), `cf_referers` (AI platform referral counts).

**Core Web Vitals** — `crux_metrics` stores origin-level LCP, INP, and CLS metrics with p75 values and good/needs-improvement/poor distribution percentages.

**Beacon events** — `beacon_events` captures client-side RUM events (pageload, scroll depth, clicks, exits) with session ID for journey reconstruction.

**Globalization** — `url_groups` stores user-defined URL pattern groups. `url_group_members` holds the expanded URL list per group, auto-populated from known GSC pages.

**Crawl monitor** — `crawl_snapshots` (one row per SF upload), `crawl_urls` (per-URL crawl data), `crawl_changes` (computed diffs between snapshots), `crawl_summaries` (cached AI-generated change summaries).

---

## Design system

The UI uses a CSS custom property design system defined in `src/styles/globals.css`.

- **60-30-10 rule**: neutral background 60%, panel surfaces 30%, accent blue 10%
- **Colorblind-friendly chart palette**: blue, orange, green, red, purple, brown
- **Status colors** always paired with icons and text labels — never color alone
- **Focus indicators**: visible outlines on all interactive elements (`:focus-visible`)
- **Skeleton loading**: shimmer animation on all panels during data fetch
- **Responsive**: panels collapse padding and KPI font size below 768px

---

## Known limitations

- **Browser/device/OS data**: the donut charts in Panel 2 display static placeholder distributions. Per-browser and per-device breakdowns are available in the Cloudflare GraphQL API but require additional API calls not yet implemented in the CF fetcher.
- **Core Web Vitals RUM trends**: Panel 3 currently displays origin-level CrUX data (monthly). Daily RUM trends from Web Analytics require the Web Analytics GraphQL API, which is not yet integrated.
- **GSC hourly data**: the `gsc-fetcher` pulls finalized daily data. Hourly trend data is available from the Search Console API (`dataState: "hourly_all"`) but fetcher logic for it is not yet implemented.
- **Bot detection granularity**: without the Cloudflare Bot Management add-on (Business plan or higher), bot identification relies on user-agent string matching rather than detection IDs or JA3/JA4 fingerprinting. This means evasive bots that spoof user agents or rotate them will not be identified.

---

## Roadmap (v2)

- 3D interactive globe (React Three Fiber) replacing the 2D country heatmap
- User journey Sankey animation reconstructing visitor paths from beacon session data
- Workers AI conversion element detection — automatically identifying CTAs, forms, and buttons on each page and tracking their activation rates
- Screaming Frog daily automation script with R2 event-triggered parsing
- Web Analytics RUM integration for daily Core Web Vitals trend data
- Historical data retention controls and data pruning

---

## License

MIT
