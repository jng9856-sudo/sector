/**
 * api/prices.js  — Vercel Serverless Function
 * GET /api/prices  →  { prices: { TICKER: { "YYYY-MM-DD": adjClose } }, timestamp }
 *
 * - Vercel Edge 캐시 5분 적용 (s-maxage=300) → 같은 URL 재요청 시 CDN에서 즉시 응답
 * - 병렬 fetch(Promise.all)로 11개 티커를 동시에 받아 10초 제한 이내 처리
 */

const yahooFinance = require("yahoo-finance2").default;

// ── 섹터 티커 목록 (index.html의 SECTORS와 동일하게 유지)
const TICKERS = [
  "SPY",   // 벤치마크
  "SOXX",  // 반도체
  "MU",    // 메모리
  "LITE",  // 광통신
  "XLU",   // 전력/유틸
  "IGV",   // 소프트웨어
  "ITA",   // 방산
  "XLE",   // 에너지
  "XLV",   // 헬스케어
  "XLF",   // 금융
  "XLI",   // 산업재
];

module.exports = async function handler(req, res) {
  // 5분 CDN 캐시 — 같은 배포 URL에 반복 접근해도 Yahoo Finance를 매번 호출하지 않음
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");

  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 380); // ~1.3년치 (252 거래일 + 여유)

  try {
    // 병렬 fetch
    const results = await Promise.allSettled(
      TICKERS.map((ticker) =>
        yahooFinance
          .historical(ticker, {
            period1:  start.toISOString().split("T")[0],
            period2:  end.toISOString().split("T")[0],
            interval: "1d",
          })
          .then((data) => ({ ticker, data }))
      )
    );

    const prices = {};
    for (const result of results) {
      if (result.status === "rejected") continue; // 실패한 티커는 스킵
      const { ticker, data } = result.value;
      prices[ticker] = {};
      for (const row of data) {
        const dateStr = row.date.toISOString().split("T")[0];
        prices[ticker][dateStr] = row.adjClose ?? row.close ?? null;
      }
    }

    res.status(200).json({ prices, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[/api/prices] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};
