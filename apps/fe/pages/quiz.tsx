import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { CountryCard } from '../components/CountryCard';
import { Timer } from '../components/Timer';
import { StreakBar } from '../components/StreakBar';
import { api, QuizCountry, AnswerResponse } from '../services/api';
import { useTimer } from '../hooks/useTimer';
import { useUserId } from '../hooks/useUserId';
import { useAd } from '../hooks/useAd';

const QUIZ_SECONDS = 5;
const KRW_RATE = 1380;
const STREAK_MILESTONE = 3;

type Phase =
  | 'loading'
  | 'quiz'
  | 'submitting'
  | 'correct'
  | 'wrong'
  | 'timeout'
  | 'error';

export const Route = createRoute('/quiz', {
  component: QuizPage,
});

function formatUSD(gdp: number): string {
  return '$' + Math.round(gdp).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatKRW(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) {
    return (krw / 100_000_000).toFixed(1) + '억원';
  }
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

function QuizPage() {
  const navigation = Route.useNavigation();
  const userId = useUserId();
  const { showAd } = useAd();

  const [phase, setPhase] = useState<Phase>('loading');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [countries, setCountries] = useState<[QuizCountry, QuizCountry] | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [streak, setStreak] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRateInfo, setShowRateInfo] = useState(false);

  const { remaining, start, stop } = useTimer(QUIZ_SECONDS, () => {
    handleTimeout();
  });

  useEffect(() => {
    if (userId) loadQuiz();
  }, [userId]);

  const loadQuiz = async () => {
    if (!userId) return;
    try {
      setPhase('loading');
      setSelectedCode(null);
      setAnswer(null);
      setShowRateInfo(false);
      const quiz = await api.getQuiz(userId);
      setQuizId(quiz.quizId);
      setCountries(quiz.countries);
      setPhase('quiz');
      start();
    } catch (e) {
      console.error('[loadQuiz] 에러:', e);
      setErrorMsg('문제를 불러오지 못했어요.');
      setPhase('error');
    }
  };

  const handleSelect = async (code: string) => {
    if (phase !== 'quiz' || !quizId || !userId) return;
    stop();
    setSelectedCode(code);
    setPhase('submitting');

    try {
      const result = await api.submitAnswer({ quizId, userId, selectedCode: code });
      setAnswer(result);
      if (result.isCorrect) setStreak(result.streak.current);
      setPhase(result.isCorrect ? 'correct' : 'wrong');
    } catch (e) {
      console.error('[submitAnswer] 에러:', e);
      setErrorMsg('정답 제출 중 오류가 발생했어요.');
      setPhase('error');
    }
  };

  const handleTimeout = () => {
    setPhase('timeout');
  };

  const handleWatchAd = (onSuccess: () => void) => {
    showAd(
      () => { onSuccess(); },
      () => { /* 광고 미완료 */ }
    );
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
      <View style={styles.cardsRow}>
        <CountryCard
          {...c1}
          onPress={() => handleSelect(c1.code)}
          selected={selectedCode === c1.code}
          disabled={phase !== 'quiz'}
          result={c1Result}
        />
        <Text style={styles.vsLabel}>VS</Text>
        <CountryCard
          {...c2}
          onPress={() => handleSelect(c2.code)}
          selected={selectedCode === c2.code}
          disabled={phase !== 'quiz'}
          result={c2Result}
        />
      </View>
    );
  };

  const renderAnswerDetail = (ans: AnswerResponse) => {
    const winner = ans.countries.find((c) => c.isCorrect)!;
    const loser = ans.countries.find((c) => !c.isCorrect)!;
    const ratio = (winner.gdpPerCapita / loser.gdpPerCapita).toFixed(1);

    const renderCard = (c: typeof winner, isWinner: boolean) => (
      <View key={c.code} style={[styles.detailCard, isWinner && styles.detailCardWinner]}>
        <View style={styles.detailCardHeader}>
          <View style={styles.detailCardLeft}>
            <Text style={styles.detailFlag}>{c.flagEmoji}</Text>
            <View>
              <Text style={styles.detailName}>{c.nameKo}</Text>
              {c.continent && <Text style={styles.detailContinent}>{c.continent}</Text>}
            </View>
          </View>
          {isWinner && (
            <View style={styles.winnerTag}>
              <Text style={styles.winnerTagText}>정답</Text>
            </View>
          )}
        </View>

        <View style={styles.detailGDP}>
          <Text style={[styles.detailGDPValue, isWinner && styles.detailGDPValueWinner]}>
            {formatKRW(c.gdpPerCapita)}
          </Text>
          <Text style={styles.detailGDPSub}>
            {formatUSD(c.gdpPerCapita)} · 세계 {c.gdpRank}위
          </Text>
        </View>

        {c.mainIndustries?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>주요 산업</Text>
            <View style={styles.tags}>
              {c.mainIndustries.slice(0, 4).map((ind) => (
                <View key={ind} style={styles.tag}>
                  <Text style={styles.tagText}>{ind}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {c.mainResource && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>주요 자원</Text>
            <Text style={styles.detailResourceText}>{c.mainResource}</Text>
          </View>
        )}
      </View>
    );

    return (
      <View style={styles.answerDetail}>
        <View style={styles.ratioRow}>
          <Text style={styles.ratioText}>{ratio}배 차이</Text>
          <Pressable onPress={() => setShowRateInfo((v) => !v)} style={styles.rateInfoBtn}>
            <Text style={styles.rateInfoBtnText}>?</Text>
          </Pressable>
        </View>
        {showRateInfo && (
          <View style={styles.rateInfoBox}>
            <Text style={styles.rateInfoText}>원화는 1 USD = 1,380원 기준으로 환산한 대략적인 값이에요.</Text>
          </View>
        )}
        {renderCard(winner, true)}
        {renderCard(loser, false)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>GDP 스피드 퀴즈</Text>
        </View>

        <StreakBar streak={streak} />

        {/* 타이머 */}
        {phase === 'quiz' && (
          <Timer remaining={remaining} total={QUIZ_SECONDS} />
        )}

        {/* 시간 초과 */}
        {phase === 'timeout' && (
          <View style={styles.timeoutArea}>
            <View style={styles.statusCard}>
              <Text style={styles.timeoutTitle}>시간 초과</Text>
              <Text style={styles.statusSub}>아쉽게도 시간이 끝났어요{'\n'}광고를 보고 다시 도전해보세요</Text>
            </View>
            <Pressable style={styles.primaryBtn} onPress={() => handleWatchAd(loadQuiz)}>
              <Text style={styles.primaryBtnText}>광고 보고 다시 도전</Text>
            </Pressable>
          </View>
        )}

        {/* 질문 */}
        {phase !== 'timeout' && (
          <View style={styles.questionArea}>
            <Text style={styles.questionText}>1인당 GDP가 더 높은 나라는?</Text>
            {phase === 'quiz' && (
              <Text style={styles.questionSub}>카드를 눌러 선택하세요</Text>
            )}
          </View>
        )}

        {/* 로딩 */}
        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>문제를 불러오는 중...</Text>
          </View>
        )}

        {/* 국가 카드 */}
        {(phase === 'quiz' || phase === 'submitting' || phase === 'correct' || phase === 'wrong') &&
          renderCountries()}

        {/* 제출 중 */}
        {phase === 'submitting' && (
          <ActivityIndicator style={{ marginTop: 8 }} color="#2563EB" />
        )}

        {/* 정답 */}
        {phase === 'correct' && answer && (
          <View style={styles.resultArea}>
            <Text style={[styles.resultLabel, styles.resultCorrect]}>정답이에요!</Text>

            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>{streak}연속 정답 중</Text>
              </View>
            )}

            {renderAnswerDetail(answer)}

            {(streak >= STREAK_MILESTONE || answer.rewardEarned) ? (
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('/encyclopedia')}
              >
                <Text style={styles.secondaryBtnText}>학습 기록 보기</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={() => handleWatchAd(loadQuiz)}>
                <Text style={styles.primaryBtnText}>다음 문제</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 오답 */}
        {phase === 'wrong' && answer && (
          <View style={styles.resultArea}>
            <Text style={[styles.resultLabel, styles.resultWrong]}>틀렸어요</Text>
            {renderAnswerDetail(answer)}
            <Pressable style={styles.primaryBtn} onPress={() => handleWatchAd(loadQuiz)}>
              <Text style={styles.primaryBtnText}>광고 보고 다시 도전</Text>
            </Pressable>
          </View>
        )}

        {/* 에러 */}
        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Pressable style={styles.primaryBtn} onPress={loadQuiz}>
              <Text style={styles.primaryBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { padding: 20, gap: 14, flexGrow: 1 },

  header: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 },

  questionArea: { alignItems: 'center', gap: 4 },
  questionText: { fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 },
  questionSub: { fontSize: 13, color: '#9CA3AF' },

  cardsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vsLabel: { fontSize: 13, fontWeight: '800', color: '#CBD5E1' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 32 },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  // 시간 초과
  timeoutArea: { gap: 14 },
  statusCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  timeoutTitle: { fontSize: 22, fontWeight: '800', color: '#DC2626', letterSpacing: -0.5 },
  statusSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },

  // 결과
  resultArea: { gap: 12 },
  resultLabel: { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  resultCorrect: { color: '#059669' },
  resultWrong: { color: '#DC2626' },

  streakBadge: {
    alignSelf: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  streakBadgeText: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  // 상세 카드
  answerDetail: { gap: 10 },
  ratioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ratioText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  rateInfoBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateInfoBtnText: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  rateInfoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rateInfoText: { fontSize: 12, color: '#4B5563', lineHeight: 18 },

  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailCardWinner: {
    borderColor: '#2563EB',
    borderWidth: 1.5,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailFlag: { fontSize: 30 },
  detailName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  detailContinent: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  winnerTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  winnerTagText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },

  detailGDP: { gap: 2 },
  detailGDPValue: { fontSize: 20, fontWeight: '800', color: '#4B5563', letterSpacing: -0.5 },
  detailGDPValueWinner: { color: '#2563EB' },
  detailGDPSub: { fontSize: 12, color: '#9CA3AF' },

  detailSection: { gap: 6 },
  detailSectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 12, color: '#4B5563' },
  detailResourceText: { fontSize: 13, color: '#4B5563', lineHeight: 19 },

  // 버튼
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
});
