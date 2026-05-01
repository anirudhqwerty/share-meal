import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';

type UserRole = 'donor' | 'ngo' | null;

interface Profile {
  organization_name?: string;
  ngo_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notification_radius_km?: number;
  registration_number?: string;
}

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  phone?: string;
  expo_push_token?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isRegistered: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isRegistered: false,
  refreshUser: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null); setProfile(null); setRole(null); setIsRegistered(false);
        return;
      }

      const { user: appUser, profile: appProfile } = await authService.getMe();
      setUser(appUser);
      setProfile(appProfile);
      setRole(appUser.role);
      setIsRegistered(true);
    } catch {
      // Not registered yet — Supabase session exists but no app_users row
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser({ id: session.user.id, email: session.user.email!, role: null });
        setIsRegistered(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadUser();
      else { setUser(null); setProfile(null); setRole(null); setIsRegistered(false); setIsLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadUser]);

  const signOut = async () => {
    await authService.signOut();
    setUser(null); setProfile(null); setRole(null); setIsRegistered(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, isLoading, isRegistered, refreshUser: loadUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
