import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { GDPResultCard } from '../components/GDPResultCard';
import { AnswerResponse } from '../services/api';
import { useAd } from '../hooks/useAd';

export const Route = createRoute('/result', {
  component: ResultPage,
});

const KRW_RATE = 1380;

function formatKRW(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

function ResultPage() {
  const navigation = Route.useNavigation();
  const { showAd } = useAd();
  const params = Route.useParams() as { answer: AnswerResponse };
  const { answer } = params;

  if (!answer) {
    navigation.goBack();
    return null;
  }

  const winner = answer.countries.find((c) => c.isCorrect)!;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 돌아가기</Text>
          </Pressable>
          <Text style={styles.title}>경제 학습</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* 정답 국가 하이라이트 */}
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerFlag}>{winner.flagEmoji}</Text>
          <Text style={styles.winnerName}>{winner.nameKo}의 1인당 GDP가 더 높아요</Text>
          <Text style={styles.winnerGDP}>{formatKRW(winner.gdpPerCapita)}</Text>
          <Text style={styles.winnerGDPSub}>
            ${Math.round(winner.gdpPerCapita).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
          </Text>
        </View>

        {/* GDP 상세 비교 */}
        <GDPResultCard countries={answer.countries as [typeof answer.countries[0], typeof answer.countries[1]]} />

        {/* 경제 상식 한줄 */}
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            1인당 GDP는 국가의 경제 규모를 인구로 나눈 값으로, 국민의 평균 생활 수준을 나타내요.
          </Text>
        </View>

        {/* 다음 문제 버튼 */}
        <Pressable
          style={styles.nextBtn}
          onPress={() => showAd(
            () => navigation.navigate('/quiz'),
            () => { /* 광고 미완료 */ }
          )}
        >
          <Text style={styles.nextBtnText}>다음 문제 풀기 →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { padding: 20, gap: 16, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backBtnText: { fontSize: 14, color: '#3182F6', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#191F28' },
  winnerBanner: {
    backgroundColor: '#EBF3FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  winnerFlag: { fontSize: 48 },
  winnerName: { fontSize: 16, fontWeight: '700', color: '#191F28', textAlign: 'center' },
  winnerGDP: { fontSize: 22, fontWeight: '800', color: '#3182F6' },
  winnerGDPSub: { fontSize: 13, color: '#8B95A1' },
  tipBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3182F6',
  },
  tipText: { fontSize: 13, color: '#4E5968', lineHeight: 20 },
  nextBtn: {
    backgroundColor: '#3182F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
