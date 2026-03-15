/**
 * 국가 정보 서비스
 * - DB에 7일 캐시
 * - 없으면 공공 API에서 가져와서 저장
 */

import { prisma } from '../plugins/prisma.js';
import { fetchAllCountriesGDP } from './publicApiService.js';

const CONTINENT_MAP: Record<string, string> = {
  CN: '아시아', JP: '아시아', KR: '아시아', IN: '아시아', ID: '아시아',
  TH: '아시아', VN: '아시아', PH: '아시아', MY: '아시아', PK: '아시아',
  BD: '아시아', SG: '아시아', IL: '아시아', AE: '아시아', SA: '아시아',
  QA: '아시아', KW: '아시아',
  DE: '유럽', GB: '유럽', FR: '유럽', IT: '유럽', ES: '유럽',
  NL: '유럽', BE: '유럽', SE: '유럽', CH: '유럽', NO: '유럽',
  DK: '유럽', FI: '유럽', AT: '유럽', PT: '유럽', PL: '유럽',
  CZ: '유럽', HU: '유럽', RO: '유럽', UA: '유럽', RU: '유럽',
  IE: '유럽', LU: '유럽', IS: '유럽',
  US: '북아메리카', CA: '북아메리카', MX: '북아메리카',
  BR: '남아메리카', AR: '남아메리카', CL: '남아메리카', CO: '남아메리카', PE: '남아메리카',
  ZA: '아프리카', NG: '아프리카', EG: '아프리카',
  AU: '오세아니아', NZ: '오세아니아',
};

// API에 major_industry가 없는 국가 fallback (alpha-2 코드 기준)
const INDUSTRY_MAP: Record<string, string[]> = {
  US: ['IT/기술', '금융', '의료', '방위산업', '제조업'],
  CN: ['제조업', '전자', '철강', '화학', '농업'],
  JP: ['자동차', '전자', '금융', '화학', '로봇공학'],
  KR: ['반도체', '자동차', 'IT/전자', '조선', '철강'],
  DE: ['자동차', '기계', '화학', '금융', '제약'],
  GB: ['금융', '서비스업', '항공우주', '의약품', '창의산업'],
  FR: ['항공우주', '자동차', '농업', '관광', '명품'],
  IN: ['IT서비스', '제약', '섬유', '자동차', '농업'],
  BR: ['농업', '광업', '석유', '자동차', '항공'],
  CA: ['석유', '광업', '임업', '금융', '제조업'],
  AU: ['광업', '농업', '금융', '서비스업', '관광'],
  RU: ['석유/가스', '광업', '방위산업', '농업', '금속'],
  NO: ['석유/가스', '어업', '금속', '조선', '수력발전'],
  CH: ['금융', '제약', '시계', '식품', '관광'],
  SG: ['금융', '물류', '전자', '석유화학', '바이오'],
  AE: ['석유/가스', '관광', '금융', '부동산', '무역'],
  SA: ['석유/가스', '석유화학', '광업', '농업', '관광'],
  MX: ['제조업', '석유', '농업', '관광', '자동차'],
  ID: ['석유/가스', '광업', '농업', '섬유', '관광'],
  NL: ['농업', '화학', '물류', '금융', '에너지'],
  SE: ['자동차', '통신', '의약품', '제조업', 'IT'],
  PL: ['제조업', '농업', 'IT', '금융', '에너지'],
  TR: ['섬유', '자동차', '건설', '농업', '관광'],
  ZA: ['광업', '농업', '제조업', '금융', '관광'],
  AR: ['농업', '석유', '광업', '자동차', '식품'],
  NG: ['석유/가스', '농업', '통신', '제조업', '광업'],
  EG: ['석유/가스', '관광', '농업', '제조업', '수에즈운하'],
  IL: ['IT/기술', '방위산업', '다이아몬드', '농업', '의약품'],
  IE: ['IT', '제약', '금융', '농업', '관광'],
  AT: ['기계', '자동차', '관광', '식품', '화학'],
  PT: ['관광', '섬유', '식품', '자동차', '코르크'],
  FI: ['IT/통신', '임업', '기계', '금속', '전자'],
  DK: ['의약품', '농업', '식품', '해운', '에너지'],
  NZ: ['농업', '관광', '식품', '임업', '교육'],
  TH: ['자동차', '전자', '관광', '농업', '섬유'],
  VN: ['섬유', '전자', '농업', '가공식품', '관광'],
  PH: ['BPO', '전자', '해외노동', '농업', '관광'],
  MY: ['전자', '석유/가스', '팜오일', '관광', '자동차'],
  PK: ['섬유', '농업', '식품', '제약', '스포츠용품'],
  BD: ['섬유', '의류', '농업', '의약품', '도자기'],
  CL: ['구리', '농업', '임업', '어업', '관광'],
  CO: ['석유', '석탄', '커피', '꽃', '농업'],
  PE: ['광업', '농업', '어업', '가스', '관광'],
  IT: ['자동차', '패션', '식품', '기계', '관광'],
  ES: ['관광', '자동차', '식품', '재생에너지', '금융'],
  BE: ['화학', '제약', '금속', '식품', '물류'],
  CZ: ['자동차', '기계', 'IT', '항공우주', '화학'],
  HU: ['자동차', '전자', '기계', '농업', '관광'],
  RO: ['자동차', 'IT', '농업', '에너지', '제조업'],
  UA: ['농업', '철강', 'IT', '화학', '방위산업'],
  QA: ['석유/가스', '금융', '건설', '관광', '물류'],
  KW: ['석유/가스', '금융', '건설', '무역', '관광'],
  LU: ['금융', '철강', 'IT', '물류', '관광'],
  IS: ['어업', '알루미늄', '관광', '지열에너지', '정보통신'],
};

