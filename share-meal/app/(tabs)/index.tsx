import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { role, isLoading, isRegistered } = useAuth();
  if (isLoading) return null;
  return <Redirect href={isRegistered ? role === 'ngo' ? '/(ngo)' : '/(donor)' : '/(auth)/welcome'} />;
}
