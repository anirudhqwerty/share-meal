import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { requestsService } from '@/services/requests.service';
import { RequestCard } from '@/components/RequestCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
type Filter = typeof FILTERS[number];

export default function NgoMyRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    const data = await requestsService.getMine();
    setRequests(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>My Requests</Text>
      <Text style={styles.subtitle}>{requests.length} total requests</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner text="Loading your requests…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            mode="ngo"
            onPress={() => router.push({ pathname: '/(ngo)/listing/[id]', params: { id: item.donation_id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.emptyTitle}>No {filter === 'all' ? '' : filter} requests</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  header: { paddingTop: Spacing.lg, marginBottom: Spacing.md },
  title: { ...Typography.h2, color: Colors.text },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, marginBottom: 14 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  filterText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.secondary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
});
