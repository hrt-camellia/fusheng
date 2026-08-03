import { calculateBaziChart } from "@openfate/bazi-engine";
import type { BaziResult, BirthInput } from "@/types/bazi";
import type { DailyFortuneResult, FiveElement } from "@/types/fortune";

const ELEMENT_LABELS: Record<string, FiveElement> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const GENERATES: Record<FiveElement, FiveElement> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const CONTROLS: Record<FiveElement, FiveElement> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

const GENERATED_BY: Record<FiveElement, FiveElement> = {
  木: "水",
  火: "木",
  土: "火",
  金: "土",
  水: "金",
};

const ELEMENT_CONTENT: Record<
  FiveElement,
  {
    colors: Array<[string, string]>;
    secondary: Array<[string, string]>;
    numbers: number[];
    accessories: string[];
    foods: string[];
    flowers: string[];
    times: string[];
  }
> = {
  木: {
    colors: [["鼠尾草绿", "#AFC5B2"], ["青竹色", "#83A98C"]],
    secondary: [["米白色", "#F6F2E8"], ["浅杏色", "#F4E6D5"]],
    numbers: [3, 8],
    accessories: ["绿东陵手串", "木质细链", "翡翠色发饰"],
    foods: ["青提", "猕猴桃", "西兰花轻食"],
    flowers: ["铃兰", "洋桔梗", "白绿色郁金香"],
    times: ["03:00—05:00", "05:00—07:00"],
  },
  火: {
    colors: [["薰衣草紫", "#B8A7F2"], ["莓果红", "#C96C7A"]],
    secondary: [["暖白色", "#FFFDF8"], ["浅粉色", "#F7DDE5"]],
    numbers: [2, 7],
    accessories: ["紫水晶手串", "石榴石耳饰", "暖金色细链"],
    foods: ["草莓酸奶", "番茄意面", "红枣桂圆饮"],
    flowers: ["紫罗兰", "郁金香", "玫瑰"],
    times: ["09:00—11:00", "11:00—13:00"],
  },
  土: {
    colors: [["浅麦色", "#D8C29D"], ["奶茶棕", "#C8A987"]],
    secondary: [["奶油白", "#FFF5E6"], ["柔金色", "#D5BC78"]],
    numbers: [5, 10],
    accessories: ["黄水晶手串", "虎眼石吊坠", "陶土色配饰"],
    foods: ["南瓜浓汤", "燕麦酸奶", "桂花米糕"],
    flowers: ["向日葵", "香槟玫瑰", "金盏花"],
    times: ["07:00—09:00", "13:00—15:00", "19:00—21:00"],
  },
  金: {
    colors: [["月光白", "#F5F5F2"], ["雾银色", "#C8CDD4"]],
    secondary: [["浅灰蓝", "#DCE4EE"], ["珍珠白", "#FFFDFC"]],
    numbers: [4, 9],
    accessories: ["白水晶手串", "珍珠耳饰", "银色细链"],
    foods: ["雪梨银耳羹", "白桃酸奶", "杏仁豆乳"],
    flowers: ["白百合", "白玫瑰", "满天星"],
    times: ["15:00—17:00", "17:00—19:00"],
  },
  水: {
    colors: [["雾霾蓝", "#A9BED8"], ["深海蓝", "#506A8A"]],
    secondary: [["月光灰", "#E7EBF0"], ["黑曜色", "#343640"]],
    numbers: [1, 6],
    accessories: ["黑曜石手串", "海蓝宝吊坠", "蓝色丝巾"],
    foods: ["蓝莓酸奶", "黑芝麻糊", "海带豆腐汤"],
    flowers: ["鸢尾花", "蓝绣球", "风信子"],
    times: ["21:00—23:00", "23:00—01:00"],
  },
};

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length];
}

function normalizeElement(value: string): FiveElement {
  if (["木", "火", "土", "金", "水"].includes(value)) {
    return value as FiveElement;
  }
  const normalized = ELEMENT_LABELS[value.toLowerCase()];
  if (!normalized) throw new Error(`无法识别五行：${value}`);
  return normalized;
}

