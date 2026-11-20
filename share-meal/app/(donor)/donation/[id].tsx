import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { Alert } from '@/utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { donationsService } from '@/services/donations.service';
import { requestsService } from '@/services/requests.service';
import { Badge } from '@/components/ui/Badge';
import { RequestCard } from '@/components/RequestCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatTimeLeft, formatDateTime, timeLeftMs } from '@/utils/time';
import { StateMessage } from '@/components/ui/StateMessage';
import { Button } from '@/components/ui/Button';
import { useNow } from '@/hooks/useNow';

export default function DonationDetailScreen() {
  useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ donation: any; requests: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const actionInProgress = useRef(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await donationsService.getById(id!);
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Could not load this donation.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleApprove = async (requestId: string) => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setActionLoading(requestId);
    try {
      await requestsService.approve(requestId);
      await load();
      Alert.alert('Pickup approved', 'Arrange collection with the NGO before the food expires.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
      actionInProgress.current = false;
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          if (actionInProgress.current) return;
          actionInProgress.current = true;
          setActionLoading(requestId);
          try {
            await requestsService.reject(requestId);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setActionLoading(null);
            actionInProgress.current = false;
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner text="Loading donation…" />;
  if (!data) return <StateMessage title="Donation detail" message={error || 'Donation not found.'} onRetry={() => { setLoading(true); void load(); }} />;
  const { donation, requests } = data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
      >
        {/* Top bar */}
        <ScreenHeader title="Donation detail" showBack />

        {/* Food image */}
        {donation.image_path ? (
          <Image accessibilityLabel={donation.food_type} source={{ uri: donation.image_path }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroFallback}>
            <Ionicons name="nutrition-outline" size={60} color={Colors.primary} />
          </View>
        )}

        {/* Info card */}
        <View style={[styles.card, Shadow.md]}>
          <View style={styles.cardTop}>
            <Text style={styles.foodType}>{donation.food_type}</Text>
            <Badge status={['available', 'pending'].includes(donation.status) && timeLeftMs(donation.expiry_time) <= 0 ? 'expired' : donation.status} />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{donation.quantity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={timeLeftMs(donation.expiry_time) <= 0 ? Colors.error : Colors.textSecondary} />
            <Text style={[styles.infoText, timeLeftMs(donation.expiry_time) <= 0 && { color: Colors.error }]}>
              {formatTimeLeft(donation.expiry_time).text}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Posted {formatDateTime(donation.created_at)}</Text>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {['available', 'pending'].includes(donation.status) && <Button title="Close listing" variant="outline" disabled={Boolean(actionLoading)} onPress={() => Alert.alert('Close this listing?', 'Pending requests will be declined and the food will no longer be available.', [
          { text: 'Keep listing', style: 'cancel' }, { text: 'Close listing', style: 'destructive', onPress: async () => {
            if (actionInProgress.current) return;
            actionInProgress.current = true; setActionLoading('expire');
            try { await donationsService.expire(donation.id); await load(); }
            catch (error: any) { Alert.alert('Listing not closed', error.message); }
            finally { actionInProgress.current = false; setActionLoading(null); }
          } },
        ])} />}

        {/* Pickup Requests */}
        <Text style={styles.sectionTitle}>
          Pickup requests ({requests.length})
        </Text>
        {requests.length === 0 ? (
          <View style={styles.emptyRequests}>
            <Ionicons name="hourglass-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No requests yet. Nearby NGOs will see this listing.</Text>
          </View>
        ) : (
          <>
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                mode="donor"
                canReview={['available', 'pending'].includes(donation.status) && timeLeftMs(donation.expiry_time) > 0}
                onChange={load}
                loadingRequestId={actionLoading}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 32, maxWidth: 760, width: '100%', alignSelf: 'center' },
  errorText: { ...Typography.body, color: Colors.error, marginBottom: 12 },
  heroImage: { width: '100%', height: 210, borderRadius: Radius.xl, marginBottom: Spacing.md },
  heroFallback: { height: 160, backgroundColor: Colors.primaryLight, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  card: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  foodType: { ...Typography.h2, color: Colors.text, flex: 1, marginRight: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  sectionTitle: { ...Typography.h3, color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptyRequests: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
