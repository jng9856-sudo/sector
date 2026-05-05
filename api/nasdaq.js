/**
 * api/nasdaq.js — 나스닥 실시간 현황 API
 * GET /api/nasdaq
 * → { quotes, intraday, news, timestamp }
 *
 * 캐시: 60초 (실시간성 vs Vercel 무료 호출 한도 균형)
 */

const yahooFinance = require("yahoo-finance2").default;

// 장외/장후 포함 실시간 데이터 수집 대상
const QUOTE_SYMBOLS = [
  "QQQ",   // 나스닥 추종 ETF (메인 지표)
  "^IXIC", // 나스닥 종합지수
  "^VIX",  // 공포지수
  "^GSPC", // S&P500 (비교용)
  "SPY",   // S&P500 ETF
];

module.exports = async function handler(req, res) {
  // 60초 캐시: 1분마다 Yahoo Finance 실제 호출, 그 사이엔 CDN에서 즉시 응답
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

  try {
    // ── 1. 실시간 시세 (QQQ, NASDAQ, VIX, S&P500) 병렬 fetch
    const quoteResults = await Promise.allSettled(
      QUOTE_SYMBOLS.map(sym => yahooFinance.quote(sym))
    );

    const quotes = {};
    for (let i = 0; i < QUOTE_SYMBOLS.length; i++) {
      if (quoteResults[i].status === "fulfilled") {
        const q = quoteResults[i].value;
        quotes[QUOTE_SYMBOLS[i]] = {
          price:              q.regularMarketPrice,
          change:             q.regularMarketChange,
          changePct:          q.regularMarketChangePercent,
          previousClose:      q.regularMarketPreviousClose,
          open:               q.regularMarketOpen,
          dayHigh:            q.regularMarketDayHigh,
          dayLow:             q.regularMarketDayLow,
          volume:             q.regularMarketVolume,
          avgVolume:          q.averageDailyVolume3Month,
          // 장전/장후
          preMarketPrice:     q.preMarketPrice     ?? null,
          preMarketChange:    q.preMarketChange     ?? null,
          preMarketChangePct: q.preMarketChangePercent ?? null,
          postMarketPrice:    q.postMarketPrice    ?? null,
          postMarketChange:   q.postMarketChange   ?? null,
          postMarketChangePct:q.postMarketChangePercent ?? null,
          marketState:        q.marketState,        // "REGULAR" | "PRE" | "POST" | "CLOSED"
          shortName:          q.shortName ?? q.displayName ?? QUOTE_SYMBOLS[i],
        };
      }
    }

    // ── 2. QQQ 당일 5분봉 차트 (장중 가격 흐름)
    let intraday = [];
    try {
      const today = new Date().toISOString().split("T")[0];
      const chart = await yahooFinance.chart("QQQ", {
        period1:  today,
        interval: "5m",
      });
      intraday = (chart.quotes || []).map(b => ({
        time:   b.date ? b.date.toISOString() : null,
        open:   b.open,
        high:   b.high,
        low:    b.low,
        close:  b.close,
        volume: b.volume,
      })).filter(b => b.time && b.close);
    } catch (_) { /* 장전·주말엔 빈 배열 */ }

    // ── 3. 나스닥 관련 뉴스 (최근 10건)
    let news = [];
    try {
      const searchResult = await yahooFinance.search("NASDAQ QQQ", {
        newsCount:                  10,
        enableEnhancedTrivialQuery: true,
      });
      news = (searchResult.news || []).map(n => ({
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
    } catch (_) { /* 뉴스 실패 시 빈 배열 */ }

    res.status(200).json({
      quotes,
      intraday,
      news,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[/api/nasdaq] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};
