export type Coordinates = { latitude: number; longitude: number };

export function coordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return null;
  const lat = Number(latitude), lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng } : null;
}

export function radiusBoundary(center: Coordinates, radiusKm: number): Coordinates[] {
  const lat = center.latitude * Math.PI / 180;
  const lng = center.longitude * Math.PI / 180;
  const angle = radiusKm / 6371;
  return Array.from({ length: 36 }, (_, index) => {
    const bearing = index * Math.PI / 18;
    const targetLat = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
    const targetLng = lng + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(targetLat));
    return { latitude: targetLat * 180 / Math.PI, longitude: ((targetLng * 180 / Math.PI + 540) % 360) - 180 };
  });
}
