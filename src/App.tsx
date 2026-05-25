import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  RotateCw, 
  Search, 
  Globe, 
  Clock, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap
} from 'lucide-react';
import { StockIndex, MarketIndexResponse, IndexRegion, IndexHistoryPoint } from './types';

// Helper to get local date components in a timezone
const getPartsInTimezone = (timezone: string, date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const formatted = formatter.format(date);
    const match = formatted.match(/(\d{4})-(\d{2})-(\d{2}),?\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1]),
        month: parseInt(match[2]),
        day: parseInt(match[3]),
        hour: parseInt(match[4]),
        minute: parseInt(match[5]),
        second: parseInt(match[6])
      };
    }
  } catch (e) {
    console.error(`Error formatting parts for ${timezone}:`, e);
  }
  return null;
};

// Helper to check if a day is weekend in the target timezone
const isWeekendInTimezone = (timezone: string, date: Date): boolean => {
  const parts = getPartsInTimezone(timezone, date);
  if (!parts) return false;
  const localDate = new Date(parts.year, parts.month - 1, parts.day);
  const day = localDate.getDay();
  return day === 0 || day === 6;
};

// Helper to construct absolute local Date in target timezone with a daily offset
const getAbsoluteDateInTimezone = (timezone: string, hhmm: string, baseTime: Date, daysOffset: number = 0): Date => {
  const parts = getPartsInTimezone(timezone, baseTime);
  if (!parts) return baseTime;

  const [h, m] = hhmm.split(':').map(Number);
  const localUtc = Date.UTC(parts.year, parts.month - 1, parts.day + daysOffset, h, m, 0);
  
  const testDate = new Date(localUtc);
  const testParts = getPartsInTimezone(timezone, testDate);
  if (testParts) {
    const testLocalUtc = Date.UTC(testParts.year, testParts.month - 1, testParts.day, testParts.hour, testParts.minute, 0);
    const offsetMs = testLocalUtc - localUtc;
    return new Date(localUtc - offsetMs);
  }
  return baseTime;
};

// Helper to find the soonest upcoming open time
const getNextOpenTime = (timezone: string, openTime: string, baseTime: Date): Date => {
  for (let d = 0; d <= 7; d++) {
    const candidate = getAbsoluteDateInTimezone(timezone, openTime, baseTime, d);
    if (candidate.getTime() > baseTime.getTime()) {
      if (!isWeekendInTimezone(timezone, candidate)) {
        const parts = getPartsInTimezone(timezone, candidate);
        if (parts) {
          const dateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
          if (timezone === 'Asia/Seoul' && dateStr === '2026-05-25') continue;
          if (timezone === 'America/New_York' && dateStr === '2026-05-25') continue;
          if (timezone === 'Europe/London' && dateStr === '2026-05-25') continue;
        }
        return candidate;
      }
    }
  }
  return getAbsoluteDateInTimezone(timezone, openTime, baseTime, 1);
};

