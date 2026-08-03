export type ThemeMode = "auto" | "day" | "night";

export interface SunTimes {
  sunrise: number;
  sunset: number;
  timezone: string;
  latitude: number;
  longitude: number;
  locationLabel?: string;
  source: "geolocation" | "manual-location" | "cached-location" | "fallback";
}
