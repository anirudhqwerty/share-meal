import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { requestsService } from '@/services/requests.service';
import { RequestCard } from '@/components/RequestCard';
import { RequestCardSkeletonList } from '@/components/skeletons/RequestCardSkeleton';
import { Colors, Spacing, Radius, Typography, Shadow } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import Animated, { FadeInDown } from 'react-native-reanimated';

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
type Filter = typeof FILTERS[number];

const FILTER_META: Record<Filter, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  all:      { icon: 'list-outline',           color: Colors.text,       bg: Colors.surface },
  pending:  { icon: 'time-outline',            color: '#D97706',         bg: '#FEF3C7' },
  approved: { icon: 'checkmark-circle-outline', color: Colors.success,   bg: Colors.successBg },
  rejected: { icon: 'close-circle-outline',    color: Colors.error,      bg: Colors.errorBg },
};

export default function NgoMyRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await requestsService.getMine();
      setRequests(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? requests.length : requests.filter((r) => r.status === f).length;
    return acc;
  }, {} as Record<Filter, number>);

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="Your requests" />
      <Text style={styles.subtitle}>
        {requests.length} total pickup request{requests.length !== 1 ? 's' : ''}
      </Text>

      {/* Summary cards row */}
      {!loading && requests.length > 0 && (
        <View style={styles.summaryRow}>
          {(['pending', 'approved', 'rejected'] as const).map((f) => {
            const meta = FILTER_META[f];
            return (
              <TouchableOpacity
                key={f}
                style={[styles.summaryCard, { backgroundColor: meta.bg }, filter === f && styles.summaryCardActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
              >
                <Ionicons name={meta.icon} size={18} color={meta.color} />
                <Text style={[styles.summaryNum, { color: meta.color }]}>{counts[f]}</Text>
                <Text style={[styles.summaryLbl, { color: meta.color }]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const meta = FILTER_META[f];
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                active && { backgroundColor: meta.bg, borderColor: meta.color },
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={meta.icon}
                size={12}
                color={active ? meta.color : Colors.textMuted}
              />
              <Text style={[styles.filterText, active && { color: meta.color, fontWeight: '700' }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {counts[f] > 0 && (
                <View style={[styles.countDot, active && { backgroundColor: meta.color }]}>
                  <Text style={[styles.countDotText, active && { color: Colors.white }]}>
                    {counts[f]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          {header}
          <RequestCardSkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.secondary}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(260)}>
              <RequestCard
                request={item}
                mode="ngo"
                onPress={() =>
                  router.push({ pathname: '/(ngo)/listing/[id]', params: { id: item.donation_id } })
                }
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[
                styles.emptyIconWrap,
                { backgroundColor: FILTER_META[filter].bg },
              ]}>
                <Ionicons
                  name={FILTER_META[filter].icon}
                  size={38}
                  color={filter === 'all' ? Colors.secondary : FILTER_META[filter].color}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No requests yet' : `No ${filter} requests`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'all'
                  ? 'Browse available food and request a pickup to get started.'
                  : 'Try a different filter above.'}
              </Text>
              {filter !== 'all' && (
                <TouchableOpacity style={styles.resetBtn} onPress={() => setFilter('all')}>
                  <Text style={styles.resetBtnText}>Show all requests</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  loadingWrap: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  header: { paddingTop: Spacing.md, marginBottom: Spacing.md },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, marginBottom: 14 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: Radius.lg, paddingVertical: Spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  summaryCardActive: { borderColor: Colors.secondary },
  summaryNum: { fontSize: 20, fontWeight: '800' },
  summaryLbl: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },

  filterRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500', fontSize: 12 },
  countDot: {
    minWidth: 18, height: 18, paddingHorizontal: 5,
    borderRadius: 9, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countDotText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { ...Typography.caption, color: Colors.error, flex: 1 },
  retryText: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: Spacing.lg },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptySub: {
    ...Typography.body, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  resetBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.secondaryLight, borderRadius: Radius.full,
  },
  resetBtnText: { ...Typography.label, color: Colors.secondary, fontWeight: '700', fontSize: 13 },
});