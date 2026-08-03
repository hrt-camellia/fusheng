import { calculateBaziChart, type BaziChart } from "@openfate/bazi-engine";
import type { BaziResult, BirthInput, Pillar } from "@/types/bazi";

const ELEMENT_LABELS: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const POLARITY_LABELS: Record<string, string> = {
  yang: "阳",
  yin: "阴",
};

function formatDateTime(value: {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
}): string {
  const date = `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;

  if (value.hour === null) return date;

  return `${date} ${String(value.hour).padStart(2, "0")}:${String(value.minute ?? 0).padStart(2, "0")}`;
}

function normalizePillars(chart: BaziChart): Pillar[] {
  const source = [
    ["年柱", chart.pillars.year],
    ["月柱", chart.pillars.month],
    ["日柱", chart.pillars.day],
    ["时柱", chart.pillars.hour],
  ] as const;

  return source.map(([label, pillar]) => ({
    label,
    stem: pillar?.stem ?? "—",
    branch: pillar?.branch ?? "—",
    element: pillar
      ? `${ELEMENT_LABELS[pillar.element] ?? pillar.element} · ${ELEMENT_LABELS[pillar.branchElement] ?? pillar.branchElement}`
      : "—",
  }));
}

function countFiveElements(chart: BaziChart): Record<string, number> {
  const counts: Record<string, number> = {
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0,
  };

  for (const pillar of [
    chart.pillars.year,
    chart.pillars.month,
    chart.pillars.day,
    chart.pillars.hour,
  ]) {
    if (!pillar) continue;

    const stemElement = ELEMENT_LABELS[pillar.element];
    const branchElement = ELEMENT_LABELS[pillar.branchElement];

    if (stemElement) counts[stemElement] += 1;
    if (branchElement) counts[branchElement] += 1;
  }

  return counts;
}

export async function calculateWithOpenFate(
  input: BirthInput,
): Promise<BaziResult> {
  const [year, month, day] = input.date.split("-").map(Number);
  const [hour, minute] = input.time.split(":").map(Number);

  const chart = calculateBaziChart({
    year,
    month,
    day,
    hour,
    minute,
    gender: input.gender,
    longitude: input.longitude,
    timezoneId: input.timezone,
    calendarType: "solar",
    enableTrueSolarTime: input.useTrueSolarTime,
    dayBoundaryMode: input.dayBoundaryMode,
  });

  const correctedTime = chart.solarTimeInfo?.trueSolarDateTime
    ?? formatDateTime(chart.calendar.calculationSolar);

  const warnings: string[] = [];

  if (!input.useTrueSolarTime) {
    warnings.push("本次未启用真太阳时校正，四柱按出生地民用时间计算。");
  }

  if (input.dayBoundaryMode === "ZI_HOUR_23") {
    warnings.push("本次采用子初换日规则：23:00起计入下一日。");
  } else {
    warnings.push("本次采用午夜换日规则：00:00起计入下一日。");
  }

  return {
    id: crypto.randomUUID(),
    source: "openfate",
    correctedTime,
    pillars: normalizePillars(chart),
    elements: countFiveElements(chart),
    summary: "四柱由确定性排盘引擎计算，出生地点、经纬度、IANA时区与换日规则均已进入计算。AI仅负责后续解释。",
    warnings,
    location: {
      name: input.place.split(" · ")[0] || input.place,
      displayName: input.place,
      latitude: input.latitude!,
      longitude: input.longitude!,
      timezone: input.timezone,
    },
    dayMaster: {
      stem: chart.dayMaster.char,
      element: ELEMENT_LABELS[chart.dayMaster.element] ?? chart.dayMaster.element,
      polarity: POLARITY_LABELS[chart.dayMaster.polarity] ?? chart.dayMaster.polarity,
    },
    calendar: {
      civilSolar: formatDateTime(chart.calendar.civilSolar),
      calculationSolar: formatDateTime(chart.calendar.calculationSolar),
      lunar: `${chart.calendar.lunar.year}年${chart.calendar.lunar.isLeapMonth ? "闰" : ""}${chart.calendar.lunar.month}月${chart.calendar.lunar.day}日`,
      zodiac: chart.calendar.zodiac,
    },
    policy: {
      trueSolarTimeApplied: chart.metadata.trueSolarTimeApplied,
      dayBoundaryMode: input.dayBoundaryMode,
    },
    raw: chart,
  };
}
