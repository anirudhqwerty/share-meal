import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Badge } from '@/components/ui/Badge';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { formatTimeLeft } from '@/utils/time';

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

export function DonationCard({ donation, onPress }: { donation: Donation; onPress?: () => void }) {
  const { text: timeLeft, urgent, expired } = formatTimeLeft(donation.expiry_time);
  const imageUri = donation.image_path && donation.image_path.trim().length > 0 ? donation.image_path : null;

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={[
          styles.card,
          Shadow.sm,
          urgent && !expired && styles.cardUrgent,
        ]}
      >
        <View style={styles.row}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="nutrition-outline" size={30} color={Colors.primary} />
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={styles.foodType} numberOfLines={1}>{donation.food_type}</Text>
              <Badge status={donation.status as any} size="sm" />
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="layers-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{donation.quantity}</Text>
            </View>

            {donation.organization_name ? (
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>{donation.organization_name}</Text>
              </View>
            ) : null}

            <View style={styles.footer}>
              <View style={[styles.timeChip, expired ? styles.timeChipExpired : urgent ? styles.timeChipUrgent : styles.timeChipOk]}>
                <Ionicons
                  name={expired ? 'alert-circle' : 'time-outline'}
                  size={12}
                  color={expired ? Colors.error : urgent ? Colors.warning : Colors.success}
                />
                <Text
                  style={[
                    styles.timeChipText,
                    { color: expired ? Colors.error : urgent ? Colors.warning : Colors.success },
                  ]}
                >
                  {timeLeft}
                </Text>
              </View>
              {donation.distance_km !== undefined ? (
                <View style={styles.distChip}>
                  <Ionicons name="navigate-outline" size={12} color={Colors.primary} />
                  <Text style={styles.distText}>{donation.distance_km.toFixed(1)} km</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
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
  cardUrgent: {
    borderColor: Colors.warningBg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  imageFallback: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  foodType: { ...Typography.h4, color: Colors.text, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...Typography.caption, color: Colors.textSecondary, flexShrink: 1 },
  footer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  timeChipOk: { backgroundColor: Colors.successBg },
  timeChipUrgent: { backgroundColor: Colors.warningBg },
  timeChipExpired: { backgroundColor: Colors.errorBg },
  timeChipText: { ...Typography.caption, fontWeight: '600', fontSize: 11 },
  distChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
  distText: { ...Typography.caption, fontWeight: '600', color: Colors.primary, fontSize: 11 },
});
