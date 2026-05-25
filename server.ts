import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { StockIndex, IndexHistoryPoint, MarketIndexResponse } from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

const indexMetadata: { [key: string]: { timezone: string; openTime: string; closeTime: string; timezoneLabel: string } } = {
  kospi: { timezone: 'Asia/Seoul', openTime: '09:00', closeTime: '15:30', timezoneLabel: 'KST' },
  kosdaq: { timezone: 'Asia/Seoul', openTime: '09:00', closeTime: '15:30', timezoneLabel: 'KST' },
  sp500: { timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'EDT' },
  nasdaq: { timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'EDT' },
  dow: { timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'EDT' },
  nikkei225: { timezone: 'Asia/Tokyo', openTime: '09:00', closeTime: '15:00', timezoneLabel: 'JST' },
  hangseng: { timezone: 'Asia/Hong_Kong', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'HKT' },
  shanghai: { timezone: 'Asia/Shanghai', openTime: '09:30', closeTime: '15:00', timezoneLabel: 'CST' },
  csi300: { timezone: 'Asia/Shanghai', openTime: '09:30', closeTime: '15:00', timezoneLabel: 'CST' },
  taiwan: { timezone: 'Asia/Taipei', openTime: '09:00', closeTime: '13:30', timezoneLabel: 'CST' },
  ftse100: { timezone: 'Europe/London', openTime: '08:00', closeTime: '16:30', timezoneLabel: 'BST' },
  dax: { timezone: 'Europe/Berlin', openTime: '09:00', closeTime: '17:30', timezoneLabel: 'CEST' },
  cac40: { timezone: 'Europe/Paris', openTime: '09:00', closeTime: '17:30', timezoneLabel: 'CEST' },
  nifty50: { timezone: 'Asia/Kolkata', openTime: '09:15', closeTime: '15:30', timezoneLabel: 'IST' }
};

// Formatting helpers
function formatInTimezone(epochSeconds: number, timezone: string, timezoneLabel: string): string {
  const date = new Date(epochSeconds * 1000);
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  let formatted = formatter.format(date); // e.g., "2026. 05. 25. 15:30:12"
  formatted = formatted.replace(/\. /g, '-').replace(/\./g, '');
  return `${formatted} ${timezoneLabel}`;
}

function formatIntradayInTimezone(epochSeconds: number, timezone: string): string {
  const date = new Date(epochSeconds * 1000);
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  return formatter.format(date).trim(); // "HH:MM"
}

