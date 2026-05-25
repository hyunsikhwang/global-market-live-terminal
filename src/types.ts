export interface IndexHistoryPoint {
  time: string;
  price: number;
}

export type IndexRegion = 'KR' | 'US' | 'ASIA' | 'EU' | 'ALL';

export interface StockIndex {
  id: string;
  name: string;
  nameKo: string;
  price: number;
  change: number;
  percentChange: number;
  status: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  asOf: string;
  region: 'KR' | 'US' | 'ASIA' | 'EU';
  history: IndexHistoryPoint[];
  timezone: string;
  openTime: string;
  closeTime: string;
  timezoneLabel: string;
}

export interface MarketIndexResponse {
  indices: StockIndex[];
  isSimulated: boolean;
  lastUpdated: string;
  error?: string;
}
