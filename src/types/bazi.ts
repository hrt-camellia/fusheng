import type { BirthLocation, LocationPrecision } from "@/types/location";

export type Gender = "female" | "male";
export type DayBoundaryMode = "ZI_HOUR_23" | "MIDNIGHT_00";

export interface BirthInput {
  name?: string;
  date: string;
  time: string;
  place: string;
  longitude?: number;
  latitude?: number;
  timezone: string;
  locationId?: number;
  countryCode?: string;
  locationPrecision?: LocationPrecision;
  locationSource?: BirthLocation["source"];
  addressType?: string;
  gender: Gender;
  useTrueSolarTime: boolean;
  dayBoundaryMode: DayBoundaryMode;
}

export interface Pillar {
  label: string;
  stem: string;
  branch: string;
  element: string;
}

export interface BaziResult {
  id: string;
  source: "openfate";
  correctedTime: string;
  pillars: Pillar[];
  elements: Record<string, number>;
  summary: string;
  warnings: string[];
  location: Pick<BirthLocation, "name" | "displayName" | "latitude" | "longitude" | "timezone">;
  dayMaster: {
    stem: string;
    element: string;
    polarity: string;
  };
  calendar: {
    civilSolar: string;
    calculationSolar: string;
    lunar: string;
    zodiac: string;
  };
  policy: {
    trueSolarTimeApplied: boolean;
    dayBoundaryMode: DayBoundaryMode;
  };
  raw?: unknown;
}
