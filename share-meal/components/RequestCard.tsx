import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { LocationPreviewMap } from '@/components/LocationPreviewMap';
import { formatDateTime } from '@/utils/time';

interface Request {
  id: string;
  status: string;
  request_time: string;
  ngo_id?: string;
  ngos?: { ngo_name: string; address: string; latitude?: number; longitude?: number };
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
  const [showMap, setShowMap] = useState(false);
  const ngoName = request.ngos?.ngo_name || 'Unknown NGO';
  const ngoAddress = request.ngos?.address || '';
  const foodType = request.food_donations?.food_type || '';
  const quantity = request.food_donations?.quantity || '';
  const time = formatDateTime(request.request_time);

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={[styles.card, Shadow.sm]}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{ngoName[0]?.toUpperCase() || 'N'}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {mode === 'ngo' ? foodType : ngoName}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {mode === 'ngo' ? quantity : ngoAddress}
            </Text>
          </View>
          <Badge status={request.status as any} size="sm" />
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.time}>Requested {time}</Text>
        </View>

        {mode === 'donor' && request.status === 'pending' && (
          <View style={styles.actions}>
            <Button
              title="Approve"
              variant="primary"
              size="sm"
              onPress={() => onApprove?.(request.id)}
              style={{ flex: 1 }}
            />
            <Button
              title="Reject"
              variant="outline"
              size="sm"
              onPress={() => onReject?.(request.id)}
              style={{ flex: 1, borderColor: Colors.error }}
              textStyle={{ color: Colors.error }}
            />
          </View>
        )}

        {mode === 'donor' && typeof request.ngos?.latitude === 'number' && (
          <>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setShowMap((s) => !s)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showMap ? 'chevron-up' : 'map-outline'}
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.toggleText}>{showMap ? 'Hide map' : 'Show NGO location'}</Text>
            </TouchableOpacity>
            {showMap && (
              <View style={styles.mapWrap}>
                <LocationPreviewMap
                  latitude={request.ngos?.latitude}
                  longitude={request.ngos?.longitude}
                  title="NGO location"
                  height={140}
                />
              </View>
            )}
          </>
        )}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.h4, color: Colors.primary },
  info: { flex: 1 },
  name: { ...Typography.h4, color: Colors.text },
  sub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  time: { ...Typography.caption, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, alignSelf: 'flex-start',
  },
  toggleText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  mapWrap: { marginTop: 8 },
});
