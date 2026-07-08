import { saveGameItem, type SavedGameItem } from "@/lib/itemLibrary";
import {
  getSrdEntity,
  KIND_TO_API_RESOURCE,
  listSrdEntities,
  srdEntityKindLabel,
  srdEntityToPreviewMarkdown,
} from "@/lib/srd/corpus";
import { fetchDnd5eResource } from "@/lib/srd/dnd5eApi";
import { buildSrdPreviewMarkdown } from "@/lib/srd/srdPreviewMarkdown";
import {
  saveCustomSrdEntry,
  type SavedCustomSrdEntry,
} from "@/lib/srd/srdCustomLibrary";
import type { SrdEntityId, SrdEntityKind, SrdEntitySummary } from "@/lib/srd/types";

export type CloneSrdResult =
  | { storage: "custom-srd"; entry: SavedCustomSrdEntry }
  | { storage: "item"; item: SavedGameItem };

export type CloneSrdOptions = {
  userId?: string | null;
};

const ITEM_KINDS: readonly SrdEntityKind[] = ["equipment", "weapon", "armor", "magic-item"];

/** Resolve full markdown for an SRD entity (bundled corpus first, API fallback). */
export async function resolveSrdEntityMarkdown(entity: SrdEntitySummary): Promise<string> {
  const bundled = srdEntityToPreviewMarkdown(entity);
  if (bundled?.trim()) return bundled;

  const resource = KIND_TO_API_RESOURCE[entity.kind];
  if (!resource) {
    return `# ${entity.name}\n\n_Cloned from the bundled SRD — full text was not available offline._`;
  }

  try {
    const data = await fetchDnd5eResource(resource, entity.key);
    return buildSrdPreviewMarkdown({
      resource,
      index: entity.key,
      name: entity.name,
      apiData: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return `# ${entity.name}\n\nCould not load SRD text: ${message}\n\nEdit this copy in your workspace.`;
  }
}

/** Server-safe markdown resolution (no fetch — bundled corpus only). */
export function resolveSrdEntityMarkdownSync(entity: SrdEntitySummary): string {
  const bundled = srdEntityToPreviewMarkdown(entity);
  if (bundled?.trim()) return bundled;
  return `# ${entity.name}\n\n_Cloned from the bundled SRD. Open in the app to fetch full text if needed._\n\nSource: \`${entity.id}\``;
}

function isItemKind(kind: SrdEntityKind): boolean {
  return (ITEM_KINDS as readonly string[]).includes(kind);
}

/** Build a clone payload without persisting (used by API + client). */
export async function buildSrdClonePayload(
  entityId: SrdEntityId,
  opts?: CloneSrdOptions & { syncOnly?: boolean },
): Promise<{
  entity: SrdEntitySummary;
  markdown: string;
  targetStorage: "custom-srd" | "item";
}> {
  const entity = getSrdEntity(entityId);
  if (!entity) {
    throw new Error(`SRD entity not found: ${entityId}`);
  }
  const markdown = opts?.syncOnly
    ? resolveSrdEntityMarkdownSync(entity)
    : await resolveSrdEntityMarkdown(entity);
  return {
    entity,
    markdown,
    targetStorage: isItemKind(entity.kind) ? "item" : "custom-srd",
  };
}

/** Deep-copy one SRD entity into the user's editable workspace storage. */
export async function cloneSrdEntityToWorkspace(
  entityId: SrdEntityId,
  opts?: CloneSrdOptions,
): Promise<CloneSrdResult> {
  const { entity, markdown, targetStorage } = await buildSrdClonePayload(entityId, opts);

  if (targetStorage === "item") {
    const kind = entity.kind === "magic-item" ? "magic" : "equipment";
    const list = await saveGameItem({
      kind,
      name: entity.name,
      itemType: srdEntityKindLabel(entity.kind),
      description: markdown,
      source: "import",
    });
    const item = list.find((row) => row.name === entity.name) ?? list[0];
    if (!item) throw new Error("Could not save cloned item.");
    return { storage: "item", item };
  }

  const list = await saveCustomSrdEntry({
    userId: opts?.userId ?? null,
    sourceSrdEntityId: entityId,
    kind: entity.kind,
    name: entity.name,
    subtitle: entity.subtitle ?? null,
    markdown,
  });
  const entry = list.find((row) => row.sourceSrdEntityId === entityId && row.name === entity.name);
  if (!entry) throw new Error("Could not save cloned SRD entry.");
  return { storage: "custom-srd", entry };
}

/** Clone every entity in an SRD category into the user's workspace. */
export async function cloneSrdCategoryToWorkspace(
  kind: SrdEntityKind,
  opts?: CloneSrdOptions,
): Promise<CloneSrdResult[]> {
  const entities = listSrdEntities(kind);
  const results: CloneSrdResult[] = [];
  for (const entity of entities) {
    try {
      results.push(await cloneSrdEntityToWorkspace(entity.id, opts));
    } catch {
      /* skip individual failures during bulk import */
    }
  }
  return results;
}
