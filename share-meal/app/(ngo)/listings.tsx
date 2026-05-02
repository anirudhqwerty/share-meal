import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { donationsService } from '@/services/donations.service';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { DonationCard } from '@/components/DonationCard';
import { DonationCardSkeletonList } from '@/components/skeletons/DonationCardSkeleton';
import { Colors, Spacing, Radius, Typography, Shadow } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { parseServerDate } from '@/utils/time';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SortBy = 'distance' | 'expiry';

export default function NgoListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { profile } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const radius = (profile as any)?.notification_radius_km || 5;

  const load = useCallback(async () => {
    if (!location) return;
    setError(null);
    try {
      const data = await donationsService.getNearby(location.latitude, location.longitude, radius);
      setDonations(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load listings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, radius]);

  useEffect(() => { if (location) load(); }, [location, load]);

  // Filter by search query
  const filtered = donations.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.food_type?.toLowerCase().includes(q) ||
      d.organization_name?.toLowerCase().includes(q) ||
      d.quantity?.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'distance') return (a.distance_km || 0) - (b.distance_km || 0);
    const aT = parseServerDate(a.expiry_time)?.getTime() ?? Infinity;
    const bT = parseServerDate(b.expiry_time)?.getTime() ?? Infinity;
    return aT - bT;
  });

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="Available food" />

      {/* Search bar */}
      <View style={[styles.searchBar, Shadow.sm]}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food, NGO…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.subtitle}>
          {sorted.length} listing{sorted.length !== 1 ? 's' : ''} within {radius} km
        </Text>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {(['distance', 'expiry'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
              onPress={() => setSortBy(s)}
            >
              <Ionicons
                name={s === 'distance' ? 'navigate-outline' : 'time-outline'}
                size={11}
                color={sortBy === s ? Colors.secondary : Colors.textMuted}
              />
              <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
                {s === 'distance' ? 'Distance' : 'Expiry'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  if (!location && !loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }, styles.center]}>
        <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Location unavailable</Text>
        <Text style={styles.emptyText}>Enable location access to see nearby food donations.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
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
          data={sorted}
          keyExtractor={(d) => d.id}
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
            <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
              <DonationCard
                donation={item}
                onPress={() => router.push({ pathname: '/(ngo)/listing/[id]', params: { id: item.id } })}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BrandLogo size={64} variant="contained" />
              <Text style={styles.emptyTitle}>
                {search ? 'No results found' : 'No food nearby'}
              </Text>
              <Text style={styles.emptyText}>
                {search
                  ? 'Try a different search term.'
                  : 'Check back soon or expand your notification radius in settings.'}
              </Text>
              {!search && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(ngo)')}>
                  <Ionicons name="map-outline" size={15} color={Colors.secondary} />
                  <Text style={styles.emptyBtnText}>Open map</Text>
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
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: Spacing.xl },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  loadingWrap: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  header: { paddingTop: Spacing.md, marginBottom: Spacing.sm },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginTop: Spacing.sm, marginBottom: Spacing.sm,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1, ...Typography.body, color: Colors.text,
    fontSize: 14, padding: 0,
  },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
    marginBottom: Spacing.sm,
  },
  subtitle: { ...Typography.caption, color: Colors.textSecondary },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { ...Typography.caption, color: Colors.textMuted, fontSize: 11 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  sortChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500', fontSize: 11 },
  sortChipTextActive: { color: Colors.secondary, fontWeight: '700' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { ...Typography.caption, color: Colors.error, flex: 1 },
  retryText: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: Spacing.lg },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginTop: 8 },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, paddingVertical: 11,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.full, marginTop: 6,
  },
  emptyBtnText: { ...Typography.label, color: Colors.secondary, fontSize: 13, fontWeight: '700' },
});