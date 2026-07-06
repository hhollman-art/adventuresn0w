import type { WorkshopLibraryCategory } from "@/lib/workshop/libraryCatalog";

export type TutorialWorkshopMode =
  | "realm"
  | "adventure"
  | "characters"
  | "maps"
  | "props"
  | "library";

export type WorkflowStepAction =
  | { type: "mode"; mode: TutorialWorkshopMode }
  | { type: "library-category"; category: WorkshopLibraryCategory }
  /** Opens the Library's SRD reference browser (a feature, not a category). */
  | { type: "library-srd" }
  | { type: "open-seed-editor" }
  | { type: "link"; href: string };

export type WorkflowStep = {
  title: string;
  body: string;
  tip?: string;
  action?: WorkflowStepAction;
  /** Button label when `action` is set (default: "Go there"). */
  actionLabel?: string;
};

export type WorkflowTutorial = {
  id: string;
  title: string;
  subtitle: string;
  estimatedTime: string;
  aiLabel: string;
  steps: WorkflowStep[];
};

export const WORKFLOW_TUTORIALS: readonly WorkflowTutorial[] = [
  {
    id: "one-nighter-manual",
    title: "One-nighter (no AI)",
    subtitle: "Run tonight with Creation Files (CFs), imports, and the Virtual Table — no API keys required.",
    estimatedTime: "~20 min prep",
    aiLabel: "No AI",
    steps: [
      {
        title: "Fast prep for a single session",
        body:
          "This path uses the Workshop as a control tower without calling Claude or OpenAI. You will anchor the session with a manual Creation File (CF), bring in heroes (player characters), optionally sketch a map, then load everything onto the Virtual Table.",
        tip: "Every step has a manual alternative. Skip maps or props if you already have what you need.",
      },
      {
        title: "Write tonight's hook as a Creation File (CF)",
        body:
          "Open the Library tab. Click Add Creation File (CF), choose Adventure (or Realm for location context), and paste a short brief: location, villain, win condition, and one twist. This becomes reusable prep you can edit anytime.",
        action: { type: "library-category", category: "seeds" },
        actionLabel: "Open Library → Creation Files (CFs)",
      },
      {
        title: "Bring a party",
        body:
          "Click Add party in the Library to type or paste your heroes (start from the built-in example — no file needed). Players on D&D Beyond? Use the From D&D Beyond tab to copy from their sheets or upload a .json they saved. You can also load saved hero .md files, pick SRD class/species per slot on Heroes, or build sheets directly on the Virtual Table.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Open Library → Parties",
      },
      {
        title: "Optional: one battle map",
        body:
          "If you want a visual arena, open Maps, describe a single encounter space, and generate — or skip this and use a plain grid on the VTT. Maps are optional for a one-nighter.",
        action: { type: "mode", mode: "maps" },
        actionLabel: "Open Maps tab",
      },
      {
        title: "Preview and load to the table",
        body:
          "Back in Library, select your Creation File (CF) or party and preview on the right. When ready, load the party to the Virtual Table. Tokens and sheets carry over from your saved roster.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Run the session",
        body:
          "Switch to the Virtual Table zone in the banner. Place tokens, roll dice, and track HP. A player shows up late? Use Load hero file (.md) in the Party panel to drop their saved sheet straight onto the table with a token. After the session you can save back to the fellowship library if you linked a campaign roster.",
        action: { type: "link", href: "/table" },
        actionLabel: "Open Virtual Table",
      },
    ],
  },
  {
    id: "one-nighter-ai",
    title: "One-nighter (AI-assisted)",
    subtitle: "Original adventure, party, and maps in one prep sitting — edit in Library before you play.",
    estimatedTime: "2–3 hours",
    aiLabel: "AI optional",
    steps: [
      {
        title: "Generate a complete one-shot",
        body:
          "Use AI to draft content fast, then curate in the Library before the session. You will anchor tone with a realm or Creation File (CF), generate an adventure module, a party, and maps, then review everything in one place.",
        tip: "Edit any generation in the Library preview before the table. AI accelerates; you stay in control.",
      },
      {
        title: "Anchor tone with a realm",
        body:
          "Open Realm, pick a scale (region or local works well for one-shots), describe the place, and generate. The result auto-saves as a Creation File (CF) you can reuse on Adventure and Maps tabs.",
        action: { type: "mode", mode: "realm" },
        actionLabel: "Open Realm tab",
      },
      {
        title: "Generate the adventure module",
        body:
          "Open Adventure, choose short session or one-nighter length, and optionally link your realm Creation File (CF) from the dropdown. Generate, then find the saved result under Library → Results.",
        action: { type: "mode", mode: "adventure" },
        actionLabel: "Open Adventure tab",
      },
      {
        title: "Generate a ready party",
        body:
          "Open Heroes, set party size and SRD slot picks (or leave Any). Generate, then use Save party for VTT in the Preview Window. The roster appears in Library → Fellowships, and each hero also becomes their own portable .md sheet — download one from the Heroes & fellowships page or grab it from your auto-save folder's heroes directory.",
        action: { type: "mode", mode: "characters" },
        actionLabel: "Open Heroes tab",
      },
      {
        title: "Add locale and battle maps",
        body:
          "Open Maps, reference your adventure or Creation File (CF) in the dropdown, and generate locale and/or battle images. Saved maps land in Library → Results alongside your text.",
        action: { type: "mode", mode: "maps" },
        actionLabel: "Open Maps tab",
      },
      {
        title: "Review in the Library",
        body:
          "Open Library, browse All or filter by Results/Parties/Creation Files (CFs). Click items to preview on the right — copy, export .md, print, or edit Creation Files (CFs) and results before the table.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Run on the Virtual Table",
        body:
          "Load your saved party from Library or Parties, set map backgrounds from saved images if you like, and share the player view for sheets. You are ready to run.",
        action: { type: "link", href: "/table" },
        actionLabel: "Open Virtual Table",
      },
    ],
  },
  {
    id: "mini-arc",
    title: "Mini-arc (3–5 sessions)",
    subtitle: "One realm bible, escalating sessions, and a linked party that grows across nights.",
    estimatedTime: "Per-session prep",
    aiLabel: "Mixed",
    steps: [
      {
        title: "Plan a short arc",
        body:
          "Use one realm Creation File (CF) as your constant bible, then add a new adventure result per session. Maps and props accumulate in the Library; your party saves back from the VTT with HP and gear.",
      },
      {
        title: "Make it a campaign",
        body:
          "On the Campaigns page, click New campaign and name it after this group or arc. While it's open, everything you create links to it automatically, the Library can show just its content, and the campaign keeps its own Virtual Table — so running a second group never disturbs this one's table.",
        action: { type: "link", href: "/campaigns" },
        actionLabel: "Open Campaigns",
      },
      {
        title: "Create the realm bible Creation File (CF)",
        body:
          "Generate or manually write a region-scale realm. Save it as a named Creation File (CF) in Library → Creation Files (CFs). Every future session should reference this for consistent geography and factions.",
        action: { type: "mode", mode: "realm" },
        actionLabel: "Open Realm tab",
      },
      {
        title: "Session 1 adventure",
        body:
          "On Adventure, link your realm Creation File (CF), pick length, and generate (or paste your own module and save as a Creation File (CF)). Store the output under Library → Results for session notes and exports.",
        action: { type: "mode", mode: "adventure" },
        actionLabel: "Open Adventure tab",
      },
      {
        title: "Establish the party once",
        body:
          "Build or generate the fellowship once, then Save party for VTT. Use the Heroes & fellowships page for campaign notes between sessions — plot threads, downtime, treasure. Each hero has their own Download button there too, so a guest hero can carry their .md sheet between arcs, fellowships, or devices.",
        action: { type: "link", href: "/tavern" },
        actionLabel: "Open The Tavern",
      },
      {
        title: "Build a location kit over time",
        body:
          "Add an overland map once, then battle maps per key location as the arc progresses. Filter Library → Results → Maps to reuse assets instead of regenerating.",
        action: { type: "library-category", category: "results" },
        actionLabel: "Library → Results",
      },
      {
        title: "Between sessions: manual Creation Files (CFs)",
        body:
          "Before session 2+, add a short Adventure Creation File (CF) with bullet hooks — no AI required. Edit existing Results in the Preview Window if you need to patch last session's module.",
        action: { type: "open-seed-editor" },
        actionLabel: "Add adventure Creation File (CF)",
      },
      {
        title: "Save progress from the VTT",
        body:
          "Link a campaign roster when loading the VTT so Save to party library writes HP, gear, and sheet changes back. With an auto-save folder set, every hero's individual .md sheet in the heroes folder stays current too — your arc stays in sync on this device and in your backups.",
        action: { type: "link", href: "/table" },
        actionLabel: "Open Virtual Table",
      },
    ],
  },
  {
    id: "full-campaign",
    title: "Full campaign (control tower)",
    subtitle: "Long-running prep: SRD pickers, private imports, layered Creation Files (CFs), and a weekly session loop.",
    estimatedTime: "Ongoing",
    aiLabel: "AI when stuck",
    steps: [
      {
        title: "Workshop as campaign HQ",
        body:
          "The Library holds two kinds of data: included rules (SRD) that ship with the app, and everything that's yours — imports you bring in and creations made in the app (Creation Files (CFs), generated results, workshop parties), which save once together and are told apart by a Creation tag. Only the SRD is hosted by the app — everything else lives on this device. AI is for bursts; manual curation is the default.",
        tip: "Non-SRD spells and subclasses from books you own go in hero Notes — never the included SRD catalogue.",
      },
      {
        title: "Know what's included (SRD)",
        body:
          "In the Library, click Browse SRD rules to open the full English SRD 5.2.1 (SRD_CC_v5.2.1): playing the game, classes, spells, monsters, magic items, and more. These are read-only, ship with the app, and never need backing up. Hero pickers use the structured index; custom content stays in Notes or your imports.",
        action: { type: "library-srd" },
        actionLabel: "Library → Browse SRD rules",
      },
      {
        title: "Import and own your book content",
        body:
          "Use Add party to type, paste, or load heroes — including the From D&D Beyond tab for sheets your players built there (copied by hand or uploaded as a .json they saved; converted in your browser only). Put custom material straight into sheets. Your imports stay on your devices — never on a server. Set the Library's auto-save folder (local or cloud-synced like OneDrive or Drive) so everything is saved automatically as you work.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Library → Parties",
      },
      {
        title: "Layer world Creation Files (CFs) by scale",
        body:
          "Maintain separate realm Creation Files (CFs) (world, country, region) as you zoom in. Edit Creation Files (CFs) in place rather than regenerating whole worlds. They live under Library → Creation Files (CFs).",
        action: { type: "library-category", category: "seeds" },
        actionLabel: "Library → Creation Files (CFs)",
      },
      {
        title: "Catalogue adventures and assets",
        body:
          "Adventures, maps, and props accumulate under Library → Results. Use the Preview Window to read, export, and print before each session.",
        action: { type: "library-category", category: "results" },
        actionLabel: "Library → Results",
      },
      {
        title: "One campaign per group",
        body:
          "Create a campaign on the Campaigns page for each group you run and link its party, Creation Files (CFs), and results. Open a campaign from the title bar and its Virtual Table comes back exactly as that group left it — switching groups shelves one table and restores the other. New creations link to whichever campaign is open.",
        action: { type: "link", href: "/campaigns" },
        actionLabel: "Open Campaigns",
      },
      {
        title: "Link one party to the campaign",
        body:
          "Create heroes on the Heroes & fellowships page, group them into one saved fellowship per group, and keep campaign notes there. Pick it as the campaign's fellowship on the Campaigns page, and load with Link campaign on the VTT so save-back updates the same roster.",
        action: { type: "link", href: "/tavern" },
        actionLabel: "Open The Tavern",
      },
      {
        title: "Weekly session loop",
        body:
          "Before game night: edit a Creation File (CF) or preview Results → optional generate → export if needed. After: save party from VTT. Repeat without rebuilding from scratch.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Auto-save and mind the policy",
        body:
          "Included SRD material is CC BY 4.0 and hosted by the app; everything yours saves once, with creations carrying a Creation tag. With an auto-save folder set, every change writes to your chosen local or cloud folder automatically — the full library backup plus one portable .md sheet per hero in the heroes folder. Nothing to remember before or after sessions.",
        action: { type: "link", href: "/legal" },
        actionLabel: "Licenses & content",
      },
    ],
  },
  {
    id: "owned-books",
    title: "Using books you own",
    subtitle: "Bring licensed Wizards of the Coast content you purchased into your private prep — legally.",
    estimatedTime: "~15 min setup",
    aiLabel: "No AI needed",
    steps: [
      {
        title: "Your books, your table",
        body:
          "Owning a D&D book lets you use its content at your own table — it does not let anyone redistribute the text. D&D Easy is built around that line: the app ships only free SRD rules, and everything you bring in from purchased books stays in your private, local data where only you can see it. This tutorial shows where each kind of book content goes.",
        tip: "This is practical guidance, not legal advice. The golden rule: keep book content in your private library, never in anything you publish or share.",
      },
      {
        title: "Know where the line is",
        body:
          "In the Library, click Browse SRD rules to see the full included SRD 5.2.1 reference under CC BY 4.0. Anything not in that document — subclasses, spells, monsters, and adventures from purchased books — is licensed WotC IP. The app will never add it to the built-in catalogue, and generators won't reproduce it; you enter it yourself as private data.",
        action: { type: "library-srd" },
        actionLabel: "Library → Browse SRD rules",
      },
      {
        title: "Character options: use sheet Notes",
        body:
          "Playing a subclass or casting spells that aren't in the SRD? Open the hero's sheet and type the features and spell effects you need into Notes, in your own words or as short personal reference notes with book page numbers. SRD spells still come from the built-in picker; book spells live in Notes alongside them.",
        action: { type: "link", href: "/tavern" },
        actionLabel: "Open The Tavern",
      },
      {
        title: "Import a party built with book options",
        body:
          "If your players made heroes using purchased books on D&D Beyond, open Add party → From D&D Beyond. You can copy stats from each hero sheet into the template, or upload a .json backup you saved on your device — conversion runs in your browser only; we never log into D&D Beyond. The fellowship lands in Library → Fellowships as your import — stored privately, never merged into the app's rules.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Library → Parties",
      },
      {
        title: "Running a published adventure",
        body:
          "Don't paste chapters of a purchased module. Instead, add an Adventure Creation File (CF) with your own prep summary: scene list, NPC names, page references (\"see p. 74 for the trap\"), and your changes. Your book stays the source at the table; the Creation File (CF) keeps the Workshop and generators grounded in your campaign.",
        action: { type: "open-seed-editor" },
        actionLabel: "Add adventure Creation File (CF)",
      },
      {
        title: "Keep it private, keep it safe",
        body:
          "Everything you typed or imported stays on your devices — the app never uploads it, and the auto-save folder only receives copies (one-way), including each hero's own .md sheet in the heroes folder. The one thing to watch: exports and prints you share with others should not contain verbatim book text. Share your original material; keep page references for the rest.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Read the content policy",
        body:
          "The legal page spells out the two tiers: included SRD rules (CC BY 4.0, hosted by the app) and everything yours — imports and creations, saved once together and private. D&D Easy does not sell or unlock paywalled WotC content — owning the book is what licenses your personal use.",
        action: { type: "link", href: "/legal" },
        actionLabel: "Licenses & content",
      },
    ],
  },
  {
    id: "vtt-first",
    title: "VTT-first campaign",
    subtitle: "Minimal Workshop — import rosters, run sessions, browse Library only when needed.",
    estimatedTime: "Minimal prep",
    aiLabel: "Rare AI",
    steps: [
      {
        title: "The table is home base",
        body:
          "If you already have adventures and books, the Virtual Table is your daily tool. The Workshop handles imports, occasional map props, and browsing saved assets — not constant generation.",
      },
      {
        title: "Session 0: import the party",
        body:
          "In Library, click Add party to type, paste, or load your heroes — the From D&D Beyond tab handles sheets your players built there (copy from the sheet or upload a saved .json). Or save heroes from an earlier generation. Confirm the roster under Library → Fellowships before loading to the table.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Library → Parties",
      },
      {
        title: "Run sessions on the VTT",
        body:
          "Sheets, tokens, grid, dice, and player view live here. Need to add one hero mid-campaign? Load hero file (.md) in the Party panel drops a saved sheet onto the table with a token — no need to rebuild the fellowship. Save to party library after sessions to keep HP and gear current; Link campaign for automatic save-back.",
        action: { type: "link", href: "/table" },
        actionLabel: "Open Virtual Table",
      },
      {
        title: "Running more than one group?",
        body:
          "Create a campaign per group on the Campaigns page. Each campaign keeps its own Virtual Table — open one from the title-bar switcher and the map, tokens, fog, and initiative come back exactly as that group left them, mid-fight included.",
        action: { type: "link", href: "/campaigns" },
        actionLabel: "Open Campaigns",
      },
      {
        title: "Browse before you rebuild",
        body:
          "Before making anything new, check Library → Results for maps and modules you already saved. Reuse beats regenerate.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Generate only when stuck",
        body:
          "When you need a quick map or handout, use Maps or Items once, then return to the VTT. Add a manual Creation File (CF) after the session if you want notes for next time — no AI required.",
        action: { type: "mode", mode: "maps" },
        actionLabel: "Open Maps tab",
      },
    ],
  },
] as const;

export type WorkflowTutorialId = (typeof WORKFLOW_TUTORIALS)[number]["id"];

const BY_ID = new Map(WORKFLOW_TUTORIALS.map((w) => [w.id, w]));

export function findWorkflowTutorial(id: string): WorkflowTutorial | undefined {
  return BY_ID.get(id);
}

export function isWorkflowTutorialId(id: string): id is WorkflowTutorialId {
  return BY_ID.has(id);
}
