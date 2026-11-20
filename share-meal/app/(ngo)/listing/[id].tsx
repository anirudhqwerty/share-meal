import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { Alert } from '@/utils/alert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { donationsService } from '@/services/donations.service';
import { requestsService } from '@/services/requests.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LocationPreviewMap } from '@/components/LocationPreviewMap';
import { formatTimeLeft, formatDate } from '@/utils/time';
import { useAuth } from '@/context/AuthContext';
import { PickupActions } from '@/components/PickupActions';
import { StateMessage } from '@/components/ui/StateMessage';
import { useNow } from '@/hooks/useNow';

export default function NgoListingDetailScreen() {
  useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [data, setData] = useState<{ donation: any; requests: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestInProgress = useRef(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await donationsService.getById(id!);
      setData(res);
      setHasRequested((res.requests || []).some((request: any) => request.ngo_id === user?.id));
    } catch (loadError: any) {
      setError(loadError.message || 'Could not load this listing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleRequest = async () => {
    Alert.alert(
      'Request Pickup',
      'Send a pickup request to the donor for this food listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request', onPress: async () => {
            if (requestInProgress.current) return;
            requestInProgress.current = true;
            setRequesting(true);
            try {
              await requestsService.create(id!);
              setHasRequested(true);
              Alert.alert('Request sent', 'The donor can now review your pickup request.');
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setRequesting(false);
              requestInProgress.current = false;
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner text="Loading listing…" />;
  if (!data) {
    return <StateMessage title="Food listing" message={error || 'This listing could not be found.'} onRetry={() => { setLoading(true); void load(); }} />;
  }
  const { donation } = data;
  const expiry = formatTimeLeft(donation.expiry_time);
  const isAvailable = ['available', 'pending'].includes(donation.status) && !expiry.expired;
  const ownRequest = data.requests.find((request: any) => request.ngo_id === user?.id);
  const pickup = Array.isArray(ownRequest?.pickups) ? ownRequest.pickups[0] : ownRequest?.pickups;
  const requestMessage = pickup?.status === 'completed' ? 'Food collected.' : pickup?.status === 'cancelled' ? 'Your pickup was cancelled.'
    : ownRequest?.status === 'approved' ? 'Pickup approved. Arrange collection before expiry.'
    : ownRequest?.status === 'rejected' ? 'Your request was not selected.'
    : !isAvailable ? 'This listing is no longer available.' : 'Request sent. Awaiting donor approval.';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.secondary} />}>
        {/* Top bar */}
        <ScreenHeader title="Food listing" showBack />

        {donation.image_path ? (
          <Image accessibilityLabel={donation.food_type} source={{ uri: donation.image_path }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroFallback}>
            <Ionicons name="nutrition-outline" size={64} color={Colors.primary} />
          </View>
        )}

        {/* Status row */}
        <View style={styles.statusRow}>
          <Badge status={expiry.expired && ['available', 'pending'].includes(donation.status) ? 'expired' : donation.status} />
          {expiry.urgent && !expiry.expired && (
            <View style={styles.urgentChip}>
              <Ionicons name="warning" size={13} color={Colors.error} />
              <Text style={styles.urgentText}>Expiring soon!</Text>
            </View>
          )}
        </View>

        <Text style={styles.foodType}>{donation.food_type}</Text>

        {/* Donor card */}
        <View style={[styles.donorCard, Shadow.sm]}>
          <View style={styles.donorIcon}><Ionicons name="business" size={22} color={Colors.primary} /></View>
          <View style={styles.donorInfo}>
            <Text style={styles.donorName}>{donation.donors?.organization_name}</Text>
            <Text style={styles.donorAddress}>{donation.address || donation.donors?.address}</Text>
          </View>
        </View>
        <LocationPreviewMap
          latitude={donation.latitude}
          longitude={donation.longitude}
          title="Pickup location"
        />

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          {[
            { icon: 'layers-outline', label: 'Quantity', val: donation.quantity },
            { icon: 'time-outline', label: 'Time left', val: expiry.text, urgent: expiry.urgent },
            { icon: 'calendar-outline', label: 'Posted', val: formatDate(donation.created_at, { day: '2-digit', month: 'short' }) },
          ].map((item) => (
            <View key={item.label} style={[styles.detailCard, Shadow.sm]}>
              <Ionicons name={item.icon as any} size={18} color={item.urgent ? Colors.error : Colors.primary} />
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={[styles.detailVal, item.urgent && { color: Colors.error }]}>{item.val}</Text>
            </View>
          ))}
        </View>
        {pickup && <PickupActions pickup={pickup} onChange={load} />}
        {error ? <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text> : null}
      </ScrollView>

      {/* CTA Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
        {hasRequested || !isAvailable ? (
          <View style={styles.alreadyReq}>
            <Ionicons name={hasRequested ? 'receipt-outline' : 'information-circle-outline'} size={22} color={Colors.secondary} />
            <Text style={styles.alreadyText}>
              {hasRequested ? requestMessage : 'This listing is no longer available.'}
            </Text>
          </View>
        ) : (
          <Button
            title="Request pickup"
            onPress={handleRequest}
            loading={requesting}
            fullWidth
            size="lg"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  errorScreen: { justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  errorMessage: { ...Typography.body, color: Colors.error, textAlign: 'center' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 24, maxWidth: 760, width: '100%', alignSelf: 'center' },
  heroImage: { width: '100%', height: 220, borderRadius: Radius.xl, marginBottom: Spacing.md },
  heroFallback: { height: 180, backgroundColor: Colors.primaryLight, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  urgentChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.errorBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  urgentText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },
  foodType: { ...Typography.h1, color: Colors.text, marginBottom: Spacing.md },
  donorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  donorIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  donorInfo: { flex: 1 },
  donorName: { ...Typography.h4, color: Colors.text },
  donorAddress: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3 },
  detailsGrid: { gap: 0 },
  detailCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 16, gap: 12, borderBottomWidth: 1, borderColor: Colors.border },
  detailLabel: { ...Typography.caption, color: Colors.textMuted },
  detailVal: { ...Typography.h4, color: Colors.text, fontSize: 15, flex: 1, textAlign: 'right' },
  footer: { backgroundColor: Colors.white, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  alreadyReq: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  alreadyText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
});
