import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';

interface Props {
  code: string;
  nameKo: string;
  nameEn: string;
  flagEmoji: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  result?: 'correct' | 'wrong' | null;
}

export function CountryCard({ nameKo, nameEn, flagEmoji, onPress, selected, disabled, result }: Props) {
  const borderColor =
    result === 'correct' ? '#059669' :
    result === 'wrong'   ? '#E5E7EB' :
    selected             ? '#2563EB' : '#E5E7EB';

  const bgColor =
    result === 'correct' ? '#F0FDF4' :
    result === 'wrong'   ? '#F9FAFB' :
    selected             ? '#EEF2FF' : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, { borderColor, backgroundColor: bgColor }]}
    >
      <Text style={styles.flag}>{flagEmoji}</Text>
      <Text style={styles.nameKo}>{nameKo}</Text>
      <Text style={styles.nameEn}>{nameEn}</Text>
      {result === 'correct' && (
        <View style={styles.correctBadge}>
          <Text style={styles.correctBadgeText}>정답</Text>
        </View>
      )}
      {result === 'wrong' && (
        <View style={styles.wrongBadge}>
          <Text style={styles.wrongBadgeText}>오답</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    minHeight: 156,
    justifyContent: 'center',
  },
  flag: { fontSize: 44 },
  nameKo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  nameEn: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  correctBadge: {
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  correctBadgeText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  wrongBadge: {
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wrongBadgeText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
});
