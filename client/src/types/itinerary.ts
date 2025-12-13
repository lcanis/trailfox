export type OsmElementType = 'node' | 'way' | 'relation' | 'N' | 'W' | 'R';

export interface RouteAmenity {
  route_osm_id: number;
  osm_type: OsmElementType;
  osm_id: number;
  name: string | null;
  class: string;
  subclass: string | null;
  lon: number;
  lat: number;
  distance_from_trail_m: number;
  trail_km: number;
  tags: Record<string, string> | null;
}

export interface AmenityCluster {
  key: string;
  trail_km: number;
  amenities: RouteAmenity[];
  countsByClass: Record<string, number>;
  size: number;
  lon: number;
  lat: number;
}
