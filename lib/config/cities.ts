// ============================================================================
// Supported Cities — Coordinates for trigger monitoring
// ============================================================================

export interface City {
  slug: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  // Risk profile flags
  flood_prone: boolean;
  aqi_prone: boolean;
  cyclone_prone: boolean;
}

export const CITIES: City[] = [
  {
    slug: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
    flood_prone: true,
    aqi_prone: false,
    cyclone_prone: true,
  },
  {
    slug: 'delhi',
    name: 'Delhi',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    flood_prone: false,
    aqi_prone: true,
    cyclone_prone: false,
  },
  {
    slug: 'bangalore',
    name: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    flood_prone: true,
    aqi_prone: false,
    cyclone_prone: false,
  },
  {
    slug: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.0827,
    longitude: 80.2707,
    flood_prone: true,
    aqi_prone: false,
    cyclone_prone: true,
  },
  {
    slug: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    flood_prone: true,
    aqi_prone: false,
    cyclone_prone: false,
  },
  {
    slug: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.385,
    longitude: 78.4867,
    flood_prone: true,
    aqi_prone: false,
    cyclone_prone: true,
  },
  {
    slug: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.5726,
    longitude: 88.3639,
    flood_prone: true,
    aqi_prone: true,
    cyclone_prone: true,
  },
  {
    slug: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    latitude: 23.0225,
    longitude: 72.5714,
    flood_prone: false,
    aqi_prone: true,
    cyclone_prone: true,
  },
  {
    slug: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    flood_prone: false,
    aqi_prone: true,
    cyclone_prone: false,
  },
  {
    slug: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.8467,
    longitude: 80.9462,
    flood_prone: true,
    aqi_prone: true,
    cyclone_prone: false,
  },
];

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCityCoordinates(slug: string): { lat: number; lng: number } | undefined {
  const city = getCityBySlug(slug);
  if (!city) return undefined;
  return { lat: city.latitude, lng: city.longitude };
}
