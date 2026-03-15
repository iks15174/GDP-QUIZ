import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GDPResultCard } from '../components/GDPResultCard';
import { AnswerResponse } from '../services/api';
import { useAd } from '../hooks/useAd';

const KRW_RATE = 1380;

function formatKRW(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAd } = useAd();
  const state = location.state as { answer: AnswerResponse } | null;

  if (!state?.answer) {
    navigate('/');
    return null;
  }

  const { answer } = state;
  const winner = answer.countries.find((c) => c.isCorrect)!;

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate(-1)} style={{ fontSize: 14, color: '#3182F6', fontWeight: 600, padding: '6px 4px' }}>← 돌아가기</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#191F28' }}>경제 학습</span>
          <div style={{ width: 80 }} />
        </div>

        <div style={{ backgroundColor: '#EBF3FF', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 48 }}>{winner.flagEmoji}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#191F28', textAlign: 'center' }}>{winner.nameKo}의 1인당 GDP가 더 높아요</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#3182F6' }}>{formatKRW(winner.gdpPerCapita)}</span>
          <span style={{ fontSize: 13, color: '#8B95A1' }}>${Math.round(winner.gdpPerCapita).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span>
        </div>

        <GDPResultCard countries={answer.countries} />

        <div style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, borderLeft: '3px solid #3182F6' }}>
          <span style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.6 }}>
            1인당 GDP는 국가의 경제 규모를 인구로 나눈 값으로, 국민의 평균 생활 수준을 나타내요.
          </span>
        </div>

        <button
          onClick={() => showAd(() => navigate('/quiz'), () => {})}
          style={{ backgroundColor: '#3182F6', paddingTop: 16, paddingBottom: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginTop: 8 }}
        >
          다음 문제 풀기 →
        </button>

      </div>
    </div>
  );
}
