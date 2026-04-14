import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, EncyclopediaCountry } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { BannerAd } from '../components/BannerAd';

const KRW_RATE = 1450;

function formatGDP(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

function CountryRow({ country }: { country: EncyclopediaCountry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 30 }}>{country.flagEmoji}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{country.nameKo}</span>
          <span style={{ fontSize: 13, color: '#2563EB', fontWeight: 600 }}>{formatGDP(country.gdpPerCapita)} / 인</span>
        </div>
        <span style={{ fontSize: 10, color: '#CBD5E1' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
          {country.continent && <span style={{ fontSize: 12, color: '#9CA3AF' }}>{country.continent}</span>}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.2 }}>주요 산업</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {country.mainIndustries.map((ind) => (
              <span key={ind} style={{ backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: 6, fontSize: 12, color: '#4B5563' }}>{ind}</span>
            ))}
          </div>
          {country.mainResource && (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.2 }}>주요 자원</span>
              <span style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{country.mainResource}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function EncyclopediaPage() {
  const navigate = useNavigate();
  const { userKey: userId } = useAuth();
  const [countries, setCountries] = useState<EncyclopediaCountry[]>([]);
  const [totalCountries, setTotalCountries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const floatingFooterStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    padding: '12px 20px 20px',
    background: 'linear-gradient(180deg, rgba(247,248,250,0) 0%, rgba(247,248,250,0.92) 24%, #F7F8FA 48%)',
    backdropFilter: 'blur(8px)',
  };

  useEffect(() => {
    api
      .getEncyclopedia(userId!)
      .then((res) => {
        setCountries(res.countries);
        setTotalCountries(res.totalCountries);
      })
      .catch(() => setError('데이터를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <BannerAd />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 112px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: -0.3 }}>내 학습 기록</span>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && error && <span style={{ fontSize: 14, color: '#DC2626', textAlign: 'center' }}>{error}</span>}

        {!loading && countries.length === 0 && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60, paddingBottom: 60 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>아직 학습한 나라가 없어요</span>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>퀴즈를 풀고 나라들을 수집해보세요</span>
            <button onClick={() => navigate('/')} style={{ marginTop: 8, backgroundColor: '#2563EB', padding: '13px 24px', borderRadius: 12, color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
              퀴즈 풀러 가기
            </button>
          </div>
        )}

        {!loading && totalCountries > 0 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>학습 진행률</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>전체 {totalCountries}개국 중 {countries.length}개국</div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#2563EB', letterSpacing: -1 }}>
                {Math.round((countries.length / totalCountries) * 100)}%
              </span>
            </div>
            <div style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((countries.length / totalCountries) * 100, 100)}%`, backgroundColor: '#2563EB', borderRadius: 2 }} />
            </div>
          </div>
        )}

        {countries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>{countries.length}개국 학습 완료</span>
            {countries.map((c) => (
              <CountryRow key={c.code} country={c} />
            ))}
          </div>
        )}

      </div>

      <div style={floatingFooterStyle}>
        <button
          onClick={() => navigate('/quiz')}
          style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3, boxShadow: '0 10px 24px rgba(37, 99, 235, 0.22)' }}
        >
          퀴즈 도전하기
        </button>
      </div>
    </div>
  );
}