function getFlagEmoji(alpha2: string): string {
  return alpha2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

const CACHE_TTL_MS =
  Number(process.env.COUNTRY_CACHE_TTL_SECONDS ?? 604800) * 1000;

function isCacheValid(cachedAt: Date): boolean {
  return Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
}

function parseMainResource(item: { main_resource?: string | null }): string | null {
  if (!item.main_resource) return null;
  const trimmed = item.main_resource.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIndustries(country: { major_industry: string | null; country_iso_alp2: string }): string[] {
  const alpha2 = country.country_iso_alp2.toUpperCase();

  if (country.major_industry) {
    // API 데이터 사용: "서비스 80%, 제조업 16%, 농업 4%" → ["서비스 80%", "제조업 16%", "농업 4%"]
    return country.major_industry
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  return INDUSTRY_MAP[alpha2] ?? ['정보 없음'];
}

/** DB에 있는 국가 2개를 랜덤으로 뽑아 반환. 없으면 공공 API 전체 조회 후 저장 */
export async function getTwoRandomCountries() {
  let count = await prisma.country.count();

  if (count < 20) {
    await seedCountriesFromPublicApi();
    count = await prisma.country.count();
  }

  const countries = await prisma.$queryRaw<{ code: string }[]>`
    SELECT code FROM "Country" ORDER BY RANDOM() LIMIT 2
  `;

  if (countries.length < 2) return null;

  const [c1, c2] = await Promise.all([
    prisma.country.findUnique({ where: { code: countries[0]!.code } }),
    prisma.country.findUnique({ where: { code: countries[1]!.code } }),
  ]);

  if (!c1 || !c2) return null;
  return { country1: c1, country2: c2 };
}

/** 공공 API에서 전체 국가 GDP 데이터를 받아 DB에 저장 */
export async function seedCountriesFromPublicApi() {
  try {
    const apiCountries = await fetchAllCountriesGDP();
    let saved = 0;

    for (const item of apiCountries) {
      const gdp = parseFloat(item.gdp_per_capita);
      if (!item.country_iso_alp2 || isNaN(gdp) || gdp <= 0) continue;

      const code = item.country_iso_alp2.toUpperCase();
      const mainIndustries = JSON.stringify(parseIndustries(item));
      const continent = CONTINENT_MAP[code] ?? null;
      const mainResource = parseMainResource(item);

      await prisma.country.upsert({
        where: { code },
        create: {
          code,
          nameKo: item.country_nm,
          nameEn: item.country_eng_nm,
          flagEmoji: getFlagEmoji(code),
          gdpPerCapita: gdp,
          mainIndustries,
          continent,
          mainResource,
          cachedAt: new Date(),
        },
        update: {
          nameKo: item.country_nm,
          nameEn: item.country_eng_nm,
          gdpPerCapita: gdp,
          mainIndustries,
          continent,
          mainResource,
          cachedAt: new Date(),
        },
      });
      saved++;
    }

    console.log(`국가 데이터 저장 완료: ${saved}개`);
  } catch (err) {
    console.error('공공 API 국가 데이터 갱신 실패:', err);
    throw err;
  }
}
