import { NextResponse } from "next/server";

const themeRules: Record<string, { primary: string; secondary: string; rhythm: string }> = {
  事业: {
    primary: "紫水晶",
    secondary: "黄水晶与白水晶",
    rhythm: "以深浅紫交替为主，在视觉中心加入少量暖黄色珠子",
  },
  学业: {
    primary: "紫水晶",
    secondary: "白水晶",
    rhythm: "采用均匀、低对比的重复排列，保持清爽和专注感",
  },
  关系: {
    primary: "粉水晶",
    secondary: "白水晶与紫水晶",
    rhythm: "以粉色为主体，使用透明或浅紫珠子留出呼吸感",
  },
  情绪: {
    primary: "白水晶",
    secondary: "紫水晶与绿东陵",
    rhythm: "降低强对比色比例，采用对称或近似对称的舒缓排列",
  },
  自信: {
    primary: "黄水晶",
    secondary: "紫水晶与黑曜石",
    rhythm: "用少量深色珠子建立边界，再以暖色珠子形成视觉焦点",
  },
};

function selectRule(theme: string) {
  const key = Object.keys(themeRules).find((item) => theme.includes(item));
  return key ? themeRules[key] : themeRules.事业;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    theme?: unknown;
    style?: unknown;
    preference?: unknown;
  };

  const theme = String(body.theme || "事业与行动").slice(0, 40);
  const style = String(body.style || "浅紫治愈").slice(0, 40);
  const preference = String(body.preference || "无特别偏好").slice(0, 100);
  const rule = selectRule(theme);

  const suggestion = [
    `主材建议：${rule.primary}。`,
    `辅材建议：${rule.secondary}。`,
    `排列节奏：${rule.rhythm}。`,
    `风格参考：${style}；个人偏好：${preference}。`,
    "这是一份审美与个人仪式建议，不代表水晶能够改变现实结果。",
  ].join("\n");

  return NextResponse.json({ suggestion, mode: "rule" });
}
