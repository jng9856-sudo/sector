/**
 * api/stocks.js — 섹터별 대표주 + 낙수효과 수혜주
 * prices.js와 동일한 v8 chart API 사용 (검증된 방식)
 */

const SECTOR_STOCKS = {
  "반도체":     { etf: "SOXX",
    leaders: [{ t:"NVDA",n:"NVIDIA" },{ t:"AMD",n:"AMD" },{ t:"AVGO",n:"Broadcom" },{ t:"QCOM",n:"Qualcomm" },{ t:"INTC",n:"Intel" }],
    trickle: [{ t:"AEHR",n:"Aehr Test" },{ t:"SITM",n:"SiTime" },{ t:"MCHP",n:"Microchip" },{ t:"SWKS",n:"Skyworks" },{ t:"ACLS",n:"Axcelis" }] },

  "메모리":     { etf: "MU",
    leaders: [{ t:"MU",n:"Micron" },{ t:"WDC",n:"Western Digital" },{ t:"STX",n:"Seagate" }],
    trickle: [{ t:"SIMO",n:"Silicon Motion" },{ t:"CRUS",n:"Cirrus Logic" },{ t:"RMBS",n:"Rambus" },{ t:"NXPI",n:"NXP Semi" }] },

  "광통신":     { etf: "LITE",
    leaders: [{ t:"LITE",n:"Lumentum" },{ t:"COHR",n:"Coherent" },{ t:"AAOI",n:"Applied Opto" },{ t:"VIAV",n:"Viavi" }],
    trickle: [{ t:"OCLR",n:"Oclaro" },{ t:"LUMN",n:"Lumen Tech" },{ t:"CIEN",n:"Ciena" },{ t:"INFN",n:"Infinera" }] },

  "전력/유틸":  { etf: "XLU",
    leaders: [{ t:"NEE",n:"NextEra" },{ t:"SO",n:"Southern Co" },{ t:"DUK",n:"Duke Energy" },{ t:"AEP",n:"Am. Electric" }],
    trickle: [{ t:"ENPH",n:"Enphase" },{ t:"ARRY",n:"Array Tech" },{ t:"RUN",n:"Sunrun" },{ t:"BE",n:"Bloom Energy" },{ t:"NOVA",n:"Sunnova" }] },

  "소프트웨어": { etf: "IGV",
    leaders: [{ t:"MSFT",n:"Microsoft" },{ t:"CRM",n:"Salesforce" },{ t:"NOW",n:"ServiceNow" },{ t:"ORCL",n:"Oracle" }],
    trickle: [{ t:"TWLO",n:"Twilio" },{ t:"BAND",n:"Bandwidth" },{ t:"ZS",n:"Zscaler" },{ t:"CRWD",n:"CrowdStrike" },{ t:"NET",n:"Cloudflare" }] },

  "방산":       { etf: "ITA",
    leaders: [{ t:"LMT",n:"Lockheed" },{ t:"RTX",n:"RTX Corp" },{ t:"NOC",n:"Northrop" },{ t:"GD",n:"General Dynamics" }],
    trickle: [{ t:"KTOS",n:"Kratos" },{ t:"PLTR",n:"Palantir" },{ t:"AVAV",n:"AeroVironment" },{ t:"HII",n:"Huntington Ingalls" }] },

  "에너지":     { etf: "XLE",
    leaders: [{ t:"XOM",n:"ExxonMobil" },{ t:"CVX",n:"Chevron" },{ t:"COP",n:"ConocoPhillips" },{ t:"SLB",n:"SLB" }],
    trickle: [{ t:"OXY",n:"Occidental" },{ t:"MPC",n:"Marathon" },{ t:"DVN",n:"Devon Energy" },{ t:"HAL",n:"Halliburton" }] },

  "헬스케어":   { etf: "XLV",
    leaders: [{ t:"LLY",n:"Eli Lilly" },{ t:"UNH",n:"UnitedHealth" },{ t:"ABBV",n:"AbbVie" },{ t:"MRK",n:"Merck" }],
    trickle: [{ t:"ISRG",n:"Intuitive Surgical" },{ t:"DXCM",n:"DexCom" },{ t:"HIMS",n:"Hims & Hers" },{ t:"ETON",n:"Eton Pharma" }] },

  "금융":       { etf: "XLF",
    leaders: [{ t:"JPM",n:"JPMorgan" },{ t:"BAC",n:"Bank of America" },{ t:"GS",n:"Goldman Sachs" },{ t:"MS",n:"Morgan Stanley" }],
    trickle: [{ t:"COIN",n:"Coinbase" },{ t:"HOOD",n:"Robinhood" },{ t:"SOFI",n:"SoFi" },{ t:"NU",n:"Nu Holdings" }] },

  "산업재":     { etf: "XLI",
    leaders: [{ t:"CAT",n:"Caterpillar" },{ t:"DE",n:"John Deere" },{ t:"HON",n:"Honeywell" },{ t:"GE",n:"GE Aerospace" }],
    trickle: [{ t:"STRL",n:"Sterling Infra" },{ t:"PWR",n:"Quanta Services" },{ t:"FIX",n:"Comfort Systems" },{ t:"TT",n:"Trane Tech" }] },
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

// v8 chart API로 단일 티커 현재가 조회 (prices.js와 동일한 방식)
async function fetchQuote(ticker) {
  const enc = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=5d`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${ticker} HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`${ticker}: no price`);

  const prev = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice;
  const price = meta.regularMarketPrice;
  return {
    ticker,
    price,
    change:    price - prev,
    changePct: ((price - prev) / prev) * 100,
    volume:    meta.regularMarketVolume ?? null,
    marketCap: meta.marketCap           ?? null,
  };
}

module.exports = async function handler(req, res) {
  // 2분 캐시 (종목 수 많아 매번 호출 부담)
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");

  try {
    // 전체 티커 목록 수집
    const allTickers = new Set();
    for (const cfg of Object.values(SECTOR_STOCKS)) {
      allTickers.add(cfg.etf);
      cfg.leaders.forEach(s => allTickers.add(s.t));
      cfg.trickle.forEach(s => allTickers.add(s.t));
    }

    // 20개씩 나눠 병렬 fetch (rate limit 대응)
    const tickerArr = [...allTickers];
    const CHUNK = 20;
    const quoteMap = {};

    for (let i = 0; i < tickerArr.length; i += CHUNK) {
      const batch = tickerArr.slice(i, i + CHUNK);
      const results = await Promise.allSettled(batch.map(fetchQuote));
      for (const r of results) {
        if (r.status === "fulfilled") quoteMap[r.value.ticker] = r.value;
        else console.error(r.reason?.message);
      }
    }

    // 섹터별 재구성
    const sectors = {};
    for (const [name, cfg] of Object.entries(SECTOR_STOCKS)) {
      const etfQ = quoteMap[cfg.etf];

      const mapStock = ({ t, n }) => {
        const q = quoteMap[t];
        if (!q) return { ticker: t, name: n, price: null, changePct: null, vsEtf: null, marketCap: null };
        const vsEtf = (q.changePct != null && etfQ?.changePct != null)
          ? q.changePct - etfQ.changePct : null;
        return { ticker: t, name: n, price: q.price, change: q.change,
                 changePct: q.changePct, vsEtf, marketCap: q.marketCap };
      };

      sectors[name] = {
        etf:     { ticker: cfg.etf, price: etfQ?.price ?? null, changePct: etfQ?.changePct ?? null },
        leaders: cfg.leaders.map(mapStock),
        trickle: cfg.trickle.map(mapStock),
      };
    }

    const fetched = Object.keys(quoteMap).length;
    res.status(200).json({ sectors, fetched, total: tickerArr.length, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/stocks]", err.message);
    res.status(500).json({ error: err.message });
  }
};