export default function App() {
  const [data, setData] = useState<MarketIndexResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<IndexRegion>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('kospi');
  const [colorScheme, setColorScheme] = useState<'KR' | 'GLOBAL'>('KR'); // KR: UP=Red, DOWN=Blue | GLOBAL: UP=Green, DOWN=Red
  
  // Timer for 60s auto refresh countdown
  const [countdown, setCountdown] = useState<number>(60);
  const [systemTime, setSystemTime] = useState<Date>(new Date());

  // Technical Tooltip state for interactive big chart
  const [hoveredPoint, setHoveredPoint] = useState<IndexHistoryPoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartContainerRef = useRef<SVGSVGElement | null>(null);

  // Fetch index data
  const fetchIndices = async (force: boolean = false) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/indices?force=${force}`);
      const result: MarketIndexResponse = await res.json();
      setData(result);
      
      // Auto-select first in loaded list if current selection is not available
      if (result.indices && result.indices.length > 0) {
        const idExists = result.indices.some(item => item.id === selectedId);
        if (!idExists) {
          setSelectedId(result.indices[0].id);
        }
      }
      setLoading(false);
      setRefreshing(false);
      setCountdown(60); // Reset countdown
    } catch (error) {
      console.error('Error fetching indices:', error);
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchIndices(false);
  }, []);

  // System clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer trigger
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchIndices(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, [selectedId]);

  // Handle active selected index details
  const activeIndex = useMemo(() => {
    if (!data || !data.indices) return null;
    return data.indices.find(idx => idx.id === selectedId) || data.indices[0];
  }, [data, selectedId]);

  // Region filtering & Search & Sorting
  const filteredIndices = useMemo(() => {
    if (!data || !data.indices) return [];
    
    const matched = data.indices.filter(idx => {
      const matchRegion = selectedRegion === 'ALL' || idx.region === selectedRegion;
      const matchSearch = 
        idx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idx.nameKo.includes(searchQuery) ||
        idx.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchSearch;
    });

    // Sort criteria:
    // 1. OPEN first, CLOSED later
    // 2. In OPEN group: Sort from transition to OPEN earliest (first opened first)
    // 3. In CLOSED group: Sort from transition to OPEN soonest (next opening first)
    return [...matched].sort((a, b) => {
      const aOpen = a.status === 'OPEN';
      const bOpen = b.status === 'OPEN';
      if (aOpen !== bOpen) {
        return aOpen ? -1 : 1; // OPEN comes first
      }
      
      if (aOpen) {
        // Both are OPEN: Sort by earlier open time (first opened first)
        const openA = getAbsoluteDateInTimezone(a.timezone, a.openTime, systemTime, 0).getTime();
        const openB = getAbsoluteDateInTimezone(b.timezone, b.openTime, systemTime, 0).getTime();
        return openA - openB;
      } else {
        // Both are CLOSED: Sort by soonest upcoming open time
        const nextA = getNextOpenTime(a.timezone, a.openTime, systemTime).getTime();
        const nextB = getNextOpenTime(b.timezone, b.openTime, systemTime).getTime();
        return nextA - nextB;
      }
    });
  }, [data, selectedRegion, searchQuery, systemTime]);

  // Color-coded helper class generators
  const getTrendClasses = (change: number) => {
    const isUp = change >= 0;
    if (colorScheme === 'KR') {
      return {
        text: isUp ? 'text-red-600' : 'text-blue-600',
        bg: isUp ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700',
        border: isUp ? 'border-red-200' : 'border-blue-200',
        fill: isUp ? 'fill-red-500' : 'fill-blue-500',
        stroke: isUp ? '#dc2626' : '#2563eb',
        gradient: isUp ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0)'] : ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0)']
      };
    } else {
      return {
        text: isUp ? 'text-emerald-600' : 'text-rose-600',
        bg: isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
        border: isUp ? 'border-emerald-200' : 'border-rose-200',
        fill: isUp ? 'fill-emerald-500' : 'fill-rose-500',
        stroke: isUp ? '#10b981' : '#f43f5e',
        gradient: isUp ? ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0)'] : ['rgba(244, 63, 94, 0.2)', 'rgba(244, 63, 94, 0)']
      };
    }
  };

  // helper to get time fraction mapping on X Axis
  const getTimeFraction = (timeStr: string, openTime: string, closeTime: string): number => {
    if (!timeStr || !openTime || !closeTime) return 0.5;
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (!match) return 0.5;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const startMin = openH * 60 + openM;
    const endMin = closeH * 60 + closeM;
    const currentMin = h * 60 + m;
    
    if (endMin <= startMin) return 0.5;
    
    const fraction = (currentMin - startMin) / (endMin - startMin);
    return Math.max(0, Math.min(1, fraction));
  };

  // Live real-time clock generator per timezone
  const getLocalCurrentTime = (timezone: string) => {
    try {
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      return formatter.format(systemTime);
    } catch (e) {
      return '';
    }
  };

  const getLocalCurrentHM = (timezone: string): string => {
    try {
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return formatter.format(systemTime);
    } catch (e) {
      return '12:00';
    }
  };

  // Generate safe coordinates for custom beautiful Sparkline SVG (mini inline line charts)
  const generateSparklinePoints = (history: IndexHistoryPoint[], width: number, height: number, openTime: string, closeTime: string, status: string, timezone: string) => {
    if (!history || history.length < 2) return '';
    
    // If the market is OPEN, only draw data points up to the current local time
    let drawingPoints = history;
    if (status === 'OPEN') {
      const currentHM = getLocalCurrentHM(timezone);
      drawingPoints = history.filter(p => p.time <= currentHM);
    }
    
    if (drawingPoints.length === 0) {
      return '';
    }
    if (drawingPoints.length === 1) {
      drawingPoints = [drawingPoints[0], drawingPoints[0]];
    }

    const prices = drawingPoints.map(h => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;
    
    return drawingPoints.map((p) => {
      const fraction = getTimeFraction(p.time, openTime, closeTime);
      const x = fraction * width;
      const y = height - ((p.price - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  };

  // Coordinates for the big selected chart
  const bigChartDetails = useMemo(() => {
    if (!activeIndex || !activeIndex.history || activeIndex.history.length === 0) return null;
    
    let chartPoints = activeIndex.history;
    if (activeIndex.status === 'OPEN') {
      const currentHM = getLocalCurrentHM(activeIndex.timezone);
      chartPoints = activeIndex.history.filter(p => p.time <= currentHM);
    }
    
    if (chartPoints.length === 0) {
      chartPoints = activeIndex.history.slice(0, 1);
    }

    const prices = chartPoints.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spread = maxPrice - minPrice;
    
    // Add 8% padding around min and max prices
    const padding = spread === 0 ? 10 : spread * 0.08;
    const yMin = Math.max(0, minPrice - padding);
    const yMax = maxPrice + padding;
    
    return {
      minPrice,
      maxPrice,
      yMin,
      yMax,
      spread: yMax - yMin,
      points: chartPoints
    };
  }, [activeIndex, systemTime]);

  // Handle interactive hover over the big chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!bigChartDetails || !activeIndex || !chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const xCoord = e.clientX - rect.left;
    const xFraction = Math.max(0, Math.min(1, xCoord / rect.width));
    
    // Find the closest point in history based on session hours fraction
    let closestIndex = 0;
    let minDiff = Infinity;
    
    bigChartDetails.points.forEach((p, idx) => {
      const ptFraction = getTimeFraction(p.time, activeIndex.openTime, activeIndex.closeTime);
      const diff = Math.abs(ptFraction - xFraction);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    
    if (closestIndex !== hoveredIndex) {
      setHoveredIndex(closestIndex);
      setHoveredPoint(bigChartDetails.points[closestIndex]);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoveredIndex(null);
  };

  // Convert status to Korean label
  const getStatusLabel = (status: 'OPEN' | 'CLOSED' | 'UNKNOWN') => {
    if (status === 'OPEN') return { text: '정규장', style: 'bg-emerald-550 text-white font-bold bg-emerald-500 border-emerald-300 shadow-sm shadow-emerald-500/20' };
    if (status === 'CLOSED') return { text: '장마감', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    return { text: '세션대기', style: 'bg-amber-100 text-amber-800 border-amber-200' };
  };

  // Get index country flag emoji based on exact index ID
  const getIndexFlag = (id: string): string => {
    switch (id) {
      case 'kospi':
      case 'kosdaq':
      case 'kospi200':
        return '🇰🇷';
      case 'sp500':
      case 'nasdaq':
      case 'dow':
        return '🇺🇸';
      case 'nikkei225':
        return '🇯🇵';
      case 'hangseng':
        return '🇭🇰';
      case 'shanghai':
      case 'csi300':
        return '🇨🇳';
      case 'taiwan':
        return '🇹🇼';
      case 'ftse100':
        return '🇬🇧';
      case 'dax':
        return '🇩🇪';
      case 'cac40':
        return '🇫🇷';
      case 'nifty50':
        return '🇮🇳';
      default:
        return '🌐';
    }
  };

  // Get index region label and generic flag
  const getRegionLabel = (region: string) => {
    switch (region) {
      case 'KR': return { flag: '🇰🇷', label: '대한민국' };
      case 'US': return { flag: '🇺🇸', label: '미국' };
      case 'ASIA': return { flag: '🌏', label: '아시아' };
      case 'EU': return { flag: '🇪🇺', label: '유럽' };
      default: return { flag: '🌐', label: '글로벌' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-16">
      
      {/* Dynamic Status / Informational Alert Bar if Simulated Mode */}
      {data?.isSimulated && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-amber-600/60 text-xs text-amber-50 rounded-full px-2 py-0.5 font-semibold shrink-0 animate-pulse">시뮬레이션 가동 중</span>
              <p className="font-medium">
                실시간 야후 파이낸스 데이터 갱신에 오류가 발생하여 실시간 가격 예측 시뮬레이션 지표를 적용하고 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Elegant Navigation / Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-600/20 shadow-lg">
              <Globe className="w-5 h-5 animate-spin-slow text-indigo-100" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold font-display tracking-wider text-slate-900 flex items-center gap-1.5 uppercase">
                GLOBAL MARKETS TERMINAL
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100 uppercase font-mono tracking-wider">Live</span>
              </h1>
            </div>
          </div>

          {/* Time and Settings Options */}
          <div className="flex items-center gap-4">
            
            {/* Color Scheme Picker */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setColorScheme('KR')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  colorScheme === 'KR' 
                    ? 'bg-white shadow text-slate-900 font-semibold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🇰🇷 한국식 (상승 빨강 / 하락 파랑)
              </button>
              <button
                onClick={() => setColorScheme('GLOBAL')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  colorScheme === 'GLOBAL' 
                    ? 'bg-white shadow text-slate-900 font-semibold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🌐 글로벌 (상승 초록 / 하락 빨강)
              </button>
            </div>

            {/* Live Clock with UTC comparison */}
            <div className="flex flex-col items-end text-xs text-slate-500 font-mono hidden md:flex">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>KST: {systemTime.toLocaleTimeString('ko-KR', { hour12: false })}</span>
              </div>
              <span>UTC: {new Date(systemTime.getTime() - 9 * 60 * 60 * 1000).toLocaleTimeString('ko-KR', { hour12: false })}</span>
            </div>

            {/* Refresh Circle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchIndices(true)}
                disabled={refreshing}
                className="relative flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 font-medium text-sm hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="font-semibold">{countdown}초 후 자동 갱신</span>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Hero Visual Section */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white pt-6 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Abstract subtle ambient gradient */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight font-display text-white">
              글로벌 주요 지수 현황
            </h2>
          </div>
          {/* Simple compact status badge */}
          <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 font-mono text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>데이터 동기화: {data?.lastUpdated || '연결 대기'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        
        {/* Filter Toolbar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-md mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Tabs Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
            {(['ALL', 'KR', 'US', 'ASIA', 'EU'] as IndexRegion[]).map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedRegion === region 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                }`}
              >
                {region === 'ALL' && '🌎 전체'}
                {region === 'KR' && '🇰🇷 한국'}
                {region === 'US' && '🇺🇸 미국'}
                {region === 'ASIA' && '🌏 아시아'}
                {region === 'EU' && '🇪🇺 유럽'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="지수 이름 또는 코드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600/40 transition-all font-medium placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* Dashboard Space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: HIGH-DENSITY MINIMALIST CARDS GRID */}
          <div className="lg:col-span-7 space-y-4">
            
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="relative w-10 h-10 mb-3">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-xs text-slate-600 font-medium">실시간 주식 연동 데이터를 동기화하는 중입니다...</p>
              </div>
            ) : filteredIndices.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-600 font-semibold text-sm">일치하는 금융 지수가 없습니다</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedRegion('ALL'); }}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-semibold rounded-md hover:bg-indigo-100 cursor-pointer"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredIndices.map(index => {
                  const isSelected = index.id === selectedId;
                  const isUp = index.change >= 0;
                  const colors = getTrendClasses(index.change);
                  const statusVal = getStatusLabel(index.status);
                  const regionVal = getRegionLabel(index.region);

                  const isOpen = index.status === 'OPEN';
                  const borderClass = isSelected
                    ? (isOpen 
                        ? 'ring-2 ring-indigo-600 border-transparent bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.22)]' 
                        : 'ring-2 ring-indigo-600 border-transparent bg-indigo-50/5')
                    : (isOpen
                        ? 'border-emerald-300 bg-emerald-50/5 hover:border-emerald-400 hover:bg-emerald-50/10 shadow-[0_2px_8px_rgba(16,185,129,0.08)] hover:shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md');

                  return (
                    <div
                      key={index.id}
                      onClick={() => setSelectedId(index.id)}
                      className={`relative rounded-xl border transition-all duration-150 p-3.5 cursor-pointer shadow-sm ${borderClass}`}
                    >
                      {/* Flex Top Row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base leading-none shrink-0">{getIndexFlag(index.id)}</span>
                          <span className="font-bold text-xs text-slate-800 tracking-tight truncate">
                            {index.nameKo}
                          </span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded border shrink-0 ${statusVal.style}`}>
                          {statusVal.text}
                        </span>
                      </div>

                      {/* Code Tag */}
                      <span className="text-[9px] font-mono text-slate-400 block -mt-1 mb-2 uppercase">
                        {index.id.toUpperCase()}
                      </span>

                      {/* Main Valuation Row */}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight">
                          {index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div className={`flex items-center gap-0.5 text-xs font-semibold ${colors.text}`}>
                          {isUp ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                          <span>{isUp ? '+' : ''}{index.percentChange}%</span>
                        </div>
                      </div>

                      {/* Sparkline and local schedule info block */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                        {/* Timezone-localized info */}
                        <div className="text-[9px] text-slate-400 font-mono leading-normal shrink-0">
                          <div className="font-semibold text-slate-600">현지 {getLocalCurrentTime(index.timezone)}</div>
                          <div className="font-medium text-slate-400">장시간 {index.openTime}-{index.closeTime} ({index.timezoneLabel})</div>
                        </div>

                        {/* Sparkline Polyline */}
                        {index.history && index.history.length > 1 && (
                          <div className="w-20 h-7 self-end">
                            <svg className="w-full h-full overflow-visible">
                              <polyline
                                fill="none"
                                stroke={colors.stroke}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={generateSparklinePoints(index.history, 80, 28, index.openTime, index.closeTime, index.status, index.timezone)}
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: LARGE INTERACTIVE SHARP DETAIL CHART */}
          <div className="lg:col-span-5">
            {activeIndex ? (
              <div className="space-y-4 sticky top-22">
                
                {/* Main Detailed Inspection Area */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
                  
                  {/* Detailed Card Accent Header */}
                  <div className="bg-slate-950 text-white p-4 border-b border-slate-800">
                    <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono px-1.5 py-0.5 rounded uppercase tracking-wider block w-fit mb-1.5">
                      지수 정밀 분석
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-lg font-bold font-display flex items-center gap-1.5">
                        <span className="text-xl leading-none">{getIndexFlag(activeIndex.id)}</span>
                        {activeIndex.nameKo}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono uppercase font-semibold">
                        {activeIndex.id.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5 truncate pl-7">
                      {activeIndex.name} • {getRegionLabel(activeIndex.region).label}
                    </p>
                  </div>

                  {/* Price & Change Details summary */}
                  <div className="p-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                        {activeIndex.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getTrendClasses(activeIndex.change).bg}`}>
                        당일 대비 변동
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1 font-bold text-xs ${getTrendClasses(activeIndex.change).text}`}>
                        {activeIndex.change >= 0 ? '▲' : '▼'}
                        <span>{activeIndex.change >= 0 ? '+' : ''}{activeIndex.change.toLocaleString()}</span>
                        <span>({activeIndex.change >= 0 ? '+' : ''}{activeIndex.percentChange}%)</span>
                      </div>
                      <div className="text-xs text-right font-mono leading-tight">
                        <div className="text-indigo-600 font-bold animate-pulse">현지 실시간 {getLocalCurrentTime(activeIndex.timezone)}</div>
                        <div className="text-slate-400 text-[10px]">기준: {activeIndex.asOf}</div>
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart Panel */}
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                        현지 거래 시간 비례 차트
                      </h4>
                      <span className="text-[9px] text-slate-400 font-mono">
                        30P Realtime Trail
                      </span>
                    </div>

                    {/* Interactive Custom SVG Chart Container */}
                    {bigChartDetails && bigChartDetails.points.length > 1 ? (
                      <div className="relative">
                        
                        {/* Hover Tooltip display context */}
                        {hoveredPoint ? (
                          <div className="mb-2 bg-slate-900 text-white rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px] font-mono shadow">
                            <span className="text-slate-400">시간 {hoveredPoint.time}</span>
                            <span className="font-bold text-indigo-300">지수 {hoveredPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ) : (
                          <div className="mb-2 text-slate-400 text-[10px] text-center leading-relaxed italic block">
                            차트 영역에 마우스를 올리면 시간대별 추이를 상세 분석할 수 있습니다.
                          </div>
                        )}

                        <div className="h-40 bg-slate-50 rounded-lg relative border border-slate-100 overflow-hidden">
                          
                          {/* Horizontal Grid lines */}
                          <div className="absolute inset-0 flex flex-col justify-between py-6 px-1 opacity-30 pointer-events-none">
                            <div className="w-full border-t border-dashed border-slate-300"></div>
                            <div className="w-full border-t border-dashed border-slate-300"></div>
                            <div className="w-full border-t border-dashed border-slate-300"></div>
                          </div>

                          <svg 
                            ref={chartContainerRef}
                            className="w-full h-full overflow-visible touch-none cursor-crosshair"
                            viewBox="0 0 360 160"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                          >
                            <defs>
                              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getTrendClasses(activeIndex.change).stroke} stopOpacity="0.20" />
                                <stop offset="100%" stopColor={getTrendClasses(activeIndex.change).stroke} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Polygon Filled Area Proportionally spaced using local market session */}
                            <path
                              d={`
                                M 0,160
                                ${bigChartDetails.points.map((p) => {
                                  const fraction = getTimeFraction(p.time, activeIndex.openTime, activeIndex.closeTime);
                                  const x = fraction * 360;
                                  const y = 160 - ((p.price - bigChartDetails.yMin) / bigChartDetails.spread) * 120 - 10;
                                  return `L ${x},${y}`;
                                }).join(' ')}
                                L ${(bigChartDetails.points.length > 0 ? getTimeFraction(bigChartDetails.points[bigChartDetails.points.length - 1].time, activeIndex.openTime, activeIndex.closeTime) : 1) * 360},160 Z
                              `}
                              fill="url(#chart-area-grad)"
                              className="transition-all duration-300"
                            />

                            {/* Polyline main value path */}
                            <path
                              d={bigChartDetails.points.map((p, idx) => {
                                const fraction = getTimeFraction(p.time, activeIndex.openTime, activeIndex.closeTime);
                                const x = fraction * 360;
                                const y = 160 - ((p.price - bigChartDetails.yMin) / bigChartDetails.spread) * 120 - 10;
                                return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke={getTrendClasses(activeIndex.change).stroke}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Dynamic Hover Point Cursor */}
                            {hoveredIndex !== null && (() => {
                              const fraction = getTimeFraction(bigChartDetails.points[hoveredIndex].time, activeIndex.openTime, activeIndex.closeTime);
                              const ptX = fraction * 360;
                              const ptY = 160 - ((bigChartDetails.points[hoveredIndex].price - bigChartDetails.yMin) / bigChartDetails.spread) * 120 - 10;
                              return (
                                <>
                                  <line
                                    x1={ptX}
                                    y1="0"
                                    x2={ptX}
                                    y2="160"
                                    stroke="#6366f1"
                                    strokeWidth="1"
                                    strokeDasharray="3"
                                  />
                                  <circle
                                    cx={ptX}
                                    cy={ptY}
                                    r="4"
                                    fill={getTrendClasses(activeIndex.change).stroke}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                  />
                                </>
                              );
                            })()}
                          </svg>

                          {/* Float visual value boundaries */}
                          <div className="absolute top-1 left-2 bg-slate-900/10 backdrop-blur-sm px-1 rounded text-[8px] text-slate-500 font-mono font-bold">
                            MAX {bigChartDetails.maxPrice.toLocaleString()}
                          </div>
                          <div className="absolute bottom-1 left-2 bg-slate-900/10 backdrop-blur-sm px-1 rounded text-[8px] text-slate-500 font-mono font-bold">
                            MIN {bigChartDetails.minPrice.toLocaleString()}
                          </div>
                        </div>

                        {/* Chart Footprint labels - Open and Close time aligned to boundaries */}
                        <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-1.5">
                          <span className="font-semibold text-slate-700">개장 {activeIndex.openTime}</span>
                          <span className="text-[9px] text-slate-400">시간대: {activeIndex.timezoneLabel} ({activeIndex.timezone})</span>
                          <span className="font-semibold text-slate-700">폐장 {activeIndex.closeTime}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 bg-slate-50 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        지수 가격 차트 데이터를 가공할 수 없습니다
                      </div>
                    )}
                  </div>

                </div>

              </div>
            ) : null}
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200/60 pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          <p className="font-medium text-slate-500">© 2026 글로벌 마켓 인덱스 대시보드</p>
        </div>
        <div>
          <span className="bg-slate-200/40 text-slate-500 px-2 py-0.5 rounded-full font-mono font-semibold">Live Feed Monitored</span>
        </div>
      </footer>

    </div>
  );
}
