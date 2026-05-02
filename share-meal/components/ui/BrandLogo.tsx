import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

type Variant = 'plain' | 'contained' | 'onDark';

interface BrandLogoProps {
  size?: number;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/**
 * BrandLogo - the Share-Meal mark.
 *
 * Variants:
 *  - "plain"      : bare logo, rounded square, no card (use in headers).
 *  - "contained"  : soft light chip (use on white/light backgrounds).
 *  - "onDark"     : translucent white chip with soft highlight (use on
 *                   colored / gradient hero backgrounds).
 */
export function BrandLogo({
  size = 48,
  variant = 'plain',
  style,
  imageStyle,
}: BrandLogoProps) {
  const radius = Math.round(size * 0.28);
  const padding = variant === 'plain' ? 0 : Math.max(4, Math.round(size * 0.1));

  const chipStyle: ViewStyle =
    variant === 'contained'
      ? {
          backgroundColor: Colors.white,
          borderWidth: 1,
          borderColor: Colors.border,
        }
      : variant === 'onDark'
      ? {
          backgroundColor: 'rgba(255,255,255,0.16)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.22)',
        }
      : {};

  const imgSize = size - padding * 2;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radius, padding },
        chipStyle,
        style,
      ]}
    >
      <Image
        source={require('@/assets/images/applogo.png')}
        style={[
          {
            width: imgSize,
            height: imgSize,
            borderRadius: Math.round(imgSize * 0.25),
          },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
