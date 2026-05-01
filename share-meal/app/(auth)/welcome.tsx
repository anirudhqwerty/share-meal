import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Dimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C5A', '#FFB088']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍲</Text>
          </View>
          <Text style={styles.appName}>Share Meal</Text>
          <Text style={styles.tagline}>
            Turning surplus food into{'\n'}someone's next meal
          </Text>
          <View style={styles.statRow}>
            {[['10K+', 'Meals Shared'], ['200+', 'NGOs'], ['50+', 'Cities']].map(([val, lbl]) => (
              <View key={lbl} style={styles.statItem}>
                <Text style={styles.statValue}>{val}</Text>
                <Text style={styles.statLabel}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* CTA Section */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Join the movement</Text>
        <Text style={styles.ctaSubtitle}>Select your role to get started</Text>

        <TouchableOpacity
          style={[styles.roleCard, Shadow.md]}
          activeOpacity={0.88}
          onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'donor' } })}
        >
          <View style={[styles.roleIcon, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="restaurant" size={26} color={Colors.primary} />
          </View>
          <View style={styles.roleText}>
            <Text style={styles.roleName}>I'm a Donor</Text>
            <Text style={styles.roleDesc}>Hotels, restaurants & individuals with surplus food</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, Shadow.md]}
          activeOpacity={0.88}
          onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'ngo' } })}
        >
          <View style={[styles.roleIcon, { backgroundColor: Colors.secondaryLight }]}>
            <Ionicons name="people" size={26} color={Colors.secondary} />
          </View>
          <View style={styles.roleText}>
            <Text style={styles.roleName}>I'm an NGO</Text>
            <Text style={styles.roleDesc}>Organizations that distribute food to those in need</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service & Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  hero: { height: height * 0.48, justifyContent: 'flex-end', paddingBottom: 36, paddingHorizontal: Spacing.xl },
  heroContent: { alignItems: 'center' },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 34, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, lineHeight: 23 },
  statRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.white },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  cta: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  ctaTitle: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  ctaSubtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  roleIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roleText: { flex: 1 },
  roleName: { ...Typography.h4, color: Colors.text },
  roleDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  terms: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
});
