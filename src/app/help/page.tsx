import type { Metadata } from "next";
import Link from "next/link";
import WorkflowTutorialLauncher from "@/features/help/WorkflowTutorialLauncher";

export const metadata: Metadata = {
  title: "How to use — D&D Easy",
  description:
    "User guide for D&D Easy: generate realms, adventures, characters, props, and maps, then print or export them.",
};

function SectionHeading({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="font-display mt-10 text-xl font-bold text-[var(--accent)]"
    >
      <span aria-hidden="true">&#10022; </span>
      {children}
    </h2>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section
        className="fantasy-panel rounded-xl border p-6 sm:p-10"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          How to use D&amp;D Easy
        </h1>
        <div className="fantasy-divider mt-2" aria-hidden="true">
          <span className="text-sm leading-none">&#10022;</span>
        </div>
        <p className="mt-4 leading-relaxed text-[var(--text)]/90">
          D&amp;D Easy is a toolkit for Dungeon Masters. It uses Claude to write
          table-ready content (realms, adventures, characters) and OpenAI to
          draw images (maps and prop handouts). Everything it produces is
          original and SRD-aware — not official Wizards of the Coast content. See{" "}
          <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
            Licenses &amp; content
          </Link>{" "}
          for SRD attribution and how your imported material is handled.
        </p>

        <SectionHeading>Quick start</SectionHeading>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--text)]/90">
          <li>
            On the <Link href="/" className="font-semibold text-[var(--accent)] underline">home page</Link>,
            pick what you want to create from the six tabs: Realm, Adventure,
            Characters, Props, Maps, or Library.
          </li>
          <li>
            Fill in the options. Almost everything is optional — a one-line
            description is enough to get going.
          </li>
          <li>
            Press the Generate button at the bottom of the form and watch the
            result stream into the Output panel on the right.
          </li>
          <li>
            Use the buttons above the output to copy, download, or print what
            you made.
          </li>
        </ol>

        <SectionHeading id="workflows">Workflow guides</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Step-by-step pop-up tours for common DM prep paths — from a no-AI one-nighter to a
          long-running campaign. Each guide switches Workshop tabs for you and includes manual
          alternatives where AI is optional.
        </p>
        <WorkflowTutorialLauncher />
        <p className="mt-3 text-sm text-[var(--muted)]">
          Or open the{" "}
          <Link href="/" className="font-semibold text-[var(--accent)] underline">
            workshop
          </Link>{" "}
          and click <strong className="text-[var(--text)]">Workflow guides</strong> in the sidebar.
        </p>

        <SectionHeading>Realm</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Builds a setting document at whatever scale you choose — from a whole
          world down to a local cluster of villages. Describe the place you
          imagine, generate, and you get an organized write-up with geography,
          peoples, politics, trade, story hooks, and a DM cheatsheet. You can
          also have it draw a matching realm map image.
        </p>
        <p className="mt-2 leading-relaxed text-[var(--text)]/90">
          After generating, the realm is saved automatically as a{" "}
          <strong>D&DEasy seed</strong> — a named summary kept in your browser.
          Seeds appear as a dropdown on the Realm and Adventure tabs, so new
          generations can stay consistent with settings you made earlier.
        </p>

        <SectionHeading>Adventure</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Writes a playable adventure module. Pick a length —{" "}
          <strong>Short</strong> for part of a session or{" "}
          <strong>One-nighter</strong> for a full evening — then optionally set
          tone, level range, party size, a villain, and how combat-heavy it
          should be (the 1–5 slider). Choose a D&DEasy seed to anchor the
          adventure in one of your saved settings. Adventures you generate are
          also saved as D&DEasy seeds automatically. The app can also
          automatically generate battle maps and prop handouts for key scenes
          it finds in the finished adventure.
        </p>

        <SectionHeading>Characters</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Creates a ready-to-play party of pre-made characters with stats,
          gear, and hooks, using SRD-open options only. Tell it how many
          characters you need and any preferences, and hand the results to
          your players.
        </p>

        <SectionHeading>Props</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Generates handout images of objects: letters and scrolls, potions,
          weapons, armor, tools, chests, jewelry, food, relics, and more. Pick
          an item type, describe the object, and optionally set its look,
          materials, age, and wear. Great for dropping on the table when the
          party finds something.
        </p>

        <SectionHeading>Maps</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Draws two kinds of maps: <strong>locale / overland</strong> maps
          (full-color, atlas-style with cities, routes, and clear water) and{" "}
          <strong>battle maps</strong> (top-down graph-paper style for
          miniatures). Generate either or both. You can set image size
          (landscape, portrait, or square), detail quality, and whether
          distances read in imperial or metric units. Finished images download
          as PNG — ready for virtual tabletops or printing.
        </p>

        <SectionHeading>Library</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          The Library tab is your repository. It holds two kinds of data:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-[var(--text)]/90">
          <li>
            <strong>Included rules (SRD)</strong> — browse spells, monsters, classes,
            equipment, and rules via the D&amp;D 5e SRD API (2014 SRD, CC BY 4.0).
            Character pickers use a bundled spell/class index. This is the only rules
            reference D&amp;D Easy hosts. It is read-only and never needs backing up.
          </li>
          <li>
            <strong>Yours</strong> — everything you import or make, saved once and
            managed the same way: party notes from books you own (typed or uploaded,
            including a D&amp;D Beyond character JSON you saved yourself), seeds you
            write, and results the generators produce. Things made in the app carry
            a <strong>Creation</strong> tag so you can tell them apart from imported
            files. Stored in <em>this browser on this device only</em>, never
            uploaded to a server.
          </li>
        </ul>
        <p className="mt-2 leading-relaxed text-[var(--text)]/90">
          Your imports and creations should never live only in the browser.
          Set an <strong>auto-save folder</strong> in the Library (one click):
          point it at a local directory or a cloud-synced folder like OneDrive,
          Google Drive, or Dropbox, and every change is written there
          automatically — no manual exporting. Alongside the main backup file,
          each party member is also written as their own portable{" "}
          <code>.md</code> character sheet in a <code>characters</code> folder
          — grab any one of those files to bring a single PC into an
          adventure, another party, or a Virtual Table session on any device. Saving is strictly one-way: the
          app writes to your folder but never reads from it on its own. To
          bring data into the app (for example on a new device), use{" "}
          <strong>Restore backup</strong> under &quot;Where is my data?&quot;
          and pick the file yourself. Browsers without folder access (Firefox,
          Safari) can use <strong>Export backup</strong> the same way. Open any
          entry to preview it in the Output panel, copy its Markdown, or
          download files.
        </p>

        <SectionHeading>Campaigns — running more than one group</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          If you run several groups, create one <strong>campaign</strong> per group on the
          Campaigns page. A campaign links that group&apos;s party plus the seeds and results
          that belong to its story (links are references — the same realm seed can serve two
          campaigns), and it keeps <strong>its own Virtual Table</strong>. Open a campaign
          from the title-bar switcher and the map, tokens, fog, and initiative come back
          exactly as that group left them; the other group&apos;s table is shelved safely.
          While a campaign is open, the Library can show just its content, and anything new
          you create links to it automatically. Deleting a campaign only removes the
          container — the party, seeds, and results stay in your library.
        </p>

        <SectionHeading>Characters &amp; parties — your people in one place</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          The <strong>Characters</strong> page is where player characters live. Create a
          sheet with the built-in editor (SRD species, classes, and spells are one click;
          options from your own books go in Notes), import a portable <code>.md</code>{" "}
          character file, or copy members out of a saved party. Sort and search your
          characters, edit them any time, and download any one as its own{" "}
          <code>.md</code> file. When a group forms, select characters and click{" "}
          <strong>Create party</strong> — or add them to an existing party. Parties are the
          unit the rest of the app uses: link one to a campaign, keep campaign notes on it,
          and load it onto the Virtual Table. Deleting a character never touches parties
          it already joined (they keep their own copy), and deleting a party never deletes
          your characters.
        </p>

        <SectionHeading>Saving, printing, and making booklets</SectionHeading>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--text)]/90">
          <li>
            <strong>Copy Markdown</strong> — copies the raw text; paste it into
            Obsidian, Notion, Google Docs, or Word.
          </li>
          <li>
            <strong>Download .md / .html</strong> — saves the document as a
            file. The HTML version is styled and ready to open in any browser.
          </li>
          <li>
            <strong>Print</strong> — opens your browser&apos;s print dialog
            with text and images formatted together. Choose{" "}
            <em>Save as PDF</em> as the destination to make a PDF.
          </li>
          <li>
            Adventures and realms render as a cover page plus one
            chapter-sheet per section. Print each to PDF and merge the PDFs in
            your viewer to bind realm + adventure into a single booklet.
          </li>
        </ul>

        <SectionHeading>Content &amp; your purchased books</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          Built-in generators use <strong>SRD-open</strong> rules only. If you own other D&amp;D
          books, you can type character notes from your D&amp;D Beyond sheet, upload a character{" "}
          <code>.json</code> you saved yourself, or paste a party file — that material stays on{" "}
          <em>this device</em> in your browser, not in a shared library other users can browse. We
          do not connect to D&amp;D Beyond or sell paywalled Wizards of the Coast content.
        </p>
        <p className="mt-2 leading-relaxed text-[var(--text)]/90">
          For a step-by-step walkthrough of bringing purchased book content in
          legally — character options, imported parties, and published
          adventures — take the{" "}
          <Link
            href="/?workflow=owned-books"
            className="font-semibold text-[var(--accent)] underline"
          >
            Using books you own
          </Link>{" "}
          tutorial. Full attribution and policy details:{" "}
          <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
            Licenses &amp; content
          </Link>
          .
        </p>

        <SectionHeading>Tips &amp; troubleshooting</SectionHeading>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--text)]/90">
          <li>
            Generation takes a little while — text streams in live, and images
            can take up to a minute. The progress checklist in the Output
            panel shows what is happening.
          </li>
          <li>
            Not happy with a result? Adjust your description and generate
            again. More specific descriptions give more specific results.
          </li>
          <li>
            An error mentioning a <em>missing API key</em> means the server
            hosting the app has not been configured with its Anthropic /
            OpenAI keys — that is a setup issue for whoever runs the app, not
            something players can fix.
          </li>
          <li>
            If an image fails to generate, try again — occasional hiccups from
            the image service are normal and the app retries automatically.
          </li>
        </ul>

        <div className="fantasy-divider mt-10" aria-hidden="true">
          <span className="text-sm leading-none">&#10022;</span>
        </div>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Back to the workshop
          </Link>
        </p>
      </section>
    </main>
  );
}
