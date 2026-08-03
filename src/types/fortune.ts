export type FiveElement = "木" | "火" | "土" | "金" | "水";

export interface DailyFortuneResult {
  date: string;
  dailyPillar: {
    stem: string;
    branch: string;
    stemElement: FiveElement;
    branchElement: FiveElement;
  };
  natal: {
    dayMasterStem: string;
    dayMasterElement: FiveElement;
  };
  relation: {
    key: "peer" | "output" | "wealth" | "pressure" | "support";
    title: string;
    conciseMeaning: string;
  };
  recommendedElement: FiveElement;
  color: {
    primaryName: string;
    primaryHex: string;
    secondaryName: string;
    secondaryHex: string;
  };
  luckyNumber: number;
  accessory: string;
  food: string;
  flower: string;
  luckyTime: string;
  methodNote: string;
  engineVersion: string;
}
