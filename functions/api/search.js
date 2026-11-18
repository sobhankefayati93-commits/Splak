export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  if (!query) return Response.json({ error: "عبارت جست‌وجو خالی است." }, { status: 400 });
  if (query.length > 300) return Response.json({ error: "عبارت جست‌وجو بیش از حد طولانی است." }, { status: 400 });

  const instances = env.SEARXNG_URL
    ? [env.SEARXNG_URL.replace(/\/+$/, "")]
    : [
        "https://search.jeremyh.xyz",
        "https://searx.ononoki.org",
        "https://search.im-in.space",
        "https://searx.be"
      ];

  const diagnostics = [];

  for (const base of instances) {
    const host = new URL(base).hostname;
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

      const contentType = upstream.headers.get("content-type") || "unknown";
      if (!upstream.ok) {
        diagnostics.push({ host, status: upstream.status, contentType });
        continue;
      }

      let raw;
      try {
        raw = await upstream.json();
      } catch {
        diagnostics.push({ host, status: upstream.status, issue: "پاسخ JSON معتبر نبود", contentType });
        continue;
      }

      if (!Array.isArray(raw.results)) {
        diagnostics.push({ host, status: upstream.status, issue: "فیلد results وجود ندارد", contentType });
        continue;
      }

      const results = raw.results.slice(0, 20).map(x => ({
        title: String(x.title || "").slice(0, 500),
        url: String(x.url || ""),
        content: String(x.content || x.description || "").slice(0, 1200)
      })).filter(x => /^https?:\/\//i.test(x.url));

      return Response.json({ query, results }, {
        headers: { "Cache-Control": "public, max-age=60" }
      });
    } catch (error) {
      diagnostics.push({
        host,
        issue: error?.name === "TimeoutError" ? "timeout" : "اتصال ناموفق",
        detail: String(error?.message || "").slice(0, 160)
      });
    }
  }

  return Response.json({
    error: "هیچ‌یک از سرورهای جست‌وجوی رایگان فعلاً پاسخ مناسب ندادند.",
    diagnostics
  }, { status: 502 });
}
