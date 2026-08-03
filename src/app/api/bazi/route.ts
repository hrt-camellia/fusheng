import { NextResponse } from "next/server";
import { zBirthInput } from "@/lib/validation";
import { calculateWithOpenFate } from "@/lib/openfate-adapter";

export async function POST(request: Request) {
  try {
    const input = zBirthInput(await request.json());
    const result = await calculateWithOpenFate(input);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "排盘失败";

    return NextResponse.json(
      {
        error: `真实排盘未完成：${message}`,
      },
      { status: 422 },
    );
  }
}
