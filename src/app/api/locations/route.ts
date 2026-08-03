import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getCachedValue,
  setCachedValue,
} from "@/lib/server-guard";
import type { BirthLocation, LocationPrecision } from "@/types/location";

type AmapGeocode = {
  formatted_address?: string;
  country?: string;
  province?: string;
  city?: string | string[];
  district?: string;
  township?: string;
  neighborhood?: { name?: string };
  building?: { name?: string };
  adcode?: string;
  street?: string;
  number?: string;
  location?: string;
  level?: string;
};

type AmapGeocodeResponse = {
  status?: string;
  info?: string;
  geocodes?: AmapGeocode[];
};

type LocationSearchResponse = { results: BirthLocation[] };

function stableId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function asText(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value.find(Boolean);
  return value || undefined;
}

function uniqueParts(parts: Array<string | undefined>): string[] {
  return parts
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .filter((item, index, values) => values.indexOf(item) === index);
}

function precisionFromLevel(level?: string): LocationPrecision {
  const normalized = level?.toLowerCase() ?? "";
  if (
    normalized.includes("门牌") ||
    normalized.includes("兴趣点") ||
    normalized.includes("道路")
  ) {
    return "address";
  }
  if (normalized.includes("乡镇") || normalized.includes("街道")) return "town";
  if (normalized.includes("区县") || normalized.includes("县")) return "district";
  if (normalized.includes("市")) return "city";
  if (normalized.includes("省")) return "region";
  return "unknown";
}

function normalizeGeocode(item: AmapGeocode, query: string): BirthLocation | null {
  if (!item.location) return null;
  const [longitudeText, latitudeText] = item.location.split(",");
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const city = asText(item.city);
  const displayName =
    item.formatted_address ||
    uniqueParts([
      item.province,
      city,
      item.district,
      item.township,
      item.street,
      item.number,
      item.neighborhood?.name,
      item.building?.name,
    ]).join("") ||
    query;

  return {
    id: stableId(`${item.adcode ?? ""}-${displayName}-${item.location}`),
    name: item.township || item.district || city || item.province || query,
    displayName,
    latitude,
    longitude,
    timezone: "Asia/Shanghai",
    countryCode: "CN",
    country: item.country || "中国",
    admin1: item.province,
    admin2: city,
    admin3: item.district || item.township,
    precision: precisionFromLevel(item.level),
    source: "amap",
    addressType: item.level || "geocode",
  };
}

export async function GET(request: Request) {
  const rate = checkRateLimit(request, "location-search", {
    limit: 12,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "地点搜索过于频繁，请稍后再试。" },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "出生地点服务尚未配置。请在项目根目录的 .env.local 中添加 AMAP_WEB_SERVICE_KEY，然后重启项目。",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const city = searchParams.get("city")?.trim().slice(0, 30) ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = `location:${city}:${query}`;
  const cached = getCachedValue<LocationSearchResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", key);
  url.searchParams.set("address", query);
  if (city) url.searchParams.set("city", city);
  url.searchParams.set("output", "JSON");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json()) as AmapGeocodeResponse;

    if (!response.ok || data.status !== "1") {
      return NextResponse.json(
        { error: data.info || "地点搜索失败" },
        { status: response.ok ? 502 : response.status },
      );
    }

    const payload: LocationSearchResponse = {
      results: (data.geocodes ?? [])
        .map((item) => normalizeGeocode(item, query))
        .filter((item): item is BirthLocation => Boolean(item))
        .slice(0, 10),
    };

    setCachedValue(cacheKey, payload, 10 * 60_000);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "地点搜索失败" },
      { status: 502 },
    );
  }
}
