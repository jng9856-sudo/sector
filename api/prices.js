/**
 * api/prices.js — 섹터 ETF 가격 데이터
 */
const yahooFinance = require("yahoo-finance2").default;

// yahoo-finance2 v2의 유효성 검사 알림 억제 (미설정 시 500 오류 원인)
yahooFinance.suppressNotices(["yahooSurvey", "ripHistorical"]);

const TICKERS = [
  "SPY", "SOXX", "MU", "LITE", "XLU",
  "IGV", "ITA",  "XLE", "XLV", "XLF", "XLI",
];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");

  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 380);

  try {
    const results = await Promise.allSettled(
      TICKERS.map(async (ticker) => {
        const data = await yahooFinance.historical(
          ticker,
          { period1: start, period2: end, interval: "1d" },
          { validateResult: false }
        );
        return { ticker, data };
      })
    );

    const prices = {};
    for (const r of results) {
      if (r.status === "rejected") continue;
      const { ticker, data } = r.value;
      prices[ticker] = {};
      for (const row of data) {
        const d = row.date instanceof Date
          ? row.date.toISOString().split("T")[0]
          : new Date(row.date).toISOString().split("T")[0];
        prices[ticker][d] = row.adjClose ?? row.close ?? null;
      }
    }

    res.status(200).json({ prices, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/prices]", err.message);
    res.status(500).json({ error: err.message });
  }
};
