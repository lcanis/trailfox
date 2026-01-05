import { AmenitySubclass } from '../types';

/**
 * OSM subclass data with counts.
 * In production, this would come from your amenities API.
 * Counts represent typical amenity distribution along hiking routes.
 */
export const SUBCLASS_DATA: Record<string, Record<string, number>> = {
  water: {
    drinking_water: 144,
    fountain: 210,
    water_tap: 1,
    watering_place: 1,
  },
  hygiene: {
    toilets: 310,
    shower: 28,
    swimming_pool: 145,
    public_bath: 2,
  },
  food: {
    restaurant: 1304,
    cafe: 277,
    pub: 383,
    fast_food: 239,
    bar: 113,
    biergarten: 2,
  },
  resupply: {
    supermarket: 196,
    bakery: 179,
    convenience: 149,
    vending_machine: 105,
    butcher: 64,
    department_store: 11,
    general: 9,
    greengrocer: 7,
  },
  shelter: {
    shelter: 1312,
  },
  street: {
    bench: 9080,
    waste_basket: 3345,
    picnic_table: 1484,
    waste_disposal: 28,
    lounger: 21,
  },
  transport: {
    bus_stop: 4863,
    station: 59,
    bus_station: 31,
    halt: 24,
    rest_area: 8,
    aerodrome: 3,
  },
  place: {
    village: 463,
    hamlet: 214,
    farm: 69,
    isolated_dwelling: 47,
    town: 15,
    city: 1,
  },
  tourism: {
    memorial: 784,
    viewpoint: 417,
    artwork: 366,
    attraction: 131,
    monument: 19,
    castle: 6,
    archaeological_site: 2,
  },
  religious: {
    church: 356,
    chapel: 155,
    monastery: 2,
  },
  cash: {
    bank: 210,
    atm: 144,
    bureau_de_change: 1,
  },
  medical: {
    pharmacy: 106,
    hospital: 15,
    physiotherapist: 1,
    clinic: 1,
  },
  accom: {
    hotel: 234,
    hostel: 78,
    guest_house: 145,
    alpine_hut: 89,
    wilderness_hut: 23,
    camp_site: 156,
  },
  other: {
    information: 2266,
    defibrillator: 212,
    phone: 132,
  },
};

/**
 * Get all subclasses for a given OSM class, sorted by count (descending).
 */
export const getSubclassesForClass = (osmClass: string): AmenitySubclass[] => {
  const subclassData = SUBCLASS_DATA[osmClass] || {};
  return Object.entries(subclassData)
    .map(([subclass, count]) => ({
      id: `${osmClass}.${subclass}`,
      categoryId: osmClass,
      name: formatSubclassName(subclass),
      count,
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Format a subclass name for display.
 * Examples: "drinking_water" → "Drinking Water", "fast_food" → "Fast Food"
 */
export const formatSubclassName = (subclass: string): string => {
  return subclass
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Count how many subclasses an OSM class has.
 */
export const countSubclasses = (osmClass: string): number => {
  return Object.keys(SUBCLASS_DATA[osmClass] || {}).length;
};

/**
 * Get display name for a specific subclass.
 */
export const getSubclassDisplayName = (osmClass: string, subclass: string): string => {
  return formatSubclassName(subclass);
};
