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
