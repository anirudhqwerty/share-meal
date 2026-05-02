import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsService } from '@/services/notifications.service';
import { NotificationItem } from '@/components/NotificationItem';
import { NotificationItemSkeletonList } from '@/components/skeletons/NotificationItemSkeleton';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await notificationsService.getAll();
    setNotifications(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    await notificationsService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAll = async () => {
    await notificationsService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader title="Notifications" showBack />
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAll} style={styles.markAll}>
          <Text style={styles.markAllText}>Mark all read ({unreadCount})</Text>
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
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handleMarkRead(item.id)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={42} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 12,
    gap: 10,
  },
  markAll: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  markAllText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  loadingWrap: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
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
