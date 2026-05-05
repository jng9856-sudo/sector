/**
 * api/nasdaq.js — 나스닥 실시간 현황
 */
const yahooFinance = require("yahoo-finance2").default;

yahooFinance.suppressNotices(["yahooSurvey", "ripHistorical"]);

const QUOTE_SYMBOLS = ["QQQ", "^IXIC", "^VIX", "^GSPC", "SPY"];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

  try {
    // 시세
    const quoteResults = await Promise.allSettled(
      QUOTE_SYMBOLS.map(sym =>
        yahooFinance.quote(sym, {}, { validateResult: false })
      )
    );

    const quotes = {};
    for (let i = 0; i < QUOTE_SYMBOLS.length; i++) {
      if (quoteResults[i].status !== "fulfilled") continue;
      const q = quoteResults[i].value;
      quotes[QUOTE_SYMBOLS[i]] = {
        price:               q.regularMarketPrice,
        change:              q.regularMarketChange,
        changePct:           q.regularMarketChangePercent,
        previousClose:       q.regularMarketPreviousClose,
        open:                q.regularMarketOpen,
        dayHigh:             q.regularMarketDayHigh,
        dayLow:              q.regularMarketDayLow,
        volume:              q.regularMarketVolume,
        avgVolume:           q.averageDailyVolume3Month,
        preMarketPrice:      q.preMarketPrice      ?? null,
        preMarketChangePct:  q.preMarketChangePercent ?? null,
        postMarketPrice:     q.postMarketPrice     ?? null,
        postMarketChangePct: q.postMarketChangePercent ?? null,
        marketState:         q.marketState,
        shortName:           q.shortName ?? QUOTE_SYMBOLS[i],
      };
    }

    // 장중 차트
    let intraday = [];
    try {
      const today = new Date().toISOString().split("T")[0];
      const chart = await yahooFinance.chart(
        "QQQ",
        { period1: today, interval: "5m" },
        { validateResult: false }
      );
      intraday = (chart.quotes || [])
        .filter(b => b.close)
        .map(b => ({
          time:   b.date instanceof Date ? b.date.toISOString() : new Date(b.date).toISOString(),
          open:   b.open,
          high:   b.high,
          low:    b.low,
          close:  b.close,
          volume: b.volume,
        }));
    } catch (_) {}

    // 뉴스
    let news = [];
    try {
      const s = await yahooFinance.search(
        "NASDAQ QQQ",
        { newsCount: 10 },
        { validateResult: false }
      );
      news = (s.news || []).map(n => ({
        title:     n.title,
        link:      n.link,
        publisher: n.publisher,
        time:      n.providerPublishTime
                   ? (n.providerPublishTime instanceof Date
                      ? n.providerPublishTime.toISOString()
                      : new Date(n.providerPublishTime * 1000).toISOString())
                   : null,
        thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? null,
      }));
    } catch (_) {}

    res.status(200).json({ quotes, intraday, news, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/nasdaq]", err.message);
    res.status(500).json({ error: err.message });
  }
};
