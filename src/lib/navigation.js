/**
 * Simple Grid-based Graph for Dijkstra/A* Visualization
 */

export class NavigationGraph {
  constructor(bounds, resolution = 0.01) {
    this.bounds = bounds; // [minLat, minLng, maxLat, maxLng]
    this.resolution = resolution;
    this.nodes = new Map(); // "lat,lng" -> { lat, lng, neighbors: [] }
    this.trafficWeights = new Map(); // "node1-node2" -> multiplier (1.0 = normal, 5.0 = heavy)
    this.generateGrid();
  }

  generateGrid() {
    const [minLat, minLng, maxLat, maxLng] = this.bounds;
    for (let lat = minLat; lat <= maxLat; lat += this.resolution) {
      for (let lng = minLng; lng <= maxLng; lng += this.resolution) {
        const id = this.getNodeId(lat, lng);
        this.nodes.set(id, { lat, lng, neighbors: [] });
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

  getNodeId(lat, lng) {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }

  getNearestNode(lat, lng) {
    let nearest = null;
    let minDist = Infinity;
    for (const [id, node] of this.nodes) {
      const dist = Math.hypot(node.lat - lat, node.lng - lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = id;
      }
    }
    return nearest;
  }

  updateTraffic(lat, lng, radius = 0.02, intensity = 5.0) {
    for (const [id1, node1] of this.nodes) {
      const d = Math.hypot(node1.lat - lat, node1.lng - lng);
      if (d < radius) {
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
    const baseDist = Math.hypot(node1.lat - node2.lat, node1.lng - node2.lng);
    return baseDist * traffic;
  }

  // A* Implementation
  findPath(startLat, startLng, endLat, endLng) {
    const startId = this.getNearestNode(startLat, startLng);
    const endId = this.getNearestNode(endLat, endLng);
    const endNode = this.nodes.get(endId);

    const openSet = new Set([startId]);
    const cameFrom = new Map();
    const gScore = new Map(); // Cost from start to node
    const fScore = new Map(); // Estimated total cost (gScore + heuristic)

    gScore.set(startId, 0);
    fScore.set(startId, this.heuristic(this.nodes.get(startId), endNode));

    while (openSet.size > 0) {
      let currentId = null;
      let minF = Infinity;
      for (const id of openSet) {
        if (fScore.get(id) < minF) {
          minF = fScore.get(id);
          currentId = id;
        }
      }

      if (currentId === endId) {
        return this.reconstructPath(cameFrom, currentId);
      }

      openSet.delete(currentId);
      const currentNode = this.nodes.get(currentId);

      for (const neighborId of currentNode.neighbors) {
        const tentativeGScore = gScore.get(currentId) + this.getEdgeWeight(currentId, neighborId);

        if (!gScore.has(neighborId) || tentativeGScore < gScore.get(neighborId)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeGScore);
          fScore.set(neighborId, tentativeGScore + this.heuristic(this.nodes.get(neighborId), endNode));
          openSet.add(neighborId);
        }
      }
    }
    return [];
  }

  heuristic(a, b) {
    return Math.hypot(a.lat - b.lat, a.lng - b.lng);
  }

  reconstructPath(cameFrom, currentId) {
    const path = [this.nodes.get(currentId)];
    while (cameFrom.has(currentId)) {
      currentId = cameFrom.get(currentId);
      path.unshift(this.nodes.get(currentId));
    }
    return path;
  }

  estimateTime(path) {
    if (!path || path.length < 2) return 0;
    let totalWeight = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const id1 = this.getNodeId(path[i].lat, path[i].lng);
      const id2 = this.getNodeId(path[i + 1].lat, path[i + 1].lng);
      totalWeight += this.getEdgeWeight(id1, id2);
    }

    // Convert weight (distance * traffic) to minutes
    // Base speed: 0.006 degrees/min (~40km/h)
    const baseSpeed = 0.006;
    return Math.round(totalWeight / baseSpeed);
  }
}
