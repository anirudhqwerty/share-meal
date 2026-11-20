import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Alert } from '@/utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { donationsService } from '@/services/donations.service';
import { DonationCard } from '@/components/DonationCard';
import { DonationCardSkeletonList } from '@/components/skeletons/DonationCardSkeleton';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { parseServerDate } from '@/utils/time';
import { useNow } from '@/hooks/useNow';

type Filter = 'all' | 'active' | 'claimed' | 'expired';

export default function DonorDashboard() {
  const now = useNow();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setDonations(await donationsService.getMyDonations() || []); }
    catch (error: any) { setError(error.message || 'Could not load donations.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const statusOf = (donation: any): Filter => donation.status === 'claimed' ? 'claimed'
    : donation.status === 'expired' || (parseServerDate(donation.expiry_time)?.getTime() || 0) <= now ? 'expired' : 'active';
  const filtered = filter === 'all' ? donations : donations.filter((donation) => statusOf(donation) === filter);
  const logout = () => Alert.alert('Sign out?', 'You can sign in again to manage your donations.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', onPress: () => { void signOut().catch((error) => Alert.alert('Could not sign out', error.message)); } },
  ]);

  const header = <>
    <View style={styles.header}>
      <BrandLogo size={36} variant="plain" />
      <Text numberOfLines={2} style={styles.organization}>{profile?.organization_name || 'Your donations'}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton} onPress={() => router.push('/notifications')}>
        <Ionicons name="notifications-outline" size={22} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" style={styles.iconButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>Food to share</Text>
      <Text style={styles.subtitle}>Post what’s available. Review pickup requests here.</Text>
      <Button title="Post a donation" onPress={() => router.push('/(donor)/new-donation')} fullWidth />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your donations</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.history} onPress={() => router.push('/(donor)/history')}>
        <Text style={styles.link}>View history</Text>
      </TouchableOpacity>
    </View>
    <View style={styles.filters}>
      {(['all', 'active', 'claimed', 'expired'] as const).map((item) => <TouchableOpacity key={item}
        accessibilityRole="button" accessibilityState={{ selected: filter === item }}
        onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.selected]}>
        <Text style={[styles.filterText, filter === item && styles.selectedText]}>{item[0].toUpperCase() + item.slice(1)}</Text>
      </TouchableOpacity>)}
    </View>
    {error ? <View style={styles.error}>
      <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Button title="Retry" variant="outline" size="sm" onPress={load} />
    </View> : null}
  </>;

  return <View style={[styles.safe, { paddingTop: insets.top }]}>
    <FlatList data={loading ? [] : filtered} keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list} ListHeaderComponent={header} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
      renderItem={({ item }) => <DonationCard donation={item} onPress={() => router.push({ pathname: '/(donor)/donation/[id]', params: { id: item.id } })} />}
      ListEmptyComponent={loading ? <DonationCardSkeletonList count={3} /> : !error ? <View style={styles.empty}>
        <Ionicons name="restaurant-outline" size={32} color={Colors.primary} />
        <Text style={styles.sectionTitle}>{filter === 'all' ? 'No donations yet' : `No ${filter} donations`}</Text>
        <Text style={styles.subtitle}>{filter === 'all' ? 'Have surplus food? Post a donation for nearby NGOs.' : 'Choose another filter to see your donations.'}</Text>
      </View> : null} />
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg, paddingBottom: 32, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  organization: { ...Typography.h4, color: Colors.text, flex: 1, minWidth: 0, marginLeft: 4 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 12, marginBottom: 24 }, title: { ...Typography.h1, color: Colors.text },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { ...Typography.h3, color: Colors.text }, history: { minHeight: 48, justifyContent: 'center' },
  link: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filter: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  selected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterText: { ...Typography.body, color: Colors.textSecondary }, selectedText: { color: Colors.primary, fontWeight: '600' },
  error: { gap: 12, paddingVertical: 16 }, errorText: { ...Typography.body, color: Colors.error },
  empty: { paddingVertical: 40, alignItems: 'center', gap: 12 },
});
