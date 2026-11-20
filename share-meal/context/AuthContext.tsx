import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { getSupabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { getNativeNotifications, supportsNativePush } from '@/lib/notifications';

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
  authError: string | null;
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
  authError: null,
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const loadVersion = useRef(0);

  const hydrateFromCache = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet(Object.values(CACHE_KEYS));
      const map = Object.fromEntries(entries) as Record<string, string | null>;
      const cachedUser = map[CACHE_KEYS.user] ? JSON.parse(map[CACHE_KEYS.user] as string) : null;
      const cachedProfile = map[CACHE_KEYS.profile] ? JSON.parse(map[CACHE_KEYS.profile] as string) : null;
      const cachedRole = (map[CACHE_KEYS.role] || null) as UserRole;
      const cachedRegistered = map[CACHE_KEYS.isRegistered] === '1';
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session || cachedUser?.id !== session.user.id || !['donor', 'ngo'].includes(cachedRole || '')) return;
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedRole) setRole(cachedRole);
      if (cachedRegistered) setIsRegistered(true);
    } catch {
      // ignore
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setAuthError(null);
    try {
      const { data: { session }, error: sessionError } = await getSupabase().auth.getSession();
      if (sessionError) throw sessionError;
      if (version !== loadVersion.current) return;
      if (!session) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsRegistered(false);
        await clearCache();
        return;
      }

      let appUser: AuthUser | undefined;
      let appProfile: Profile | null = null;
      try {
        ({ user: appUser, profile: appProfile } = await authService.getMe());
      } catch (error) {
        // A 404 is the backend's explicit "profile not created" response.
        // Network errors and server errors must not send registered users back to registration.
        if ((error as { status?: number })?.status !== 404) throw error;
      }

      if (version !== loadVersion.current) return;
      if (appUser) {
        const registrationComplete = Boolean(appUser.role && appProfile);
        setUser(appUser);
        setProfile(appProfile);
        setRole(appUser.role);
        setIsRegistered(registrationComplete);
        await writeCache({ user: appUser, profile: appProfile, role: appUser.role, isRegistered: registrationComplete });
      } else {
        // Supabase session exists but app_users row doesn't — user hasn't finished registration.
        const preferredRole = session.user.user_metadata?.preferred_role;
        const pendingRole = preferredRole === 'donor' || preferredRole === 'ngo' ? preferredRole : null;
        const sessionUser: AuthUser = { id: session.user.id, email: session.user.email || '', role: pendingRole };
        setUser(sessionUser);
        setProfile(null);
        setRole(pendingRole);
        setIsRegistered(false);
        await writeCache({ user: sessionUser, profile: null, role: null, isRegistered: false });
      }
    } catch (error) {
      if (version !== loadVersion.current) return;
      setAuthError(error instanceof Error ? error.message : 'Could not load your account. Check your connection and try again.');
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await hydrateFromCache();
      await loadUser();
    })();

    const { data: listener } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      if (session) {
        // Supabase warns against awaiting more Supabase work inside this callback.
        setTimeout(() => { void loadUser(); }, 0);
      } else {
        ++loadVersion.current;
        setAuthError(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsRegistered(false);
        setIsLoading(false);
        clearCache();
      }
    });
    return () => { ++loadVersion.current; listener.subscription.unsubscribe(); };
  }, [hydrateFromCache, loadUser]);

  useEffect(() => {
    if (!user?.id || !isRegistered || !supportsNativePush) return;
    let active = true;
    let tokenListener: { remove: () => void } | undefined;
    let registering = false;
    const expectedUserId = user.id;

    const registerPushToken = async () => {
      if (registering || !active) return;
      registering = true;
      try {
        const Notifications = await getNativeNotifications();
        if (!Notifications || !active) return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) { if (__DEV__) console.warn('Push registration needs an EAS project ID.'); return; }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('share-meal', {
            name: 'Share-Meal updates',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== 'granted' || !active) {
          if (active) await authService.updatePushToken(null);
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        const { data: { session } } = await getSupabase().auth.getSession();
        if (active && session?.user.id === expectedUserId) await authService.updatePushToken(token);
        if (!tokenListener && active) tokenListener = Notifications.addPushTokenListener(() => { void registerPushToken(); });
      } catch (error) {
        console.warn('Could not register for push notifications:', error instanceof Error ? error.message : error);
      } finally { registering = false; }
    };

    void registerPushToken();
    const appListener = AppState.addEventListener('change', (state) => { if (state === 'active') void registerPushToken(); });

    return () => {
      active = false;
      tokenListener?.remove();
      appListener.remove();
    };
  }, [user?.id, isRegistered]);

  const signOut = useCallback(async () => {
    try {
      await authService.updatePushToken(null);
    } catch {
      // Signing out must still work if the API is unavailable.
    }
    await authService.signOut();
    setAuthError(null);
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
        authError,
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
