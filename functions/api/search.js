export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  if (!query) return Response.json({ error: "عبارت جست‌وجو خالی است." }, { status: 400 });
  if (query.length > 300) return Response.json({ error: "عبارت جست‌وجو بیش از حد طولانی است." }, { status: 400 });

  // A custom instance can be set in Cloudflare as SEARXNG_URL.
  // Public instances are best-effort: some disable JSON or block automated requests.
  const instances = env.SEARXNG_URL
    ? [env.SEARXNG_URL.replace(/\/+$/, "")]
    : [
        "https://search.jeremyh.xyz",
        "https://searx.ononoki.org",
        "https://search.im-in.space",
        "https://searx.be"
      ];

  for (const base of instances) {
    try {
      const endpoint = new URL(base + "/search");
      endpoint.searchParams.set("q", query);
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("language", "all");

      const upstream = await fetch(endpoint.toString(), {
        headers: {
          "Accept": "application/json",
          "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; SplackSearch/1.0)"
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!upstream.ok) continue;
      const raw = await upstream.json();
      if (!Array.isArray(raw.results)) continue;

      const results = raw.results.slice(0, 20).map(x => ({
        title: String(x.title || "").slice(0, 500),
        url: String(x.url || ""),
        content: String(x.content || x.description || "").slice(0, 1200)
      })).filter(x => /^https?:\/\//i.test(x.url));

      return Response.json({ query, results }, {
        headers: { "Cache-Control": "public, max-age=60" }
      });
    } catch {
      // Try the next public instance.
    }
  }

  return Response.json({
    error: "هیچ‌یک از سرورهای جست‌وجوی رایگان فعلاً پاسخ مناسب ندادند. کمی بعد دوباره امتحان کن."
  }, { status: 502 });
}
