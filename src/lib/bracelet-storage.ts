import type { BraceletDesign } from "@/types/bracelet";
import { normalizeBraceletDesign } from "@/lib/bracelet";

const LIST_KEY = "fusheng:bracelets";
const DRAFT_KEY = "fusheng:bracelet-draft:v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readBraceletDesigns(): BraceletDesign[] {
  if (!canUseStorage()) return [];

  const designs = parseJson<BraceletDesign[]>(localStorage.getItem(LIST_KEY));
  return Array.isArray(designs)
    ? designs.map(normalizeBraceletDesign)
    : [];
}

export function replaceBraceletDesigns(designs: BraceletDesign[]) {
  if (!canUseStorage()) return;
  const normalized = designs.map(normalizeBraceletDesign).slice(0, 20);
  localStorage.setItem(LIST_KEY, JSON.stringify(normalized));
}

export function saveBraceletDesign(design: BraceletDesign) {
  if (!canUseStorage()) return;

  const normalized = normalizeBraceletDesign(design);
  const existing = readBraceletDesigns();
  const next = [
    normalized,
    ...existing.filter((item) => item.id !== normalized.id),
  ].slice(0, 20);

  localStorage.setItem(LIST_KEY, JSON.stringify(next));
  writeBraceletDraft(normalized);
}

export function deleteBraceletDesign(designId: string) {
  if (!canUseStorage()) return;

  const remaining = readBraceletDesigns().filter((item) => item.id !== designId);
  localStorage.setItem(LIST_KEY, JSON.stringify(remaining));

  const draft = readBraceletDraft();
  if (draft?.id === designId) {
    clearBraceletDraft();
  }
}

export function readBraceletDraft(): BraceletDesign | null {
  if (!canUseStorage()) return null;

  const draft = parseJson<BraceletDesign>(localStorage.getItem(DRAFT_KEY));
  return draft ? normalizeBraceletDesign(draft) : null;
}

export function writeBraceletDraft(design: BraceletDesign) {
  if (!canUseStorage()) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeBraceletDesign(design)));
}

export function clearBraceletDraft() {
  if (!canUseStorage()) return;
  localStorage.removeItem(DRAFT_KEY);
}
