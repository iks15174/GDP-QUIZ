import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAd } from '../hooks/useAd';
import { useDailyFreePlay } from '../hooks/useDailyFreePlay';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { BannerAd } from '../components/BannerAd';

export default function IndexPage() {
  const navigate = useNavigate();
  const { showAd } = useAd();
  const { canFreePlay, consumeFreePlay } = useDailyFreePlay();
  const { isLoggedIn, login, validating, userKey } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<{ attemptsToday: number; maxAttempts: number; limitReached: boolean } | null>(null);

  useEffect(() => {
    if (isLoggedIn && userKey) {
      api.getDailyStatus(userKey).then(setDailyStatus).catch(() => {});
    }
  }, [isLoggedIn, userKey]);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await login();
      // 로그인 후 홈에 머물며 퀴즈 시작 버튼을 통해 정상적으로 시작
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

  const remaining = dailyStatus ? dailyStatus.maxAttempts - dailyStatus.attemptsToday : null;

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F7F8FA', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', gap: 24 }}>

      <BannerAd />

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
        {isLoggedIn && remaining !== null && !dailyStatus?.limitReached && (
          <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
            오늘 {remaining}번 도전 가능
          </span>
        )}

        {validating ? (
          <div style={{ paddingTop: 17, paddingBottom: 17 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !isLoggedIn ? (
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 17, paddingBottom: 17, borderRadius: 14, fontSize: 17, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3, opacity: loginLoading ? 0.6 : 1 }}
          >
            {loginLoading ? '로그인 중...' : '로그인하기'}
          </button>
        ) : (
          <>
            {dailyStatus?.limitReached ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button
                  disabled
                  style={{ width: '100%', backgroundColor: '#E5E7EB', paddingTop: 17, paddingBottom: 17, borderRadius: 14, fontSize: 17, fontWeight: 700, color: '#9CA3AF', letterSpacing: -0.3 }}
                >
                  퀴즈 시작하기
                </button>
                <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>오늘 10번 모두 도전했어요. 내일 다시 찾아와주세요!</span>
              </div>
            ) : (
              <button
                onClick={handleStartQuiz}
                style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 17, paddingBottom: 17, borderRadius: 14, fontSize: 17, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}
              >
                퀴즈 시작하기
              </button>
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
