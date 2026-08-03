import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "经纬度参数无效" }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "sunrise,sunset",
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "2",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `日落服务暂时不可用（${response.status}）` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      timezone?: string;
      daily?: {
        sunrise?: number[];
        sunset?: number[];
      };
    };

    const sunrise = Number(data.daily?.sunrise?.[0]) * 1000;
    const sunset = Number(data.daily?.sunset?.[0]) * 1000;

    if (!Number.isFinite(sunrise) || !Number.isFinite(sunset)) {
      return NextResponse.json({ error: "日落服务未返回有效时间" }, { status: 502 });
    }

    return NextResponse.json({
      sunrise,
      sunset,
      timezone: data.timezone || "auto",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? "获取日落时间超时"
            : "获取日落时间失败",
      },
      { status: 502 },
    );
  }
}
