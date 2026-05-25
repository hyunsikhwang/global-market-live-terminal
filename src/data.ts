export interface IndexProfile {
  id: string;
  description: string;
  constituents: string[];
  exchange: string;
  tradingHours: string;
  weightMethod: string;
}

export const INDEX_PROFILES: Record<string, IndexProfile> = {
  kospi: {
    id: 'kospi',
    exchange: '한국거래소 (KRX)',
    tradingHours: '09:00 ~ 15:30 (KST)',
    weightMethod: '시가총액가중방식',
    description: '유가증권시장에 상장된 전 종목을 종합하여 나타낸 대한민국 주식시장의 대표 지수입니다. 삼성전자, SK하이닉스 등 국가대표 제조업, 기술기업 및 전통 대형 기업들이 포함되어 있습니다.',
    constituents: ['삼성전자', 'SK하이닉스', 'LG에너지솔루션', '삼성바이오로직스', '현대자동차', '기아']
  },
  kosdaq: {
    id: 'kosdaq',
    exchange: '한국거래소 (KRX)',
    tradingHours: '09:00 ~ 15:30 (KST)',
    weightMethod: '시가총액가중방식',
    description: '대한민국의 성장 벤처기업, IT 및 바이오 기업들이 주로 상장된 장외거래 시장 기반 주가지수입니다. 코스피에 비해 기술주 및 바이오 헬스케어 관련 중소형 고성장 주식 비중이 매우 높습니다.',
    constituents: ['에코프로비엠', '에코프로', 'HLB', '알테오젠', '셀트리온제약', '엔켐']
  },
  sp500: {
    id: 'sp500',
    exchange: '뉴욕증권거래소 (NYSE) & 나스닥 (NASDAQ)',
    tradingHours: '09:30 ~ 16:00 (EST/EDT)',
    weightMethod: '부동시가총액가중',
    description: '미국 신용평가사 Standard & Poor\'s가 산출하는 지수로, 미국 주식시장의 우량 거대기업 500개 사를 편입하는 미국의 대표적인 벤치마크 지수입니다. 전세계 금융 및 자산 배분의 기조가 됩니다.',
    constituents: ['Microsoft', 'Apple', 'NVIDIA', 'Amazon', 'Alphabet', 'Meta']
  },
  nasdaq: {
    id: 'nasdaq',
    exchange: '나스닥 (NASDAQ)',
    tradingHours: '09:30 ~ 16:00 (EST/EDT)',
    weightMethod: '시가총액가중방식',
    description: '미국 나스닥 시장에 상장된 약 3,000여 개 기술주, 바이오벤처 등 중소·대형 성장주들을 종합한 대표 지수입니다. 변동성이 크며 전세계 기술 혁신의 방향타 역할을 합니다.',
    constituents: ['Apple', 'Microsoft', 'NVIDIA', 'Amazon', 'Alphabet', 'Tesla']
  },
  dow: {
    id: 'dow',
    exchange: '뉴욕증권거래소 (NYSE)',
    tradingHours: '09:30 ~ 16:00 (EST/EDT)',
    weightMethod: '주가가중방식',
    description: '다우 존스사에서 발표하는 미국 대표 우량 30개 기업 주가의 단순 평균을 바탕으로 산출한 지수입니다. 시가총액이 아닌 주가를 기준 가중치로 하여 오랜 역사를 가진 정통 대기업 비중이 큽니다.',
    constituents: ['UnitedHealth', 'Goldman Sachs', 'Microsoft', 'Home Depot', 'McDonald\'s', 'Caterpillar']
  },
  nikkei225: {
    id: 'nikkei225',
    exchange: '도쿄증권거래소 (TSE)',
    tradingHours: '09:00 ~ 11:30, 12:30 ~ 15:00 (JST)',
    weightMethod: '주가가중방식',
    description: '도쿄증권거래소 1부에 상장된 대표 우량 기업 225개 종목을 대상으로 일본 경제신문(니혼케이자이)이 주가가중 방식으로 산출 및 가공하는 일본 주식시장의 최고 인덱스입니다.',
    constituents: ['Fast Retailing', 'Tokyo Electron', 'Advantest', 'SoftBank Group', 'Toyota Motor', 'Sony']
  },
  hangseng: {
    id: 'hangseng',
    exchange: '홍콩증권거래소 (HKEX)',
    tradingHours: '09:30 ~ 12:00, 13:00 ~ 16:00 (HKT)',
    weightMethod: '부동시가총액가중',
    description: '홍콩증권거래소에 상장된 종목 중 시가총액 상위 대형 블루칩 종목들을 선별하여 가중 평균한 종합 주가지수입니다. 중국 본토 대기업들이 대거 상장되어 있어 중국 경기의 가늠자 역할을 겸합니다.',
    constituents: ['Tencent', 'Alibaba', 'AIA Group', 'HSBC', 'Meituan', 'China Construction Bank']
  },
  shanghai: {
    id: 'shanghai',
    exchange: '상하이증권거래소 (SSE)',
    tradingHours: '09:30 ~ 11:30, 13:00 ~ 15:00 (CST)',
    weightMethod: '시가총액가중방식',
    description: '중국 본토 상하이증권거래소에 상장된 전체 주식(A주 및 B주)의 시가총액 가중 평균을 나타내는 중국 본토 경제의 대표 지수입니다. 금융, 기간산업 및 국유 대기업 비중이 큽니다.',
    constituents: ['Kweichow Moutai', 'Industrial and Commercial Bank of China', 'Agricultural Bank of China', 'PetroChina']
  },
  ftse100: {
    id: 'ftse100',
    exchange: '런던증권거래소 (LSE)',
    tradingHours: '08:00 ~ 16:30 (BST/GMT)',
    weightMethod: '부동시가총액가중',
    description: '런던증권거래소에 상장된 시가총액 상위 100대 기업으로 구성된 영국 경제의 대형주 벤치마크 지수입니다. 금융, 자원개발, 헬스케어 등 글로벌 비즈니스를 영위하는 다국적 기업들이 주를 이룹니다.',
    constituents: ['AstraZeneca', 'Shell', 'HSBC', 'Unilever', 'BP', 'Rio Tinto']
  },
  dax: {
    id: 'dax',
    exchange: '프랑크푸르트증권거래소 (FWB)',
    tradingHours: '09:00 ~ 17:30 (CEST/CET)',
    weightMethod: '시가총액가중방식',
    description: '독일 프랑크푸르트증권거래소에 상장된 시가총액 기준 상위 40대 기업들로 이루어진 독일 경제 및 유럽 제조업의 건강 상태를 대변하는 핵심 주가지수입니다.',
    constituents: ['SAP', 'Siemens', 'Allianz', 'Mercedes-Benz Group', 'Deutsche Telekom', 'BASF']
  },
  cac40: {
    id: 'cac40',
    exchange: '유로넥스트 파리 (Euronext Paris)',
    tradingHours: '09:00 ~ 17:30 (CEST/CET)',
    weightMethod: '시가총액가중방식',
    description: '프랑스 유로넥스트 파리 거래소에 상장된 우량 대기업 40개 개별 종목을 토대로 산출하는 대표 지수입니다. 명품(LVMH, Hermes), 화장품(L\'Oreal), 항공공학 및 금융 등 고효율 섹터에 집중되어 있습니다.',
    constituents: ['LVMH', 'Hermes', 'L\'Oreal', 'TotalEnergies', 'Schneider Electric', 'Air Liquide']
  },
  nifty50: {
    id: 'nifty50',
    exchange: '인도국립증권거래소 (NSE)',
    tradingHours: '09:15 ~ 15:30 (IST)',
    weightMethod: '부동시가총액가중',
    description: '인도국립증권거래소에 속한 상위 50대 주요 블루칩 우량종목을 가중 평가하여 주가를 합산한 아시아 최고 고성장 신흥 주식시장인 인도의 핵심 지표입니다.',
    constituents: ['Reliance Industries', 'HDFC Bank', 'ICICI Bank', 'Infosys', 'Larsen & Toubro', 'Tata Consultancy']
  }
};
