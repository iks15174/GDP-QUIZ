/**
 * data.go.kr 공공 데이터 API 서비스
 * 데이터셋: 국가별 경제 개요 (ID: 15099538)
 * API: OverviewEconomicService/OverviewEconomicList
 */

export interface PublicApiCountry {
  country_nm: string;        // 국가명 (한국어)
  country_eng_nm: string;    // 국가명 (영어)
  country_iso_alp2: string;  // ISO 3166-1 alpha-2 코드 (e.g. "KR")
  gdp_per_capita: string;    // 1인당 GDP (USD)
  major_industry: string | null; // 주요 산업 (한국어)
  main_resource: string | null;  // 주요 자원
}

interface ApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: PublicApiCountry[] };
      totalCount: number;
      numOfRows: number;
      pageNo: number;
    };
  };
}

const BASE_URL = process.env.PUBLIC_DATA_API_BASE_URL!;
const API_KEY = process.env.PUBLIC_DATA_API_KEY!;

export async function fetchAllCountriesGDP(): Promise<PublicApiCountry[]> {
  if (!API_KEY || !BASE_URL) {
    throw new Error('PUBLIC_DATA_API_KEY 또는 PUBLIC_DATA_API_BASE_URL이 설정되지 않았습니다.');
  }

  // serviceKey는 이미 URL 인코딩된 상태이므로 직접 붙임 (URLSearchParams 이중인코딩 방지)
  const params = new URLSearchParams({
    numOfRows: '250',
    pageNo: '1',
    type: 'json',
  });

  const url = `${BASE_URL}?serviceKey=${API_KEY}&${params.toString()}`;
  const { default: fetch } = await import('node-fetch');
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`공공 API 호출 실패: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiResponse;
  return data.response?.body?.items?.item ?? [];
}
