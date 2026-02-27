/**
 * Haversine-based Navigation Graph with A* Pathfinding
 * Uses real-world distance calculations (km) instead of Euclidean degree math.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two lat/lng points in km.
 * Exported for reuse across the entire application.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class MinPriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this.bubbleUp();
  }

  pop() {
    if (this.size() === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.size() > 0) {
      this.heap[0] = last;
      this.sinkDown();
    }
    return min;
  }

  size() {
    return this.heap.length;
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  sinkDown() {
    let index = 0;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;

      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

export class NavigationGraph {
  constructor(bounds, resolution = 0.01) {
    this.bounds = bounds; // [minLat, minLng, maxLat, maxLng]
    this.resolution = resolution;
    this.nodes = new Map(); // "lat,lng" -> { lat, lng, neighbors: [] }
    this.trafficWeights = new Map(); // "node1-node2" -> multiplier (1.0 = normal, 5.0 = heavy)

    // Grid-cell index for O(1) nearest-node lookup
    this.gridIndex = new Map();
    this.generateGrid();
  }

  generateGrid() {
    const [minLat, minLng, maxLat, maxLng] = this.bounds;
    for (let lat = minLat; lat <= maxLat; lat += this.resolution) {
      for (let lng = minLng; lng <= maxLng; lng += this.resolution) {
        const id = this.getNodeId(lat, lng);
        this.nodes.set(id, { lat, lng, neighbors: [] });

        // Build grid-cell index for fast nearest-node lookup
        const cellKey = this._getCellKey(lat, lng);
        this.gridIndex.set(cellKey, id);
      }
    }

    // Connect neighbors (8-way)
    for (const [id, node] of this.nodes) {
      const neighbors = [
        [node.lat + this.resolution, node.lng],
        [node.lat - this.resolution, node.lng],
        [node.lat, node.lng + this.resolution],
        [node.lat, node.lng - this.resolution],
        [node.lat + this.resolution, node.lng + this.resolution],
        [node.lat - this.resolution, node.lng - this.resolution],
        [node.lat + this.resolution, node.lng - this.resolution],
        [node.lat - this.resolution, node.lng + this.resolution],
      ];

      for (const [nLat, nLng] of neighbors) {
        const nId = this.getNodeId(nLat, nLng);
        if (this.nodes.has(nId)) {
          node.neighbors.push(nId);
        }
      }
    }
  }

  _getCellKey(lat, lng) {
    const row = Math.round((lat - this.bounds[0]) / this.resolution);
    const col = Math.round((lng - this.bounds[1]) / this.resolution);
    return `${row},${col}`;
  }

  getNodeId(lat, lng) {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }

  /**
   * O(1) grid-based nearest-node lookup with fallback to neighbors.
   */
  getNearestNode(lat, lng) {
    // Try exact cell first
    const cellKey = this._getCellKey(lat, lng);
    if (this.gridIndex.has(cellKey)) return this.gridIndex.get(cellKey);

    // Search immediate neighboring cells (3x3 grid)
    const row = Math.round((lat - this.bounds[0]) / this.resolution);
    const col = Math.round((lng - this.bounds[1]) / this.resolution);

    let nearest = null;
    let minDist = Infinity;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const neighborKey = `${row + dr},${col + dc}`;
        const nodeId = this.gridIndex.get(neighborKey);
        if (nodeId) {
          const node = this.nodes.get(nodeId);
          const dist = haversineDistance(lat, lng, node.lat, node.lng);
          if (dist < minDist) {
            minDist = dist;
            nearest = nodeId;
          }
        }
      }
    }

    return nearest;
  }

  updateTraffic(lat, lng, radius = 0.02, intensity = 5.0) {
    for (const [id1, node1] of this.nodes) {
      const d = haversineDistance(node1.lat, node1.lng, lat, lng);
      if (d < radius * 111) { // Convert degree-radius to approximate km
        for (const id2 of node1.neighbors) {
          const edgeId = [id1, id2].sort().join('-');
          this.trafficWeights.set(edgeId, intensity);
        }
      }
    }
  }

  getEdgeWeight(id1, id2) {
    const edgeId = [id1, id2].sort().join('-');
    const traffic = this.trafficWeights.get(edgeId) || 1.0;
    const node1 = this.nodes.get(id1);
    const node2 = this.nodes.get(id2);
    const baseDist = haversineDistance(node1.lat, node1.lng, node2.lat, node2.lng);
    return baseDist * traffic;
  }

  // A* Implementation with Min-Priority Queue and Haversine heuristic
  findPath(startLat, startLng, endLat, endLng) {
    const startId = this.getNearestNode(startLat, startLng);
    const endId = this.getNearestNode(endLat, endLng);
    const endNode = this.nodes.get(endId);

    const openSet = new MinPriorityQueue();
    const cameFrom = new Map();
    const gScore = new Map(); // Cost from start to node (in km)

    gScore.set(startId, 0);
    openSet.push({ id: startId, priority: this.heuristic(this.nodes.get(startId), endNode) });

    while (openSet.size() > 0) {
      const { id: currentId } = openSet.pop();

      if (currentId === endId) {
        return this.reconstructPath(cameFrom, currentId);
      }

      const currentNode = this.nodes.get(currentId);

      for (const neighborId of currentNode.neighbors) {
        const tentativeGScore = gScore.get(currentId) + this.getEdgeWeight(currentId, neighborId);

        if (!gScore.has(neighborId) || tentativeGScore < gScore.get(neighborId)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeGScore);
          const fScoreValue = tentativeGScore + this.heuristic(this.nodes.get(neighborId), endNode);
          openSet.push({ id: neighborId, priority: fScoreValue });
        }
      }
    }
    return [];
  }

  heuristic(a, b) {
    return haversineDistance(a.lat, a.lng, b.lat, b.lng);
  }

  reconstructPath(cameFrom, currentId) {
    const path = [this.nodes.get(currentId)];
    while (cameFrom.has(currentId)) {
      currentId = cameFrom.get(currentId);
      path.unshift(this.nodes.get(currentId));
    }
    return path;
  }

  /**
   * Estimate travel time in minutes using Haversine distances.
   * Assumes average ambulance speed of 40 km/h in urban Pune.
   */
  estimateTime(path) {
    if (!path || path.length < 2) return 0;
    let totalKm = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const id1 = this.getNodeId(path[i].lat, path[i].lng);
      const id2 = this.getNodeId(path[i + 1].lat, path[i + 1].lng);
      totalKm += this.getEdgeWeight(id1, id2);
    }

    // Average ambulance speed: 40 km/h → 0.667 km/min
    const AMBULANCE_SPEED_KM_PER_MIN = 40 / 60;
    return Math.round(totalKm / AMBULANCE_SPEED_KM_PER_MIN);
  }
}
