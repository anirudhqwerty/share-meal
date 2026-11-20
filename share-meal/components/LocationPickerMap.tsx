import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from '@/components/maps/Map';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';

interface LocationPickerMapProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onLocationChange: (location: { latitude: number; longitude: number }, address: string) => void;
  height?: number;
}

export function LocationPickerMap({
  initialLatitude,
  initialLongitude,
  onLocationChange,
  height = 250,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapView>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const hasInteracted = useRef(false);
  const userDraggedMap = useRef(false);

  useEffect(() => {
    if (typeof initialLatitude === 'number' && typeof initialLongitude === 'number' && !hasInteracted.current) {
      const region = {
        latitude: initialLatitude,
        longitude: initialLongitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current?.animateToRegion(region);
    }
  }, [initialLatitude, initialLongitude]);
  useEffect(() => () => { ++requestVersion.current; }, []);
  
  const handleRegionChangeComplete = async (region: Region) => {
    if (!userDraggedMap.current) return;
    userDraggedMap.current = false;
    hasInteracted.current = true;
    const version = ++requestVersion.current;
    const point = { latitude: region.latitude, longitude: region.longitude };
    const fallback = `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
    onLocationChange(point, fallback);
    setError('');
    setLoading(true);
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude
      });
      if (version !== requestVersion.current) return;
      if (place) {
        const addr = `${place.name || place.street || ''}, ${place.city || place.subregion || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',').trim();
        const finalAddr = addr.endsWith(',') ? addr.slice(0, -1) : addr;
        setAddress(finalAddr);
        onLocationChange({ latitude: region.latitude, longitude: region.longitude }, finalAddr);
      } else {
        setAddress('');
      }
    } catch {
      if (version === requestVersion.current) setAddress('');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!address.trim()) return;
    const version = ++requestVersion.current;
    const query = address.trim();
    setError('');
    setLoading(true);
    try {
      const [result] = await Location.geocodeAsync(query);
      if (version !== requestVersion.current) return;
      if (result) {
        hasInteracted.current = true;
        const newRegion = {
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        };
        mapRef.current?.animateToRegion(newRegion);
        onLocationChange(
          { latitude: result.latitude, longitude: result.longitude },
          query,
        );
      } else setError('No location found. Try a fuller address or move the map pin.');
    } catch {
      if (version === requestVersion.current) setError('Address search is unavailable. Move the map pin to choose your location.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search pickup address or move the map</Text>
      <View style={[styles.inputWrapper, Shadow.md]}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput 
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={handleAddressSubmit}
          placeholder="Type an address to search..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          accessibilityLabel="Search pickup address"
        />
        {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Find address" onPress={handleAddressSubmit} style={styles.searchButton}>
          <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={[styles.mapWrap, Shadow.md, { height }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: initialLatitude ?? 30.3398,
            longitude: initialLongitude ?? 76.3869,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          onMapReady={() => {
            if (initialLatitude != null && initialLongitude != null && !hasInteracted.current) mapRef.current?.animateToRegion({ latitude: initialLatitude, longitude: initialLongitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 0);
          }}
          onPanDrag={() => { userDraggedMap.current = true; hasInteracted.current = true; ++requestVersion.current; }}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
        <View style={styles.centerMarker} pointerEvents="none">
          <Ionicons name="location" size={42} color={Colors.primary} style={styles.markerIcon} />
          <View style={styles.markerDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...Typography.label, color: Colors.textSecondary },
  error: { ...Typography.caption, color: Colors.error },
  searchButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  container: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.sm,
    ...Typography.body,
    fontSize: 16,
    color: Colors.text,
  },
  mapWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -21,
    marginTop: -42,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  markerIcon: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -4,
  }
});
