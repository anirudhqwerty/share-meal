import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

interface Donation {
  id: string;
  food_type: string;
  quantity: string;
  image_path?: string;
  status: string;
  expiry_time: string;
  created_at: string;
  distance_km?: number;
  organization_name?: string;
}

function getTimeLeft(expiry: string) {
  const diff = new Date(expiry).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function DonationCard({ donation, onPress }: { donation: Donation; onPress?: () => void }) {
  const timeLeft = getTimeLeft(donation.expiry_time);
  const isExpiring = new Date(donation.expiry_time).getTime() - Date.now() < 3600000;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[styles.card, Shadow.md]}>
      <View style={styles.row}>
        {donation.image_path ? (
          <Image source={{ uri: donation.image_path }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageEmoji}>🍲</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.foodType} numberOfLines={1}>{donation.food_type}</Text>
            <Badge status={donation.status as any} size="sm" />
          </View>
          <Text style={styles.quantity}>
            <Ionicons name="restaurant-outline" size={12} color={Colors.textSecondary} /> {donation.quantity}
          </Text>
          {donation.organization_name && (
            <Text style={styles.org} numberOfLines={1}>
              <Ionicons name="business-outline" size={12} color={Colors.textSecondary} /> {donation.organization_name}
            </Text>
          )}
          <View style={styles.footer}>
            <Text style={[styles.timeLeft, isExpiring && styles.urgent]}>
              <Ionicons name="time-outline" size={12} color={isExpiring ? Colors.error : Colors.textSecondary} /> {timeLeft}
            </Text>
            {donation.distance_km !== undefined && (
              <Text style={styles.distance}>
                <Ionicons name="location-outline" size={12} color={Colors.primary} /> {donation.distance_km} km
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: Colors.surface },
  imageFallback: {
    width: 64, height: 64, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  imageEmoji: { fontSize: 28 },
  info: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  foodType: { ...Typography.h4, color: Colors.text, flex: 1 },
  quantity: { ...Typography.caption, color: Colors.textSecondary },
  org: { ...Typography.caption, color: Colors.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeLeft: { ...Typography.caption, color: Colors.textSecondary },
  urgent: { color: Colors.error, fontWeight: '600' },
  distance: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
});
