import * as Location from 'expo-location';
import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
}

export const useUserLocation = () => {
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

    const startWatching = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
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
  }, [requestPermission]);

  return { location, errorMsg, permissionStatus, requestPermission };
};
