import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <View style={styles.center}>
      <BrandLogo size={56} variant="contained" />
      <ActivityIndicator size="large" color={Colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 10 },
  text: { ...Typography.body, color: Colors.textSecondary, marginTop: 12 },
});
