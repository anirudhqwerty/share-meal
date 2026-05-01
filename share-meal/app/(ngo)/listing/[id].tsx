import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Image, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { donationsService } from '@/services/donations.service';
import { requestsService } from '@/services/requests.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';

function timeLeft(expiry: string) {
  const diff = new Date(expiry).getTime() - Date.now();
  if (diff <= 0) return { text: 'Expired', urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { text: h > 0 ? `${h}h ${m}m left` : `${m}m left`, urgent: h < 1 };
}

export default function NgoListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ donation: any; requests: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const load = useCallback(async () => {
    const res = await donationsService.getById(id!);
    setData(res);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async () => {
    Alert.alert(
      'Request Pickup',
      'Send a pickup request to the donor for this food listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request', onPress: async () => {
            setRequesting(true);
            try {
              await requestsService.create(id!);
              setHasRequested(true);
              Alert.alert('✅ Requested!', 'The donor will review your request. You will be notified when approved.');
              load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !data) return <LoadingSpinner text="Loading listing…" />;
  const { donation } = data;
  const expiry = timeLeft(donation.expiry_time);
  const isAvailable = donation.status === 'available';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Food Listing</Text>
          <View style={{ width: 40 }} />
        </View>

        {donation.image_path ? (
          <Image source={{ uri: donation.image_path }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroFallback}><Text style={{ fontSize: 64 }}>🍲</Text></View>
        )}

        {/* Status row */}
        <View style={styles.statusRow}>
          <Badge status={donation.status} />
          {expiry.urgent && (
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
            <Text style={styles.donorAddress} numberOfLines={2}>{donation.donors?.address}</Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          {[
            { icon: 'layers-outline', label: 'Quantity', val: donation.quantity },
            { icon: 'location-outline', label: 'Distance', val: donation.distance_km ? `${donation.distance_km} km` : 'N/A' },
            { icon: 'time-outline', label: 'Time Left', val: expiry.text, urgent: expiry.urgent },
            { icon: 'calendar-outline', label: 'Posted', val: new Date(donation.created_at).toLocaleDateString('en-IN') },
          ].map((item) => (
            <View key={item.label} style={[styles.detailCard, Shadow.sm]}>
              <Ionicons name={item.icon as any} size={18} color={item.urgent ? Colors.error : Colors.primary} />
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={[styles.detailVal, item.urgent && { color: Colors.error }]}>{item.val}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA Footer */}
      <View style={[styles.footer, Shadow.md]}>
        {hasRequested || !isAvailable ? (
          <View style={styles.alreadyReq}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.alreadyText}>
              {hasRequested ? 'Request Sent! Awaiting donor approval.' : `This food is ${donation.status}.`}
            </Text>
          </View>
        ) : (
          <Button
            title="Request Pickup"
            onPress={handleRequest}
            loading={requesting}
            fullWidth size="lg"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { ...Typography.h3, color: Colors.text },
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
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCard: { width: '47%', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: Colors.border },
  detailLabel: { ...Typography.caption, color: Colors.textMuted },
  detailVal: { ...Typography.h4, color: Colors.text, fontSize: 15 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  alreadyReq: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  alreadyText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
});
