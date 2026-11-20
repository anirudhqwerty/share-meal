import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function Button({ onPress, title, variant = 'primary', size = 'md', loading = false,
  disabled = false, style, textStyle, fullWidth = false }: ButtonProps) {
  const filled = variant === 'primary' || variant === 'danger';
  const [focused, setFocused] = useState(false);
  const color = filled ? Colors.white : variant === 'secondary' ? Colors.secondary : Colors.primary;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button"
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [styles.base, styles[variant], styles[size],
        fullWidth && styles.full, pressed && styles.pressed,
        focused && styles.focused, (disabled || loading) && styles.disabled, style]}>
      {loading && <ActivityIndicator color={color} size="small" />}
      <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  full: { width: '100%' },
  sm: { paddingHorizontal: 16 }, md: {}, lg: { minHeight: 52 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.secondaryLight },
  outline: { borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.card },
  ghost: { backgroundColor: Colors.primaryLight }, danger: { backgroundColor: Colors.error },
  pressed: { opacity: 0.85 }, focused: { outlineWidth: 2, outlineColor: Colors.text, outlineOffset: 3 },
  disabled: { opacity: 0.55 }, text: { fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
