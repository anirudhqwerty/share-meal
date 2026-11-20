import React, { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type * as Leaflet from 'leaflet';
import type { MapViewProps, MapMarkerProps as MarkerProps, MapCircleProps as CircleProps, Region } from 'react-native-maps';
import 'leaflet/dist/leaflet.css';

export type { Region };
export const PROVIDER_GOOGLE = undefined;
const MapContext = createContext<{ map: Leaflet.Map; api: typeof Leaflet } | null>(null);
type Point = { latitude: number; longitude: number };

const BrowserMap = forwardRef(function BrowserMap(props: MapViewProps, ref) {
  const host = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<{ map: Leaflet.Map; api: typeof Leaflet } | null>(null);
  const [error, setError] = useState(false);
  const handlers = useRef(props);
  handlers.current = props;
  useImperativeHandle(ref, () => ({
    animateToRegion(region: Region) {
      context?.map.fitBounds([[region.latitude - region.latitudeDelta / 2, region.longitude - region.longitudeDelta / 2],
        [region.latitude + region.latitudeDelta / 2, region.longitude + region.longitudeDelta / 2]], { animate: true });
    },
    fitToCoordinates(points: Point[], options?: { edgePadding?: { top: number; bottom: number; left: number; right: number }; animated?: boolean }) {
      const padding = options?.edgePadding;
      context?.map.fitBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]), {
        paddingTopLeft: [padding?.left || 0, padding?.top || 0], paddingBottomRight: [padding?.right || 0, padding?.bottom || 0], animate: options?.animated,
      });
    },
  }), [context]);

  useEffect(() => {
    let active = true;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet').then((api) => {
      if (!active || !host.current) return;
      const region = handlers.current.initialRegion;
      const interactive = handlers.current.pointerEvents !== 'none';
      map = api.map(host.current, { zoomControl: interactive, dragging: interactive, scrollWheelZoom: interactive,
        doubleClickZoom: interactive, touchZoom: interactive, keyboard: interactive, attributionControl: true,
      }).setView([region?.latitude || 0, region?.longitude || 0], 12);
      api.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19,
      }).addTo(map);
      const emitRegion = () => {
        if (!map) return;
        const center = map.getCenter(), bounds = map.getBounds();
        handlers.current.onRegionChangeComplete?.({ latitude: center.lat, longitude: center.lng,
          latitudeDelta: bounds.getNorth() - bounds.getSouth(), longitudeDelta: bounds.getEast() - bounds.getWest() }, { isGesture: true });
      };
      map.on('dragstart', () => handlers.current.onPanDrag?.({} as never));
      map.on('moveend', emitRegion);
      map.on('click', () => handlers.current.onPress?.({} as never));
      setContext({ map, api });
      observer = new ResizeObserver(() => { map?.invalidateSize(); });
      observer.observe(host.current);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; observer?.disconnect(); map?.remove(); };
  }, []);
  useEffect(() => {
    if (context) handlers.current.onMapReady?.({} as never);
  }, [context]);
  return <View style={props.style} onLayout={props.onLayout}>
    <div ref={host} aria-label="Food collection map" role="region" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
    {error && <Text style={styles.error}>The map couldn’t load. Browse the food listings or try again later.</Text>}
    <MapContext.Provider value={context}>{props.children}</MapContext.Provider>
  </View>;
});
export default BrowserMap;

export function Marker({ coordinate, title, description, pinColor, onPress }: MarkerProps) {
  const context = useContext(MapContext);
  const press = useRef(onPress); press.current = onPress;
  useEffect(() => {
    if (!context) return;
    const marker = context.api.circleMarker([coordinate.latitude, coordinate.longitude], {
      radius: 9, color: '#FFFFFF', weight: 3, fillColor: typeof pinColor === 'string' ? pinColor : '#B83E17', fillOpacity: 1, bubblingMouseEvents: false,
    }).addTo(context.map);
    const label = document.createElement('div');
    label.textContent = [title, description].filter(Boolean).join(' · ');
    marker.bindTooltip(label);
    marker.on('click', () => press.current?.({ stopPropagation() {} } as never));
    const element = marker.getElement();
    if (element) {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', [title, description].filter(Boolean).join(', ') || 'Food location');
      element.addEventListener('keydown', (event) => {
        const key = (event as KeyboardEvent).key;
        if (key === 'Enter' || key === ' ') { event.preventDefault(); press.current?.({ stopPropagation() {} } as never); }
      });
    }
    return () => { marker.remove(); };
  }, [context, coordinate.latitude, coordinate.longitude, title, description, pinColor]);
  return null;
}

export function Circle({ center, radius, strokeColor, fillColor, strokeWidth }: CircleProps) {
  const context = useContext(MapContext);
  useEffect(() => {
    if (!context) return;
    const circle = context.api.circle([center.latitude, center.longitude], {
      radius, color: typeof strokeColor === 'string' ? strokeColor : '#087657', weight: strokeWidth || 2,
      fillColor: typeof fillColor === 'string' ? fillColor : '#087657', fillOpacity: 0.1, interactive: false,
    }).addTo(context.map);
    return () => { circle.remove(); };
  }, [context, center.latitude, center.longitude, radius, strokeColor, fillColor, strokeWidth]);
  return null;
}
const styles = StyleSheet.create({ error: { padding: 20, backgroundColor: '#FFFFFF', color: '#B42330', zIndex: 1 } });
