import React, { useState, useEffect } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
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
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { donationsService } from '@/services/donations.service';
import { useLocation } from '@/hooks/useLocation';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import Animated, { FadeInDown } from 'react-native-reanimated';

const EXPIRY_PRESETS = [2, 4, 6, 12, 24] as const;

const DEFAULT_COORDS = { latitude: 30.3398, longitude: 76.3869 };
const DEFAULT_ADDRESS = 'Patiala, Punjab, India';

export default function NewDonationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();

  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [hoursToExpire, setHoursToExpire] = useState(4);
  const [customHoursText, setCustomHoursText] = useState('4');
  const [submitting, setSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'location'>('form');

  // Bug fix: use actual device location as default if available
  const [customLocation, setCustomLocation] = useState<{ latitude: number; longitude: number }>(
    DEFAULT_COORDS,
  );
  const [customAddress, setCustomAddress] = useState(DEFAULT_ADDRESS);
  const [locationSet, setLocationSet] = useState(false);

  // Sync device location as default once available (only if user hasn't manually moved the pin)
  useEffect(() => {
    if (location && !locationSet) {
      setCustomLocation({ latitude: location.latitude, longitude: location.longitude });
      setLocationSet(true);
    }
  }, [location, locationSet]);

  // Bug fix: keep hoursToExpire number and custom text in sync
  const handlePresetPress = (p: number) => {
    setHoursToExpire(p);
    setCustomHoursText(String(p));
  };

  const handleCustomHoursChange = (text: string) => {
    setCustomHoursText(text);
    const n = Number(text);
    if (n > 0 && Number.isFinite(n)) {
      setHoursToExpire(n);
    }
  };

  const pickImage = async () => {
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

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const validate = (): string | null => {
    if (!foodType.trim()) return 'Food type is required.';
    if (!quantity.trim()) return 'Quantity is required.';
    if (!hoursToExpire || hoursToExpire <= 0 || !Number.isFinite(hoursToExpire)) {
      return 'Enter a valid expiry duration in hours.';
    }
    if (!customLocation) return 'Pick a pickup location on the map.';
    return null;
  };

  const submit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      let imagePath = '';
      if (image) {
        try {
          imagePath = await donationsService.uploadImage(image);
        } catch (upErr: any) {
          Alert.alert('Image upload failed', upErr?.message || 'Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const expiry_time = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000).toISOString();
      await donationsService.create({
        food_type: foodType.trim(),
        quantity: quantity.trim(),
        latitude: customLocation.latitude,
        longitude: customLocation.longitude,
        address: customAddress,
        image_path: imagePath,
        expiry_time,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Donation posted! 🎉',
        'Nearby NGOs have been notified and will reach out soon.',
        [{ text: 'Great!', onPress: () => router.replace('/(donor)') }],
      );
    } catch (e: any) {
      Alert.alert('Unable to post donation', e.message);
    } finally {
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
          <Animated.View entering={FadeInDown.delay(60).duration(280)} style={[styles.section, Shadow.sm]}>
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
            />
            <Input
              label="Quantity"
              placeholder="e.g. 10 packs, 5 kg, 20 portions"
              leftIcon="layers-outline"
              value={quantity}
              onChangeText={setQuantity}
            />
          </Animated.View>

          {/* Section: Expiry */}
          <Animated.View entering={FadeInDown.delay(100).duration(280)} style={[styles.section, Shadow.sm]}>
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
                  Expires at{' '}
                  <Text style={styles.expiryPreviewBold}>
                    {new Date(Date.now() + hoursToExpire * 3600000).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {' '}today
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Section: Photo */}
          <Animated.View entering={FadeInDown.delay(140).duration(280)} style={[styles.section, Shadow.sm]}>
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
              style={styles.imagePicker}
              activeOpacity={0.85}
            >
              {image ? (
                <View style={StyleSheet.absoluteFill}>
                  <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
                  <Text style={styles.imagePlaceholderHelp}>Helps NGOs see what's available</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Section: Location */}
          <Animated.View entering={FadeInDown.delay(180).duration(280)} style={[styles.section, Shadow.sm]}>
            <View style={styles.sectionHeadRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="location-outline" size={16} color="#7C3AED" />
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
                setCustomLocation(loc);
                setLocationSet(true);
                if (addr) setCustomAddress(addr);
              }}
              height={220}
            />
          </Animated.View>

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
            Nearby NGOs will receive a notification immediately after publishing.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 60, paddingTop: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },

  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: Spacing.md,
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 9,
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
    flex: 1, paddingVertical: 11, borderRadius: Radius.md,
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