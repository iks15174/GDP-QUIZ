import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface Props {
  streak: number; // 0~3
}

export function StreakBar({ streak }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i <= streak && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.label}>3연속 정답 시 1원 적립</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: '#2563EB',
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
