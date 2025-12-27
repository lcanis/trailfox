import * as Location from 'expo-location';
import { useState, useEffect, useCallback } from 'react';
import { useOnForeground } from './useOnForeground';

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
}

export const useUserLocation = (params?: { enabled?: boolean }) => {
  const enabled = params?.enabled ?? true;
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return false;
      }
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    if (!enabled) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    setIsLocating(true);
    try {
      // 1. Fast fetch (cached)
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setLocation({
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          heading: last.coords.heading,
        });
      }

      // 2. Accurate fetch (fresh)
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        heading: fresh.coords.heading,
      });
    } catch (err) {
      console.warn('Refresh location failed', err);
    } finally {
      setIsLocating(false);
    }
  }, [enabled, requestPermission]);

  // Wake -> Refresh
  useOnForeground(refreshLocation);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    if (!enabled) {
      return () => {
        if (subscription) subscription.remove();
      };
    }

    const startWatching = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      try {
        // Initial refresh on mount
        refreshLocation();

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 2000, // ...or at least every 2s (helps when stationary)
          },
          (loc) => {
            setLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading,
            });
          }
        );
      } catch {
        setErrorMsg('Error watching position');
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enabled, requestPermission, refreshLocation]);

  return { location, errorMsg, permissionStatus, requestPermission, isLocating, refreshLocation };
};
