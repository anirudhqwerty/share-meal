import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export function useLocation() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const requestAndGet = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to find nearby donations.');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(coords);

      // Reverse geocode for display address
      const [place] = await Location.reverseGeocodeAsync(coords);
      if (place) {
        setAddress(`${place.street || ''}, ${place.city || place.subregion || ''}, ${place.region || ''}`
          .replace(/^,\s*/, '').replace(/,\s*,/g, ','));
      }
      return coords;
    } catch (e) {
      Alert.alert('Error', 'Could not get your location. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { requestAndGet(); }, []);

  return { location, address, loading, refresh: requestAndGet };
}
