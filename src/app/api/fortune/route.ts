import { NextResponse } from "next/server";
import { calculateDailyFortune } from "@/lib/fortune-engine";
import { zBirthInput } from "@/lib/validation";
import type { BaziResult } from "@/types/bazi";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const date = String(body.date || "");
    const input = zBirthInput(body.input);

    if (!body.result || typeof body.result !== "object") {
      throw new Error("缺少已确认命盘");
    }

    const result = body.result as BaziResult;
    if (!result.dayMaster || !Array.isArray(result.pillars) || !result.elements) {
      throw new Error("命盘结构不完整，请重新排盘");
    }

    return NextResponse.json(calculateDailyFortune(input, result, date));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "每日命理计算失败" },
      { status: 422 },
    );
  }
}
