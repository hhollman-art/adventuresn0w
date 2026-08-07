import {
  appendGenerationLibraryItem,
  type LibraryImage,
  type LibraryItem,
  type LibraryKind,
  updateGenerationLibraryItem,
} from "@/lib/generationLibrary";
import { autoLinkToActiveCampaign, getActiveCampaignId } from "@/lib/campaigns";
import { firstHeading } from "@/lib/workshop/previewExport";

export type PreviewCommitKind = "save-library" | "add-campaign" | "update-library" | "none";

export type PreviewCommitPlan = {
  kind: PreviewCommitKind;
  /** Plain button label — answers what happens on click. */
  label: string;
  show: boolean;
};

export function planPreviewCommit(opts: {
  hasContent: boolean;
  loading: boolean;
  isSrdPreview: boolean;
  /** Heroes use the Scry Window multi-select instead of this footer. */
  showHeroRecruit: boolean;
  isLibraryView: boolean;
  hasViewingResult: boolean;
  committedLibraryId: string | null;
}): PreviewCommitPlan {
  if (
    !opts.hasContent ||
    opts.loading ||
    opts.isSrdPreview ||
    opts.showHeroRecruit
  ) {
    return { kind: "none", label: "", show: false };
  }

  if (opts.isLibraryView && opts.hasViewingResult) {
    return {
      kind: "add-campaign",
      label: getActiveCampaignId() ? "Add to Campaign" : "Save to Library",
      show: true,
    };
  }

  if (opts.committedLibraryId) {
    return {
      kind: getActiveCampaignId() ? "add-campaign" : "update-library",
      label: getActiveCampaignId() ? "Add to Campaign" : "Update in Library",
      show: true,
    };
  }

  return { kind: "save-library", label: "Save to Library", show: true };
}

export function libraryKindFromWorkspace(workspace: string): LibraryKind {
  if (workspace === "realm") return "realm";
  if (workspace === "characters") return "characters";
  if (workspace === "maps") return "maps";
  if (workspace === "props") return "props";
  return "adventure";
}

export type CommitPreviewInput = {
  markdown: string;
  images: LibraryImage[];
  textModel: string | null;
  imageModel: string | null;
  workspace: string;
  titleHint?: string;
  committedLibraryId: string | null;
  viewingResult: LibraryItem | null;
  planKind: PreviewCommitKind;
};

export type CommitPreviewResult =
  | { ok: true; libraryId: string | null; message: string }
  | { ok: false; error: string };

/**
 * Commit the Scrying Glass document into local Library storage (IndexedDB)
 * and optionally link it to the active campaign. Never triggers a browser download.
 */
export async function commitPreviewToLibrary(
  input: CommitPreviewInput,
): Promise<CommitPreviewResult> {
  if (input.planKind === "none") {
    return { ok: false, error: "Nothing to save right now." };
  }

  const md = input.markdown.trim();
  if (!md && input.images.length === 0) {
    return { ok: false, error: "Generate or open a creation before saving." };
  }

  const kind = libraryKindFromWorkspace(input.workspace);
  const fallbackTitle =
    kind === "characters"
      ? "Heroes"
      : kind === "maps"
        ? "Maps"
        : kind === "props"
          ? "Items"
          : kind === "realm"
            ? "Realm"
            : "Adventure";
  const title = (firstHeading(md) ?? input.titleHint?.trim()) || fallbackTitle;

  try {
    if (input.viewingResult && input.planKind === "add-campaign") {
      await autoLinkToActiveCampaign({ resultId: input.viewingResult.id });
      const campaignLinked = Boolean(getActiveCampaignId());
      return {
        ok: true,
        libraryId: input.viewingResult.id,
        message: campaignLinked
          ? `“${input.viewingResult.title}” is linked to your active campaign.`
          : `“${input.viewingResult.title}” is already in your Library. Open a campaign to link it.`,
      };
    }

    if (input.committedLibraryId) {
      await updateGenerationLibraryItem(input.committedLibraryId, {
        title,
        markdown: md || input.viewingResult?.markdown || "",
      });
      await autoLinkToActiveCampaign({ resultId: input.committedLibraryId });
      const campaignLinked = Boolean(getActiveCampaignId());
      return {
        ok: true,
        libraryId: input.committedLibraryId,
        message: campaignLinked
          ? "Updated your Library copy and linked it to the active campaign."
          : "Updated your Library copy.",
      };
    }

    const list = await appendGenerationLibraryItem({
      kind,
      title,
      markdown: md,
      textModel: input.textModel,
      imageModel: input.imageModel,
      images: input.images,
    });
    const saved = list[0];
    if (!saved) {
      return { ok: false, error: "Could not save to your Library." };
    }
    await autoLinkToActiveCampaign({ resultId: saved.id });
    const campaignLinked = Boolean(getActiveCampaignId());
    return {
      ok: true,
      libraryId: saved.id,
      message: campaignLinked
        ? `Saved “${saved.title}” to your Library and linked it to the active campaign.`
        : `Saved “${saved.title}” to your Library.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save to your Library.",
    };
  }
}
