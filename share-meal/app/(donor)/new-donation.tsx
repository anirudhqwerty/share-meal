import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, View, Image, TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { donationsService } from '@/services/donations.service';
import { useLocation } from '@/hooks/useLocation';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/utils/alert';

const EXPIRY_PRESETS = [2, 4, 6, 12, 24] as const;

const DEFAULT_COORDS = { latitude: 30.3398, longitude: 76.3869 };
const DEFAULT_ADDRESS = 'Choose the pickup location on the map';

export default function NewDonationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location, address } = useLocation();
  const { profile } = useAuth();

  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [hoursToExpire, setHoursToExpire] = useState(4);
  const [customHoursText, setCustomHoursText] = useState('4');
  const [submitting, setSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [customLocation, setCustomLocation] = useState<{ latitude: number; longitude: number }>(
    profile?.latitude != null && profile?.longitude != null ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) } : DEFAULT_COORDS,
  );
  const [customAddress, setCustomAddress] = useState(profile?.address || DEFAULT_ADDRESS);
  const [locationSet, setLocationSet] = useState(profile?.latitude != null && profile?.longitude != null);
  const manuallySelectedLocation = useRef(false);
  const submissionInProgress = useRef(false);

  const finishPosting = () => {
    setFoodType(''); setQuantity(''); setImage(null);
    setHoursToExpire(4); setCustomHoursText('4');
    router.replace('/(donor)');
  };

  // Sync device location as default once available (only if user hasn't manually moved the pin)
  useEffect(() => {
    if (location && !profile?.address && !manuallySelectedLocation.current) {
      setCustomLocation({ latitude: location.latitude, longitude: location.longitude });
      setLocationSet(true);
    }
    if (address && !profile?.address && !manuallySelectedLocation.current) setCustomAddress(address);
  }, [location, address, profile?.address]);

  // Bug fix: keep hoursToExpire number and custom text in sync
  const handlePresetPress = (p: number) => {
    setHoursToExpire(p);
    setCustomHoursText(String(p));
  };

  const handleCustomHoursChange = (text: string) => {
    setCustomHoursText(text);
    const n = Number(text);
    setHoursToExpire(text.trim() && n > 0 && Number.isFinite(n) ? n : 0);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to upload a food image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });

      if (!result.canceled && result.assets?.[0]?.uri) setImage(result.assets[0].uri);
    } catch (error: any) {
      Alert.alert('Unable to open photos', error.message || 'Please try again.');
    }
  };

  const validate = (): string | null => {
    if (!foodType.trim()) return 'Food type is required.';
    if (!quantity.trim()) return 'Quantity is required.';
    if (!hoursToExpire || hoursToExpire <= 0 || !Number.isFinite(hoursToExpire) || hoursToExpire > 168) {
      return 'Enter an expiry duration from 0 to 168 hours.';
    }
    if (!locationSet) return 'Wait for your location or choose a pickup location on the map.';
    return null;
  };

  const submit = async () => {
    if (submissionInProgress.current) return;

    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    const submissionStartedAt = Date.now();
    const expiry_time = new Date(submissionStartedAt + hoursToExpire * 60 * 60 * 1000).toISOString();
    const submission = {
      food_type: foodType.trim(),
      quantity: quantity.trim(),
      latitude: customLocation.latitude,
      longitude: customLocation.longitude,
      address: customAddress,
      expiry_time,
    };
    let imagePath = '';

    try {
      if (image) {
        try {
          imagePath = await donationsService.uploadImage(image);
        } catch (upErr: any) {
          Alert.alert('Image upload failed', upErr?.message || 'Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        ...submission,
        image_path: imagePath,
      };
      await donationsService.create(payload);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Donation posted',
        'Your food is now listed for nearby NGOs.',
        [{ text: 'View donations', onPress: finishPosting }],
      );
    } catch (e: any) {
      // A mobile connection can drop after the API has committed the donation but
      // before Axios receives the 201 response. Reconcile that exact submission
      // before telling the donor to retry and risk creating a duplicate.
      if (e?.status == null && (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED' || e?.message === 'Network Error')) {
        try {
          const donations = await donationsService.getMyDonations();
          const expectedExpiry = new Date(expiry_time).getTime();
          const savedDonation = donations?.find((donation: any) => {
            const createdAt = new Date(donation.created_at).getTime();
            return (
              donation.food_type === submission.food_type &&
              donation.quantity === submission.quantity &&
              Number(donation.latitude) === submission.latitude &&
              Number(donation.longitude) === submission.longitude &&
              new Date(donation.expiry_time).getTime() === expectedExpiry &&
              (donation.image_path || '') === imagePath &&
              Number.isFinite(createdAt) &&
              createdAt >= submissionStartedAt - 10_000 &&
              createdAt <= Date.now() + 5_000
            );
          });

          if (savedDonation) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Donation posted',
              'Your food is now listed for nearby NGOs.',
              [{ text: 'View donations', onPress: finishPosting }],
            );
            return;
          }
        } catch {
          // The connection may also prevent the confirmation lookup; explain that
          // the donor should check their list before making another submission.
        }

        Alert.alert(
          'Connection interrupted',
          'I couldn’t confirm whether the donation was saved. Check My donations before trying again to avoid a duplicate.',
        );
        return;
      }

      Alert.alert('Unable to post donation', e.message);
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  };

  // Determine if custom hours input doesn't match any preset
  const isCustomHours = !EXPIRY_PRESETS.includes(hoursToExpire as any);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title="New donation" showBack />
          <Text style={styles.subtitle}>Fill in the details and publish instantly to nearby NGOs.</Text>

          {/* Section: Basics */}
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="nutrition-outline" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.sectionLabel}>Food details</Text>
            </View>

            <Input
              label="Food type"
              placeholder="e.g. Cooked meals, fruits, rice"
              leftIcon="nutrition-outline"
              value={foodType}
              onChangeText={setFoodType}
              maxLength={500}
            />
            <Input
              label="Quantity"
              placeholder="e.g. 10 packs, 5 kg, 20 portions"
              leftIcon="layers-outline"
              value={quantity}
              onChangeText={setQuantity}
              maxLength={100}
            />
          </View>

          {/* Section: Expiry */}
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={16} color="#D97706" />
              </View>
              <Text style={styles.sectionLabel}>Expires in</Text>
            </View>

            {/* Preset chips */}
            <View style={styles.presetRow}>
              {EXPIRY_PRESETS.map((p) => {
                const active = hoursToExpire === p && !isCustomHours;
                return (
                  <TouchableOpacity
                    key={p}
                    accessibilityRole="button" accessibilityLabel={`${p} hours`} accessibilityState={{ selected: active }}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => handlePresetPress(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>
                      {p}h
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bug fix: custom input synced with presets */}
            <Input
              label="Custom (hours)"
              placeholder="e.g. 8"
              leftIcon="create-outline"
              keyboardType="number-pad"
              value={customHoursText}
              onChangeText={handleCustomHoursChange}
            />

            {hoursToExpire > 0 && Number.isFinite(hoursToExpire) && (
              <View style={styles.expiryPreview}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.expiryPreviewText}>
                  Expires{' '}
                  <Text style={styles.expiryPreviewBold}>
                    {new Date(Date.now() + hoursToExpire * 3600000).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {/* Section: Photo */}
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: Colors.secondaryLight }]}>
                <Ionicons name="camera-outline" size={16} color={Colors.secondary} />
              </View>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Food photo</Text>
                <Text style={styles.sectionOptional}>Optional</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={pickImage}
              accessibilityRole="button" accessibilityLabel={image ? 'Change food photo' : 'Add food photo'}
              style={styles.imagePicker}
              activeOpacity={0.85}
            >
              {image ? (
                <View style={StyleSheet.absoluteFill}>
                  <Image accessibilityLabel="Selected food photo" source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.imageOverlay}>
                    <View style={styles.imageOverlayBtn}>
                      <Ionicons name="camera" size={18} color={Colors.white} />
                      <Text style={styles.changePhotoText}>Tap to change</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.imageIconWrap}>
                    <Ionicons name="camera-outline" size={26} color={Colors.primary} />
                  </View>
                  <Text style={styles.imagePlaceholderTitle}>Add a food photo</Text>
                  <Text style={styles.imagePlaceholderHelp}>Helps NGOs see what&apos;s available</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Section: Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Pickup location</Text>
              </View>
            </View>
            <Text style={styles.addressText} numberOfLines={2}>{customAddress}</Text>

            <LocationPickerMap
              initialLatitude={customLocation.latitude}
              initialLongitude={customLocation.longitude}
              onLocationChange={(loc, addr) => {
                manuallySelectedLocation.current = true;
                setCustomLocation(loc);
                setLocationSet(true);
                if (addr) setCustomAddress(addr);
              }}
              height={220}
            />
          </View>

          {/* Error message */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title="Publish donation"
            onPress={submit}
            loading={submitting}
            fullWidth
            size="lg"
          />

          <Text style={styles.publishNote}>
            Choose an expiry time that reflects how long the food is safe to collect.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 32, paddingTop: Spacing.sm, maxWidth: 760, width: '100%', alignSelf: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },

  section: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionHeadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: Spacing.md,
  },
  sectionIconWrap: {
    width: 24, height: 24, borderRadius: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: {
    ...Typography.label, color: Colors.text, fontSize: 13,
    fontWeight: '700', letterSpacing: 0.2,
  },
  sectionOptional: {
    ...Typography.caption, color: Colors.textMuted,
    fontSize: 11, backgroundColor: Colors.surface,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },

  presetRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  presetChip: {
    flex: 1, paddingVertical: 11, minHeight: 48, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  presetText: { ...Typography.label, color: Colors.textSecondary, fontSize: 13 },
  presetTextActive: { color: Colors.primary, fontWeight: '800' },

  expiryPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.md, marginTop: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  expiryPreviewText: { ...Typography.caption, color: Colors.textSecondary },
  expiryPreviewBold: { fontWeight: '700', color: Colors.text },

  imagePicker: {
    width: '100%', height: 190,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    overflow: 'hidden', backgroundColor: Colors.surface,
  },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  imageIconWrap: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholderTitle: { ...Typography.h4, color: Colors.text, fontSize: 14 },
  imagePlaceholderHelp: { ...Typography.caption, color: Colors.textSecondary },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14,
  },
  imageOverlayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
  },
  changePhotoText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  addressText: {
    ...Typography.caption, color: Colors.textSecondary,
    marginBottom: Spacing.sm, lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: '#FCA5A5',
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.caption, color: Colors.error, flex: 1, lineHeight: 18 },

  publishNote: {
    ...Typography.caption, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.md, lineHeight: 18,
  },
});
