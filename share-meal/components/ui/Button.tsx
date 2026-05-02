import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, Radius, Shadow, Typography } from '@/constants/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  onPress, title, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => { scale.value = withSpring(0.98); };
  const onPressOut = () => { scale.value = withSpring(1); };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        disabled={isDisabled}
        style={[
          styles.base,
          styles[`size_${size}`],
          styles[`variant_${variant}`],
          fullWidth && { width: '100%' },
          isDisabled && styles.disabled,
          variant === 'primary' && Shadow.lg,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
        ) : (
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, flexDirection: 'row' },

  size_sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  size_md: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 50 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 32, minHeight: 58 },

  variant_primary: { backgroundColor: Colors.primary },
  variant_secondary: { backgroundColor: Colors.secondaryLight, borderWidth: 1.5, borderColor: Colors.secondary },
  variant_outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  variant_ghost: { backgroundColor: Colors.primaryLight },
  variant_danger: { backgroundColor: Colors.error },

  disabled: { opacity: 0.45 },

  text: { ...Typography.body, fontWeight: '700' },
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.secondary },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },
  text_danger: { color: Colors.white },

  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
});
