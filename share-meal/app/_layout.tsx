import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function AuthGuard() {
  const { user, role, isLoading, isRegistered } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inDonor = segments[0] === '(donor)';
    const inNgo = segments[0] === '(ngo)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/welcome');
      return;
    }

    if (!isRegistered) {
      router.replace('/(auth)/register');
      return;
    }

    if (role === 'donor' && !inDonor) router.replace('/(donor)/');
    if (role === 'ngo' && !inNgo) router.replace('/(ngo)/');
  }, [user, role, isLoading, isRegistered, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(donor)" />
        <Stack.Screen name="(ngo)" />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications', headerTintColor: '#FF6B35' }} />
      </Stack>
    </AuthProvider>
  );
}
