import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';

interface Props {
  remaining: number;
  total: number;
}

export function Timer({ remaining, total }: Props) {
  const animatedWidth = useRef(new Animated.Value(1)).current;
  const isUrgent = remaining <= 2;

  useEffect(() => {
    const ratio = remaining / total;
    if (remaining === total) {
      animatedWidth.setValue(1);
      return;
    }
    Animated.timing(animatedWidth, {
      toValue: ratio,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [remaining]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: widthInterpolated }, isUrgent && styles.fillUrgent]}
        />
      </View>
      <Text style={[styles.text, isUrgent && styles.textUrgent]}>{remaining}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  track: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  fillUrgent: {
    backgroundColor: '#DC2626',
  },
  text: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.5,
  },
  textUrgent: {
    color: '#DC2626',
  },
});
