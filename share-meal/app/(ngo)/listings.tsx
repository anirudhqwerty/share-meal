import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { donationsService } from '@/services/donations.service';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { DonationCard } from '@/components/DonationCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Typography, Shadow } from '@/constants/theme';

export default function NgoListingsScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const { profile } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'expiry'>('distance');
  const radius = (profile as any)?.notification_radius_km || 5;

  const load = useCallback(async () => {
    if (!location) return;
    const data = await donationsService.getNearby(location.latitude, location.longitude, radius);
    setDonations(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [location, radius]);

  useEffect(() => { if (location) load(); }, [location, load]);

  const sorted = [...donations].sort((a, b) =>
    sortBy === 'distance'
      ? (a.distance_km || 0) - (b.distance_km || 0)
      : new Date(a.expiry_time).getTime() - new Date(b.expiry_time).getTime()
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Available Food</Text>
      <Text style={styles.subtitle}>{donations.length} listings within {radius} km</Text>
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(['distance', 'expiry'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
              {s === 'distance' ? '📍 Distance' : '⏰ Expiry'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner text="Finding food near you…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={sorted}
        keyExtractor={d => d.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        renderItem={({ item }) => (
          <DonationCard
            donation={item}
            onPress={() => router.push({ pathname: '/(ngo)/listing/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 52 }}>🌍</Text>
            <Text style={styles.emptyTitle}>No food nearby</Text>
            <Text style={styles.emptyText}>Check back soon or expand your notification radius in settings.</Text>
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
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortLabel: { ...Typography.caption, color: Colors.textMuted },
  sortChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  sortChipActive: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  sortChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  sortChipTextActive: { color: Colors.secondary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.text },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
