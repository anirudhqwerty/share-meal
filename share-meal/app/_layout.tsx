import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getMissingConfiguration } from '@/constants/config';
import { Button } from '@/components/ui/Button';
import { getNativeNotifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard() {
  const { user, role, isLoading, isRegistered } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { role: selectedRole } = useGlobalSearchParams<{ role?: string }>();
  const hiddenRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!hiddenRef.current) {
      hiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }

    const group = segments[0];
    const inAuth = group === '(auth)';
    const inDonor = group === '(donor)';
    const inNgo = group === '(ngo)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/welcome');
      return;
    }

    if (!isRegistered) {
      const last = segments[segments.length - 1];
      if (last !== 'register') {
        router.replace({ pathname: '/(auth)/register', params: { role: role || (selectedRole === 'ngo' ? 'ngo' : 'donor') } });
      }
      return;
    }

    if (inAuth) {
      if (role === 'donor') router.replace('/(donor)');
      else if (role === 'ngo') router.replace('/(ngo)');
      return;
    }

    if (group === 'notifications') return;

    if (role === 'donor' && !inDonor) router.replace('/(donor)');
    if (role === 'ngo' && !inNgo) router.replace('/(ngo)');
  }, [user, role, isLoading, isRegistered, segments, router, selectedRole]);

  return null;
}

export default function RootLayout() {
  const missingConfiguration = getMissingConfiguration();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {missingConfiguration.length > 0 ? (
          <ConfigurationRequired missing={missingConfiguration} />
        ) : (
          <AuthProvider>
            <AppNavigation />
          </AuthProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigation() {
  const { authError, refreshUser, signOut, isLoading, isRegistered, user } = useAuth();
  const router = useRouter();
  const [pendingNotification, setPendingNotification] = useState(false);

  useEffect(() => {
    if (authError) SplashScreen.hideAsync().catch(() => {});
  }, [authError]);

  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | undefined;
    void getNativeNotifications().then((Notifications) => {
      if (!Notifications || !active) return;
      Notifications.setNotificationHandler({ handleNotification: async () => ({
        shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
      }) });
      const openNotifications = () => {
        if (!active) return;
        setPendingNotification(true);
        Notifications.clearLastNotificationResponse();
      };
      subscription = Notifications.addNotificationResponseReceivedListener(openNotifications);
      if (Notifications.getLastNotificationResponse()) openNotifications();
    }).catch((error) => console.warn('Notification listener unavailable:', error.message));
    return () => { active = false; subscription?.remove(); };
  }, []);
  useEffect(() => {
    if (pendingNotification && !isLoading && isRegistered && user) {
      setPendingNotification(false);
      router.push('/notifications');
    }
  }, [pendingNotification, isLoading, isRegistered, user, router]);

  if (authError) {
    return (
      <SafeAreaView style={styles.setupSafe}>
        <View style={styles.setupContent}>
          <Text style={styles.setupTitle}>Can’t load your account</Text>
          <Text style={styles.setupBody}>{authError}</Text>
          <Button title="Try again" onPress={() => { void refreshUser(); }} fullWidth />
          <Button title="Sign out" variant="outline" onPress={() => { void signOut(); }} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(donor)" />
        <Stack.Screen name="(ngo)" />
        <Stack.Screen name="notifications" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </>
  );
}

function ConfigurationRequired({ missing }: { missing: string[] }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    if (__DEV__) console.warn('Missing application configuration:', missing.join(', '));
  }, [missing]);

  return (
    <SafeAreaView style={styles.setupSafe}>
      <View style={styles.setupContent}>
        <Text accessibilityRole="header" style={styles.setupTitle}>Share Meal is unavailable</Text>
        <Text style={styles.setupBody}>We couldn’t connect to the service. Please try opening the app again later.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  setupSafe: { flex: 1, backgroundColor: Colors.background },
  setupContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  setupIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  setupIconText: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  setupTitle: { ...Typography.h2, color: Colors.text },
  setupBody: { ...Typography.body, color: Colors.textSecondary, lineHeight: 23 },
  setupCard: { padding: Spacing.md, gap: 8, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  setupLabel: { ...Typography.label, color: Colors.text },
  setupCode: { ...Typography.body, color: Colors.primary, fontFamily: 'monospace' },
  setupHint: { ...Typography.caption, color: Colors.textMuted, lineHeight: 19 },
});
