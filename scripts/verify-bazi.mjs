import { calculateBaziChart } from "@openfate/bazi-engine";

const chart = calculateBaziChart({
  year: 1998,
  month: 12,
  day: 13,
  hour: 12,
  minute: 0,
  gender: "female",
  longitude: 116.39,
  timezone: 8,
  enableTrueSolarTime: true,
  dayBoundaryMode: "ZI_HOUR_23",
});

const actual = [
  chart.pillars.year.ganZhi,
  chart.pillars.month.ganZhi,
  chart.pillars.day.ganZhi,
  chart.pillars.hour?.ganZhi,
];

const expected = ["戊寅", "甲子", "甲午", "庚午"];
const passed = actual.every((value, index) => value === expected[index]);

console.log("OpenFate smoke test");
console.log("actual:  ", actual.join(" / "));
console.log("expected:", expected.join(" / "));

if (!passed) {
  console.error("FAILED: 排盘引擎示例结果与公开文档不一致。");
  process.exit(1);
}

console.log("PASSED: 公开示例结果一致。");
