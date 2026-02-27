import { haversineDistance } from './navigation';

/**
 * Ambulance Movement Simulation following a specific path
 */
export function createPathFollowingSimulation(path, durationSeconds = 300) {
  if (!path || path.length < 2) {
    throw new Error('Path must contain at least 2 points');
  }

  // Pre-calculate segments and cumulative distances using Haversine
  const segments = [];
  let totalPathDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const dist = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
    segments.push({
      start: p1,
      end: p2,
      dist,
      cumDist: totalPathDistance
    });
    totalPathDistance += dist;
  }

  function getPositionAtTime(elapsedSeconds) {
    const progress = Math.min(elapsedSeconds / durationSeconds, 1);
    const targetDist = totalPathDistance * progress;

    // Find the segment containing targetDist
    let segment = segments[0];
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].cumDist + segments[i].dist >= targetDist) {
        segment = segments[i];
        break;
      }
      segment = segments[i]; // Fallback to last
    }

    const segProgress = segment.dist > 0 
      ? (targetDist - segment.cumDist) / segment.dist 
      : 1;

    const lat = segment.start[0] + (segment.end[0] - segment.start[0]) * segProgress;
    const lng = segment.start[1] + (segment.end[1] - segment.start[1]) * segProgress;

    return [lat, lng];
  }

  return { getPositionAtTime, durationSeconds, totalDistance: totalPathDistance };
}

export function createAmbulanceSimulation(startLat, startLng, targetLat, targetLng, durationSeconds = 300) {
  return createPathFollowingSimulation([[startLat, startLng], [targetLat, targetLng]], durationSeconds);
}

/**
 * Start simulating ambulance movement
 * Updates the ambulance location in real-time
 */
export async function startAmbulanceMovement(
  ambulanceId,
  startLat,
  startLng,
  targetLat,
  targetLng,
  updateAmbulanceLocation,
  durationSeconds = 300,
  updateIntervalMs = 2000,
  path = null // Optional path geometry
) {
  const simulation = path && path.length >= 2
    ? createPathFollowingSimulation(path, durationSeconds)
    : createAmbulanceSimulation(startLat, startLng, targetLat, targetLng, durationSeconds);
    
  const startTime = Date.now();

  return new Promise((resolve) => {
    const movementInterval = setInterval(async () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      
      if (elapsedSeconds >= durationSeconds) {
        clearInterval(movementInterval);
        await updateAmbulanceLocation(ambulanceId, targetLat, targetLng);
        resolve();
        return;
      }

      const [lat, lng] = simulation.getPositionAtTime(elapsedSeconds);
      await updateAmbulanceLocation(ambulanceId, lat, lng);
    }, updateIntervalMs);
  });
}
