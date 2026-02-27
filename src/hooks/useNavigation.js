import { useCallback } from 'react';
import { fetchRoute } from '../lib/externalMaps';

export function useNavigation() {
  const calculateETA = useCallback(async (fromLat, fromLng, toLat, toLng) => {
    try {
      const route = await fetchRoute([fromLat, fromLng], [toLat, toLng]);
      if (!route) return null;

      return {
        path: route.geometry,
        eta: Math.round(route.duration / 60),
        distance: route.distance
      };
    } catch (err) {
      console.error('Pathfinding failed:', err);
      return null;
    }
  }, []);

  return { calculateETA };
}
