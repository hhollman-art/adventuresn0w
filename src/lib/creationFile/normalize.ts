import type { CreationFile, CFType, CreationFileCiClass } from "@/lib/creationFile/types";
import { CF_TYPES } from "@/lib/creationFile/types";
import { cfTypeForCiClass, defaultCiClassForCfType, isCreationFileCiClass } from "@/lib/creationFile/map";

/** Parse ISO or epoch → epoch ms; falls back to now. */
export function toEpochMs(value: string | number | null | undefined, fallback = Date.now()): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && /^\d+(\.\d+)?$/.test(value.trim())) return asNum;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeIdList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  return ids.length ? ids : undefined;
}

/**
 * Validates and upgrades an unknown value into a Universal CF Card.
 * Returns null when required fields are missing or `type`/`ciClass` disagree.
 */
export function fixCreationFile(value: unknown): CreationFile | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.id !== "string" || !value.id.trim()) return null;
  if (typeof value.title !== "string" || !value.title.trim()) return null;

  const type =
    typeof value.type === "string" && (CF_TYPES as readonly string[]).includes(value.type)
      ? (value.type as CFType)
      : null;
  if (!type) return null;

  let ciClass: CreationFileCiClass;
  if (typeof value.ciClass === "string" && isCreationFileCiClass(value.ciClass)) {
    ciClass = value.ciClass;
    const mapped = cfTypeForCiClass(ciClass);
    if (mapped && mapped !== type) return null;
  } else {
    ciClass = defaultCiClassForCfType(type);
  }

  const createdAt = toEpochMs(
    typeof value.createdAt === "string" || typeof value.createdAt === "number"
      ? value.createdAt
      : undefined,
  );
  const updatedAt = toEpochMs(
    typeof value.updatedAt === "string" || typeof value.updatedAt === "number"
      ? value.updatedAt
      : undefined,
    createdAt,
  );

  const card: CreationFile = {
    id: value.id.trim(),
    type,
    ciClass,
    title: value.title.trim(),
    tags: normalizeTags(value.tags),
    data: isPlainObject(value.data) ? value.data : {},
    createdAt,
    updatedAt,
  };

  if (typeof value.subtitle === "string" && value.subtitle.trim()) {
    card.subtitle = value.subtitle.trim();
  }
  const childIds = normalizeIdList(value.childIds);
  if (childIds) card.childIds = childIds;
  if (typeof value.parentId === "string" && value.parentId.trim()) {
    card.parentId = value.parentId.trim();
  }

  return card;
}

/** Mint a new CF card shell (caller fills `data` / links). */
export function createCreationFile(input: {
  type: CFType;
  title: string;
  subtitle?: string;
  tags?: string[];
  data?: Record<string, unknown>;
  childIds?: string[];
  parentId?: string;
  ciClass?: CreationFileCiClass;
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}): CreationFile {
  const now = Date.now();
  const ciClass = input.ciClass ?? defaultCiClassForCfType(input.type);
  const mapped = cfTypeForCiClass(ciClass);
  if (mapped && mapped !== input.type) {
    throw new Error(`ciClass ${ciClass} does not map to CFType ${input.type}`);
  }
  const title = input.title.trim() || "Untitled";
  return {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    ciClass,
    title,
    ...(input.subtitle?.trim() ? { subtitle: input.subtitle.trim() } : {}),
    tags: normalizeTags(input.tags ?? []),
    data: input.data ?? {},
    ...(input.childIds?.length ? { childIds: [...input.childIds] } : {}),
    ...(input.parentId?.trim() ? { parentId: input.parentId.trim() } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}
