/**
 * api/stocks.js — 섹터별 대표주 + 낙수효과 수혜주 실시간 시세
 * Yahoo Finance v7 batch quote API 사용 (패키지 불필요)
 */

const SECTOR_STOCKS = {
  "반도체": {
    etf: "SOXX",
    leaders: [
      { ticker: "NVDA", name: "NVIDIA" },
      { ticker: "AMD",  name: "AMD" },
      { ticker: "AVGO", name: "Broadcom" },
      { ticker: "QCOM", name: "Qualcomm" },
      { ticker: "INTC", name: "Intel" },
    ],
    trickle: [
      { ticker: "AEHR", name: "Aehr Test" },
      { ticker: "SITM", name: "SiTime" },
      { ticker: "MCHP", name: "Microchip Tech" },
      { ticker: "SWKS", name: "Skyworks" },
      { ticker: "ACLS", name: "Axcelis Tech" },
    ],
  },
  "메모리": {
    etf: "MU",
    leaders: [
      { ticker: "MU",   name: "Micron" },
      { ticker: "WDC",  name: "Western Digital" },
      { ticker: "STX",  name: "Seagate" },
    ],
    trickle: [
      { ticker: "SIMO", name: "Silicon Motion" },
      { ticker: "CRUS", name: "Cirrus Logic" },
      { ticker: "IMOS", name: "ChipMOS" },
      { ticker: "NXPI", name: "NXP Semi" },
      { ticker: "RMBS", name: "Rambus" },
    ],
  },
  "광통신": {
    etf: "LITE",
    leaders: [
      { ticker: "LITE", name: "Lumentum" },
      { ticker: "COHR", name: "Coherent" },
      { ticker: "AAOI", name: "Applied Optoelectronics" },
      { ticker: "VIAV", name: "Viavi Solutions" },
    ],
    trickle: [
      { ticker: "IIVI", name: "II-VI (Coherent)" },
      { ticker: "NPTN", name: "NeoPhotonics" },
      { ticker: "FNSR", name: "Finisar" },
      { ticker: "OCLR", name: "Oclaro" },
      { ticker: "LUMN", name: "Lumen Tech" },
    ],
  },
  "전력/유틸": {
    etf: "XLU",
    leaders: [
      { ticker: "NEE",  name: "NextEra Energy" },
      { ticker: "SO",   name: "Southern Company" },
      { ticker: "DUK",  name: "Duke Energy" },
      { ticker: "AEP",  name: "American Electric" },
    ],
    trickle: [
      { ticker: "NOVA", name: "Sunnova Energy" },
      { ticker: "ARRY", name: "Array Technologies" },
      { ticker: "ENPH", name: "Enphase Energy" },
      { ticker: "RUN",  name: "Sunrun" },
      { ticker: "BE",   name: "Bloom Energy" },
    ],
  },
  "소프트웨어": {
    etf: "IGV",
    leaders: [
      { ticker: "MSFT", name: "Microsoft" },
      { ticker: "CRM",  name: "Salesforce" },
      { ticker: "NOW",  name: "ServiceNow" },
      { ticker: "ORCL", name: "Oracle" },
    ],
    trickle: [
      { ticker: "TWLO", name: "Twilio" },
      { ticker: "BAND", name: "Bandwidth" },
      { ticker: "ZS",   name: "Zscaler" },
      { ticker: "CRWD", name: "CrowdStrike" },
      { ticker: "NET",  name: "Cloudflare" },
    ],
  },
  "방산": {
    etf: "ITA",
    leaders: [
      { ticker: "LMT",  name: "Lockheed Martin" },
      { ticker: "RTX",  name: "RTX Corp" },
      { ticker: "NOC",  name: "Northrop Grumman" },
      { ticker: "GD",   name: "General Dynamics" },
    ],
    trickle: [
      { ticker: "KTOS", name: "Kratos Defense" },
      { ticker: "PLTR", name: "Palantir" },
      { ticker: "AVAV", name: "AeroVironment" },
      { ticker: "HII",  name: "Huntington Ingalls" },
      { ticker: "RCAT", name: "Red Cat Holdings" },
    ],
  },
  "에너지": {
    etf: "XLE",
    leaders: [
      { ticker: "XOM",  name: "ExxonMobil" },
      { ticker: "CVX",  name: "Chevron" },
      { ticker: "COP",  name: "ConocoPhillips" },
      { ticker: "SLB",  name: "SLB" },
    ],
    trickle: [
      { ticker: "OXY",  name: "Occidental" },
      { ticker: "MPC",  name: "Marathon Petroleum" },
      { ticker: "DVN",  name: "Devon Energy" },
      { ticker: "FANG", name: "Diamondback Energy" },
      { ticker: "HAL",  name: "Halliburton" },
    ],
  },
  "헬스케어": {
    etf: "XLV",
    leaders: [
      { ticker: "LLY",  name: "Eli Lilly" },
      { ticker: "UNH",  name: "UnitedHealth" },
      { ticker: "ABBV", name: "AbbVie" },
      { ticker: "MRK",  name: "Merck" },
    ],
    trickle: [
      { ticker: "ISRG", name: "Intuitive Surgical" },
      { ticker: "DXCM", name: "DexCom" },
      { ticker: "VEEV", name: "Veeva Systems" },
      { ticker: "HIMS", name: "Hims & Hers" },
      { ticker: "ETON", name: "Eton Pharmaceuticals" },
    ],
  },
  "금융": {
    etf: "XLF",
    leaders: [
      { ticker: "JPM",  name: "JPMorgan" },
      { ticker: "BAC",  name: "Bank of America" },
      { ticker: "GS",   name: "Goldman Sachs" },
      { ticker: "MS",   name: "Morgan Stanley" },
    ],
    trickle: [
      { ticker: "COIN", name: "Coinbase" },
      { ticker: "HOOD", name: "Robinhood" },
      { ticker: "SOFI", name: "SoFi Technologies" },
      { ticker: "NU",   name: "Nu Holdings" },
      { ticker: "AFRM", name: "Affirm" },
    ],
  },
  "산업재": {
    etf: "XLI",
    leaders: [
      { ticker: "CAT",  name: "Caterpillar" },
      { ticker: "DE",   name: "John Deere" },
      { ticker: "HON",  name: "Honeywell" },
      { ticker: "GE",   name: "GE Aerospace" },
    ],
    trickle: [
      { ticker: "STRL", name: "Sterling Infrastructure" },
      { ticker: "PWR",  name: "Quanta Services" },
      { ticker: "FIX",  name: "Comfort Systems" },
      { ticker: "GTES", name: "Gates Industrial" },
      { ticker: "TT",   name: "Trane Technologies" },
    ],
  },
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

async function batchQuote(tickers) {
  const symbols = tickers.join(",");
  const fields  = "shortName,regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketVolume,marketCap";
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}`;

  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`batch quote HTTP ${res.status}`);
  const json = await res.json();

  const map = {};
  for (const q of json?.quoteResponse?.result || []) {
    map[q.symbol] = {
      ticker:    q.symbol,
      name:      q.shortName ?? q.symbol,
      price:     q.regularMarketPrice     ?? null,
      change:    q.regularMarketChange    ?? null,
      changePct: q.regularMarketChangePercent ?? null,
      volume:    q.regularMarketVolume    ?? null,
      marketCap: q.marketCap             ?? null,
    };
  }
  return map;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");

  try {
    // 모든 티커 수집
    const allTickers = new Set();
    for (const cfg of Object.values(SECTOR_STOCKS)) {
      allTickers.add(cfg.etf);
      cfg.leaders.forEach(s => allTickers.add(s.ticker));
      cfg.trickle.forEach(s => allTickers.add(s.ticker));
    }

    // 50개씩 나눠서 batch fetch (Yahoo Finance URL 길이 제한)
    const tickerArr   = [...allTickers];
    const chunkSize   = 50;
    const chunks      = [];
    for (let i = 0; i < tickerArr.length; i += chunkSize) {
      chunks.push(tickerArr.slice(i, i + chunkSize));
    }

    const chunkResults = await Promise.allSettled(chunks.map(batchQuote));
    const quoteMap = {};
    for (const r of chunkResults) {
      if (r.status === "fulfilled") Object.assign(quoteMap, r.value);
    }

    // 섹터별로 재구성
    const sectors = {};
    for (const [sectorName, cfg] of Object.entries(SECTOR_STOCKS)) {
      const etfQ = quoteMap[cfg.etf] || null;

      const mapStock = (s) => {
        const q = quoteMap[s.ticker];
        if (!q) return { ...s, price: null, changePct: null, vsEtf: null };
        const vsEtf = (q.changePct != null && etfQ?.changePct != null)
          ? q.changePct - etfQ.changePct
          : null;
        return { ...s, price: q.price, changePct: q.changePct, change: q.change,
                 volume: q.volume, marketCap: q.marketCap, vsEtf };
      };

      sectors[sectorName] = {
        etf:     { ticker: cfg.etf, price: etfQ?.price, changePct: etfQ?.changePct },
        leaders: cfg.leaders.map(mapStock),
        trickle: cfg.trickle.map(mapStock),
      };
    }

    res.status(200).json({ sectors, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/stocks]", err.message);
    res.status(500).json({ error: err.message });
  }
};
