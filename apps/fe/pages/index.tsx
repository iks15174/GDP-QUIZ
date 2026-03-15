import React from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { useAd } from '../hooks/useAd';
import { useDailyFreePlay } from '../hooks/useDailyFreePlay';

export const Route = createRoute('/', {
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigation = Route.useNavigation();
  const { showAd } = useAd();
  const { canFreePlay, consumeFreePlay } = useDailyFreePlay();

  const handleStartQuiz = () => {
    if (canFreePlay) {
      consumeFreePlay();
      navigation.navigate('/quiz');
    } else {
      showAd(
        () => { navigation.navigate('/quiz'); },
        () => { /* 광고 미완료 */ }
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.hero}>
          <Text style={styles.title}>GDP{'\n'}스피드 퀴즈</Text>
          <Text style={styles.subtitle}>
            두 나라 중 1인당 GDP가 더 높은 나라를 맞춰보세요
          </Text>
        </View>

        <View style={styles.rulesCard}>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleNum}>1</Text>
            <Text style={styles.ruleText}>5초 안에 GDP가 더 높은 나라를 고르세요</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.ruleRow}>
            <Text style={styles.ruleNum}>2</Text>
            <Text style={styles.ruleText}>틀리거나 시간이 초과되면 광고를 보고 이어서 도전할 수 있어요</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.ruleRow}>
            <Text style={[styles.ruleNum, styles.ruleNumGold]}>3</Text>
            <Text style={styles.ruleText}>
              3번 연속 맞추면{' '}
              <Text style={styles.ruleHighlight}>1원 지급</Text>
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={handleStartQuiz}>
            <Text style={styles.primaryBtnText}>퀴즈 시작하기</Text>
          </Pressable>
          {canFreePlay && (
            <Text style={styles.freeNote}>오늘 첫 도전은 무료예요</Text>
          )}
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('/encyclopedia')}
          >
            <Text style={styles.secondaryBtnText}>내 학습 기록 보기</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FA' },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 24,
  },

  hero: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1.5,
    textAlign: 'center',
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },

  rulesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  ruleNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    width: 18,
    lineHeight: 21,
  },
  ruleNumGold: {
    color: '#D97706',
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },
  ruleHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: -20,
  },

  actions: {
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  freeNote: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginTop: -2,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
});
