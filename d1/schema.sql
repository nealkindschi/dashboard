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