// Baseline values for major indices
const baselines: Omit<StockIndex, 'history'>[] = [
  { id: 'kospi', name: 'KOSPI', nameKo: '코스피', price: 2650.50, change: 12.30, percentChange: 0.47, status: 'CLOSED', asOf: '2026-05-25 15:30 KST', region: 'KR', timezone: 'Asia/Seoul', openTime: '09:00', closeTime: '15:30', timezoneLabel: 'KST' },
  { id: 'kosdaq', name: 'KOSDAQ', nameKo: '코스닥', price: 855.20, change: -3.45, percentChange: -0.40, status: 'CLOSED', asOf: '2026-05-25 15:30 KST', region: 'KR', timezone: 'Asia/Seoul', openTime: '09:00', closeTime: '15:30', timezoneLabel: 'KST' },
  { id: 'sp500', name: 'S&P 500', nameKo: 'S&P 500', price: 5250.40, change: 24.15, percentChange: 0.46, status: 'CLOSED', asOf: '2026-05-22 16:00 EDT', region: 'US', timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'EDT' },
  { id: 'nasdaq', name: 'NASDAQ Composite', nameKo: '나스닥 종합', price: 16450.80, change: 145.20, percentChange: 0.89, status: 'CLOSED', asOf: '2026-05-22 16:00 EDT', region: 'US', timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'EDT' },
  { id: 'dow', name: 'Dow Jones', nameKo: '다우 존스', price: 39100.10, change: -85.40, percentChange: -0.22, status: 'CLOSED', asOf: '2026-05-22 16:00 EDT', region: 'US', timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'EDT' },
  { id: 'nikkei225', name: 'Nikkei 225', nameKo: '닛케이 225', price: 38900.50, change: 310.20, percentChange: 0.80, status: 'CLOSED', asOf: '2026-05-25 15:00 JST', region: 'ASIA', timezone: 'Asia/Tokyo', openTime: '09:00', closeTime: '15:00', timezoneLabel: 'JST' },
  { id: 'hangseng', name: 'Hang Seng Index', nameKo: '항셍 지수', price: 18500.10, change: -120.50, percentChange: -0.65, status: 'CLOSED', asOf: '2026-05-25 16:00 HKT', region: 'ASIA', timezone: 'Asia/Hong_Kong', openTime: '09:30', closeTime: '16:00', timezoneLabel: 'HKT' },
  { id: 'shanghai', name: 'Shanghai Composite', nameKo: '상해 종합', price: 3120.30, change: 5.40, percentChange: 0.17, status: 'CLOSED', asOf: '2026-05-25 15:00 CST', region: 'ASIA', timezone: 'Asia/Shanghai', openTime: '09:30', closeTime: '15:00', timezoneLabel: 'CST' },
  { id: 'csi300', name: 'CSI 300', nameKo: 'CSI 300 (중국)', price: 3624.50, change: 18.25, percentChange: 0.51, status: 'CLOSED', asOf: '2026-05-25 15:00 CST', region: 'ASIA', timezone: 'Asia/Shanghai', openTime: '09:30', closeTime: '15:00', timezoneLabel: 'CST' },
  { id: 'taiwan', name: 'Taiwan Weighted', nameKo: '대만 가권', price: 21500.50, change: 180.20, percentChange: 0.84, status: 'CLOSED', asOf: '2026-05-25 13:30 CST', region: 'ASIA', timezone: 'Asia/Taipei', openTime: '09:00', closeTime: '13:30', timezoneLabel: 'CST' },
  { id: 'ftse100', name: 'FTSE 100', nameKo: 'FTSE 100 (영국)', price: 8350.20, change: 42.10, percentChange: 0.51, status: 'CLOSED', asOf: '2026-05-22 16:30 BST', region: 'EU', timezone: 'Europe/London', openTime: '08:00', closeTime: '16:30', timezoneLabel: 'BST' },
  { id: 'dax', name: 'DAX', nameKo: 'DAX (독일)', price: 18700.40, change: 110.30, percentChange: 0.59, status: 'CLOSED', asOf: '2026-05-22 17:30 CEST', region: 'EU', timezone: 'Europe/Berlin', openTime: '09:00', closeTime: '17:30', timezoneLabel: 'CEST' },
  { id: 'cac40', name: 'CAC 40', nameKo: 'CAC 40 (프랑스)', price: 8100.60, change: 38.40, percentChange: 0.48, status: 'CLOSED', asOf: '2026-05-22 17:30 CEST', region: 'EU', timezone: 'Europe/Paris', openTime: '09:00', closeTime: '17:30', timezoneLabel: 'CEST' },
  { id: 'nifty50', name: 'Nifty 50', nameKo: '니프티 50 (인도)', price: 22500.80, change: -95.20, percentChange: -0.42, status: 'CLOSED', asOf: '2026-05-25 15:30 IST', region: 'ASIA', timezone: 'Asia/Kolkata', openTime: '09:15', closeTime: '15:30', timezoneLabel: 'IST' }
];

// Helper to generate a realistic initial history walk
function generateInitialHistory(basePrice: number, timezone: string): IndexHistoryPoint[] {
  const history: IndexHistoryPoint[] = [];
  const now = new Date();
  let currentVal = basePrice * (1 - (Math.random() * 0.02 - 0.01));
  for (let i = 29; i >= 0; i--) {
    const ptEpoch = Math.floor((now.getTime() - i * 15 * 60 * 1000) / 1000);
    const changePct = (Math.random() * 0.3 - 0.15) / 100;
    currentVal = currentVal * (1 + changePct);
    history.push({
      time: formatIntradayInTimezone(ptEpoch, timezone),
      price: parseFloat(currentVal.toFixed(2))
    });
  }
  return history;
}

// Market Status check based on current UTC time
function isHoliday(id: string, date: Date): boolean {
  try {
    const kstDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date); // outputs "YYYY-MM-DD"

    if ((id === 'kospi' || id === 'kosdaq') && kstDateStr === '2026-05-25') {
      return true; // May 25, 2026 is Buddha's Birthday Alternative Holiday in KR (Closed)
    }
  } catch (e) {
    console.error("Error formatting date for holiday check:", e);
  }
  return false;
}

