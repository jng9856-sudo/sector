/**
 * api/nasdaq.js
 * 나스닥 실시간 현황 — Yahoo Finance HTTP API 직접 호출
 */

const QUOTE_SYMBOLS = ["QQQ", "^IXIC", "^VIX", "^GSPC"];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

async function fetchQuote(sym) {
  const encoded = encodeURIComponent(sym);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=5d`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${sym} HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`${sym}: meta 없음`);
  return { sym, meta };
}

async function fetchIntraday() {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/QQQ?interval=5m&range=1d`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) return [];
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp || [];
  const quotes     = result.indicators?.quote?.[0] || {};

  return timestamps.map((ts, i) => ({
    time:   new Date(ts * 1000).toISOString(),
    open:   quotes.open?.[i]   ?? null,
    high:   quotes.high?.[i]   ?? null,
    low:    quotes.low?.[i]    ?? null,
    close:  quotes.close?.[i]  ?? null,
    volume: quotes.volume?.[i] ?? null,
  })).filter(b => b.close != null);
}

async function fetchNews() {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=NASDAQ+QQQ&newsCount=10&lang=en-US`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.news || []).map(n => ({
    title:     n.title,
    link:      n.link,
    publisher: n.publisher,
    time:      n.providerPublishTime
               ? new Date(n.providerPublishTime * 1000).toISOString()
               : null,
    thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? null,
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

  try {
    const [quoteResults, intraday, news] = await Promise.all([
      Promise.allSettled(QUOTE_SYMBOLS.map(s => fetchQuote(s))),
      fetchIntraday().catch(() => []),
      fetchNews().catch(() => []),
    ]);

    const quotes = {};
    for (const r of quoteResults) {
      if (r.status !== "fulfilled") continue;
      const { sym, meta } = r.value;
      quotes[sym] = {
        price:               meta.regularMarketPrice,
        change:              meta.regularMarketPrice - meta.previousClose,
        changePct:           ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        previousClose:       meta.previousClose,
        open:                meta.regularMarketOpen     ?? null,
        dayHigh:             meta.regularMarketDayHigh  ?? null,
        dayLow:              meta.regularMarketDayLow   ?? null,
        volume:              meta.regularMarketVolume   ?? null,
        avgVolume:           meta.fiftyDayAverage       ?? null,
        preMarketPrice:      meta.preMarketPrice        ?? null,
        preMarketChangePct:  meta.preMarketPrice
                             ? ((meta.preMarketPrice - meta.previousClose) / meta.previousClose) * 100
                             : null,
        postMarketPrice:     meta.postMarketPrice       ?? null,
        postMarketChangePct: meta.postMarketPrice
                             ? ((meta.postMarketPrice - meta.previousClose) / meta.previousClose) * 100
                             : null,
        marketState:         meta.marketState,
        shortName:           meta.shortName ?? sym,
      };
    }

    res.status(200).json({ quotes, intraday, news, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/nasdaq]", err.message);
    res.status(500).json({ error: err.message });
  }
};
