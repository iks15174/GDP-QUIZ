import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { api, EncyclopediaCountry } from '../services/api';
import { useUserId } from '../hooks/useUserId';

export const Route = createRoute('/encyclopedia', {
  component: EncyclopediaPage,
});

const KRW_RATE = 1380;

function formatGDP(gdp: number): string {
  const krw = Math.round(gdp * KRW_RATE);
  if (krw >= 100_000_000) return (krw / 100_000_000).toFixed(1) + '억원';
  return Math.round(krw / 10_000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만원';
}

function CountryRow({ country }: { country: EncyclopediaCountry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable style={styles.row} onPress={() => setExpanded((v) => !v)}>
      <View style={styles.rowMain}>
        <Text style={styles.rowFlag}>{country.flagEmoji}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{country.nameKo}</Text>
          <Text style={styles.rowGDP}>{formatGDP(country.gdpPerCapita)} / 인</Text>
        </View>
        <Text style={styles.rowChevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.rowDetail}>
          {country.continent && (
            <Text style={styles.detailContinent}>{country.continent}</Text>
          )}
          <Text style={styles.detailLabel}>주요 산업</Text>
          <View style={styles.tags}>
            {country.mainIndustries.map((ind) => (
              <View key={ind} style={styles.tag}>
                <Text style={styles.tagText}>{ind}</Text>
              </View>
            ))}
          </View>
          {country.mainResource && (
            <>
              <Text style={styles.detailLabel}>주요 자원</Text>
              <Text style={styles.resourceText}>{country.mainResource}</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

function EncyclopediaPage() {
  const navigation = Route.useNavigation();
  const userId = useUserId();
  const [countries, setCountries] = useState<EncyclopediaCountry[]>([]);
  const [totalCountries, setTotalCountries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    api
      .getEncyclopedia(userId)
      .then((res) => {
        setCountries(res.countries);
        setTotalCountries(res.totalCountries);
      })
      .catch(() => setError('데이터를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.title}>내 학습 기록</Text>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color="#2563EB" />
          </View>
        )}

        {!loading && error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {!loading && countries.length === 0 && error === '' && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 학습한 나라가 없어요</Text>
            <Text style={styles.emptySub}>퀴즈를 풀고 나라들을 수집해보세요</Text>
            <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('/')}>
              <Text style={styles.primaryBtnText}>퀴즈 풀러 가기</Text>
            </Pressable>
          </View>
        )}

        {!loading && totalCountries > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>학습 진행률</Text>
                <Text style={styles.progressSub}>전체 {totalCountries}개국 중 {countries.length}개국</Text>
              </View>
              <Text style={styles.progressPercent}>
                {Math.round((countries.length / totalCountries) * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((countries.length / totalCountries) * 100, 100)}%` as any },
                ]}
              />
            </View>
          </View>
        )}

        {countries.length > 0 && (
          <View style={styles.list}>
            <Text style={styles.listMeta}>{countries.length}개국 학습 완료</Text>
            {countries.map((c) => (
              <CountryRow key={c.code} country={c} />
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { padding: 20, gap: 16, flexGrow: 1 },

  header: { alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 },

  center: { flex: 1, alignItems: 'center', paddingVertical: 40 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 13, color: '#9CA3AF' },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  progressSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  progressPercent: { fontSize: 28, fontWeight: '900', color: '#2563EB', letterSpacing: -1 },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%' as any,
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },

  list: { gap: 8 },
  listMeta: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowFlag: { fontSize: 30 },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  rowGDP: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  rowChevron: { fontSize: 10, color: '#CBD5E1' },

  rowDetail: { marginTop: 14, gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  detailContinent: { fontSize: 12, color: '#9CA3AF' },
  detailLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 12, color: '#4B5563' },
  resourceText: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
});
