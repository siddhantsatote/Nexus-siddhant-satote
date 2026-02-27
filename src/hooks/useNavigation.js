import { useMemo, useCallback } from 'react';
import { NavigationGraph } from '../lib/navigation';

export function useNavigation(ambulances, incidents, hospitals) {
  const graph = useMemo(() => {
    const points = [...ambulances, ...incidents, ...hospitals];
    const allLat = points.map(p => p.location_lat).filter(l => typeof l === 'number' && !isNaN(l));
    const allLng = points.map(p => p.location_lng).filter(l => typeof l === 'number' && !isNaN(l));
    
    if (allLat.length === 0) return null;

    const bounds = [
      Math.min(...allLat) - 0.2,
      Math.min(...allLng) - 0.2,
      Math.max(...allLat) + 0.2,
      Math.max(...allLng) + 0.2
    ];

    const g = new NavigationGraph(bounds, 0.02);

    // Dynamic traffic around P1 incidents
    incidents
      .filter(i => i.priority === 'P1' && typeof i.location_lat === 'number')
      .forEach(i => g.updateTraffic(i.location_lat, i.location_lng, 0.05, 10.0));

    return g;
  }, [ambulances, incidents, hospitals]);

  const calculateETA = useCallback((fromLat, fromLng, toLat, toLng) => {
    if (!graph) return null;
    try {
      const path = graph.findPath(fromLat, fromLng, toLat, toLng);
      if (!path || path.length === 0) return null;
      return {
        path,
        eta: graph.estimateTime(path)
      };
    } catch (err) {
      console.error('Pathfinding failed:', err);
      return null;
    }
  }, [graph]);

  return { graph, calculateETA };
}
