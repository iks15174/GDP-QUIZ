import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CountryCard } from '../components/CountryCard';
import { Timer } from '../components/Timer';
import { StreakBar } from '../components/StreakBar';
import { BannerAd } from '../components/BannerAd';
import { api, BatchQuizItem, AnswerCountry, DailyLimitError } from '../services/api';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../hooks/useAuth';
import { useAd } from '../hooks/useAd';

const QUIZ_SECONDS = 5;
const STREAK_MILESTONE = 3;
const KRW_RATE = 1450;

type Phase = 'loading' | 'quiz' | 'correct' | 'wrong' | 'timeout' | 'error' | 'limit';

function formatKRW(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

function formatUSD(gdp: number): string {
  return '$' + Math.round(gdp).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function QuizPage() {
  const navigate = useNavigate();
  const { userKey: userId } = useAuth();
  const { showAd } = useAd();

  const [batch, setBatch] = useState<BatchQuizItem[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [rewardEarned, setRewardEarned] = useState(false);
  const [milestoneEarned, setMilestoneEarned] = useState(false);
  const [allCountriesLearned, setAllCountriesLearned] = useState(false);
  const [learnedCountryCount, setLearnedCountryCount] = useState<number | null>(null);
  const [nextMilestoneRemaining, setNextMilestoneRemaining] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const floatingFooterStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    padding: '12px 20px 20px',
    background: 'linear-gradient(180deg, rgba(247,248,250,0) 0%, rgba(247,248,250,0.92) 24%, #F7F8FA 48%)',
    backdropFilter: 'blur(8px)',
  };

  const { remaining, start, stop } = useTimer(QUIZ_SECONDS, () => setPhase('timeout'));
  const isMountedRef = useRef(true);

  useEffect(() => {
    loadBatch();
    return () => { isMountedRef.current = false; };
  }, []);

  const currentQuiz: BatchQuizItem | null = batch[batchIndex] ?? null;

  const loadBatch = async () => {
    try {
      setPhase('loading');
      setSelectedCode(null);
      setBatchIndex(0);
      setRewardEarned(false);
      setMilestoneEarned(false);
      setAllCountriesLearned(false);
      setLearnedCountryCount(null);
      setNextMilestoneRemaining(null);
      const result = await api.getQuizBatch(userId!, 3, true);
      if (!isMountedRef.current) return;
      setBatch(result.quizzes);
      setStreak(result.currentStreak);
      setPhase('quiz');
      start();
    } catch (e) {
      if (!isMountedRef.current) return;
      if (e instanceof DailyLimitError) { setPhase('limit'); return; }
      setErrorMsg('문제를 불러오지 못했어요.');
      setPhase('error');
    }
  };

  const handleSelect = (code: string) => {
    if (phase !== 'quiz' || !currentQuiz) return;
    stop();
    setSelectedCode(code);

    const isCorrect = code === currentQuiz.correctCode;
    const newStreak = isCorrect ? streak + 1 : streak;
    const isReward = isCorrect && newStreak >= STREAK_MILESTONE;

    if (isReward) {
      setStreak(0);
      setRewardEarned(true);
    } else {
      setStreak(newStreak);
    }

    setPhase(isCorrect ? 'correct' : 'wrong');

    // 백그라운드로 서버에 정답 제출 (streak DB 동기화 + 전국 학습 체크)
    api.submitAnswer({ quizId: currentQuiz.quizId, userId: userId!, selectedCode: code })
      .then(result => {
        if (!isMountedRef.current) return;
        if (result.milestoneEarned) setMilestoneEarned(true);
        if (result.allCountriesLearned) setAllCountriesLearned(true);
        if (typeof result.learnedCountryCount === 'number') setLearnedCountryCount(result.learnedCountryCount);
        if (typeof result.nextMilestoneRemaining === 'number') setNextMilestoneRemaining(result.nextMilestoneRemaining);
      })
      .catch(() => {});
  };

  const handleNextQuestion = () => {
    const nextIndex = batchIndex + 1;
    setBatchIndex(nextIndex);
    setSelectedCode(null);
    setPhase('quiz');
    start();
  };

  const handleRetry = async () => {
    if (!currentQuiz) return;
    try {
      setPhase('loading');
      const retryResult = await api.retryQuiz(currentQuiz.quizId, userId!);
      if (!isMountedRef.current) return;
      // 새 quizId만 교체, 나머지 배치 데이터는 그대로 사용
      setBatch(prev => {
        const updated = [...prev];
        updated[batchIndex] = { ...updated[batchIndex]!, quizId: retryResult.quizId };
        return updated;
      });
      setSelectedCode(null);
      setPhase('quiz');
      start();
    } catch {
      setErrorMsg('다시 시도해주세요.');
      setPhase('error');
    }
  };

  const handleWatchAd = (onSuccess: () => void) => {
    showAd(() => onSuccess(), () => {});
  };

  const renderLearningMilestoneHint = () => {
    if (learnedCountryCount === null || nextMilestoneRemaining === null || allCountriesLearned) {
      return null;
    }

    return (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: '12px 14px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>학습 리워드 진행 상황</span>
        <span style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5 }}>
          지금까지 <strong>{learnedCountryCount}개 나라</strong>를 학습했어요. 다음 1원까지 <strong>{nextMilestoneRemaining}개 나라</strong> 더 보면 돼요.
        </span>
      </div>
    );
  };

  const renderDetailCard = (c: AnswerCountry, isWinner: boolean) => (
    <div key={c.code} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, border: isWinner ? '1.5px solid #2563EB' : '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 30 }}>{c.flagEmoji}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{c.nameKo}</div>
            {c.continent && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{c.continent}</div>}
          </div>
        </div>
        {isWinner && <span style={{ backgroundColor: '#EEF2FF', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#2563EB' }}>정답</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: isWinner ? '#2563EB' : '#4B5563', letterSpacing: -0.5 }}>{formatKRW(c.gdpPerCapita)}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{formatUSD(c.gdpPerCapita)} · 세계 {c.gdpRank}위</div>
      </div>
      {c.mainIndustries?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.2 }}>주요 산업</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {c.mainIndustries.slice(0, 4).map((ind) => (
              <span key={ind} style={{ backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: 6, fontSize: 12, color: '#4B5563' }}>{ind}</span>
            ))}
          </div>
        </div>
      )}
      {c.mainResource && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.2 }}>주요 자원</span>
          <span style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{c.mainResource}</span>
        </div>
      )}
    </div>
  );

  const renderAnswerDetail = () => {
    if (!currentQuiz) return null;
    const [d1, d2] = currentQuiz.countryDetails;
    const winner = d1.isCorrect ? d1 : d2;
    const loser = d1.isCorrect ? d2 : d1;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {renderDetailCard(winner, true)}
        {renderDetailCard(loser, false)}
      </div>
    );
  };

  const renderCountries = () => {
    if (!currentQuiz) return null;
    const [c1, c2] = currentQuiz.countries;
    let c1Result: 'correct' | 'wrong' | null = null;
    let c2Result: 'correct' | 'wrong' | null = null;
    if (phase === 'correct' || phase === 'wrong' || phase === 'timeout') {
      c1Result = c1.code === currentQuiz.correctCode ? 'correct' : 'wrong';
      c2Result = c2.code === currentQuiz.correctCode ? 'correct' : 'wrong';
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CountryCard {...c1} onPress={() => handleSelect(c1.code)} selected={selectedCode === c1.code} disabled={phase !== 'quiz'} result={c1Result} />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#CBD5E1' }}>VS</span>
        <CountryCard {...c2} onPress={() => handleSelect(c2.code)} selected={selectedCode === c2.code} disabled={phase !== 'quiz'} result={c2Result} />
      </div>
    );
  };

  // 하단 고정 버튼
  const renderFooterButton = () => {
    if (phase === 'correct') {
      if (rewardEarned) {
        return (
          <button onClick={() => navigate('/encyclopedia', { replace: true })} style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}>
            내 학습 기록 보기
          </button>
        );
      }
      return (
        <button onClick={handleNextQuestion} style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}>
          다음 문제
        </button>
      );
    }
    if (phase === 'wrong' || phase === 'timeout') {
      return (
        <button onClick={() => handleWatchAd(handleRetry)} style={{ width: '100%', backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}>
          광고 보고 다시 도전
        </button>
      );
    }
    return null;
  };

  const footerButton = renderFooterButton();

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <BannerAd />

      {/* 전국 학습 완료 배너 — phase 무관하게 항상 노출 */}
      {allCountriesLearned && (
        <div style={{ backgroundColor: '#F0FDF4', padding: '10px 20px', borderBottom: '1px solid #86EFAC', textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>🌍 모든 나라 학습 완료! 1원이 지급됐어요</span>
        </div>
      )}

      {milestoneEarned && (
        <div style={{ backgroundColor: '#FFFBEB', padding: '10px 20px', borderBottom: '1px solid #FDE68A', textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#B45309' }}>10개 학습 마일스톤 달성! 1원이 지급됐어요</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 112px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {phase === 'quiz' && <Timer remaining={remaining} total={QUIZ_SECONDS} />}

        {/* 질문 */}
        {phase !== 'timeout' && phase !== 'limit' && phase !== 'error' && phase !== 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 }}>1인당 GDP가 더 높은 나라는?</span>
            {phase === 'quiz' && <span style={{ fontSize: 13, color: '#9CA3AF' }}>카드를 눌러 선택하세요</span>}
          </div>
        )}

        {/* 로딩 */}
        {phase === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60, paddingBottom: 32 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 14, color: '#9CA3AF' }}>문제를 불러오는 중...</span>
          </div>
        )}

        {/* 국가 카드 */}
        {(phase === 'quiz' || phase === 'correct' || phase === 'wrong' || phase === 'timeout') && renderCountries()}

        {/* 시간 초과 */}
        {phase === 'timeout' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ backgroundColor: '#FEF2F2', borderRadius: 16, paddingTop: 28, paddingBottom: 28, paddingLeft: 20, paddingRight: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid #FECACA' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#DC2626', letterSpacing: -0.5 }}>시간 초과</span>
              <span style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>아쉽게도 시간이 끝났어요{'\n'}정답을 확인하고 광고를 보면 다시 도전할 수 있어요</span>
            </div>
            <div style={{ alignSelf: 'center' }}>
              <StreakBar streak={streak} />
            </div>
            {renderLearningMilestoneHint()}
            {renderAnswerDetail()}
          </div>
        )}

        {/* 정답 */}
        {phase === 'correct' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: -0.5, color: '#059669' }}>정답이에요!</span>
            <div style={{ alignSelf: 'center' }}>
              {rewardEarned ? (
                <div style={{ backgroundColor: '#FFFBEB', padding: '8px 18px', borderRadius: 20, border: '1px solid #FDE68A' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>🎉 3연속 정답! 1원이 지급됐어요</span>
                </div>
              ) : (
                <StreakBar streak={streak} />
              )}
            </div>
            {renderAnswerDetail()}
          </div>
        )}

        {/* 오답 */}
        {phase === 'wrong' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: -0.5, color: '#DC2626' }}>틀렸어요</span>
            <div style={{ alignSelf: 'center' }}>
              <StreakBar streak={streak} />
            </div>
            {renderAnswerDetail()}
          </div>
        )}

        {/* 일일 한도 초과 */}
        {phase === 'limit' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 32, paddingBottom: 32 }}>
            <span style={{ fontSize: 36 }}>😴</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>오늘 도전 끝!</span>
            <span style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>
              하루 최대 10번까지 도전할 수 있어요{'\n'}내일 다시 찾아와 주세요
            </span>
            <button onClick={() => navigate('/')} style={{ marginTop: 8, paddingTop: 14, paddingBottom: 14, paddingLeft: 28, paddingRight: 28, borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#4B5563', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
              홈으로
            </button>
          </div>
        )}

        {/* 에러 */}
        {phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 32, paddingBottom: 32 }}>
            <span style={{ fontSize: 14, color: '#DC2626', textAlign: 'center' }}>{errorMsg}</span>
            <button onClick={loadBatch} style={{ backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
              다시 시도
            </button>
          </div>
        )}

      </div>

      {/* 하단 고정 액션 버튼 */}
      {footerButton && (
        <div style={floatingFooterStyle}>
          {footerButton}
        </div>
      )}
    </div>
  );
}
