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
