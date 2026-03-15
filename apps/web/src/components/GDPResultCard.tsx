import React from 'react';
import { AnswerCountry } from '../services/api';

interface Props {
  countries: [AnswerCountry, AnswerCountry];
}

const KRW_RATE = 1380;

function formatGDP(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

export function GDPResultCard({ countries }: Props) {
  const winner = countries.find((c) => c.isCorrect)!;
  const loser = countries.find((c) => !c.isCorrect)!;
  const diff = winner.gdpPerCapita - loser.gdpPerCapita;
  const ratio = (winner.gdpPerCapita / loser.gdpPerCapita).toFixed(1);

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      marginTop: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#191F28', textAlign: 'center' }}>GDP 비교 결과</span>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {/* 승자 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 32 }}>{winner.flagEmoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#191F28', textAlign: 'center' }}>{winner.nameKo}</span>
          <span style={{ fontSize: 13, color: '#3182F6', fontWeight: 700 }}>{formatGDP(winner.gdpPerCapita)}</span>
          <span style={{ backgroundColor: '#FFD600', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#191F28' }}>1위</span>
        </div>

        {/* VS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#8B95A1' }}>VS</span>
          <span style={{ fontSize: 11, color: '#3182F6', fontWeight: 600, textAlign: 'center' }}>+{formatGDP(diff)} 더 높아요</span>
          <span style={{ fontSize: 11, color: '#8B95A1' }}>{ratio}배 차이</span>
        </div>

        {/* 패자 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 32 }}>{loser.flagEmoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#191F28', textAlign: 'center' }}>{loser.nameKo}</span>
          <span style={{ fontSize: 13, color: '#3182F6', fontWeight: 700 }}>{formatGDP(loser.gdpPerCapita)}</span>
        </div>
      </div>

      {/* 주요 산업 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {countries.map((c) => (
          <div key={c.code} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4E5968' }}>{c.flagEmoji} {c.nameKo} 주요 산업</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {c.mainIndustries.map((ind) => (
                <span key={ind} style={{ backgroundColor: '#F2F4F6', padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#4E5968', fontWeight: 500 }}>
                  {ind}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
