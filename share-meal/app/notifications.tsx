import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsService } from '@/services/notifications.service';
import { NotificationItem } from '@/components/NotificationItem';
import { NotificationItemSkeletonList } from '@/components/skeletons/NotificationItemSkeleton';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getNativeNotifications } from '@/lib/notifications';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);
  const version = useRef(0);
  const hasOlderPages = useRef(false);

  const load = useCallback(async () => {
    const current = ++version.current;
    setError('');
    try {
      const data = await notificationsService.getPage();
      if (current !== version.current) return;
      setNotifications(data.notifications || []);
      setNextCursor(data.nextCursor || null);
    } catch (loadError: any) {
      if (current === version.current) setError(loadError.message || 'Could not load notifications.');
    } finally {
      if (current === version.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    const timer = setInterval(() => { if (!hasOlderPages.current) void load(); }, 30_000);
    let active = true;
    let listener: { remove: () => void } | undefined;
    void getNativeNotifications().then((module) => {
      if (active && module) listener = module.addNotificationReceivedListener(() => { if (!hasOlderPages.current) void load(); });
    }).catch(() => {});
    return () => { active = false; ++version.current; clearInterval(timer); listener?.remove(); };
  }, [load]));

  const loadMore = async () => {
    if (!nextCursor || loadingRef.current || refreshing) return;
    loadingRef.current = true; setLoadingMore(true);
    const current = version.current;
    try {
      const data = await notificationsService.getPage(nextCursor);
      if (current !== version.current) return;
      setNotifications((items) => [...items, ...(data.notifications || []).filter((item: any) => !items.some((existing) => existing.id === item.id))]);
      hasOlderPages.current = true;
      setNextCursor(data.nextCursor || null);
    } catch (error: any) { setError(error.message || 'Could not load older notifications.'); }
    finally { loadingRef.current = false; setLoadingMore(false); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markRead(id);
      ++version.current;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (actionError: any) {
      setError(actionError.message || 'Could not update this notification.');
    }
  };

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllRead();
      ++version.current;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (actionError: any) {
      setError(actionError.message || 'Could not update notifications.');
    } finally { setMarkingAll(false); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader title="Notifications" showBack />
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { setRefreshing(true); void load(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {unreadCount > 0 && (
        <TouchableOpacity accessibilityRole="button" disabled={markingAll} onPress={handleMarkAll} style={styles.markAll}>
          <Text style={styles.markAllText}>{markingAll ? 'Marking read…' : 'Mark all read'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.loadingWrap}>
          {header}
          <NotificationItemSkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { hasOlderPages.current = false; setRefreshing(true); void load(); }}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => {
              if (!item.is_read) void handleMarkRead(item.id);
              if (item.donation_id) router.push({ pathname: role === 'donor' ? '/(donor)/donation/[id]' : '/(ngo)/listing/[id]', params: { id: item.donation_id } });
            }} />
          )}
          onEndReached={() => { void loadMore(); }} onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
          ListEmptyComponent={!error ?
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={42} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Food and pickup updates will appear here.</Text>
            </View> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerWrap: {
    paddingHorizontal: 0,
    paddingTop: Spacing.sm,
    paddingBottom: 12,
    gap: 10,
  },
  markAll: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 48, justifyContent: 'center',
    borderRadius: 20,
  },
  markAllText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: Spacing.sm, borderRadius: 10 },
  errorText: { ...Typography.caption, color: Colors.error, flex: 1 },
  retryText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 32, width: '100%', maxWidth: 760, alignSelf: 'center' },
  loadingWrap: { paddingHorizontal: Spacing.lg, paddingBottom: 32, width: '100%', maxWidth: 760, alignSelf: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptySub: { ...Typography.body, color: Colors.textSecondary },
});
