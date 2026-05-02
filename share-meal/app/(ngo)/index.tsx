import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  FlatList, Pressable, Dimensions, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { donationsService } from '@/services/donations.service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseServerDate } from '@/utils/time';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_GAP = 12;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;

/** Four cardinal points on the search-radius circle so fitToCoordinates never crops the circle. */
function circleBoundaryCoordinates(
  lat: number,
  lng: number,
  radiusKm: number,
): { latitude: number; longitude: number }[] {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLat = (radiusKm / 111) * 1.08;
  const dLng = radiusKm / (111 * Math.max(cosLat, 0.15)) * 1.08;
  return [
    { latitude: lat + dLat, longitude: lng },
    { latitude: lat - dLat, longitude: lng },
    { latitude: lat, longitude: lng + dLng },
    { latitude: lat, longitude: lng - dLng },
  ];
}

function regionForRadius(latitude: number, longitude: number, radiusKm: number): Region {
  // Ensure the full circle (diameter 2R) fits: span ≥ 2R/111 with margin.
  const latDelta = Math.max((radiusKm / 111) * 2.6, ((2 * radiusKm) / 111) * 1.2);
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const lngDelta = cosLat > 0.01 ? latDelta / cosLat : latDelta;
  return { latitude, longitude, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

function toLatLng(lat: unknown, lng: unknown): { latitude: number; longitude: number } | null {
  const latitude = typeof lat === 'number' && Number.isFinite(lat) ? lat : parseFloat(String(lat));
  const longitude = typeof lng === 'number' && Number.isFinite(lng) ? lng : parseFloat(String(lng));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function timeUntilExpiry(expiryTimeStr: string | null | undefined): string | null {
  if (!expiryTimeStr) return null;
  const exp = parseServerDate(expiryTimeStr);
  if (!exp) return null;
  const diffMs = exp.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

/** Single horizontal listing card shown in the bottom tray */
function DonationMapCard({
  donation,
  isSelected,
  onPress,
}: {
  donation: any;
  isSelected: boolean;
  onPress: () => void;
}) {
  const expiryLabel = timeUntilExpiry(donation.expiry_time);
  const isExpiringSoon =
    !!expiryLabel &&
    expiryLabel !== 'Expired' &&
    expiryLabel.includes('m left') &&
    !expiryLabel.includes('h');

  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      android_ripple={{ color: Colors.secondaryLight }}
    >
      {/* Green accent bar at top when selected */}
      {isSelected && <View style={styles.cardAccentBar} />}

      {/* Top row: emoji badge + text + selection indicator */}
      <View style={styles.cardTop}>
        <View style={[styles.cardEmojiBadge, isSelected && styles.cardEmojiBadgeSelected]}>
          <Text style={styles.cardEmoji}>🍲</Text>
        </View>
        <View style={styles.cardTextBlock}>
          <Text style={styles.cardFoodType} numberOfLines={1}>
            {donation.food_type}
          </Text>
          <Text style={styles.cardOrg} numberOfLines={1}>
            {donation.organization_name}
          </Text>
        </View>
        {isSelected ? (
          <View style={styles.cardCheckBadge}>
            <Ionicons name="checkmark" size={11} color={Colors.white} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.border} />
        )}
      </View>

      {/* Chip row */}
      <View style={styles.cardChips}>
        {donation.distance_km != null && Number.isFinite(Number(donation.distance_km)) && (
          <View style={styles.cardChip}>
            <Ionicons name="navigate" size={10} color={Colors.secondary} />
            <Text style={styles.cardChipText}>{Number(donation.distance_km).toFixed(1)} km</Text>
          </View>
        )}
        <View style={styles.cardChip}>
          <Ionicons name="layers" size={10} color={Colors.secondary} />
          <Text style={styles.cardChipText}>{donation.quantity}</Text>
        </View>
        {expiryLabel && (
          <View style={[styles.cardChip, isExpiringSoon && styles.cardChipWarn]}>
            <Ionicons
              name="time"
              size={10}
              color={isExpiringSoon ? '#D97706' : Colors.secondary}
            />
            <Text
              style={[styles.cardChipText, isExpiringSoon && styles.cardChipTextWarn]}
            >
              {expiryLabel}
            </Text>
          </View>
        )}
      </View>

      {/* Footer hint */}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardFooterText, isSelected && styles.cardFooterTextSelected]}>
          {isSelected ? 'Selected on map' : 'Tap to view on map'}
        </Text>
        <Ionicons
          name={isSelected ? 'location' : 'map-outline'}
          size={11}
          color={isSelected ? Colors.secondary : Colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

export default function NgoMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location, loading: locLoading } = useLocation();
  const { profile, signOut } = useAuth();
  const mapRef = useRef<MapView>(null);
  const cardListRef = useRef<FlatList<any>>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const radius = (profile as any)?.notification_radius_km || 5;

  const load = useCallback(async () => {
    if (!location) return;
    try {
      const data = await donationsService.getNearby(
        location.latitude,
        location.longitude,
        radius,
      );
      setDonations(data || []);
    } catch (e: any) {
      Alert.alert('Error loading donations', e.message);
    } finally {
      setLoading(false);
    }
  }, [location, radius]);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      if (location) void load();
    }, [location, load]),
  );

  // Pan to user on first location fix
  useEffect(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      regionForRadius(location.latitude, location.longitude, radius),
      400,
    );
  }, [location, radius]);

  // Fit markers + full radius circle (boundary points) so the green circle is never clipped.
  useEffect(() => {
    if (!location || !mapRef.current) return;
    const donationCoords = donations
      .map((d) => toLatLng(d.latitude, d.longitude))
      .filter((c): c is { latitude: number; longitude: number } => c !== null);
    const circleRing = circleBoundaryCoordinates(location.latitude, location.longitude, radius);
    const toFit =
      donationCoords.length === 0
        ? [...circleRing, { latitude: location.latitude, longitude: location.longitude }]
        : [
            { latitude: location.latitude, longitude: location.longitude },
            ...donationCoords,
            ...circleRing,
          ];
    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(toFit, {
        edgePadding: { top: 175, right: 36, bottom: 320, left: 36 },
        animated: true,
      });
    });
  }, [donations, location, radius]);

  /** Select a donation: haptic + fly map + scroll card into view */
  const selectDonation = useCallback(
    (d: any) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelected((prev: any) => (prev?.id === d.id ? null : d)); // toggle

      const coord = toLatLng(d.latitude, d.longitude);
      if (coord && mapRef.current) {
        mapRef.current.animateToRegion(
          regionForRadius(coord.latitude, coord.longitude, Math.min(radius, 1.5)),
          480,
        );
      }

      const idx = donations.findIndex((x) => x.id === d.id);
      if (idx >= 0) {
        try {
          cardListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.45 });
        } catch {
          cardListRef.current?.scrollToOffset({
            offset: idx * CARD_STRIDE,
            animated: true,
          });
        }
      }
    },
    [donations, radius],
  );

  const centerOnUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      regionForRadius(location.latitude, location.longitude, radius),
      600,
    );
  };

  const handleViewListing = () => {
    if (!selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = selected.id;
    setSelected(null);
    router.push({ pathname: '/(ngo)/listing/[id]', params: { id } });
  };

  if (locLoading || loading) return <LoadingSpinner text="Finding food near you…" />;

  const initialRegion = location
    ? regionForRadius(location.latitude, location.longitude, radius)
    : undefined;

  // Tab navigator already lays out above the tab bar — only offset by safe inset + padding.
  const TRAY_BOTTOM = Math.max(insets.bottom, 10) + Spacing.sm;
  const LOC_BTN_BOTTOM = TRAY_BOTTOM + 200 + Spacing.md;

  return (
    <View style={styles.container}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        mapType={mapType}
        showsCompass={false}
        showsScale={false}
        onPress={() => setSelected(null)}
      >
        {location && (
          <Circle
            center={location}
            radius={radius * 1000}
            strokeColor="rgba(19,184,134,0.5)"
            fillColor="rgba(19,184,134,0.06)"
            strokeWidth={1.5}
          />
        )}

        {donations.map((d) => {
          const coord = toLatLng(d.latitude, d.longitude);
          if (!coord) return null;
          const isSel = selected?.id === d.id;

          return (
            <Marker
              key={String(d.id)}
              coordinate={coord}
              tracksViewChanges={true}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => selectDonation(d)}
            >
              {/*
               * Map renders Marker children into a square bitmap — shadows, tails, and
               * negative inset rings get clipped (often bottom-left). Keep everything
               * inside a fixed box with only in-bounds styling.
               */}
              <View style={styles.markerWrap} collapsable={false}>
                <View style={[styles.pin, isSel && styles.pinSelected]}>
                  <Text style={styles.pinEmoji}>🍲</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Top overlay: header + stats ── */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none" edges={['top']}>
        <Animated.View entering={FadeInDown.springify().damping(18).stiffness(200).mass(0.8)} style={[styles.header, Shadow.md]}>
          <View style={styles.headerLeft}>
            <BrandLogo size={32} variant="plain" />
            <View>
              <Text style={styles.headerTitle}>Nearby food</Text>
              <Text style={styles.headerSub}>Within {radius} km</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.countPill}>
              <Ionicons name="restaurant" size={11} color={Colors.secondary} />
              <Text style={styles.countText}>{donations.length}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setMapType((t) => (t === 'standard' ? 'satellite' : 'standard'));
              }}
              style={styles.iconBtn}
            >
              <Ionicons
                name={mapType === 'standard' ? 'earth' : 'map-outline'}
                size={16}
                color={Colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={styles.iconBtn}
            >
              <Ionicons name="notifications-outline" size={16} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={16} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {donations.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(20).stiffness(220).mass(0.7)}
            style={styles.statsStrip}
          >
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{donations.length}</Text>
              <Text style={styles.statLbl}>Available</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{radius} km</Text>
              <Text style={styles.statLbl}>Radius</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>
                {donations[0]?.distance_km != null
                  ? `${Number(donations[0].distance_km).toFixed(1)} km`
                  : '—'}
              </Text>
              <Text style={styles.statLbl}>Nearest</Text>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ── Locate-me FAB ── */}
      <TouchableOpacity
        style={[styles.locBtn, Shadow.md, { bottom: LOC_BTN_BOTTOM }]}
        onPress={centerOnUser}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={20} color={Colors.secondary} />
      </TouchableOpacity>

      {/* ── Bottom card tray (always visible when donations exist) ── */}
      {donations.length > 0 && (
        <Animated.View
          entering={SlideInUp.springify().damping(16).stiffness(240).mass(0.9)}
          style={[styles.trayContainer, { bottom: TRAY_BOTTOM }]}
        >
          {/* "Request pickup" action bar — slides in when a card is selected */}
          {selected && (
            <Animated.View
              entering={ZoomIn.springify().damping(14).stiffness(300).mass(0.7)}
              style={[styles.actionBar, Shadow.md]}
            >
              <View style={styles.actionBarLeft}>
                <Text style={styles.actionBarTitle} numberOfLines={1}>
                  {selected.food_type}
                </Text>
                <Text style={styles.actionBarOrg} numberOfLines={1}>
                  {selected.organization_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionBarBtn}
                onPress={handleViewListing}
                activeOpacity={0.88}
              >
                <Text style={styles.actionBarBtnText}>Request pickup</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.white} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Horizontal list — FlatList + snap so all listings scroll reliably */}
          <FlatList
            ref={cardListRef}
            horizontal
            data={donations}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.cardSlide}>
                <DonationMapCard
                  donation={item}
                  isSelected={selected?.id === item.id}
                  onPress={() => selectDonation(item)}
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: CARD_STRIDE,
              offset: CARD_STRIDE * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => {
                cardListRef.current?.scrollToOffset({
                  offset: index * CARD_STRIDE,
                  animated: true,
                });
              });
            }}
            showsHorizontalScrollIndicator
            decelerationRate="fast"
            snapToInterval={CARD_STRIDE}
            snapToAlignment="start"
            disableIntervalMomentum
            bounces
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.trayListContent}
          />
        </Animated.View>
      )}

      {/* ── Empty state pill ── */}
      {donations.length === 0 && (
        <Animated.View
          entering={FadeIn.springify().damping(18).stiffness(200)}
          style={[styles.emptyPill, { bottom: TRAY_BOTTOM + 16 }]}
        >
          <Ionicons name="restaurant-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.emptyPillText}>No food within {radius} km</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },

  /* ── Header ── */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginHorizontal: Spacing.md,
    marginTop: Spacing.sm, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerTitle: { ...Typography.h4, color: Colors.text, fontSize: 15 },
  headerSub: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  countText: { ...Typography.label, color: Colors.secondary, fontSize: 12, fontWeight: '700' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },

  /* ── Stats strip ── */
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: 8,
    borderRadius: Radius.lg, paddingVertical: 9, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { ...Typography.h4, color: Colors.text, fontSize: 13, fontWeight: '800' },
  statLbl: { ...Typography.caption, color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  statDivider: { width: 1, height: 20, backgroundColor: Colors.border },

  /* ── Locate FAB ── */
  locBtn: {
    position: 'absolute', right: Spacing.lg,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },

  /* ── Map markers (must fit inside bitmap — no overflow, no outer shadows) ── */
  markerWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  pinSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
  },
  pinEmoji: { fontSize: 22, lineHeight: 28, textAlign: 'center' },

  /* ── Card tray ── */
  trayContainer: { position: 'absolute', left: 0, right: 0 },
  trayListContent: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'stretch',
  },
  /** One page in the horizontal carousel: card + trailing gap */
  cardSlide: {
    width: CARD_STRIDE,
    paddingRight: CARD_GAP,
    justifyContent: 'flex-start',
  },

  /* ── Individual card ── */
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 8,
  },
  cardSelected: {
    borderColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.2,
    elevation: 8,
  },
  cardAccentBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3.5, backgroundColor: Colors.secondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  cardEmojiBadge: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    overflow: 'visible',
  },
  cardEmojiBadgeSelected: { backgroundColor: Colors.secondaryLight },
  cardEmoji: { fontSize: 24, textAlign: 'center' },
  cardTextBlock: { flex: 1 },
  cardFoodType: { ...Typography.h4, color: Colors.text, fontSize: 14, lineHeight: 19 },
  cardOrg: { ...Typography.caption, color: Colors.textSecondary, marginTop: 1, fontSize: 11 },
  cardCheckBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },

  cardChips: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 10 },
  cardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  cardChipWarn: { backgroundColor: '#FEF3C7' },
  cardChipText: {
    ...Typography.caption, color: Colors.secondary,
    fontWeight: '600', fontSize: 10,
  },
  cardChipTextWarn: { color: '#D97706' },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
    paddingTop: 8, borderTopWidth: 1, borderColor: Colors.border,
  },
  cardFooterText: {
    ...Typography.caption, color: Colors.textMuted, fontSize: 10, fontWeight: '500',
  },
  cardFooterTextSelected: { color: Colors.secondary, fontWeight: '600' },

  /* ── "Request pickup" action bar ── */
  actionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md, marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 11, paddingHorizontal: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.secondary,
  },
  actionBarLeft: { flex: 1, marginRight: 10 },
  actionBarTitle: { ...Typography.h4, color: Colors.text, fontSize: 14 },
  actionBarOrg: { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  actionBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
  },
  actionBarBtnText: { ...Typography.label, color: Colors.white, fontSize: 13, fontWeight: '700' },

  /* ── Empty pill ── */
  emptyPill: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  emptyPillText: { ...Typography.body, color: Colors.textSecondary, fontSize: 14 },
});