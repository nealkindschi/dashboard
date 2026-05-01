export const onRequestGet: PagesFunction<{ DB: D1Database; AI: Ai }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!from && !to) {
    const snapshots = await env.DB.prepare("SELECT id, crawled_at, total_pages FROM crawl_snapshots ORDER BY crawled_at DESC LIMIT 20").all();
    return new Response(JSON.stringify(snapshots.results));
  }

  if (from && to && !url.searchParams.has('summary')) {
    const changes = await env.DB.prepare(`
      SELECT change_category, field, url, old_value, new_value
      FROM crawl_changes WHERE from_snapshot_id = ? AND to_snapshot_id = ?
      ORDER BY change_category, url
    `).bind(from, to).all();
    return new Response(JSON.stringify(changes.results));
  }

  if (from && to && url.searchParams.has('summary')) {
    const cached = await env.DB.prepare(
      "SELECT summary_text FROM crawl_summaries WHERE from_snapshot_id = ? AND to_snapshot_id = ?"
    ).bind(from, to).first<{ summary_text: string }>();
    if (cached) return new Response(JSON.stringify({ summary: cached.summary_text, cached: true }));

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

    try {
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
    } catch (e) {
      return new Response(JSON.stringify({ summary: 'AI summary unavailable. Crawl comparison generated ' + changesText.split('\n').length + ' changes.', cached: false }));
    }
  }

  return new Response(JSON.stringify({ error: 'specify from and to' }), { status: 400 });
};
