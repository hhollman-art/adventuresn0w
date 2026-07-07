"use client";

import type { PlayerCharacter } from "@/lib/tabletop/types";
import type { TabletopSession } from "@/lib/tabletop/types";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import {
  buildFoundryMacroPack,
  downloadDataUrlImage,
  downloadJsonFile,
  downloadTextFile,
  exportFileSlug,
  exportFoundryActorBundle,
  exportFoundryPartyBundle,
  exportFoundrySceneFromSession,
  exportRoll20CharacterBundle,
  exportRoll20PartyBundle,
} from "@/modules/vtt/exports";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

type VttExportPanelProps = {
  /** Compact layout for inline button rows. */
  compact?: boolean;
  /** Single hero for Tavern character exports. */
  player?: PlayerCharacter;
  /** Party roster for bulk exports. */
  party?: SavedCharacterRoster | null;
  /** Live table session for scene + macro exports. */
  session?: TabletopSession | null;
  /** Limit which export groups render (default: infer from props). */
  modes?: Array<"hero" | "party" | "scene">;
};

function partyNameFrom(party: SavedCharacterRoster | null | undefined, fallback: string): string {
  return party?.name?.trim() || fallback;
}

/** Foundry + Roll20 export actions — DMMS → JSON → VTT import pipeline. */
export default function VttExportPanel({ compact, player, party, session, modes }: VttExportPanelProps) {
  const players =
    session?.players?.length ? session.players : party?.players ?? (player ? [player] : []);
  const label = partyNameFrom(party, players.length === 1 ? players[0]?.name ?? "hero" : "party");

  const exportFoundryActor = () => {
    if (!player) return;
    const slug = exportFileSlug(player.name, "actor");
    downloadJsonFile(`${slug}-foundry-actor.json`, exportFoundryActorBundle(player));
  };

  const exportRoll20Actor = () => {
    if (!player) return;
    const slug = exportFileSlug(player.name, "character");
    downloadJsonFile(`${slug}-roll20-character.json`, exportRoll20CharacterBundle(player));
  };

  const exportFoundryParty = () => {
    if (!players.length) return;
    const slug = exportFileSlug(label, "party");
    downloadJsonFile(`${slug}-foundry-party.json`, exportFoundryPartyBundle(label, players));
  };

  const exportRoll20Party = () => {
    if (!players.length) return;
    const slug = exportFileSlug(label, "party");
    downloadJsonFile(`${slug}-roll20-party.json`, exportRoll20PartyBundle(label, players));
  };

  const exportFoundryScene = () => {
    if (!session) return;
    const bundle = exportFoundrySceneFromSession(session);
    const slug = exportFileSlug(session.mapName, "scene");
    downloadJsonFile(`${slug}-foundry-scene.json`, bundle);
    downloadTextFile(`${slug}-foundry-import.txt`, bundle.importNotes);
    if (session.mapImageDataUrl && bundle.mapImageFilename) {
      downloadDataUrlImage(bundle.mapImageFilename, session.mapImageDataUrl);
    }
  };

  const exportMacroPack = () => {
    const pack = buildFoundryMacroPack();
    downloadJsonFile("dmms-foundry-macros.json", pack.macros);
    downloadTextFile("dmms-foundry-macros-readme.txt", pack.readme);
  };

  const showHero = modes ? modes.includes("hero") && Boolean(player) : Boolean(player);
  const showParty = modes
    ? modes.includes("party") && players.length > 0 && !player
    : players.length > 0 && !player;
  const showSession = modes ? modes.includes("scene") && Boolean(session) : Boolean(session);

  if (compact) {
    return (
      <>
        {showHero && (
          <>
            <FantasyTooltipWrap label="Foundry" hint="Download Foundry actor JSON">
              <button
                type="button"
                className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
                onClick={exportFoundryActor}
              >
                Foundry
              </button>
            </FantasyTooltipWrap>
            <FantasyTooltipWrap label="Roll20" hint="Download Roll20 character JSON">
              <button
                type="button"
                className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
                onClick={exportRoll20Actor}
              >
                Roll20
              </button>
            </FantasyTooltipWrap>
          </>
        )}
        {showParty && (
          <>
            <FantasyTooltipWrap label="Foundry party" hint="Download Foundry party bundle">
              <button
                type="button"
                className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
                onClick={exportFoundryParty}
              >
                Foundry party
              </button>
            </FantasyTooltipWrap>
            <FantasyTooltipWrap label="Roll20 party" hint="Download Roll20 party bundle">
              <button
                type="button"
                className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
                onClick={exportRoll20Party}
              >
                Roll20 party
              </button>
            </FantasyTooltipWrap>
          </>
        )}
        {showSession && (
          <>
            <FantasyTooltipWrap label="Foundry scene" hint="Download scene JSON and map PNG">
              <button
                type="button"
                className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
                onClick={exportFoundryScene}
              >
                Foundry scene
              </button>
            </FantasyTooltipWrap>
            <FantasyTooltipWrap label="Foundry macros" hint="Download initiative, token link, and party-import macros">
              <button
                type="button"
                className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
                onClick={exportMacroPack}
              >
                Foundry macros
              </button>
            </FantasyTooltipWrap>
          </>
        )}
      </>
    );
  }

  return (
    <section
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)" }}
      aria-label="VTT export"
    >
      <div className="mb-2">
        <h3 className="font-display text-sm font-bold text-[var(--text)]">VTT export</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-soft)]">
          Foundry v11/v12 (dnd5e) and Roll20 (D&amp;D 5E by Roll20). JSON files import via each
          platform&apos;s Import Data.
        </p>
      </div>

      {showHero && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold text-[var(--muted)]">Hero → VTT</p>
          <div className="flex flex-wrap gap-1">
            <FantasyTooltipWrap label="Foundry actor" hint="Download Foundry actor JSON">
              <button type="button" className="btn btn-sm" onClick={exportFoundryActor}>
                Foundry actor
              </button>
            </FantasyTooltipWrap>
            <FantasyTooltipWrap label="Roll20 sheet" hint="Download Roll20 character JSON">
              <button type="button" className="btn btn-sm" onClick={exportRoll20Actor}>
                Roll20 sheet
              </button>
            </FantasyTooltipWrap>
          </div>
        </div>
      )}

      {showParty && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold text-[var(--muted)]">Party → VTT</p>
          <div className="flex flex-wrap gap-1">
            <FantasyTooltipWrap label="Foundry party" hint="Download Foundry party bundle">
              <button type="button" className="btn btn-sm" onClick={exportFoundryParty}>
                Foundry party
              </button>
            </FantasyTooltipWrap>
            <FantasyTooltipWrap label="Roll20 party" hint="Download Roll20 party bundle">
              <button type="button" className="btn btn-sm" onClick={exportRoll20Party}>
                Roll20 party
              </button>
            </FantasyTooltipWrap>
          </div>
        </div>
      )}

      {showSession && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold text-[var(--muted)]">Table → Foundry</p>
          <div className="flex flex-wrap gap-1">
            <FantasyTooltipWrap
              label="Foundry scene"
              hint="Download scene JSON, map PNG, and import notes"
            >
              <button type="button" className="btn btn-sm" onClick={exportFoundryScene}>
                Foundry scene
              </button>
            </FantasyTooltipWrap>
            <FantasyTooltipWrap
              label="Foundry macros"
              hint="Download initiative, token link, and party-import macros"
            >
              <button type="button" className="btn btn-sm" onClick={exportMacroPack}>
                Foundry macros
              </button>
            </FantasyTooltipWrap>
          </div>
        </div>
      )}
    </section>
  );
}
