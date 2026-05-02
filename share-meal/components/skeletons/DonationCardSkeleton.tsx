import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export function DonationCardSkeleton() {
  return (
    <View style={[styles.card, Shadow.sm]}>
      <Skeleton width={76} height={76} radius={Radius.md} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Skeleton width={'58%'} height={14} />
          <Skeleton width={60} height={18} radius={Radius.full} />
        </View>
        <Skeleton width={'40%'} height={11} style={{ marginTop: 10 }} />
        <Skeleton width={'70%'} height={11} style={{ marginTop: 8 }} />
        <View style={styles.footerRow}>
          <Skeleton width={80} height={10} />
          <Skeleton width={50} height={10} />
        </View>
      </View>
    </View>
  );
}

export function DonationCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <DonationCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  body: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
});
