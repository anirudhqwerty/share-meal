import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { notificationsService } from '@/services/notifications.service';
import { NotificationItem } from '@/components/NotificationItem';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function NotificationsScreen() {
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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = async () => {
    await notificationsService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <LoadingSpinner text="Loading notifications…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll} style={styles.markAll}>
            <Text style={styles.markAllText}>Mark all read ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={() => handleMarkRead(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>No notifications yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { alignItems: 'flex-end', paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  markAll: { backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  markAllText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptySub: { ...Typography.body, color: Colors.textSecondary },
});
