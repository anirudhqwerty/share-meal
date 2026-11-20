import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Alert } from '@/utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius, Typography, Shadow } from '@/constants/theme';
import { authService } from '@/services/auth.service';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { Coordinates } from '@/utils/geo';

export default function RegisterScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: 'donor' | 'ngo' }>();
  const normalizedRole = role === 'donor' || role === 'ngo' ? role : null;
  const { refreshUser, signOut } = useAuth();
  const { location: deviceLocation, address, loading: locLoading, error: locationError, refresh: refreshLoc } = useLocation();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const locationEdited = useRef(false);
  const addressEdited = useRef(false);

  const isDonor = normalizedRole === 'donor';

  // Shared
  const [phone, setPhone] = useState('');

  // Donor fields
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState(address);

  // NGO fields
  const [ngoName, setNgoName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [ngoAddress, setNgoAddress] = useState(address);
  const [radius, setRadius] = useState('5');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (deviceLocation && !locationEdited.current) setLocation(deviceLocation);
    if (address && !addressEdited.current && !locationEdited.current) {
      setOrgAddress(address);
      setNgoAddress(address);
    }
  }, [address, deviceLocation]);

  React.useEffect(() => {
    if (!normalizedRole) {
      Alert.alert('Role required', 'Please choose Donor or NGO first.');
      router.replace('/(auth)/welcome');
    }
  }, [normalizedRole, router]);

  const validate = () => {
    if (!normalizedRole) {
      setErrors({ role: 'Role is missing. Please reselect role.' });
      return false;
    }
    const e: Record<string, string> = {};
    if (isDonor) {
      if (!orgName.trim()) e.orgName = 'Organization name is required';
      if (!orgAddress.trim()) e.orgAddress = 'Address is required';
    } else {
      if (!ngoName.trim()) e.ngoName = 'NGO name is required';
      if (!regNumber.trim()) e.regNumber = 'Registration number is required';
      if (!ngoAddress.trim()) e.ngoAddress = 'Address is required';
      const radiusKm = Number(radius);
      if (!/^\d+$/.test(radius) || !Number.isInteger(radiusKm) || radiusKm < 1 || radiusKm > 100) {
        e.radius = 'Enter a whole number from 1 to 100 km';
      }
    }
    if (!location) e.location = 'Select your organization location on the map or use your device location.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (loading) return;
    if (!validate()) return;
    if (!normalizedRole) return;
    setLoading(true);
    try {
      let organizationData: Record<string, any>;
      if (normalizedRole === 'donor') {
        organizationData = {
          organization_name: orgName,
          address: orgAddress,
          latitude: location!.latitude,
          longitude: location!.longitude,
        };
      } else if (normalizedRole === 'ngo') {
        organizationData = {
          ngo_name: ngoName,
          registration_number: regNumber,
          address: ngoAddress,
          latitude: location!.latitude,
          longitude: location!.longitude,
          notification_radius_km: parseInt(radius, 10),
        };
      } else {
        throw new Error('Invalid role selected. Please choose again.');
      }

      await authService.registerProfile({ role: normalizedRole, phone, organizationData });
      await refreshUser();
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <BrandLogo size={54} variant="contained" />
            <Text style={styles.title}>Your {isDonor ? 'donor' : 'NGO'} profile</Text>
            <Text style={styles.subtitle}>Add your organization and collection address.</Text>
          </View>

          {/* Shared */}
          <Input
            label="Phone Number (Optional)"
            leftIcon="call-outline"
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={20}
          />

          {isDonor ? (
            <>
              <Input
                label="Organization / Restaurant Name *"
                leftIcon="business-outline"
                placeholder="e.g. The Grand Hotel"
                value={orgName}
                onChangeText={setOrgName}
                maxLength={255}
                error={errors.orgName}
              />
              <Input
                label="Address *"
                leftIcon="location-outline"
                placeholder="Street, City, State"
                value={orgAddress}
                onChangeText={(text) => { addressEdited.current = true; setOrgAddress(text); }}
                maxLength={2000}
                error={errors.orgAddress}
                multiline
              />
            </>
          ) : (
            <>
              <Input
                label="NGO Name *"
                leftIcon="people-outline"
                placeholder="e.g. Feeding India Foundation"
                value={ngoName}
                onChangeText={setNgoName}
                maxLength={255}
                error={errors.ngoName}
              />
              <Input
                label="Registration Number *"
                leftIcon="document-text-outline"
                placeholder="e.g. MH/2024/00123"
                value={regNumber}
                onChangeText={setRegNumber}
                maxLength={100}
                error={errors.regNumber}
                autoCapitalize="characters"
              />
              <Input
                label="Address *"
                leftIcon="location-outline"
                placeholder="Street, City, State"
                value={ngoAddress}
                onChangeText={(text) => { addressEdited.current = true; setNgoAddress(text); }}
                maxLength={2000}
                error={errors.ngoAddress}
                multiline
              />
              <Input
                label="Notification Radius (km)"
                leftIcon="radio-outline"
                placeholder="5"
                keyboardType="number-pad"
                value={radius}
                onChangeText={setRadius}
                error={errors.radius}
                hint="You'll receive alerts for food within this radius"
              />
            </>
          )}

          {/* Location */}
          <View style={[styles.locBox, Shadow.sm]}>
            <View style={styles.locRow}>
              <View style={[styles.locIcon, { backgroundColor: location ? Colors.successBg : Colors.surface }]}>
                <Ionicons name="location" size={20} color={location ? Colors.success : Colors.textMuted} />
              </View>
              <View style={styles.locText}>
                <Text style={styles.locTitle}>{location ? 'Organization location' : locLoading ? 'Finding your location…' : 'Choose your location'}</Text>
                {location && (
                  <Text style={styles.locCoords}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
                )}
                {errors.location && <Text style={styles.locError}>{errors.location}</Text>}
              </View>
              {locLoading && <ActivityIndicator size="small" color={Colors.primary} />}
              {!locLoading && (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Use device location" style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }} onPress={() => { locationEdited.current = false; void refreshLoc(); }}>
                  <Ionicons name="refresh" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {!location && locationError ? <Text style={styles.locError}>{locationError}</Text> : null}
          <LocationPickerMap
            initialLatitude={location?.latitude}
            initialLongitude={location?.longitude}
            onLocationChange={(point, selectedAddress) => {
              locationEdited.current = true;
              setLocation(point);
              if (selectedAddress) { setOrgAddress(selectedAddress); setNgoAddress(selectedAddress); }
            }}
            height={220}
          />
          <Button title="Use another account" variant="ghost" disabled={loading} onPress={() => { void signOut().catch((error) => Alert.alert('Could not sign out', error.message)); }} style={{ marginTop: 12 }} />

          <Button
            title="Complete Registration"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 32, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { marginBottom: Spacing.xl, gap: 10 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, marginBottom: 14,
  },
  roleChipText: { ...Typography.label, fontSize: 12 },
  title: { ...Typography.h2, color: Colors.text, marginBottom: 6 },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  locBox: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locText: { flex: 1 },
  locTitle: { ...Typography.h4, color: Colors.text, fontSize: 14 },
  locCoords: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  locError: { ...Typography.caption, color: Colors.error, marginTop: 2 },
});
