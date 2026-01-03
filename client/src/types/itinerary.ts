import type { Feature, Point } from 'geojson';

export type OsmElementType = 'node' | 'way' | 'relation' | 'N' | 'W' | 'R';

export interface RouteAmenityProperties {
  route_osm_id: number;
  osm_type: OsmElementType;
  osm_id: number;
  name: string | null;
  class: string;
  subclass: string | null;
  distance_from_trail_m: number;
  trail_km: number;
  tags: Record<string, string> | null;
}

export type RouteAmenity = Feature<Point, RouteAmenityProperties>;

export interface AmenityCluster {
  key: string;
  trail_km: number;
  kmFromStart?: number;
  marker?: string;
  amenities: RouteAmenity[];
  countsByClass: Record<string, number>;
  countsByIcon: Record<string, number>;
  size: number;
  lon: number;
  lat: number;
  userMetrics?: {
    kmOnTrail: number;
    distanceOffTrail: number;
    distanceToNext: number | null;
    distanceToEnd: number;
  };
}