function getMarketStatus(id: string, now: Date): 'OPEN' | 'CLOSED' | 'UNKNOWN' {
  if (isHoliday(id, now)) {
    return 'CLOSED';
  }
  const day = now.getUTCDay();
  if (day === 0 || day === 6) {
    return 'CLOSED'; // Weekends closed
  }
  const utchour = now.getUTCHours();
  const utcminute = now.getUTCMinutes();
  const utcMinutes = utchour * 60 + utcminute;

  switch (id) {
    case 'kospi':
    case 'kosdaq':
      // KST (UTC+9) 09:00 - 15:30 -> UTC 00:00 - 06:30 -> 0 to 390 min
      return (utcMinutes >= 0 && utcMinutes <= 390) ? 'OPEN' : 'CLOSED';
    case 'nikkei225':
      // JST (UTC+9) 09:00 - 15:00 -> UTC 00:00 - 06:00 -> 0 to 360 min
      return (utcMinutes >= 0 && utcMinutes <= 360) ? 'OPEN' : 'CLOSED';
    case 'sp500':
    case 'nasdaq':
    case 'dow':
      // EDT (UTC-4) 09:30 - 16:00 -> UTC 13:30 - 20:00 -> 810 to 1200 min
      return (utcMinutes >= 810 && utcMinutes <= 1200) ? 'OPEN' : 'CLOSED';
    case 'hangseng':
    case 'shanghai':
      // HKT/CST (UTC+8) 09:30 - 16:00 -> UTC 01:30 - 08:00 -> 90 to 480 min
      return (utcMinutes >= 90 && utcMinutes <= 480) ? 'OPEN' : 'CLOSED';
    case 'ftse100':
    case 'dax':
    case 'cac40':
      // EU DST (UTC+2 / +1) 08:00 - 16:30 local -> UTC 07:00 - 15:30 -> 420 to 930 min
      return (utcMinutes >= 420 && utcMinutes <= 930) ? 'OPEN' : 'CLOSED';
    case 'nifty50':
      // IST (UTC+5.5) 09:15 - 15:30 -> UTC 03:45 - 10:00 -> 225 to 600 min
      return (utcMinutes >= 225 && utcMinutes <= 600) ? 'OPEN' : 'CLOSED';
    default:
      return 'CLOSED';
  }
}

// In-memory persistent state of indices
let indicesState: StockIndex[] = baselines.map(item => ({
  ...item,
  history: generateInitialHistory(item.price, item.timezone)
}));

// Timing tracking
let lastFetchTime = 0;
const CACHE_STALE_MS = 60 * 1000; // 60 seconds core stale limit

// Performs dynamic random walk simulation update for all indices
function simulateWalkingState() {
  const now = new Date();
  indicesState = indicesState.map(index => {
    const meta = indexMetadata[index.id];
    const isOpen = getMarketStatus(index.id, now) === 'OPEN';
    let newPrice = index.price;
    if (isOpen) {
      // open: -0.05% to +0.05% change
      const pct = (Math.random() * 0.10 - 0.05) / 100;
      newPrice = parseFloat((index.price * (1 + pct)).toFixed(2));
    } else {
      // closed: very small occasional random noise to keep UI lifelike (e.g., -0.005% to 0.005%)
      const pct = (Math.random() * 0.01 - 0.005) / 100;
      newPrice = parseFloat((index.price * (1 + pct)).toFixed(2));
    }

    // Baseline previous close can be derived from baseline or previous states
    const prevClose = index.price - index.change;
    const newChange = parseFloat((newPrice - prevClose).toFixed(2));
    const newPctChange = parseFloat(((newChange / prevClose) * 100).toFixed(2));

    const nowEpoch = Math.floor(now.getTime() / 1000);
    const timeStr = formatIntradayInTimezone(nowEpoch, meta.timezone);
    const newHistory = [...index.history];
    
    // Replace last node if in the exact same minute slot, otherwise insert
    if (newHistory.length > 0 && newHistory[newHistory.length - 1].time === timeStr) {
      newHistory[newHistory.length - 1] = { time: timeStr, price: newPrice };
    } else {
      newHistory.push({ time: timeStr, price: newPrice });
      if (newHistory.length > 30) {
        newHistory.shift();
      }
    }

    const marketOpenState = getMarketStatus(index.id, now);
    const asOfStr = formatInTimezone(nowEpoch, meta.timezone, meta.timezoneLabel);

    return {
      ...index,
      price: newPrice,
      change: newChange,
      percentChange: newPctChange,
      status: marketOpenState,
      asOf: asOfStr,
      history: newHistory
    };
  });
}

const symbolToIdMap: { [key: string]: string } = {
  '^KS11': 'kospi',
  '^KQ11': 'kosdaq',
  '^GSPC': 'sp500',
  '^IXIC': 'nasdaq',
  '^DJI': 'dow',
  '^N225': 'nikkei225',
  '^HSI': 'hangseng',
  '000001.SS': 'shanghai',
  '000300.SS': 'csi300',
  '^TWII': 'taiwan',
  '^FTSE': 'ftse100',
  '^GDAXI': 'dax',
  '^FCHI': 'cac40',
  '^NSEI': 'nifty50',
};

interface YahooParsedResult {
  id: string;
  price: number;
  change: number;
  percentChange: number;
  status: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  asOf: string;
  history: { time: string; price: number }[];
  timezone: string;
  openTime: string;
  closeTime: string;
  timezoneLabel: string;
}

