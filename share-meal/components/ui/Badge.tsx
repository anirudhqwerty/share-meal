import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

type BadgeStatus = 'available' | 'pending' | 'claimed' | 'expired' | 'approved' | 'rejected' | 'scheduled' | 'completed' | 'cancelled';

const STATUS_MAP: Record<BadgeStatus, { label: string; color: string; bg: string }> = {
  available:  { label: 'Available',  color: Colors.available, bg: Colors.availableBg },
  pending:    { label: 'Pending',    color: Colors.pending,   bg: Colors.pendingBg },
  claimed:    { label: 'Claimed',    color: Colors.claimed,   bg: Colors.claimedBg },
  expired:    { label: 'Expired',    color: Colors.expired,   bg: Colors.expiredBg },
  approved:   { label: 'Approved',   color: Colors.approved,  bg: Colors.approvedBg },
  rejected:   { label: 'Rejected',   color: Colors.rejected,  bg: Colors.rejectedBg },
  scheduled:  { label: 'Scheduled',  color: Colors.info,      bg: Colors.infoBg },
  completed:  { label: 'Completed',  color: Colors.success,   bg: Colors.successBg },
  cancelled:  { label: 'Cancelled',  color: Colors.textMuted, bg: Colors.surface },
};

interface BadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

export function Badge({ status, size = 'md' }: BadgeProps) {
  const s = STATUS_MAP[status] || { label: status, color: Colors.textSecondary, bg: Colors.surface };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }, size === 'sm' && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: s.color }]} />
      <Text style={[styles.text, { color: s.color }, size === 'sm' && styles.textSm]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  text: { ...Typography.label, fontSize: 12 },
  textSm: { fontSize: 11 },
});
