import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { coordinates, Coordinates } from '@/utils/geo';

export function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const requestAndGet = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (request !== version.current) return null;
      if (status !== 'granted') { setError('Allow location access in your device settings, or select a location on the map.'); return null; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = coordinates(position.coords.latitude, position.coords.longitude);
      if (!point || request !== version.current) return null;
      setLocation(point);
      try {
        const [place] = await Location.reverseGeocodeAsync(point);
        if (request === version.current) setAddress(place ? [place.name || place.street, place.city || place.subregion, place.region].filter(Boolean).join(', ') : '');
      } catch {
        // Coordinates stay usable when the address lookup is unavailable.
      }
      return point;
    } catch {
      if (request === version.current) setError('Could not find your location. Try again or select it on the map.');
      return null;
    } finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => { void requestAndGet(); return () => { ++version.current; }; }, [requestAndGet]);
  return { location, address, loading, error, refresh: requestAndGet };
}
