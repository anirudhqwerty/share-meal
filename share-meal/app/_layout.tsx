import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard() {
  const { user, role, isLoading, isRegistered } = useAuth();
  const segments = useSegments();
  const router = useRouter();
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
        router.replace({ pathname: '/(auth)/register', params: { role: role || 'donor' } });
      }
      return;
    }

    if (inAuth) {
      if (role === 'donor') router.replace('/(donor)');
      else if (role === 'ngo') router.replace('/(ngo)');
      return;
    }

    if (role === 'donor' && !inDonor) router.replace('/(donor)');
    if (role === 'ngo' && !inNgo) router.replace('/(ngo)');
  }, [user, role, isLoading, isRegistered, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#F7F8FC' } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(donor)" />
          <Stack.Screen name="(ngo)" />
          <Stack.Screen name="notifications" options={{ headerShown: false, presentation: 'card' }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
