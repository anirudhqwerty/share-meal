import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const [regionInitialized, setRegionInitialized] = useState(false);

  useEffect(() => {
    if (initialLatitude && initialLongitude && !regionInitialized) {
      const region = {
        latitude: initialLatitude,
        longitude: initialLongitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current?.animateToRegion(region);
      setRegionInitialized(true);
    }
  }, [initialLatitude, initialLongitude, regionInitialized]);
  
  const handleRegionChangeComplete = async (region: Region) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude
      });
      if (place) {
        const addr = `${place.name || place.street || ''}, ${place.city || place.subregion || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',').trim();
        const finalAddr = addr.endsWith(',') ? addr.slice(0, -1) : addr;
        setAddress(finalAddr);
        onLocationChange({ latitude: region.latitude, longitude: region.longitude }, finalAddr);
      } else {
        onLocationChange({ latitude: region.latitude, longitude: region.longitude }, 'Unknown Location');
      }
    } catch(e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!address.trim()) return;
    setLoading(true);
    try {
      const [result] = await Location.geocodeAsync(address);
      if (result) {
        const newRegion = {
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        };
        mapRef.current?.animateToRegion(newRegion);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>
      <View style={[styles.mapWrap, Shadow.md, { height }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: initialLatitude || 37.78825,
            longitude: initialLongitude || -122.4324,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
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
  container: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.body,
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
