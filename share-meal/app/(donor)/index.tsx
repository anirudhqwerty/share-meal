import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { donationsService } from '@/services/donations.service';
import { DonationCard } from '@/components/DonationCard';
import { DonationCardSkeletonList } from '@/components/skeletons/DonationCardSkeleton';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';
import Animated, { FadeInDown, FadeIn, SlideInRight } from 'react-native-reanimated';
import { parseServerDate } from '@/utils/time';

type DashFilter = 'all' | 'active' | 'claimed' | 'expired';

const DASH_FILTERS: DashFilter[] = ['all', 'active', 'claimed', 'expired'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DonorDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashFilter, setDashFilter] = useState<DashFilter>('all');
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

  const now = Date.now();
  const isActive = (d: any) => {
    const exp = parseServerDate(d.expiry_time)?.getTime() ?? 0;
    return (d.status === 'available' || d.status === 'pending') && exp > now;
  };

  const stats = {
    active: donations.filter(isActive).length,
    claimed: donations.filter((d) => d.status === 'claimed').length,
    expired: donations.filter((d) => d.status === 'expired').length,
  };

  const filteredDonations = donations.filter((d) => {
    if (dashFilter === 'all') return true;
    if (dashFilter === 'active') return isActive(d);
    if (dashFilter === 'claimed') return d.status === 'claimed';
    if (dashFilter === 'expired') return d.status === 'expired';
    return true;
  });

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const STATS: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    filter: DashFilter;
  }[] = [
    { icon: 'leaf',             label: 'Active',   value: stats.active,  filter: 'active' },
    { icon: 'checkmark-circle', label: 'Claimed',  value: stats.claimed, filter: 'claimed' },
    { icon: 'close-circle',     label: 'Expired',  value: stats.expired, filter: 'expired' },
  ];

  const header = (
    <>
      <LinearGradient
        colors={['#FF6B35', '#FF8B5B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, Shadow.lg]}
      >
        {/* Top row */}
        <View style={styles.heroTop}>
          <View style={styles.heroTopLeft}>
            <BrandLogo size={40} variant="onDark" />
            <View style={styles.heroTitleBlock}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.orgName} numberOfLines={1}>
                {(profile as any)?.organization_name || 'Welcome back'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.headerBtn}>
              <Ionicons name="notifications-outline" size={17} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={17} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.heroSub}>Every donation makes a difference. Keep sharing!</Text>

        {/* Stat chips */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.statCard, dashFilter === s.filter && styles.statCardActive]}
              onPress={() => setDashFilter(dashFilter === s.filter ? 'all' : s.filter)}
              activeOpacity={0.85}
            >
              <View style={styles.statIcon}>
                <Ionicons name={s.icon} size={15} color={Colors.white} />
              </View>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(80).duration(280)}>
        <TouchableOpacity
          style={[styles.postBtn, Shadow.lg]}
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(donor)/new-donation');
          }}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8B5B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postBtnGradient}
          >
            <View style={styles.postBtnIconWrap}>
              <Ionicons name="add" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.postBtnText}>Post food now</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="arrow-forward-circle" size={22} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Error inline */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section header */}
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionTitle}>
            {dashFilter === 'all' ? 'Your donations' : `${dashFilter.charAt(0).toUpperCase() + dashFilter.slice(1)} donations`}
          </Text>
          <Text style={styles.sectionSub}>
            {filteredDonations.length} item{filteredDonations.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(donor)/history')}
          style={styles.seeAllBtn}
        >
          <Text style={styles.sectionLink}>See all</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.loadingWrap}>
          {header}
          <DonationCardSkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={filteredDonations}
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
            <Animated.View entering={FadeInDown.delay(index * 45).duration(260)}>
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
              <View style={styles.emptyIconWrap}>
                <Ionicons name="restaurant-outline" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {dashFilter === 'all' ? 'No donations yet' : `No ${dashFilter} donations`}
              </Text>
              <Text style={styles.emptySub}>
                {dashFilter === 'all'
                  ? 'Post your first food donation and start making an impact!'
                  : 'Try clearing the filter to see all donations.'}
              </Text>
              {dashFilter !== 'all' && (
                <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setDashFilter('all')}>
                  <Text style={styles.clearFilterText}>Show all donations</Text>
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120, paddingTop: Spacing.sm },
  loadingWrap: { paddingHorizontal: Spacing.lg, paddingBottom: 120, paddingTop: Spacing.sm },

  heroCard: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    paddingTop: Spacing.md, marginBottom: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 10, marginBottom: 12,
  },
  heroTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  heroTitleBlock: { flex: 1 },
  greeting: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500', letterSpacing: 0.3 },
  orgName: { ...Typography.h3, color: Colors.white, marginTop: 1, fontSize: 16 },
  heroSub: {
    ...Typography.caption, color: 'rgba(255,255,255,0.82)',
    marginBottom: 14, fontSize: 12, lineHeight: 18,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    padding: 11, borderRadius: Radius.md,
  },
  statCardActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderColor: 'rgba(255,255,255,0.55)',
  },
  statIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  statVal: { fontSize: 20, fontWeight: '800', color: Colors.white },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.88)', fontWeight: '500' },

  postBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  postBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 15, paddingHorizontal: Spacing.lg,
  },
  postBtnIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtnText: { ...Typography.h4, color: Colors.white, fontSize: 15, fontWeight: '700' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: '#FCA5A5',
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.caption, color: Colors.error, flex: 1 },
  retryText: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },

  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, color: Colors.text },
  sectionSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLink: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 48, gap: 8, paddingHorizontal: Spacing.lg },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptySub: {
    ...Typography.body, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  clearFilterBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
  },
  clearFilterText: { ...Typography.label, color: Colors.primary, fontWeight: '700', fontSize: 13 },
});