interface Env {
  DB: D1Database;
  CRAWL_BUCKET: R2Bucket;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let current = '';
    let inQuote = false;
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
    const cat =
      r.status_code !== r.old_sc ? 'indexing' :
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
      const url = row['URL'] ?? row['Address'] ?? '';
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

    return new Response(
      JSON.stringify({ snapshotId, pages: rows.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  },
};
