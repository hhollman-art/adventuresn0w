import Link from "next/link";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import { THE_LIBRARY, THE_TAVERN } from "@/lib/workplace/forgeLexicon";

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold text-[var(--text)]">{children}</h3>
  );
}

function StepList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="mt-2 list-decimal space-y-2 pl-5 leading-relaxed text-[var(--text)]/90">
      {children}
    </ol>
  );
}

function BulletList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-[var(--text)]/90">
      {children}
    </ul>
  );
}

/** DM workflow: prep and run a campaign with today&apos;s tools (+ planned features). */
export default function DmCampaignWorkflowGuide() {
  return (
    <div
      className="mt-4 rounded-lg border p-4 sm:p-5"
      style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.04)" }}
    >
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        A practical path from zero to running sessions — using what ships today. Every step has a
        manual option; AI generators are optional accelerators, not requirements.
      </p>

      <SubHeading>How the pieces fit together</SubHeading>
      <p className="mt-2 leading-relaxed text-[var(--text)]/90">
        Think of your prep as layers. A <strong>campaign</strong> is the top folder for one group.
        It links (by reference, never by copy) a <strong>fellowship</strong>, individual{" "}
        <strong>heroes</strong>, <strong>CFs</strong> and <strong>prepared scrolls</strong>,{" "}
        <strong>items</strong>, and that group&apos;s <strong>Virtual Table</strong>. {THE_LIBRARY}{" "}
        is where you browse everything; the Fantasy Forge tabs are where you create new content.
      </p>

      <SubHeading>A. One-time campaign setup</SubHeading>
      <StepList>
        <li>
          Open{" "}
          <Link href="/campaigns" className="font-semibold text-[var(--accent)] underline">
            Campaigns
          </Link>{" "}
          and create a chronicle for this group — name, short pitch, done.
        </li>
        <li>
          Set it as the <strong>active campaign</strong> (title-bar switcher). New heroes, CFs,
          and results you make will link to it automatically.
        </li>
        <li>
          In {THE_TAVERN} (
          <Link href="/tavern" className="font-semibold text-[var(--accent)] underline">
            /tavern
          </Link>
          ), create or import heroes, then <strong>gather a fellowship</strong>. Link that party
          on the Campaigns page.
        </li>
        <li>
          Set an <strong>auto-save folder</strong> in {THE_LIBRARY} so CFs, heroes, and campaigns
          survive beyond this browser.
        </li>
      </StepList>

      <SubHeading>B. Session prep (repeat each time you play)</SubHeading>
      <StepList>
        <li>
          Confirm the active campaign in the title bar. In {THE_LIBRARY}, turn on{" "}
          <strong>campaign scope</strong> to see only that group&apos;s linked content — or browse
          All shelves when you need shared realm CFs.
        </li>
        <li>
          <strong>Realm &amp; adventure</strong> — Write or generate CFs on the Realm and Adventure
          tabs, or plant CFs manually in the Library. Attach realm CFs when generating so output
          stays consistent. Prepared scrolls land on the <strong>Prepared scrolls</strong> shelf.
        </li>
        <li>
          <strong>Maps &amp; handouts</strong> — Use the Maps and Items tabs for battle maps and prop
          images, or link existing map CFs. Export PNGs for the Virtual Table or print.
        </li>
        <li>
          <strong>Rules lookup</strong> — Open {THE_LIBRARY} → <strong>Rule tomes</strong> shelf or{" "}
          <strong>Browse rule tomes</strong> for the bundled SRD (spells, monsters, classes, gear).
          Full text opens in the {PREVIEW_WINDOW}. Drag entries into CF markdown or use{" "}
          <code>[[srd:spell:fireball]]</code> reference tokens in editors.
        </li>
        <li>
          <strong>Treasure &amp; stat blocks</strong> — Catalog magic gear on the{" "}
          <Link href="/items" className="font-semibold text-[var(--accent)] underline">
            Items
          </Link>{" "}
          page; attach to hero sheets in {THE_TAVERN}. SRD gear appears on the Items shelf as
          read-only reference CFs.
        </li>
        <li>
          Preview anything from {THE_LIBRARY} — selection opens in the {PREVIEW_WINDOW} for copy,
          print, or export before the session.
        </li>
      </StepList>

      <SubHeading>C. At the table</SubHeading>
      <StepList>
        <li>
          Open the{" "}
          <Link href="/table" className="font-semibold text-[var(--accent)] underline">
            Virtual Table
          </Link>{" "}
          with the active campaign selected. Each campaign keeps its own map, tokens, fog, and
          initiative — switching campaigns shelves the other group&apos;s table safely.
        </li>
        <li>
          Load the linked fellowship onto the map (place tokens, roll initiative). Player view
          stays separate at <code>/table/player</code>.
        </li>
        <li>
          Keep the {PREVIEW_WINDOW} or exported PDFs handy for adventure text; the VTT handles
          spatial play, not long-form reading.
        </li>
      </StepList>

      <SubHeading>D. Between sessions</SubHeading>
      <BulletList>
        <li>
          Edit CFs or prepared scrolls in {THE_LIBRARY} — changes update the saved copy and your
          auto-save folder.
        </li>
        <li>
          Update hero sheets in {THE_TAVERN} (loot, HP notes, new spells). Spell picks validate
          against the bundled SRD list; custom spells from your books stay in Notes.
        </li>
        <li>
          Export a library backup periodically (Library → &quot;Where is my data?&quot;) — SRD
          rules are not included because they ship with the app.
        </li>
        <li>
          Link new CFs or results to the campaign on the Campaigns page when they belong to this
          group&apos;s story.
        </li>
      </BulletList>

      <SubHeading>{THE_LIBRARY} shelves — what to use when</SubHeading>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-sm text-[var(--text)]/90">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="py-2 pr-3">Shelf</th>
              <th className="py-2">Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-3 font-medium">CFs</td>
              <td className="py-2">Story notes generators draw from — worlds, hooks, handouts</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-3 font-medium">Prepared scrolls</td>
              <td className="py-2">Finished generator output ready to print or run</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-3 font-medium">Heroes</td>
              <td className="py-2">Standalone character sheets</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-3 font-medium">Items</td>
              <td className="py-2">Your gear + included SRD catalogue</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-3 font-medium">Rule tomes</td>
              <td className="py-2">Bundled SRD reference — spells, monsters, rules (read-only)</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-3 font-medium">Fellowships</td>
              <td className="py-2">Parties for the Virtual Table and campaigns</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-medium">Chronicles</td>
              <td className="py-2">Campaign containers — open on Campaigns page to manage links</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SubHeading>Manual-first checklist (no AI required)</SubHeading>
      <BulletList>
        <li>Plant CFs by hand in the Library → add a CF.</li>
        <li>Create heroes in {THE_TAVERN} with the sheet editor and SRD pickers.</li>
        <li>Import party or hero <code>.md</code> files from your own notes.</li>
        <li>Browse Rule tomes and Items shelves for SRD reference — no generation needed.</li>
        <li>Run the Virtual Table with tokens, grid, fog, and dice only.</li>
      </BulletList>

      <SubHeading>Coming soon — without replacing today&apos;s tools</SubHeading>
      <p className="mt-2 leading-relaxed text-[var(--text)]/90">
        These features will <strong>add</strong> to what you already have. Campaign link fields,
        Library shelves, and manual editors stay exactly as they are.
      </p>
      <BulletList>
        <li>
          <strong>Relationship graph</strong> — typed links between NPCs, locations, factions, and
          adventures (e.g. &quot;this quest involves this NPC&quot;), shown beside existing campaign
          membership links.
        </li>
        <li>
          <strong>Dedicated world CFs</strong> — first-class NPC, location, faction, and encounter
          records (today much of this lives as markdown in realm/adventure CFs).
        </li>
        <li>
          <strong>Session log CFs</strong> — per-session events, clues, promises, and loot with
          summaries that suggest follow-ups for the next game.
        </li>
        <li>
          <strong>Graph &amp; timeline views</strong> — new panels in {THE_LIBRARY} for continuity
          and forgotten-thread reminders — not replacements for the shelf browser.
        </li>
      </BulletList>

      <p className="mt-4 text-sm text-[var(--muted)]">
        Pop-up tours for specific paths (one-nighter, long campaign, books you own):{" "}
        <Link href="/?workflow=full-campaign" className="font-semibold text-[var(--accent)] underline">
          Full campaign workflow
        </Link>
        {" · "}
        <Link href="/" className="font-semibold text-[var(--accent)] underline">
          All workflow guides
        </Link>{" "}
        in the workshop sidebar.
      </p>
    </div>
  );
}
