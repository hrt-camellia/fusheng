import type { BraceletBead, BraceletDesign } from "@/types/bracelet";

export const BEAD_SIZES = [6, 8, 10, 12] as const;
export type BeadSize = (typeof BEAD_SIZES)[number];

export const BRACELET_ALLOWANCE_MM = 12;
export const FIT_TOLERANCE_MM = 3;

export interface BraceletLayoutPosition {
  bead: BraceletBead;
  x: number;
  y: number;
  radius: number;
  angle: number;
}

export interface BraceletLayout {
  orbitRadius: number;
  positions: BraceletLayoutPosition[];
}

export interface FillResult {
  beads: BraceletBead[];
  addedSizes: number[];
  targetLength: number;
  finalLength: number;
  difference: number;
  status: "filled" | "already-fit" | "too-long";
}

export function circumference(beads: BraceletBead[]) {
  return beads.reduce((sum, bead) => sum + bead.sizeMm, 0);
}

export function recommendedLength(wrist: number) {
  return wrist + BRACELET_ALLOWANCE_MM;
}

export function targetCount(wrist: number, size = 8) {
  return Math.max(10, Math.round(recommendedLength(wrist) / size));
}

export function createBeads(
  crystalId: string,
  count: number,
  sizeMm = 8,
): BraceletBead[] {
  return Array.from({ length: count }, () => ({
    instanceId: crypto.randomUUID(),
    crystalId,
    sizeMm,
  }));
}

/**
 * 根据每颗珠子的真实珠径分配圆周角度。
 * 相邻珠子的圆心间距由两颗珠子的平均直径决定，因此混合珠径不会再被平均摊开。
 */
export function calculateBraceletLayout(
  beads: BraceletBead[],
  options: {
    centerX?: number;
    centerY?: number;
    pxPerMm?: number;
    gapPx?: number;
    minOrbitRadius?: number;
    maxOrbitRadius?: number;
  } = {},
): BraceletLayout {
  const {
    centerX = 210,
    centerY = 210,
    pxPerMm = 3.2,
    gapPx = 1.5,
    minOrbitRadius = 82,
    maxOrbitRadius = 150,
  } = options;

  if (beads.length === 0) {
    return { orbitRadius: minOrbitRadius, positions: [] };
  }

  const diameters = beads.map((bead) => bead.sizeMm * pxPerMm);
  const pitches = beads.map((_, index) => {
    const nextIndex = (index + 1) % beads.length;
    return (diameters[index] + diameters[nextIndex]) / 2 + gapPx;
  });
  const totalPitch = pitches.reduce((sum, pitch) => sum + pitch, 0);
  const naturalRadius = totalPitch / (Math.PI * 2);
  const orbitRadius = Math.min(
    maxOrbitRadius,
    Math.max(minOrbitRadius, naturalRadius),
  );

  let angle = -Math.PI / 2;
  const positions = beads.map((bead, index) => {
    const position = {
      bead,
      x: centerX + orbitRadius * Math.cos(angle),
      y: centerY + orbitRadius * Math.sin(angle),
      radius: Math.max(9.5, bead.sizeMm * 1.55),
      angle,
    };

    angle += (pitches[index] / totalPitch) * Math.PI * 2;
    return position;
  });

  return { orbitRadius, positions };
}

/**
 * 在不改变现有珠子顺序和珠径的前提下，用当前选中的材质自动补齐剩余周长。
 * 如果手串已经过长，则不会擅自删除用户已有珠子，只返回过长状态。
 */
export function fillBraceletToWrist(
  beads: BraceletBead[],
  wrist: number,
  crystalId: string,
  preferredSize: number,
): FillResult {
  const targetLength = recommendedLength(wrist);
  const currentLength = circumference(beads);
  const initialDifference = targetLength - currentLength;

  if (currentLength > targetLength + FIT_TOLERANCE_MM) {
    return {
      beads,
      addedSizes: [],
      targetLength,
      finalLength: currentLength,
      difference: currentLength - targetLength,
      status: "too-long",
    };
  }

  if (Math.abs(initialDifference) <= FIT_TOLERANCE_MM) {
    return {
      beads,
      addedSizes: [],
      targetLength,
      finalLength: currentLength,
      difference: Math.abs(initialDifference),
      status: "already-fit",
    };
  }

  const addedSizes = findBestFillCombination(initialDifference, preferredSize);
  const additions = addedSizes.map((sizeMm) => ({
    instanceId: crypto.randomUUID(),
    crystalId,
    sizeMm,
  }));
  const next = [...beads, ...additions];
  const finalLength = circumference(next);

  return {
    beads: next,
    addedSizes,
    targetLength,
    finalLength,
    difference: Math.abs(finalLength - targetLength),
    status: "filled",
  };
}

function findBestFillCombination(remaining: number, preferredSize: number) {
  const sizes = [...BEAD_SIZES].sort((a, b) => {
    const preferredDelta = Math.abs(a - preferredSize) - Math.abs(b - preferredSize);
    return preferredDelta || b - a;
  });

  const maxBeads = Math.max(1, Math.ceil((remaining + 12) / 6));
  let best: number[] = [];
  let bestError = Number.POSITIVE_INFINITY;
  let bestPreferencePenalty = Number.POSITIVE_INFINITY;

  function visit(index: number, selected: number[], sum: number) {
    if (selected.length > maxBeads || sum > remaining + 12) return;

    if (index === sizes.length) {
      if (selected.length === 0) return;

      const error = Math.abs(remaining - sum);
      const preferencePenalty = selected.reduce(
        (total, size) => total + Math.abs(size - preferredSize),
        0,
      );

      if (
        error < bestError ||
        (error === bestError && preferencePenalty < bestPreferencePenalty) ||
        (error === bestError &&
          preferencePenalty === bestPreferencePenalty &&
          selected.length < best.length)
      ) {
        best = [...selected];
        bestError = error;
        bestPreferencePenalty = preferencePenalty;
      }
      return;
    }

    const size = sizes[index];
    const maxCount = Math.min(maxBeads - selected.length, Math.ceil((remaining + 12 - sum) / size));

    for (let count = 0; count <= maxCount; count += 1) {
      visit(
        index + 1,
        [...selected, ...Array.from({ length: count }, () => size)],
        sum + count * size,
      );
    }
  }

  visit(0, [], 0);
  return best.length ? best : [preferredSize];
}

export function normalizeBraceletDesign(design: BraceletDesign): BraceletDesign {
  return {
    ...design,
    beads: Array.isArray(design.beads)
      ? design.beads.map((bead) => ({
          instanceId: bead.instanceId || crypto.randomUUID(),
          crystalId: bead.crystalId || "amethyst",
          sizeMm: BEAD_SIZES.includes(bead.sizeMm as BeadSize)
            ? bead.sizeMm
            : 8,
        }))
      : [],
  };
}
