import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DonationCard } from '@/components/DonationCard';
import { DonationCardSkeletonList } from '@/components/skeletons/DonationCardSkeleton';
import { Colors, Spacing, Radius, Typography, Shadow } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { donationsService } from '@/services/donations.service';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

type StatusFilter = 'all' | 'claimed' | 'available' | 'expired';

const STATUS_META: Record<StatusFilter, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
}> = {
  all:       { icon: 'list-outline',            color: Colors.text,    bg: Colors.surface,      label: 'All' },
  claimed:   { icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successBg,   label: 'Claimed' },
  available: { icon: 'leaf-outline',             color: Colors.primary, bg: Colors.primaryLight, label: 'Active' },
  expired:   { icon: 'close-circle-outline',     color: Colors.error,   bg: Colors.errorBg,     label: 'Expired' },
};

export default function DonorHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await donationsService.getMyDonations();
      setDonations(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load donations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completed = donations.filter((d) => d.status === 'claimed');
  const expired = donations.filter((d) => d.status === 'expired');
  const active = donations.filter((d) => d.status === 'available' || d.status === 'pending');
  // Meals estimate: labelled as estimate to be honest with users
  const mealsEstimate = completed.length * 10;

  const counts: Record<StatusFilter, number> = {
    all: donations.length,
    claimed: completed.length,
    available: active.length,
    expired: expired.length,
  };

  const filtered = filter === 'all' ? donations : donations.filter((d) => {
    if (filter === 'available') return d.status === 'available' || d.status === 'pending';
    return d.status === filter;
  });

  const header = (
    <>
      <ScreenHeader title="Your impact" />

      {/* Impact stat cards */}
      <Animated.View entering={FadeIn.duration(350)} style={styles.impactCard}>
        <View style={styles.impactMain}>
          <Text style={styles.impactNumber}>{mealsEstimate}</Text>
          <Text style={styles.impactLabel}>Estimated meals provided</Text>
          <Text style={styles.impactNote}>Based on ~10 meals per claimed donation</Text>
        </View>
        <View style={styles.impactDivider} />
        <View style={styles.impactStats}>
          {[
            { icon: 'checkmark-circle' as const, val: completed.length, lbl: 'Claimed', col: Colors.success, bg: Colors.successBg },
            { icon: 'leaf' as const,              val: active.length,    lbl: 'Active',  col: Colors.primary, bg: Colors.primaryLight },
            { icon: 'close-circle' as const,      val: expired.length,   lbl: 'Expired', col: Colors.error,   bg: Colors.errorBg },
          ].map((s) => (
            <View key={s.lbl} style={styles.impactStatItem}>
              <View style={[styles.impactStatIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={16} color={s.col} />
              </View>
              <Text style={[styles.impactStatNum, { color: s.col }]}>{s.val}</Text>
              <Text style={styles.impactStatLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Filter strip */}
      <View style={styles.filterRow}>
        {(Object.keys(STATUS_META) as StatusFilter[]).map((f) => {
          const meta = STATUS_META[f];
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
              <Ionicons name={meta.icon} size={12} color={active ? meta.color : Colors.textMuted} />
              <Text style={[styles.filterText, active && { color: meta.color, fontWeight: '700' }]}>
                {meta.label}
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

      <Text style={styles.sectionTitle}>
        {filter === 'all' ? 'All donations' : `${STATUS_META[filter].label} donations`}
      </Text>
    </>
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
          <DonationCardSkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
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
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
              <DonationCard
                donation={item}
                onPress={() =>
                  router.push({ pathname: '/(donor)/donation/[id]', params: { id: item.id } })
                }
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[
                styles.emptyIconWrap,
                { backgroundColor: STATUS_META[filter].bg },
              ]}>
                <Ionicons
                  name={STATUS_META[filter].icon}
                  size={38}
                  color={filter === 'all' ? Colors.primary : STATUS_META[filter].color}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No donations yet' : `No ${STATUS_META[filter].label.toLowerCase()} donations`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'all'
                  ? 'Your history will appear here after you post your first donation.'
                  : 'Try a different filter.'}
              </Text>
              {filter !== 'all' && (
                <TouchableOpacity style={styles.resetBtn} onPress={() => setFilter('all')}>
                  <Text style={styles.resetBtnText}>Show all</Text>
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
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 120 },
  loadingWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 120 },

  impactCard: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md, marginTop: Spacing.sm,
    overflow: 'hidden', ...Shadow.sm,
  },
  impactMain: {
    alignItems: 'center', paddingVertical: Spacing.lg,
    backgroundColor: Colors.primaryLight,
  },
  impactNumber: {
    fontSize: 52, fontWeight: '900', color: Colors.primary,
    lineHeight: 58,
  },
  impactLabel: { ...Typography.h4, color: Colors.text, marginTop: 4, fontSize: 15 },
  impactNote: { ...Typography.caption, color: Colors.textMuted, marginTop: 2, fontSize: 11 },
  impactDivider: { height: 1, backgroundColor: Colors.border },
  impactStats: {
    flexDirection: 'row', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
  },
  impactStatItem: { flex: 1, alignItems: 'center', gap: 5 },
  impactStatIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  impactStatNum: { fontSize: 18, fontWeight: '800' },
  impactStatLbl: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11 },

  filterRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: Spacing.md },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
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

  sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { ...Typography.caption, color: Colors.error, flex: 1 },
  retryText: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 48, gap: 10, paddingHorizontal: Spacing.lg },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginTop: 4 },
  emptySub: {
    ...Typography.body, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  resetBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
  },
  resetBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '700', fontSize: 13 },
});