async function fetchFromYahooFinance(): Promise<YahooParsedResult[]> {
  const symbols = Object.keys(symbolToIdMap);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };

  const results = await Promise.all(
    symbols.map(async (sym) => {
      const id = symbolToIdMap[sym];
      const idxMeta = indexMetadata[id];
      try {
        // Querying chart endpoint for unauthenticated, reliable real-time and 1d intraday data
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=5m&range=1d`;
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const data = await response.json();
        const resultItem = data?.chart?.result?.[0];
        const meta = resultItem?.meta;

        if (!meta || typeof meta.regularMarketPrice !== 'number') {
          throw new Error("Missing or invalid meta price information");
        }

        const price = meta.regularMarketPrice;
        const prevClose = typeof meta.previousClose === 'number' 
          ? meta.previousClose 
          : (typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : price);

        const change = parseFloat((price - prevClose).toFixed(2));
        const percentChange = prevClose !== 0 ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;

        // Determine Trading status dynamically
        const nowEpoch = Math.floor(Date.now() / 1000);
        const start = meta.currentTradingPeriod?.regular?.start;
        const end = meta.currentTradingPeriod?.regular?.end;
        
        let status: 'OPEN' | 'CLOSED' | 'UNKNOWN' = 'CLOSED';
        if (isHoliday(id, new Date())) {
          status = 'CLOSED';
        } else if (start && end && nowEpoch >= start && nowEpoch <= end) {
          status = 'OPEN';
        } else {
          status = getMarketStatus(id, new Date());
        }

        const asOf = meta.regularMarketTime
          ? formatInTimezone(meta.regularMarketTime, idxMeta.timezone, idxMeta.timezoneLabel)
          : formatInTimezone(nowEpoch, idxMeta.timezone, idxMeta.timezoneLabel);

        // Build elegant intraday history from chart
        const timestamps = resultItem?.timestamp || [];
        const closes = resultItem?.indicators?.quote?.[0]?.close || [];
        const historyPoints: { time: string; price: number }[] = [];

        // Distribute nicely up to maximum of 30 graph points
        const maxPoints = 30;
        const step = Math.max(1, Math.floor(timestamps.length / maxPoints));

        for (let i = 0; i < timestamps.length; i += step) {
          const pt = closes[i];
          if (pt !== null && pt !== undefined) {
            const timeStr = formatIntradayInTimezone(timestamps[i], idxMeta.timezone);
            historyPoints.push({
              time: timeStr,
              price: parseFloat(pt.toFixed(2))
            });
          }
        }

        // Fallback for empty history
        if (historyPoints.length === 0) {
          const timeStr = formatIntradayInTimezone(nowEpoch, idxMeta.timezone);
          historyPoints.push({ time: timeStr, price });
        }

        return {
          id,
          price,
          change,
          percentChange,
          status,
          asOf,
          history: historyPoints,
          timezone: idxMeta.timezone,
          openTime: idxMeta.openTime,
          closeTime: idxMeta.closeTime,
          timezoneLabel: idxMeta.timezoneLabel
        };
      } catch (err: any) {
        console.error(`[Yahoo chart error] for symbol ${sym} (${id}):`, err.message);
        throw err;
      }
    })
  );

  return results;
}

// API endpoint to fetch stock indices values
app.get("/api/indices", async (req, res) => {
  const now = Date.now();
  const forceRefresh = req.query.force === "true";
  const shouldRefresh = forceRefresh || (now - lastFetchTime > CACHE_STALE_MS);

  if (!shouldRefresh) {
    // Return cached in-memory states (with slight live oscillations)
    simulateWalkingState();
    return res.json({
      indices: indicesState,
      isSimulated: false,
      lastUpdated: new Date(lastFetchTime > 0 ? lastFetchTime : now).toLocaleTimeString('ko-KR')
    });
  }

  // Update timestamps
  lastFetchTime = now;

  try {
    console.log("Fetching live indexes from unauthenticated Yahoo Finance chart API (Parallel Mode)...");
    const parsedList = await fetchFromYahooFinance();
    if (Array.isArray(parsedList) && parsedList.length > 0) {
      const updateTime = new Date();

      indicesState = indicesState.map(prevIndex => {
        const parsed = parsedList.find(item => item.id === prevIndex.id);
        if (parsed) {
          return {
            ...prevIndex,
            price: parsed.price,
            change: parsed.change,
            percentChange: parsed.percentChange,
            status: parsed.status,
            asOf: parsed.asOf,
            history: parsed.history
          };
        }
        return prevIndex;
      });

      return res.json({
        indices: indicesState,
        isSimulated: false,
        lastUpdated: updateTime.toLocaleTimeString('ko-KR')
      });
    }
  } catch (err: any) {
    console.error("Failed to fetch or parse parallel Yahoo Finance quotes:", err);
  }

  // Backup fallback simulation
  simulateWalkingState();
  return res.json({
    indices: indicesState,
    isSimulated: true,
    lastUpdated: new Date().toLocaleTimeString('ko-KR'),
    error: "실시간 야후 파이낸스 데이터 갱신에 오류가 발생하여 예측 시뮬레이션 가격으로 활성화됩니다."
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
