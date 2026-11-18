export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  if (!query) return Response.json({ error: "عبارت جست‌وجو خالی است." }, { status: 400 });
  if (query.length > 300) return Response.json({ error: "عبارت جست‌وجو بیش از حد طولانی است." }, { status: 400 });

  // You may override this in Cloudflare Pages environment variables.
  const base = (env.SEARXNG_URL || "https://searx.be").replace(/\/+$/, "");
  const endpoint = new URL(base + "/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("language", "all");

  try {
    const upstream = await fetch(endpoint.toString(), {
      headers: { "Accept": "application/json", "User-Agent": "SplackSearch/1.0" }
    });
    if (!upstream.ok) {
      return Response.json({ error: `موتور جست‌وجو پاسخ نداد (HTTP ${upstream.status}).` }, { status: 502 });
    }
    const raw = await upstream.json();
    const results = (raw.results || []).slice(0, 20).map(x => ({
      title: String(x.title || "").slice(0, 500),
      url: String(x.url || ""),
      content: String(x.content || x.description || "").slice(0, 1200)
    })).filter(x => /^https?:\/\//i.test(x.url));
    return Response.json({ query, results }, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch (e) {
    return Response.json({ error: "اتصال به موتور جست‌وجو برقرار نشد. ممکن است سرویس موقتاً در دسترس نباشد." }, { status: 502 });
  }
}
