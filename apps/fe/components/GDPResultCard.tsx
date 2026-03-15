import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>GDP 비교 결과</Text>

      {/* 두 나라 GDP 비교 */}
      <View style={styles.comparison}>
        <View style={styles.countryInfo}>
          <Text style={styles.flag}>{winner.flagEmoji}</Text>
          <Text style={styles.countryName}>{winner.nameKo}</Text>
          <Text style={styles.gdpValue}>{formatGDP(winner.gdpPerCapita)}</Text>
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerBadgeText}>1위</Text>
          </View>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.diffText}>
            +{formatGDP(diff)} 더 높아요
          </Text>
          <Text style={styles.ratioText}>{ratio}배 차이</Text>
        </View>

        <View style={styles.countryInfo}>
          <Text style={styles.flag}>{loser.flagEmoji}</Text>
          <Text style={styles.countryName}>{loser.nameKo}</Text>
          <Text style={styles.gdpValue}>{formatGDP(loser.gdpPerCapita)}</Text>
        </View>
      </View>

      {/* 주요 산업 */}
      <View style={styles.industries}>
        {countries.map((c) => (
          <View key={c.code} style={styles.industrySection}>
            <Text style={styles.industryTitle}>
              {c.flagEmoji} {c.nameKo} 주요 산업
            </Text>
            <View style={styles.tags}>
              {c.mainIndustries.map((industry) => (
                <View key={industry} style={styles.tag}>
                  <Text style={styles.tagText}>{industry}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191F28',
    textAlign: 'center',
  },
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countryInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  flag: {
    fontSize: 32,
  },
  countryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191F28',
    textAlign: 'center',
  },
  gdpValue: {
    fontSize: 13,
    color: '#3182F6',
    fontWeight: '700',
  },
  winnerBadge: {
    backgroundColor: '#FFD600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  winnerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#191F28',
  },
  vsContainer: {
    alignItems: 'center',
    gap: 4,
  },
  vs: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B95A1',
  },
  diffText: {
    fontSize: 11,
    color: '#3182F6',
    fontWeight: '600',
    textAlign: 'center',
  },
  ratioText: {
    fontSize: 11,
    color: '#8B95A1',
  },
  industries: {
    gap: 12,
  },
  industrySection: {
    gap: 8,
  },
  industryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E5968',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F2F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    color: '#4E5968',
    fontWeight: '500',
  },
});
