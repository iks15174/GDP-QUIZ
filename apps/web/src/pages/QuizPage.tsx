import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CountryCard } from '../components/CountryCard';
import { Timer } from '../components/Timer';
import { StreakBar } from '../components/StreakBar';
import { api, QuizCountry, AnswerResponse, DailyLimitError } from '../services/api';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../hooks/useAuth';
import { useAd } from '../hooks/useAd';

const QUIZ_SECONDS = 5;
const KRW_RATE = 1380;
const STREAK_MILESTONE = 3;

type Phase = 'loading' | 'quiz' | 'submitting' | 'correct' | 'wrong' | 'timeout' | 'error' | 'limit';

function formatUSD(gdp: number): string {
  return '$' + Math.round(gdp).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatKRW(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

export default function QuizPage() {
  const navigate = useNavigate();
  const { userKey: userId } = useAuth();
  const { showAd } = useAd();

  const [phase, setPhase] = useState<Phase>('loading');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [countries, setCountries] = useState<[QuizCountry, QuizCountry] | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [streak, setStreak] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRateInfo, setShowRateInfo] = useState(false);

  const { remaining, start, stop } = useTimer(QUIZ_SECONDS, () => setPhase('timeout'));

  useEffect(() => {
    api.getStreak(userId!).then(({ streak }) => setStreak(streak)).catch(() => {});
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    try {
      setPhase('loading');
      setSelectedCode(null);
      setAnswer(null);
      setShowRateInfo(false);
      const quiz = await api.getQuiz(userId!);
      setQuizId(quiz.quizId);
      setCountries(quiz.countries);
      setPhase('quiz');
      start();
    } catch (e) {
      if (e instanceof DailyLimitError) {
        setPhase('limit');
        return;
      }
      setErrorMsg('문제를 불러오지 못했어요.');
      setPhase('error');
    }
  };

  const handleSelect = async (code: string) => {
    if (phase !== 'quiz' || !quizId) return;
    stop();
    setSelectedCode(code);
    setPhase('submitting');

    try {
      const result = await api.submitAnswer({ quizId, userId: userId!, selectedCode: code });
      setAnswer(result);
      if (result.isCorrect) setStreak(result.rewardEarned ? 3 : result.streak.current);
      setPhase(result.isCorrect ? 'correct' : 'wrong');
    } catch (e) {
      console.error('[submitAnswer] 에러:', e);
      setErrorMsg('정답 제출 중 오류가 발생했어요.');
      setPhase('error');
    }
  };

  const handleWatchAd = (onSuccess: () => void) => {
    showAd(() => onSuccess(), () => { /* 광고 미완료 */ });
  };

  const renderCountries = () => {
    if (!countries) return null;
    const [c1, c2] = countries;

    let c1Result: 'correct' | 'wrong' | null = null;
    let c2Result: 'correct' | 'wrong' | null = null;

    if (answer && (phase === 'correct' || phase === 'wrong')) {
      c1Result = c1.code === answer.correctCode ? 'correct' : 'wrong';
      c2Result = c2.code === answer.correctCode ? 'correct' : 'wrong';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CountryCard {...c1} onPress={() => handleSelect(c1.code)} selected={selectedCode === c1.code} disabled={phase !== 'quiz'} result={c1Result} />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#CBD5E1' }}>VS</span>
        <CountryCard {...c2} onPress={() => handleSelect(c2.code)} selected={selectedCode === c2.code} disabled={phase !== 'quiz'} result={c2Result} />
      </div>
    );
  };

  const renderAnswerDetail = (ans: AnswerResponse) => {
    const winner = ans.countries.find((c) => c.isCorrect)!;
    const loser = ans.countries.find((c) => !c.isCorrect)!;
    const ratio = (winner.gdpPerCapita / loser.gdpPerCapita).toFixed(1);

    const renderCard = (c: typeof winner, isWinner: boolean) => (
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>{ratio}배 차이</span>
          <button onClick={() => setShowRateInfo((v) => !v)} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>?</button>
        </div>
        {showRateInfo && (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>원화는 1 USD = 1,380원 기준으로 환산한 대략적인 값이에요.</span>
          </div>
        )}
        {renderCard(winner, true)}
        {renderCard(loser, false)}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: -0.3 }}>GDP 스피드 퀴즈</span>
        </div>

        <StreakBar streak={streak} />

        {phase === 'quiz' && <Timer remaining={remaining} total={QUIZ_SECONDS} />}

        {/* 시간 초과 */}
        {phase === 'timeout' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ backgroundColor: '#FEF2F2', borderRadius: 16, paddingTop: 28, paddingBottom: 28, paddingLeft: 20, paddingRight: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid #FECACA' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#DC2626', letterSpacing: -0.5 }}>시간 초과</span>
              <span style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>아쉽게도 시간이 끝났어요{'\n'}광고를 보고 다시 도전해보세요</span>
            </div>
            <button onClick={() => handleWatchAd(loadQuiz)} style={{ backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}>
              광고 보고 다시 도전
            </button>
          </div>
        )}

        {/* 질문 */}
        {phase !== 'timeout' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 }}>1인당 GDP가 더 높은 나라는?</span>
            {phase === 'quiz' && <span style={{ fontSize: 13, color: '#9CA3AF' }}>카드를 눌러 선택하세요</span>}
          </div>
        )}

        {/* 로딩 */}
        {phase === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 32, paddingBottom: 32 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 14, color: '#9CA3AF' }}>문제를 불러오는 중...</span>
          </div>
        )}

        {/* 국가 카드 */}
        {(phase === 'quiz' || phase === 'submitting' || phase === 'correct' || phase === 'wrong') && renderCountries()}

        {/* 제출 중 */}
        {phase === 'submitting' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* 정답 */}
        {phase === 'correct' && answer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: -0.5, color: '#059669' }}>정답이에요!</span>
            {streak > 0 && (
              <div style={{ alignSelf: 'center', backgroundColor: '#FFFBEB', padding: '6px 14px', borderRadius: 20, border: '1px solid #FDE68A' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}>{streak}연속 정답 중</span>
              </div>
            )}
            {renderAnswerDetail(answer)}
            {(streak >= STREAK_MILESTONE || answer.rewardEarned) && (
              <button onClick={() => navigate('/encyclopedia')} style={{ paddingTop: 15, paddingBottom: 15, borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#4B5563', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                학습 기록 보기
              </button>
            )}
            <button onClick={loadQuiz} style={{ backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}>
              다음 문제
            </button>
          </div>
        )}

        {/* 오답 */}
        {phase === 'wrong' && answer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: -0.5, color: '#DC2626' }}>틀렸어요</span>
            {renderAnswerDetail(answer)}
            <button onClick={() => handleWatchAd(loadQuiz)} style={{ backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3 }}>
              광고 보고 다시 도전
            </button>
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
            <button onClick={loadQuiz} style={{ backgroundColor: '#2563EB', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, borderRadius: 14, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
              다시 시도
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
