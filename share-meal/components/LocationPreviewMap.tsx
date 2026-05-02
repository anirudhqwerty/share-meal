import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';

interface LocationPreviewMapProps {
  latitude?: number | null;
  longitude?: number | null;
  title?: string;
  height?: number;
}

export function LocationPreviewMap({
  latitude,
  longitude,
  title = 'Location Preview',
  height = 170,
}: LocationPreviewMapProps) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>Location coordinates are unavailable.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, Shadow.md, { height }]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker coordinate={{ latitude, longitude }} />
      </MapView>
      <View style={styles.label}>
        <Text style={styles.labelText}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  label: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Shadow.sm,
  },
  labelText: { ...Typography.caption, color: Colors.text, fontWeight: '700' },
  empty: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  emptyTitle: { ...Typography.h4, color: Colors.text },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
});
