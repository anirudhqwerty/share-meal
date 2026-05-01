import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

interface Request {
  id: string;
  status: string;
  request_time: string;
  ngo_id?: string;
  ngos?: { ngo_name: string; address: string };
  food_donations?: { food_type: string; quantity: string; organization_name?: string };
}

interface RequestCardProps {
  request: Request;
  mode: 'donor' | 'ngo'; // donor sees approve/reject, ngo sees status
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPress?: () => void;
}

export function RequestCard({ request, mode, onApprove, onReject, onPress }: RequestCardProps) {
  const ngoName = request.ngos?.ngo_name || 'Unknown NGO';
  const ngoAddress = request.ngos?.address || '';
  const foodType = request.food_donations?.food_type || '';
  const quantity = request.food_donations?.quantity || '';
  const time = new Date(request.request_time).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.card, Shadow.sm]}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{ngoName[0]?.toUpperCase() || 'N'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{mode === 'ngo' ? foodType : ngoName}</Text>
          <Text style={styles.sub} numberOfLines={1}>{mode === 'ngo' ? quantity : ngoAddress}</Text>
        </View>
        <Badge status={request.status as any} size="sm" />
      </View>
      <Text style={styles.time}>
        <Ionicons name="time-outline" size={11} color={Colors.textMuted} /> Requested {time}
      </Text>

      {mode === 'donor' && request.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title="Approve" variant="primary" size="sm"
            onPress={() => onApprove?.(request.id)}
            style={{ flex: 1 }}
          />
          <Button
            title="Reject" variant="outline" size="sm"
            onPress={() => onReject?.(request.id)}
            style={{ flex: 1, borderColor: Colors.error }}
            textStyle={{ color: Colors.error }}
          />
        </View>
      )}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.h4, color: Colors.primary },
  info: { flex: 1 },
  name: { ...Typography.h4, color: Colors.text },
  sub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  time: { ...Typography.caption, color: Colors.textMuted, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
