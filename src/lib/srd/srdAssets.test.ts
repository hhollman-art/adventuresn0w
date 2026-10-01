import { describe, expect, it } from "vitest";
import {
  isSrdAssetsReady,
  memoBySrdTable,
  srdDocument,
  srdDocumentIndex,
  srdEntities,
  srdEntityCounts,
  srdSpellIndex,
  srdTaxonomyCounts,
  SRD_ASSET_FILES,
  SRD_ASSET_NAMES,
  srdAssetUrl,
  srdPreloadBootScript,
} from "@/lib/srd/srdAssets";
import { srdAssetDiskPath } from "@/lib/srd/srdAssets.node";
import { SRD_ENTITIES, SRD_ENTITY_COUNTS, SRD_TAXONOMY_COUNTS } from "@/lib/srd/srdEntities.data";
import { SRD_DOCUMENT_INDEX } from "@/lib/srd/srdDocumentIndex.data";
import { SRD_SPELL_INDEX } from "@/lib/srd/spellIndex.data";
import {
  SRD_DOCUMENT_BODY,
  SRD_DOCUMENT_CHAPTERS,
  SRD_DOCUMENT_PDF_ID,
} from "@/lib/srd/srdDocument.data";

describe("SRD asset delivery", () => {
  it("fetches each asset under its public path (versioned only when a build hash exists)", () => {
    for (const name of SRD_ASSET_NAMES) {
      expect(srdAssetUrl(name).startsWith(SRD_ASSET_FILES[name])).toBe(true);
    }
  });

  it("maps versioned URLs onto the same file on disk", () => {
    expect(srdAssetDiskPath("/srd/entities.json?v=abc123", "/root")).toBe(
      srdAssetDiskPath("/srd/entities.json", "/root"),
    );
  });

  it("boot script preloads every asset as a CORS-matched fetch", () => {
    const script = srdPreloadBootScript();
    for (const name of SRD_ASSET_NAMES) expect(script).toContain(srdAssetUrl(name));
    expect(script).toContain('l.as="fetch"');
    expect(script).toContain('l.crossOrigin="anonymous"');
    expect(() => new Function(script)).not.toThrow();
  });
});

describe("SRD assets (public/srd/*.json)", () => {
  it("are loaded by the vitest setup file", () => {
    expect(isSrdAssetsReady()).toBe(true);
    expect(SRD_ASSET_FILES.entities).toBe("/srd/entities.json");
    expect(SRD_ASSET_FILES.document).toBe("/srd/document.json");
  });

  it("document byte ranges resolve into the document body", () => {
    const { body, pdfId, chapters } = srdDocument();
    expect(pdfId).toBe("SRD_CC_v5.2.1");
    expect(chapters.length).toBeGreaterThan(10);
    const fireball = srdEntities().find((e) => e.id === "spell:fireball");
    expect(fireball).toBeDefined();
    expect(body.slice(fireball!.start, fireball!.end)).toMatch(/^#+\s*Fireball/);
  });

  it("entity counts agree with the entity rows", () => {
    const counts = srdEntityCounts();
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(srdEntities().length);
    for (const [kind, n] of Object.entries(counts)) {
      expect(srdEntities().filter((e) => e.kind === kind).length).toBe(n);
    }
  });

  /*
   * Parity with the generated TypeScript modules. These three tests pin the
   * JSON export to the `.data.ts` sources while both exist; delete them in the
   * same change that removes the `.data.ts` files (the export script's
   * `--verify` mode covers the build pipeline from then on).
   */
  it("entities.json mirrors srdEntities.data.ts exactly", () => {
    expect(srdEntities()).toStrictEqual(SRD_ENTITIES);
    expect(srdEntityCounts()).toStrictEqual(SRD_ENTITY_COUNTS);
    expect(srdTaxonomyCounts()).toStrictEqual(SRD_TAXONOMY_COUNTS);
  });

  it("document-index.json mirrors srdDocumentIndex.data.ts exactly", () => {
    expect(srdDocumentIndex()).toStrictEqual(SRD_DOCUMENT_INDEX);
  });

  it("spell-index.json mirrors spellIndex.data.ts exactly", () => {
    expect(srdSpellIndex()).toStrictEqual(SRD_SPELL_INDEX);
  });

  it("document.json mirrors srdDocument.data.ts exactly", () => {
    const doc = srdDocument();
    expect(doc.pdfId).toBe(SRD_DOCUMENT_PDF_ID);
    expect(doc.chapters).toStrictEqual(SRD_DOCUMENT_CHAPTERS);
    expect(doc.body.length).toBe(SRD_DOCUMENT_BODY.length);
    expect(doc.body).toBe(SRD_DOCUMENT_BODY);
  });

  it("memoBySrdTable rebuilds only when the table identity changes", () => {
    let builds = 0;
    let table: readonly number[] = [1, 2, 3];
    const derived = memoBySrdTable(
      () => table,
      (t) => {
        builds += 1;
        return t.length;
      },
    );
    expect(derived()).toBe(3);
    expect(derived()).toBe(3);
    expect(builds).toBe(1);
    table = [1, 2];
    expect(derived()).toBe(2);
    expect(builds).toBe(2);
  });
});
