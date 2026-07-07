import type { CiClass } from "@/lib/ciRegistry";
import { fetchDnd5eResource, type SrdApiResource } from "@/lib/srd/dnd5eApi";
import { ciClassForSrdEntity, getSrdEntity, srdEntityToPreviewMarkdown, KIND_TO_API_RESOURCE } from "@/lib/srd/corpus";
import { lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { buildSrdPreviewMarkdown } from "@/lib/srd/srdPreviewMarkdown";
import type { SrdItemRef } from "@/lib/srd/srdItemRef";
import type { SrdEntityId } from "@/lib/srd/types";
import {
  openOrFocusPreviewWindow,
  publishPreviewSnapshot,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";
import { ciClassForSrdResource } from "@/lib/workshop/previewCiClass";

export type SrdPreviewRef = {
  resource: SrdApiResource;
  index: string;
  name: string;
};

function srdPreviewSnapshot(
  name: string,
  markdown: string,
  loading: boolean,
  ciClass?: CiClass | null,
): WorkshopPreviewSnapshot {
  return {
    markdown,
    images: [],
    textModel: null,
    imageModel: null,
    outputLayoutKind: "adventure",
    workspace: "welcome",
    isLibraryView: true,
    viewingLabel: `Viewing SRD: ${name}`,
    viewingSubline: "read-only",
    ciClass: ciClass ?? "rules.srd-entry",
    progressStage: "idle",
    loading: false,
    imageLoading: false,
    error: null,
    imageError: null,
    partySaveMessage: null,
    srdLoading: loading,
    autoMapEnabled: false,
    autoPropsEnabled: false,
    isSrdPreview: true,
    canEdit: false,
    editKind: "none",
    showSavePartyVtt: false,
    showLoadPartyVtt: false,
    viewingPartyId: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Fetch SRD rules text from the API and open it in the Scrying Glass. */
export function openSrdPreview(ref: SrdPreviewRef): void {
  if (typeof window === "undefined") return;

  openOrFocusPreviewWindow();

  const bundled = lookupSrdDocumentMarkdown({
    resource: ref.resource,
    name: ref.name,
    index: ref.index,
  });
  if (bundled?.trim()) {
    publishPreviewSnapshot(srdPreviewSnapshot(ref.name, bundled, false, ciClassForSrdResource(ref.resource)));
    return;
  }

  publishPreviewSnapshot(srdPreviewSnapshot(ref.name, "", true, ciClassForSrdResource(ref.resource)));

  void fetchDnd5eResource(ref.resource, ref.index)
    .then((data) => {
      publishPreviewSnapshot(
        srdPreviewSnapshot(
          ref.name,
          buildSrdPreviewMarkdown({
            resource: ref.resource,
            index: ref.index,
            name: ref.name,
            apiData: data,
          }),
          false,
        ),
      );
    })
    .catch((err) => {
      publishPreviewSnapshot(
        srdPreviewSnapshot(
          ref.name,
          `# ${ref.name}\n\nCould not load this SRD entry: ${err instanceof Error ? err.message : "Unknown error"}.`,
          false,
        ),
      );
    });
}

export function openSrdItemPreview(ref: SrdItemRef): void {
  openSrdPreview({ resource: ref.resource, index: ref.index, name: ref.name });
}

export function openSrdSpellPreview(spell: { id: string; name: string }): void {
  openSrdPreview({ resource: "spells", index: spell.id, name: spell.name });
}

/** Open any bundled SRD entity by stable id (`spell:fireball`, …). */
export function openSrdEntityPreview(entityId: SrdEntityId): void {
  if (typeof window === "undefined") return;

  const entity = getSrdEntity(entityId);
  if (!entity) return;

  openOrFocusPreviewWindow();

  const bundled = srdEntityToPreviewMarkdown(entity);
  if (bundled?.trim()) {
    publishPreviewSnapshot(srdPreviewSnapshot(entity.name, bundled, false, ciClassForSrdEntity(entity.kind)));
    return;
  }

  const resource = KIND_TO_API_RESOURCE[entity.kind];
  if (!resource) return;

  publishPreviewSnapshot(srdPreviewSnapshot(entity.name, "", true, ciClassForSrdEntity(entity.kind)));

  void fetchDnd5eResource(resource, entity.key)
    .then((data) => {
      publishPreviewSnapshot(
        srdPreviewSnapshot(
          entity.name,
          buildSrdPreviewMarkdown({
            resource,
            index: entity.key,
            name: entity.name,
            apiData: data,
          }),
          false,
        ),
      );
    })
    .catch((err) => {
      publishPreviewSnapshot(
        srdPreviewSnapshot(
          entity.name,
          `# ${entity.name}\n\nCould not load this SRD entry: ${err instanceof Error ? err.message : "Unknown error"}.`,
          false,
        ),
      );
    });
}
