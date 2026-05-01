import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { donationsService } from '@/services/donations.service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function NgoMapScreen() {
  const router = useRouter();
  const { location, loading: locLoading } = useLocation();
  const { profile } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const radius = (profile as any)?.notification_radius_km || 5;

  const load = useCallback(async () => {
    if (!location) return;
    try {
      const data = await donationsService.getNearby(location.latitude, location.longitude, radius);
      setDonations(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [location, radius]);

  useEffect(() => { if (location) load(); }, [location, load]);

  const centerOnUser = () => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }, 600);
  };

  if (locLoading || loading) return <LoadingSpinner text="Finding food near you…" />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        } : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {location && (
          <Circle
            center={location}
            radius={radius * 1000}
            strokeColor="rgba(0,200,150,0.4)"
            fillColor="rgba(0,200,150,0.06)"
            strokeWidth={1.5}
          />
        )}
        {donations.map((d) => (
          <Marker
            key={d.id}
            coordinate={{ latitude: parseFloat(d.latitude), longitude: parseFloat(d.longitude) }}
            onPress={() => setSelected(d)}
          >
            <View style={[styles.pin, selected?.id === d.id && styles.pinSelected]}>
              <Text style={styles.pinEmoji}>🍲</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top overlay */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={[styles.header, Shadow.md]}>
          <View style={styles.headerLeft}>
            <Ionicons name="map" size={18} color={Colors.secondary} />
            <Text style={styles.headerTitle}>Nearby Food</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{donations.length} available</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Center button */}
      <TouchableOpacity style={[styles.locBtn, Shadow.md]} onPress={centerOnUser}>
        <Ionicons name="locate" size={22} color={Colors.secondary} />
      </TouchableOpacity>

      {/* Bottom sheet for selected marker */}
      {selected && (
        <View style={[styles.bottomSheet, Shadow.lg]}>
          <TouchableOpacity style={styles.sheetClose} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.sheetFood}>{selected.food_type}</Text>
          <Text style={styles.sheetOrg}>{selected.organization_name}</Text>
          <View style={styles.sheetMeta}>
            <View style={styles.sheetChip}>
              <Ionicons name="location-outline" size={13} color={Colors.primary} />
              <Text style={styles.sheetChipText}>{selected.distance_km} km</Text>
            </View>
            <View style={styles.sheetChip}>
              <Ionicons name="layers-outline" size={13} color={Colors.primary} />
              <Text style={styles.sheetChipText}>{selected.quantity}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => {
              setSelected(null);
              router.push({ pathname: '/(ngo)/listing/[id]', params: { id: selected.id } });
            }}
          >
            <Text style={styles.viewBtnText}>View & Request Pickup</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { ...Typography.h4, color: Colors.text },
  countPill: { backgroundColor: Colors.secondaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  countText: { ...Typography.label, color: Colors.secondary, fontSize: 12 },
  locBtn: {
    position: 'absolute', bottom: 220, right: Spacing.lg,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
  },
  pin: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  pinSelected: { borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight, transform: [{ scale: 1.2 }] },
  pinEmoji: { fontSize: 22 },
  bottomSheet: {
    position: 'absolute', bottom: 80, left: Spacing.lg, right: Spacing.lg,
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
  },
  sheetClose: { position: 'absolute', top: 12, right: 12, padding: 4 },
  sheetFood: { ...Typography.h3, color: Colors.text, marginBottom: 4, marginTop: 4 },
  sheetOrg: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 12 },
  sheetMeta: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sheetChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  sheetChipText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  viewBtn: { backgroundColor: Colors.secondary, borderRadius: Radius.lg, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  viewBtnText: { ...Typography.h4, color: Colors.white, fontSize: 15 },
});
