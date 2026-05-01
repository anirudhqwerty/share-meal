import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { donationsService } from '@/services/donations.service';
import { DonationCard } from '@/components/DonationCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';

const STATS = [
  { icon: 'leaf', label: 'Active', key: 'active', color: Colors.success, bg: Colors.successBg },
  { icon: 'restaurant', label: 'Meals Saved', key: 'meals', color: Colors.primary, bg: Colors.primaryLight },
  { icon: 'people', label: 'People Fed', key: 'people', color: Colors.info, bg: Colors.infoBg },
];

export default function DonorDashboard() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await donationsService.getMyDonations();
      setDonations(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    active: donations.filter(d => d.status === 'available' || d.status === 'pending').length,
    meals: donations.filter(d => d.status === 'claimed').length * 10,
    people: donations.filter(d => d.status === 'claimed').length * 10,
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) return <LoadingSpinner text="Loading your dashboard…" />;

  const header = (
    <>
      <LinearGradient colors={['#FF6B35', '#FF8C5A']} style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>{greeting()} 👋</Text>
            <Text style={styles.orgName}>{(profile as any)?.organization_name || 'Welcome back'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroSub}>Make a difference today by sharing your surplus food.</Text>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.key} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Ionicons name={s.icon as any} size={18} color={Colors.white} />
              </View>
              <Text style={styles.statVal}>{(stats as any)[s.key]}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <TouchableOpacity
        style={[styles.postBtn, Shadow.lg]}
        activeOpacity={0.88}
        onPress={() => router.push('/(donor)/new-donation')}
      >
        <Ionicons name="add-circle" size={22} color={Colors.white} />
        <Text style={styles.postBtnText}>Post Food Now</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Donations</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={donations}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <DonationCard
            donation={item}
            onPress={() => router.push({ pathname: '/(donor)/donation/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No donations yet</Text>
            <Text style={styles.emptySub}>Post your first food donation and start making an impact!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  orgName: { ...Typography.h2, color: Colors.white, marginTop: 2 },
  heroSub: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  bell: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statVal: { fontSize: 22, fontWeight: '800', color: Colors.white },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, marginBottom: Spacing.lg,
  },
  postBtnText: { ...Typography.h4, color: Colors.white, fontSize: 16 },
  sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: 6 },
  emptySub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
