import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function NotificationItemSkeleton() {
  return (
    <View style={styles.item}>
      <SkeletonCircle size={40} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width={'60%'} height={13} />
        <Skeleton width={'90%'} height={10} />
        <Skeleton width={80} height={9} />
      </View>
    </View>
  );
}

export function NotificationItemSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
