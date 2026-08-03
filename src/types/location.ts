export type LocationPrecision =
  | "coordinate"
  | "address"
  | "town"
  | "district"
  | "city"
  | "region"
  | "unknown";

export interface BirthLocation {
  id: number;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  precision?: LocationPrecision;
  source?: "osm" | "open-meteo" | "manual" | "amap";
  addressType?: string;
}

export interface AmapDistrictOption {
  id: number;
  name: string;
  adcode: string;
  citycode?: string;
  level: "country" | "province" | "city" | "district" | "street" | "unknown";
  longitude?: number;
  latitude?: number;
}
