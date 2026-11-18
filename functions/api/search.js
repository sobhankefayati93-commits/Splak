export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();

  if (!query) {
    return Response.json({ error: "عبارت جست‌وجو خالی است." }, { status: 400 });
  }
  if (query.length > 300) {
    return Response.json({ error: "عبارت جست‌وجو بیش از حد طولانی است." }, { status: 400 });
  }
  if (!env.BRAVE_API_KEY) {
    return Response.json({
      error: "کلید Brave تنظیم نشده است. در تنظیمات Cloudflare، متغیر مخفی BRAVE_API_KEY را اضافه کنید."
    }, { status: 503 });
  }

  const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("count", "20");
  endpoint.searchParams.set("search_lang", "fa");

  try {
    const upstream = await fetch(endpoint.toString(), {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": env.BRAVE_API_KEY
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!upstream.ok) {
      const detail = upstream.status === 401 || upstream.status === 403
        ? "کلید API معتبر نیست یا طرح Brave فعال نشده است."
        : upstream.status === 429
          ? "سهمیه یا محدودیت درخواست Brave به پایان رسیده است."
          : `Brave پاسخ ناموفق داد (HTTP ${upstream.status}).`;
      return Response.json({ error: detail }, { status: 502 });
    }

    const raw = await upstream.json();
    const results = (raw.web?.results || []).slice(0, 20).map(item => ({
      title: String(item.title || "").slice(0, 500),
      url: String(item.url || ""),
      content: String(item.description || "").slice(0, 1200)
    })).filter(item => /^https?:\/\//i.test(item.url));

    return Response.json({ query, results }, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch (error) {
    return Response.json({
      error: error?.name === "TimeoutError"
        ? "اتصال به Brave بیش از حد طول کشید. دوباره امتحان کنید."
        : "ارتباط با سرویس Brave برقرار نشد."
    }, { status: 502 });
  }
}
