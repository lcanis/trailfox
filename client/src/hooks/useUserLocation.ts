import * as Location from 'expo-location';
import { useState, useEffect, useCallback } from 'react';

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
        // Get an initial fix immediately so UX doesn't depend on watch callbacks timing.
        // (watchPositionAsync may not emit right away, especially if the user hasn't moved.)
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading,
          });
        } catch {
          // Non-fatal; we'll still try to watch.
        }

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
  }, [enabled, requestPermission]);

  return { location, errorMsg, permissionStatus, requestPermission };
};
