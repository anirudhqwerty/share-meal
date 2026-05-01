import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { donationsService } from '@/services/donations.service';
import { requestsService } from '@/services/requests.service';
import { Badge } from '@/components/ui/Badge';
import { RequestCard } from '@/components/RequestCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';

function timeLeft(expiry: string) {
  const diff = new Date(expiry).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

export default function DonationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ donation: any; requests: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await donationsService.getById(id!);
      setData(res);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await requestsService.approve(requestId);
      await load();
      Alert.alert('✅ Approved!', 'The NGO has been notified and a pickup has been scheduled.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          setActionLoading(requestId);
          try {
            await requestsService.reject(requestId);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (loading || !data) return <LoadingSpinner text="Loading donation…" />;
  const { donation, requests } = data;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={Colors.primary} />}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Donation Detail</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Food image */}
        {donation.image_path ? (
          <Image source={{ uri: donation.image_path }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroFallback}>
            <Text style={{ fontSize: 60 }}>🍲</Text>
          </View>
        )}

        {/* Info card */}
        <View style={[styles.card, Shadow.md]}>
          <View style={styles.cardTop}>
            <Text style={styles.foodType}>{donation.food_type}</Text>
            <Badge status={donation.status} />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{donation.quantity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={new Date(donation.expiry_time) < new Date() ? Colors.error : Colors.textSecondary} />
            <Text style={[styles.infoText, new Date(donation.expiry_time) < new Date() && { color: Colors.error }]}>
              {timeLeft(donation.expiry_time)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              Posted {new Date(donation.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Pickup Requests */}
        <Text style={styles.sectionTitle}>
          Pickup Requests ({requests.length})
        </Text>
        {requests.length === 0 ? (
          <View style={styles.emptyRequests}>
            <Ionicons name="hourglass-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No requests yet. NGOs nearby will see this listing.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              mode="donor"
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { ...Typography.h3, color: Colors.text },
  heroImage: { width: '100%', height: 210, borderRadius: Radius.xl, marginBottom: Spacing.md },
  heroFallback: { height: 160, backgroundColor: Colors.primaryLight, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  card: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  foodType: { ...Typography.h2, color: Colors.text, flex: 1, marginRight: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoText: { ...Typography.body, color: Colors.textSecondary },
  sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  emptyRequests: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
