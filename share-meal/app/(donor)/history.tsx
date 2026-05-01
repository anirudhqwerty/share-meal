import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DonationCard } from '@/components/DonationCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Typography, Shadow } from '@/constants/theme';
import { donationsService } from '@/services/donations.service';

export default function DonorHistoryScreen() {
  const router = useRouter();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await donationsService.getMyDonations();
    setDonations(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const completed = donations.filter(d => d.status === 'claimed');
  const expired = donations.filter(d => d.status === 'expired');
  const mealsCount = completed.length * 10;

  const header = (
    <>
      <Text style={styles.title}>Your Impact</Text>
      <View style={styles.statsRow}>
        {[
          { icon: 'checkmark-circle', val: completed.length, lbl: 'Claimed', col: Colors.success, bg: Colors.successBg },
          { icon: 'restaurant', val: mealsCount, lbl: 'Meals Saved', col: Colors.primary, bg: Colors.primaryLight },
          { icon: 'people', val: mealsCount, lbl: 'People Fed', col: Colors.info, bg: Colors.infoBg },
        ].map((s) => (
          <View key={s.lbl} style={[styles.statCard, Shadow.sm, { borderColor: s.bg }]}>
            <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon as any} size={20} color={s.col} />
            </View>
            <Text style={[styles.statVal, { color: s.col }]}>{s.val}</Text>
            <Text style={styles.statLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sectionTitle}>All Donations</Text>
    </>
  );

  if (loading) return <LoadingSpinner text="Loading history…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={donations}
        keyExtractor={d => d.id}
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
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.emptyTitle}>No donations yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  title: { ...Typography.h2, color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, alignItems: 'center', gap: 6, backgroundColor: Colors.card,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5,
  },
  statIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLbl: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
});
