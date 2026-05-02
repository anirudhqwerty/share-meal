import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar as RNStatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BrandLogo } from '@/components/ui/BrandLogo';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const statusBarPad = Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : insets.top;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Hero — full-bleed gradient extending behind status bar */}
      <LinearGradient
        colors={['#FF6B35', '#FF8B5B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: statusBarPad + 24 }]}
      >
        <View style={styles.heroContent}>
          <BrandLogo size={76} variant="onDark" />
          <Text style={styles.appName}>Share Meal</Text>
          <Text style={styles.tagline}>
            Turning surplus food into{'\n'}someone's next meal
          </Text>
          <View style={styles.statRow}>
            {[['10K+', 'Meals'], ['200+', 'NGOs'], ['50+', 'Cities']].map(([val, lbl]) => (
              <View key={lbl} style={styles.statItem}>
                <Text style={styles.statValue}>{val}</Text>
                <Text style={styles.statLabel}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* CTA section — safe area applied only here */}
      <SafeAreaView style={styles.cta} edges={['bottom', 'left', 'right']}>
        <Text style={styles.ctaTitle}>Join the movement</Text>
        <Text style={styles.ctaSubtitle}>Select your role to get started</Text>

        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <TouchableOpacity
            style={[styles.roleCard, Shadow.md]}
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/(auth)/login', params: { role: 'donor' } });
            }}
          >
            <View style={[styles.roleIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="restaurant" size={24} color={Colors.primary} />
            </View>
            <View style={styles.roleText}>
              <Text style={styles.roleName}>I'm a Donor</Text>
              <Text style={styles.roleDesc}>Hotels, restaurants & individuals with surplus food</Text>
            </View>
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(350)}>
          <TouchableOpacity
            style={[styles.roleCard, Shadow.md]}
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/(auth)/login', params: { role: 'ngo' } });
            }}
          >
            <View style={[styles.roleIcon, { backgroundColor: Colors.secondaryLight }]}>
              <Ionicons name="people" size={24} color={Colors.secondary} />
            </View>
            <View style={styles.roleText}>
              <Text style={styles.roleName}>I'm an NGO</Text>
              <Text style={styles.roleDesc}>Organizations that distribute food to those in need</Text>
            </View>
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service & Privacy Policy
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  hero: {
    height: height * 0.46,
    justifyContent: 'flex-end',
    paddingBottom: 32,
    paddingHorizontal: Spacing.xl,
  },
  heroContent: { alignItems: 'center', gap: 2 },
  appName: {
    fontSize: 34, fontWeight: '800', color: Colors.white,
    letterSpacing: -1, marginTop: 14,
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.88)',
    textAlign: 'center', marginTop: 6, lineHeight: 22,
  },
  statRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: 22 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },

  cta: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  ctaTitle: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  ctaSubtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  roleIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  roleText: { flex: 1 },
  roleName: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  roleDesc: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 17 },
  chevronWrapper: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  terms: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    lineHeight: 17,
  },
});
