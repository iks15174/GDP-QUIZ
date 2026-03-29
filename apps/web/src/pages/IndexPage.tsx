import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAd } from '../hooks/useAd';
import { useDailyFreePlay } from '../hooks/useDailyFreePlay';
import { useAuth } from '../hooks/useAuth';

export default function IndexPage() {
  const navigate = useNavigate();
  const { showAd } = useAd();
  const { canFreePlay, consumeFreePlay } = useDailyFreePlay();
  const { isLoggedIn, login } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await login();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (canFreePlay) {
      consumeFreePlay();
      navigate('/quiz');
    } else {
      showAd(
        () => navigate('/quiz'),
        () => { /* 광고 미완료 */ }
      );
    }
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F7F8FA', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', gap: 24 }}>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: '#0F172A', letterSpacing: -1.5, textAlign: 'center', lineHeight: 1.2 }}>
          GDP{'\n'}스피드 퀴즈
        </h1>
        <p style={{ fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
          두 나라 중 1인당 GDP가 더 높은 나라를 맞춰보세요
        </p>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: '6px 20px', border: '1px solid #E5E7EB' }}>
        {[
          { num: '1', text: '5초 안에 GDP가 더 높은 나라를 고르세요', color: '#2563EB' },
          { num: '2', text: '틀리거나 시간이 초과되면 광고를 보고 이어서 도전할 수 있어요', color: '#2563EB' },
          { num: '3', text: null, color: '#D97706' },
        ].map((rule, i) => (
          <div key={i}>
            {i > 0 && <div style={{ height: 1, backgroundColor: '#F3F4F6', margin: '0 -20px' }} />}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingTop: 16, paddingBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: rule.color, width: 18, lineHeight: '21px' }}>{rule.num}</span>
              {rule.text ? (
                <span style={{ flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 1.5 }}>{rule.text}</span>
              ) : (
                <span style={{ flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 1.5 }}>
                  3번 연속 맞추면 <strong style={{ color: '#0F172A' }}>1원 지급</strong>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {!isLoggedIn ? (
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 17, paddingBottom: 17, borderRadius: 14, fontSize: 17, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3, opacity: loginLoading ? 0.6 : 1 }}
          >
            {loginLoading ? '로그인 중...' : '토스로 시작하기'}
          </button>
        ) : (
          <>
            <button
              onClick={handleStartQuiz}
              style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 17, paddingBottom: 17, borderRadius: 14, fontSize: 17, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}
            >
              퀴즈 시작하기
            </button>
            {canFreePlay && (
              <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>오늘 첫 도전은 무료예요</span>
            )}
            <button
              onClick={() => navigate('/encyclopedia')}
              style={{ width: '100%', paddingTop: 15, paddingBottom: 15, borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#4B5563', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}
            >
              내 학습 기록 보기
            </button>
          </>
        )}
      </div>

    </div>
  );
}
