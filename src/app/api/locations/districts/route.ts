import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getCachedValue,
  setCachedValue,
} from "@/lib/server-guard";
import type { AmapDistrictOption } from "@/types/location";

type AmapDistrict = {
  citycode?: string | string[];
  adcode?: string;
  name?: string;
  center?: string;
  level?: string;
  districts?: AmapDistrict[];
};

type AmapDistrictResponse = {
  status?: string;
  info?: string;
  districts?: AmapDistrict[];
};

type DistrictPayload = {
  current: AmapDistrictOption | null;
  items: AmapDistrictOption[];
};

function stableId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function parseCenter(center?: string): { longitude?: number; latitude?: number } {
  if (!center) return {};
  const [longitudeText, latitudeText] = center.split(",");
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return {};
  return { longitude, latitude };
}

function normalizeLevel(level?: string): AmapDistrictOption["level"] {
  if (
    level === "country" ||
    level === "province" ||
    level === "city" ||
    level === "district" ||
    level === "street"
  ) {
    return level;
  }
  return "unknown";
}

function normalizeDistrict(item: AmapDistrict): AmapDistrictOption | null {
  const name = item.name?.trim();
  const adcode = item.adcode?.trim();
  if (!name || !adcode) return null;
  const center = parseCenter(item.center);
  const citycode = Array.isArray(item.citycode) ? item.citycode[0] : item.citycode;

  return {
    id: stableId(`${adcode}-${name}`),
    name,
    adcode,
    citycode: citycode || undefined,
    level: normalizeLevel(item.level),
    ...center,
  };
}

export async function GET(request: Request) {
  const rate = checkRateLimit(request, "location-districts", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "行政区查询过于频繁，请稍后再试。" },
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
  const keywords = searchParams.get("keywords")?.trim().slice(0, 40) || "中国";
  const cacheKey = `districts:${keywords}`;
  const cached = getCachedValue<DistrictPayload>(cacheKey);

  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "private, max-age=1800" },
    });
  }

  const url = new URL("https://restapi.amap.com/v3/config/district");
  url.searchParams.set("key", key);
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("subdistrict", "1");
  url.searchParams.set("extensions", "base");
  url.searchParams.set("output", "JSON");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json()) as AmapDistrictResponse;

    if (!response.ok || data.status !== "1") {
      return NextResponse.json(
        { error: data.info || "行政区查询失败" },
        { status: response.ok ? 502 : response.status },
      );
    }

    const currentRaw = data.districts?.[0];
    const payload: DistrictPayload = {
      current: currentRaw ? normalizeDistrict(currentRaw) : null,
      items: (currentRaw?.districts ?? [])
        .map(normalizeDistrict)
        .filter((item): item is AmapDistrictOption => Boolean(item)),
    };

    setCachedValue(cacheKey, payload, 24 * 60 * 60_000);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=1800" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "行政区查询失败" },
      { status: 502 },
    );
  }
}
