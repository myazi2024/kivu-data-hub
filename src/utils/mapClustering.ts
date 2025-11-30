interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  data: any;
}

interface Cluster {
  id: string;
  centerLat: number;
  centerLng: number;
  points: ClusterPoint[];
  count: number;
}

export const clusterPoints = (
  points: ClusterPoint[],
  distance: number = 0.01 // Distance en degrés (~1km)
): Cluster[] => {
  if (points.length === 0) return [];

  const clusters: Cluster[] = [];
  const visited = new Set<string>();

  points.forEach(point => {
    if (visited.has(point.id)) return;

    const cluster: Cluster = {
      id: `cluster-${clusters.length}`,
      centerLat: point.latitude,
      centerLng: point.longitude,
      points: [point],
      count: 1
    };

    visited.add(point.id);

    // Trouver tous les points proches
    points.forEach(other => {
      if (visited.has(other.id)) return;

      const dist = Math.sqrt(
        Math.pow(point.latitude - other.latitude, 2) +
        Math.pow(point.longitude - other.longitude, 2)
      );

      if (dist <= distance) {
        cluster.points.push(other);
        cluster.count++;
        visited.add(other.id);
      }
    });

    // Recalculer le centre du cluster
    if (cluster.count > 1) {
      cluster.centerLat = cluster.points.reduce((sum, p) => sum + p.latitude, 0) / cluster.count;
      cluster.centerLng = cluster.points.reduce((sum, p) => sum + p.longitude, 0) / cluster.count;
    }

    clusters.push(cluster);
  });

  return clusters;
};

export const shouldCluster = (zoomLevel: number): boolean => {
  return zoomLevel < 14; // Cluster uniquement si zoom < 14
};