function classifyRelation(dayMaster: FiveElement, dailyStem: FiveElement) {
  if (dayMaster === dailyStem) {
    return {
      key: "peer" as const,
      title: "比和日",
      conciseMeaning: "同类能量偏强，适合协作、复盘与明确边界。",
    };
  }
  if (GENERATES[dayMaster] === dailyStem) {
    return {
      key: "output" as const,
      title: "输出日",
      conciseMeaning: "表达与产出倾向增强，适合完成作品或推进沟通。",
    };
  }
  if (CONTROLS[dayMaster] === dailyStem) {
    return {
      key: "wealth" as const,
      title: "资源日",
      conciseMeaning: "更关注资源、交易与结果，适合做取舍和预算安排。",
    };
  }
  if (CONTROLS[dailyStem] === dayMaster) {
    return {
      key: "pressure" as const,
      title: "规则日",
      conciseMeaning: "外部要求感更明显，适合按规则推进并预留缓冲。",
    };
  }
  return {
    key: "support" as const,
    title: "支持日",
    conciseMeaning: "学习与支持倾向增强，适合吸收信息、寻求协助。",
  };
}

function chooseRecommendedElement(
  relationKey: DailyFortuneResult["relation"]["key"],
  dayMaster: FiveElement,
  dailyBranch: FiveElement,
  counts: Record<string, number>,
): FiveElement {
  const support = GENERATED_BY[dayMaster];

  if (relationKey === "pressure" || relationKey === "output") return support;
  if (relationKey === "support") return dailyBranch === dayMaster ? support : dailyBranch;
  if (relationKey === "wealth") return counts[dayMaster] <= counts[support] ? dayMaster : support;

  const candidates: FiveElement[] = [dayMaster, support, dailyBranch];
  return candidates.sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0))[0];
}

export function calculateDailyFortune(
  input: BirthInput,
  natalResult: BaziResult,
  targetDate: string,
): DailyFortuneResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error("日期格式应为 YYYY-MM-DD");
  }

  const [year, month, day] = targetDate.split("-").map(Number);
  const parsed = new Date(`${targetDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("日期无效");

  const chart = calculateBaziChart({
    year,
    month,
    day,
    hour: 12,
    minute: 0,
    gender: input.gender,
    longitude: input.longitude,
    timezoneId: input.timezone,
    calendarType: "solar",
    enableTrueSolarTime: input.useTrueSolarTime,
    dayBoundaryMode: input.dayBoundaryMode,
  });

  const dayPillar = chart.pillars.day;
  if (!dayPillar) throw new Error("未能计算当日干支");

  const dayMasterElement = normalizeElement(natalResult.dayMaster.element);
  const dailyStemElement = normalizeElement(dayPillar.element);
  const dailyBranchElement = normalizeElement(dayPillar.branchElement);
  const relation = classifyRelation(dayMasterElement, dailyStemElement);
  const recommendedElement = chooseRecommendedElement(
    relation.key,
    dayMasterElement,
    dailyBranchElement,
    natalResult.elements,
  );

  const seed = hashText(
    `${targetDate}|${natalResult.pillars.map((pillar) => `${pillar.stem}${pillar.branch}`).join("")}|${dayPillar.stem}${dayPillar.branch}`,
  );
  const content = ELEMENT_CONTENT[recommendedElement];
  const primary = pick(content.colors, seed, 0);
  const secondary = pick(content.secondary, seed, 1);

  return {
    date: targetDate,
    dailyPillar: {
      stem: dayPillar.stem,
      branch: dayPillar.branch,
      stemElement: dailyStemElement,
      branchElement: dailyBranchElement,
    },
    natal: {
      dayMasterStem: natalResult.dayMaster.stem,
      dayMasterElement,
    },
    relation,
    recommendedElement,
    color: {
      primaryName: primary[0],
      primaryHex: primary[1],
      secondaryName: secondary[0],
      secondaryHex: secondary[1],
    },
    luckyNumber: pick(content.numbers, seed, 2),
    accessory: pick(content.accessories, seed, 3),
    food: pick(content.foods, seed, 4),
    flower: pick(content.flowers, seed, 5),
    luckyTime: pick(content.times, seed, 6),
    methodNote: "根据当前确认命盘的日主、五行分布与所选日期的日柱关系进行确定性映射；同一命盘在同一日期结果固定。",
    engineVersion: "fortune-rule-v1",
  };
}
