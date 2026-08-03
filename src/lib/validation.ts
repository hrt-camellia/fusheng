import type { BirthInput } from "@/types/bazi";

const GENDERS = new Set(["female", "male"]);
const DAY_BOUNDARY_MODES = new Set(["ZI_HOUR_23", "MIDNIGHT_00"]);

export function zBirthInput(value: unknown): BirthInput {
  if (!value || typeof value !== "object") {
    throw new Error("请求体不能为空");
  }

  const v = value as Record<string, unknown>;

  for (const key of ["date", "time", "place", "timezone", "gender", "dayBoundaryMode"]) {
    if (typeof v[key] !== "string" || !v[key]) {
      throw new Error(`缺少字段：${key}`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.date))) {
    throw new Error("出生日期格式不正确");
  }

  if (!/^\d{2}:\d{2}$/.test(String(v.time))) {
    throw new Error("出生时间格式不正确");
  }

  if (!GENDERS.has(String(v.gender))) {
    throw new Error("性别字段仅支持 male 或 female");
  }

  if (!DAY_BOUNDARY_MODES.has(String(v.dayBoundaryMode))) {
    throw new Error("换日规则不正确");
  }

  const longitude = Number(v.longitude);
  const latitude = Number(v.latitude);

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("请从地点候选项中选择有效出生地点，以获得正确经度");
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("请从地点候选项中选择有效出生地点，以获得正确纬度");
  }

  if (Boolean(v.useTrueSolarTime) && !Number.isFinite(longitude)) {
    throw new Error("启用真太阳时校正时必须提供出生地经度");
  }

  return {
    name: typeof v.name === "string" ? v.name : undefined,
    date: String(v.date),
    time: String(v.time),
    place: String(v.place),
    longitude,
    latitude,
    timezone: String(v.timezone),
    locationId: typeof v.locationId === "number" ? v.locationId : undefined,
    countryCode: typeof v.countryCode === "string" ? v.countryCode : undefined,
    gender: v.gender as BirthInput["gender"],
    useTrueSolarTime: Boolean(v.useTrueSolarTime),
    dayBoundaryMode: v.dayBoundaryMode as BirthInput["dayBoundaryMode"],
  };
}
