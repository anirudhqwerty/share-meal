import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { Alert } from '@/utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from '@/components/maps/Map';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { donationsService } from '@/services/donations.service';
import { authService } from '@/services/auth.service';
import { Colors, Radius, Shadow, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { formatTimeLeft } from '@/utils/time';
import { coordinates, radiusBoundary } from '@/utils/geo';
import { useNow } from '@/hooks/useNow';

const RADII = [1, 3, 5, 10, 25, 50, 100];

export default function NgoMapScreen() {
  const now = useNow();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { location, loading: locating, refresh: refreshLocation } = useLocation();
  const { profile, refreshUser, signOut } = useAuth();
  const center = location || coordinates(profile?.latitude, profile?.longitude);
  const lat = center?.latitude, lng = center?.longitude;
  const radius = profile?.notification_radius_km || 5;
  const [savingRadius, setSavingRadius] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const map = useRef<MapView>(null);
  const list = useRef<FlatList>(null);
  const requestVersion = useRef(0);
  const selected = donations.find((donation) => donation.id === selectedId);
  useEffect(() => { setDonations((items) => items.filter((item) => new Date(item.expiry_time).getTime() > now)); }, [now]);
  const cardWidth = Math.min(width - 48, 360);

  const fitRadius = useCallback(() => {
    if (lat == null || lng == null || !mapReady) return;
    map.current?.fitToCoordinates(radiusBoundary({ latitude: lat, longitude: lng }, radius), {
      edgePadding: { top: 32, right: 72, bottom: 32, left: 32 }, animated: true,
    });
  }, [lat, lng, radius, mapReady]);
  useEffect(() => { fitRadius(); }, [fitRadius]);

  const load = useCallback(async () => {
    if (lat == null || lng == null) { setLoading(false); return; }
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const results = await donationsService.getNearby(lat, lng, radius);
      if (version !== requestVersion.current) return;
      setDonations(results || []);
      setSelectedId((id) => results?.some((donation: any) => donation.id === id) ? id : null);
    } catch (error: any) {
      if (version === requestVersion.current) setError(error.message || 'Could not load nearby food.');
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [lat, lng, radius]);
  useFocusEffect(useCallback(() => {
    void load();
    return () => { ++requestVersion.current; };
  }, [load]));

  const updateRadius = async (value: number) => {
    if (savingRadius || value === radius) return;
    setSavingRadius(true);
    try { await authService.updateRadius(value); await refreshUser(); }
    catch (error: any) { Alert.alert('Radius not saved', error.message); }
    finally { setSavingRadius(false); }
  };
  const select = (donation: any) => {
    setSelectedId(donation.id);
    const point = coordinates(donation.latitude, donation.longitude);
    if (point) map.current?.animateToRegion({ ...point, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 250);
    const index = donations.findIndex((item) => item.id === donation.id);
    list.current?.scrollToOffset({ offset: index * (cardWidth + 12), animated: true });
  };
  const logout = () => Alert.alert('Sign out?', 'You can sign in again to manage pickups.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', onPress: () => { void signOut().catch((error) => Alert.alert('Could not sign out', error.message)); } },
  ]);

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={styles.title}>Food nearby</Text>
        <Text style={styles.subtitle}>{loading ? 'Finding available food…' : `${donations.length} listing${donations.length === 1 ? '' : 's'} within ${radius} km`}</Text>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton} onPress={() => router.push('/notifications')}>
        <Ionicons name="notifications-outline" size={22} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" style={styles.iconButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
    <View style={styles.radiusHeader}>
      <Text style={styles.radiusLabel}>Search radius</Text>
      {savingRadius && <ActivityIndicator size="small" color={Colors.secondary} />}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radiusScroll} contentContainerStyle={styles.radii}>
      {Array.from(new Set([...RADII, radius])).sort((a, b) => a - b).map((value) => <TouchableOpacity key={value}
        accessibilityRole="button" accessibilityLabel={`${value} kilometre radius`} accessibilityState={{ selected: radius === value, disabled: savingRadius }}
        disabled={savingRadius} onPress={() => { void updateRadius(value); }} style={[styles.radius, value === radius && styles.radiusSelected]}>
        <Text style={[styles.radiusText, value === radius && styles.radiusTextSelected]}>{value} km</Text>
      </TouchableOpacity>)}
    </ScrollView>
    <Text style={styles.radiusHint}>Alerts use this radius around your NGO address.</Text>

    <View style={styles.mapArea}>
      {center ? <>
        <MapView ref={map} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill}
          initialRegion={{ ...center, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
          onMapReady={() => setMapReady(true)} onLayout={fitRadius} onPress={() => setSelectedId(null)}
          showsUserLocation={Boolean(location)} showsMyLocationButton={false} showsCompass mapType={satellite ? 'satellite' : 'standard'}>
          <Circle center={center} radius={radius * 1000} strokeColor={Colors.secondary} fillColor="rgba(8,118,87,0.09)" strokeWidth={2} />
          <Marker coordinate={center} title={location ? 'Search centre' : 'Your NGO'} pinColor={Colors.secondary} />
          {donations.map((donation) => {
            const point = coordinates(donation.latitude, donation.longitude);
            return point ? <Marker key={donation.id} coordinate={point} title={donation.food_type}
              description={donation.quantity} pinColor={selectedId === donation.id ? Colors.secondary : Colors.primary}
              onPress={(event) => { event.stopPropagation(); select(donation); }} /> : null;
          })}
        </MapView>
        <View style={styles.mapTools}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show full search radius" onPress={fitRadius} style={[styles.mapTool, Shadow.md]}>
            <Ionicons name="locate-outline" size={22} color={Colors.secondary} />
          </TouchableOpacity>
          {Platform.OS !== 'web' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={satellite ? 'Use standard map' : 'Use satellite map'} onPress={() => setSatellite(!satellite)} style={[styles.mapTool, Shadow.md]}>
            <Ionicons name={satellite ? 'map-outline' : 'earth-outline'} size={22} color={Colors.text} />
          </TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh nearby food" disabled={loading} onPress={load} style={[styles.mapTool, Shadow.md]}>
            {loading ? <ActivityIndicator color={Colors.secondary} /> : <Ionicons name="refresh-outline" size={22} color={Colors.text} />}
          </TouchableOpacity>
        </View>
      </> : <View style={styles.unavailable}>
        {locating ? <ActivityIndicator color={Colors.secondary} /> : <>
          <Ionicons name="location-outline" size={32} color={Colors.secondary} />
          <Text style={styles.subtitle}>Allow location access to find food nearby.</Text>
          <Button title="Try location again" onPress={() => { void refreshLocation(); }} />
        </>}
      </View>}
    </View>

    {error ? <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
      <Button title="Retry" variant="outline" size="sm" onPress={load} />
    </View> : !loading && center && donations.length === 0 ? <View style={styles.feedback}>
      <Text style={styles.subtitle}>No food within {radius} km. Try a wider radius or check back later.</Text>
    </View> : null}
    {donations.length > 0 && !error && <View style={styles.tray}>
      <FlatList horizontal ref={list} data={donations} keyExtractor={(donation) => donation.id}
        showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} snapToInterval={cardWidth + 12} decelerationRate="fast"
        renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.food_type}, ${item.quantity}`}
          accessibilityState={{ selected: selectedId === item.id }} onPress={() => select(item)}
          style={[styles.card, { width: cardWidth }, selectedId === item.id && styles.cardSelected]}>
          <Text style={styles.food} numberOfLines={1}>{item.food_type}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{item.organization_name}</Text>
          <Text style={styles.meta} numberOfLines={2}>{item.quantity} · {Number(item.distance_km).toFixed(1)} km · {formatTimeLeft(item.expiry_time).text}</Text>
        </TouchableOpacity>} />
      {selected && <View style={styles.viewListing}>
        <Button title="View listing and request pickup" variant="secondary" fullWidth onPress={() => router.push({ pathname: '/(ngo)/listing/[id]', params: { id: selected.id } })} />
      </View>}
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  headerText: { flex: 1, minWidth: 0, gap: 4 }, title: { ...Typography.h2, color: Colors.text },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  radiusHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginTop: 16 },
  radiusLabel: { ...Typography.label, color: Colors.text },
  radiusScroll: { flexGrow: 0, marginTop: 8 }, radii: { paddingHorizontal: 20, gap: 8 },
  radius: { minHeight: 48, minWidth: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, backgroundColor: Colors.card },
  radiusSelected: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  radiusText: { ...Typography.body, color: Colors.textSecondary }, radiusTextSelected: { color: Colors.secondary, fontWeight: '700' },
  radiusHint: { ...Typography.caption, color: Colors.textSecondary, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  mapArea: { flex: 1, minHeight: 160, backgroundColor: Colors.surface },
  mapTools: { position: 'absolute', right: 12, top: 12, gap: 8 },
  mapTool: { width: 48, height: 48, backgroundColor: Colors.card, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  unavailable: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  feedback: { padding: 20, gap: 12 }, errorText: { ...Typography.body, color: Colors.error },
  tray: { backgroundColor: Colors.background, paddingVertical: 12 }, cards: { paddingHorizontal: 20, gap: 12 },
  card: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, padding: 14, gap: 4, borderRadius: Radius.md },
  cardSelected: { borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight },
  food: { ...Typography.h4, color: Colors.text }, meta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  viewListing: { paddingHorizontal: 20, paddingTop: 12 },
});
