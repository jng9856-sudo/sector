/**
 * api/prices.js
 * yahoo-finance2 패키지 없이 Yahoo Finance HTTP API 직접 호출
 * Node.js 18+ 내장 fetch 사용 (Vercel 기본 런타임)
 */

const TICKERS = [
  "SPY", "SOXX", "MU", "LITE", "XLU",
  "IGV", "ITA",  "XLE", "XLV", "XLF", "XLI",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

async function fetchTickerHistory(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${ticker} HTTP ${res.status}`);
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`${ticker}: 데이터 없음`);

  const timestamps = result.timestamp || [];
  const adjClose   = result.indicators?.adjclose?.[0]?.adjclose;
  const close      = result.indicators?.quote?.[0]?.close;
  const values     = adjClose || close || [];

  const prices = {};
  for (let i = 0; i < timestamps.length; i++) {
    if (values[i] != null) {
      const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
      prices[date] = values[i];
    }
  }
  return { ticker, prices };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");

  try {
    const results = await Promise.allSettled(
      TICKERS.map(t => fetchTickerHistory(t))
    );

    const prices = {};
    for (const r of results) {
      if (r.status === "rejected") {
        console.error(r.reason?.message);
        continue;
      }
      prices[r.value.ticker] = r.value.prices;
    }

    if (Object.keys(prices).length === 0) {
      throw new Error("모든 티커 데이터 수집 실패");
    }

    res.status(200).json({ prices, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/prices]", err.message);
    res.status(500).json({ error: err.message });
  }
};
