import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createRoute } from '@granite-js/react-native';

export const Route = createRoute('/_404', {
  component: NotFoundPage,
});

function NotFoundPage() {
  const navigation = Route.useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>페이지를 찾을 수 없어요</Text>
      <Pressable style={styles.btn} onPress={() => navigation.navigate('/')}>
        <Text style={styles.btnText}>홈으로 가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#191F28' },
  btn: { backgroundColor: '#3182F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
