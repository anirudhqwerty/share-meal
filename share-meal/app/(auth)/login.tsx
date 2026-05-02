import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { authService } from '@/services/auth.service';

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: 'donor' | 'ngo' }>();
  const normalizedRole = role === 'donor' || role === 'ngo' ? role : null;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isNgo = normalizedRole === 'ngo';

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
  };

  const validate = () => {
    clearErrors();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!normalizedRole) {
      Alert.alert('Role required', 'Please choose your role first.');
      router.replace('/(auth)/welcome');
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'register') {
        const signUpRes = await authService.signUpWithPassword(email.trim().toLowerCase(), password);
        if (!signUpRes.session) {
          Alert.alert(
            'Email confirmation enabled',
            'Your Supabase project is requiring email confirmation, so no access token is created yet. Disable email confirmations in Supabase Auth settings, or confirm the email first, then login.'
          );
          return;
        }
        // Brand-new signup — always needs to complete profile
        router.replace({ pathname: '/(auth)/register', params: { role: normalizedRole } });
      } else {
        const signInRes = await authService.signInWithPassword(email.trim().toLowerCase(), password);
        if (!signInRes.session) {
          Alert.alert('Login failed', 'No active session received from Supabase.');
          return;
        }
        // AuthGuard will route to the right dashboard (or register) once loadUser completes.
      }
    } catch (e: any) {
      Alert.alert(mode === 'register' ? 'Registration Failed' : 'Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(350)} style={[styles.rolePill, { backgroundColor: isNgo ? Colors.secondaryLight : Colors.primaryLight }]}>
            <Ionicons
              name={isNgo ? 'people' : 'restaurant'}
              size={16}
              color={isNgo ? Colors.secondary : Colors.primary}
            />
            <Text style={[styles.roleLabel, { color: isNgo ? Colors.secondary : Colors.primary }]}>
              {isNgo ? 'NGO Account' : 'Donor Account'}
            </Text>
          </Animated.View>

          <View style={styles.switcher}>
            <TouchableOpacity
              onPress={() => setMode('login')}
              style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]}
            >
              <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('register')}
              style={[styles.switchBtn, mode === 'register' && styles.switchBtnActive]}
            >
              <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Sign in with email and password to continue.'
              : 'Register with email/password first, then complete your role profile.'}
          </Text>

          <Input
            label="Email Address"
            leftIcon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            returnKeyType="next"
          />
          <Input
            label="Password"
            leftIcon="lock-closed-outline"
            placeholder="Minimum 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            returnKeyType={mode === 'register' ? 'next' : 'done'}
          />
          {mode === 'register' && (
            <Input
              label="Confirm Password"
              leftIcon="shield-checkmark-outline"
              placeholder="Re-enter password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          )}
          <Button
            title={mode === 'login' ? 'Login & Continue' : 'Register & Continue'}
            onPress={handleContinue}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.btn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 40 },
  back: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, marginBottom: 16,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: 22,
  },
  switchBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  switchBtnActive: {
    backgroundColor: Colors.white,
  },
  switchText: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },
  switchTextActive: { color: Colors.text },
  roleLabel: { ...Typography.label, fontSize: 13 },
  title: { ...Typography.h1, color: Colors.text, marginBottom: 8 },
  subtitle: { ...Typography.bodyLg, color: Colors.textSecondary, marginBottom: 32, lineHeight: 24 },
  btn: { marginTop: 8 },
});
