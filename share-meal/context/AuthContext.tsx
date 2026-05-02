import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  isHydrated: boolean;
  isRegistered: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isHydrated: false,
  isRegistered: false,
  refreshUser: async () => {},
  signOut: async () => {},
});

const CACHE_KEYS = {
  user: 'auth.cache.user.v1',
  profile: 'auth.cache.profile.v1',
  role: 'auth.cache.role.v1',
  isRegistered: 'auth.cache.isRegistered.v1',
};

async function writeCache(payload: {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole;
  isRegistered: boolean;
}) {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEYS.user, JSON.stringify(payload.user)],
      [CACHE_KEYS.profile, JSON.stringify(payload.profile)],
      [CACHE_KEYS.role, payload.role ?? ''],
      [CACHE_KEYS.isRegistered, payload.isRegistered ? '1' : '0'],
    ]);
  } catch {
    // ignore
  }
}

async function clearCache() {
  try {
    await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const hasHydratedRef = useRef(false);

  const hydrateFromCache = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet(Object.values(CACHE_KEYS));
      const map = Object.fromEntries(entries) as Record<string, string | null>;
      const cachedUser = map[CACHE_KEYS.user] ? JSON.parse(map[CACHE_KEYS.user] as string) : null;
      const cachedProfile = map[CACHE_KEYS.profile] ? JSON.parse(map[CACHE_KEYS.profile] as string) : null;
      const cachedRole = (map[CACHE_KEYS.role] || null) as UserRole;
      const cachedRegistered = map[CACHE_KEYS.isRegistered] === '1';
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedRole) setRole(cachedRole);
      if (cachedRegistered) setIsRegistered(true);
    } catch {
      // ignore
    } finally {
      hasHydratedRef.current = true;
      setIsHydrated(true);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsRegistered(false);
        await clearCache();
        return;
      }

      try {
        const { user: appUser, profile: appProfile } = await authService.getMe();
        setUser(appUser);
        setProfile(appProfile);
        setRole(appUser.role);
        setIsRegistered(Boolean(appUser.role));
        await writeCache({ user: appUser, profile: appProfile, role: appUser.role, isRegistered: Boolean(appUser.role) });
      } catch {
        // Supabase session exists but app_users row doesn't — user hasn't finished registration
        const sessionUser: AuthUser = { id: session.user.id, email: session.user.email!, role: null };
        setUser(sessionUser);
        setProfile(null);
        setRole(null);
        setIsRegistered(false);
        await writeCache({ user: sessionUser, profile: null, role: null, isRegistered: false });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await hydrateFromCache();
      await loadUser();
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUser();
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsRegistered(false);
        setIsLoading(false);
        clearCache();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [hydrateFromCache, loadUser]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setIsRegistered(false);
    await clearCache();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isHydrated,
        isRegistered,
        refreshUser: loadUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
