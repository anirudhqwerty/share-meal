import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export function RequestCardSkeleton() {
  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.header}>
        <SkeletonCircle size={42} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={'60%'} height={13} />
          <Skeleton width={'40%'} height={10} />
        </View>
        <Skeleton width={70} height={20} radius={Radius.full} />
      </View>
      <Skeleton width={'50%'} height={10} style={{ marginTop: 12 }} />
    </View>
  );
}

export function RequestCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
