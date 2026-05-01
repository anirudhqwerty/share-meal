import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  text: { ...Typography.body, color: Colors.textSecondary, marginTop: 12 },
});
