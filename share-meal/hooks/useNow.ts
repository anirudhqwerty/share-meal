import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

export function useNow() {
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []));
  return now;
}
