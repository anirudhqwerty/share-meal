import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
}

export function ScreenHeader({ title, showBack = false }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      {showBack ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
      ) : (
        <BrandLogo size={36} variant="plain" />
      )}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.mdSm,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { ...Typography.h3, color: Colors.text, flex: 1, textAlign: 'left', marginLeft: Spacing.mdSm },
  spacer: { width: 8 },
});
