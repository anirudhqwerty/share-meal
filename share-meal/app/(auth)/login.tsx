import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Alert } from '@/utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    if (loading) return;
    if (!normalizedRole) {
      Alert.alert('Role required', 'Please choose your role first.');
      router.replace('/(auth)/welcome');
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'register') {
        const signUpRes = await authService.signUpWithPassword(email.trim().toLowerCase(), password, normalizedRole);
        if (!signUpRes.session) {
          Alert.alert(
            'Check your email',
            'Open the confirmation link in your email, then return here to sign in.'
          );
          setMode('login');
          return;
        }
        // Brand-new signup — always needs to complete profile
        router.replace({ pathname: '/(auth)/register', params: { role: normalizedRole } });
      } else {
        const signInRes = await authService.signInWithPassword(email.trim().toLowerCase(), password);
        if (!signInRes.session) {
          Alert.alert('Sign-in incomplete', 'Please try signing in again.');
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.switcher}>
            <TouchableOpacity
              accessibilityRole="tab" accessibilityState={{ selected: mode === 'login' }} disabled={loading}
              onPress={() => { setMode('login'); clearErrors(); }}
              style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]}
            >
              <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="tab" accessibilityState={{ selected: mode === 'register' }} disabled={loading}
              onPress={() => { setMode('register'); clearErrors(); }}
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
              : `Create your ${isNgo ? 'NGO' : 'donor'} account, then add your organization details.`}
          </Text>

          <Input
            label="Email Address"
            leftIcon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
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
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            returnKeyType={mode === 'register' ? 'next' : 'done'}
            onSubmitEditing={mode === 'login' ? handleContinue : undefined}
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
            title={mode === 'login' ? 'Sign in' : 'Create account'}
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
  scroll: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 40 },
  back: {
    width: 48, height: 48, borderRadius: 12,
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
