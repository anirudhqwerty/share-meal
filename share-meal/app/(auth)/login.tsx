import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { authService } from '@/services/auth.service';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: 'donor' | 'ngo' }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');

  const isNgo = role === 'ngo';

  const handleSendOtp = async () => {
    setEmailError('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authService.sendOtp(email);
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (!otp || otp.length < 6) {
      setOtpError('Enter the 6-digit code sent to your email');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      // Navigate to register profile — pass role
      router.replace({ pathname: '/(auth)/register', params: { role } });
    } catch (e: any) {
      setOtpError('Invalid code. Please try again.');
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

          <View style={[styles.rolePill, { backgroundColor: isNgo ? Colors.secondaryLight : Colors.primaryLight }]}>
            <Ionicons
              name={isNgo ? 'people' : 'restaurant'}
              size={16}
              color={isNgo ? Colors.secondary : Colors.primary}
            />
            <Text style={[styles.roleLabel, { color: isNgo ? Colors.secondary : Colors.primary }]}>
              {isNgo ? 'NGO Login' : 'Donor Login'}
            </Text>
          </View>

          <Text style={styles.title}>
            {step === 'email' ? 'Welcome back 👋' : 'Check your inbox 📬'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'Enter your email to receive a one-time login code'
              : `We've sent a 6-digit code to\n${email}`}
          </Text>

          {step === 'email' ? (
            <>
              <Input
                label="Email Address"
                leftIcon="mail-outline"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
              <Button
                title="Send Login Code"
                onPress={handleSendOtp}
                loading={loading}
                fullWidth
                size="lg"
                style={styles.btn}
              />
            </>
          ) : (
            <>
              <Input
                label="Verification Code"
                leftIcon="keypad-outline"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                error={otpError}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
              />
              <Button
                title="Verify & Continue"
                onPress={handleVerifyOtp}
                loading={loading}
                fullWidth
                size="lg"
                style={styles.btn}
              />
              <TouchableOpacity onPress={handleSendOtp} style={styles.resend}>
                <Text style={styles.resendText}>
                  Didn't receive it? <Text style={styles.resendLink}>Resend code</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  roleLabel: { ...Typography.label, fontSize: 13 },
  title: { ...Typography.h1, color: Colors.text, marginBottom: 8 },
  subtitle: { ...Typography.bodyLg, color: Colors.textSecondary, marginBottom: 32, lineHeight: 24 },
  btn: { marginTop: 8 },
  resend: { alignItems: 'center', marginTop: 20 },
  resendText: { ...Typography.body, color: Colors.textSecondary },
  resendLink: { color: Colors.primary, fontWeight: '600' },
});
