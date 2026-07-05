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
    subtitle: "Run tonight with seeds, imports, and the Virtual Table — no API keys required.",
    estimatedTime: "~20 min prep",
    aiLabel: "No AI",
    steps: [
      {
        title: "Fast prep for a single session",
        body:
          "This path uses the Workshop as a control tower without calling Claude or OpenAI. You will anchor the session with a manual seed, bring in characters, optionally sketch a map, then load everything onto the Virtual Table.",
        tip: "Every step has a manual alternative. Skip maps or props if you already have what you need.",
      },
      {
        title: "Write tonight's hook as a seed",
        body:
          "Open the Library tab. Click Add seed, choose Adventure (or Realm for location context), and paste a short brief: location, villain, win condition, and one twist. This becomes reusable prep you can edit anytime.",
        action: { type: "library-category", category: "seeds" },
        actionLabel: "Open Library → Seeds",
      },
      {
        title: "Bring a party",
        body:
          "Click Add party in the Library to type or paste your characters (start from the built-in example — no file needed). Players on D&D Beyond? Use the From D&D Beyond tab to copy from their sheets or upload a .json they saved. You can also load saved character .md files, pick SRD class/species per slot on Characters, or build sheets directly on the Virtual Table.",
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
          "Back in Library, select your seed or party and preview on the right. When ready, load the party to the Virtual Table. Tokens and sheets carry over from your saved roster.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Run the session",
        body:
          "Switch to the Virtual Table zone in the banner. Place tokens, roll dice, and track HP. A player shows up late? Use Load character file (.md) in the Party panel to drop their saved sheet straight onto the table with a token. After the session you can save back to the party library if you linked a campaign roster.",
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
          "Use AI to draft content fast, then curate in the Library before the session. You will anchor tone with a realm or seed, generate an adventure module, a party, and maps, then review everything in one place.",
        tip: "Edit any generation in the Library preview before the table. AI accelerates; you stay in control.",
      },
      {
        title: "Anchor tone with a realm",
        body:
          "Open Realm, pick a scale (region or local works well for one-shots), describe the place, and generate. The result auto-saves as a seed you can reuse on Adventure and Maps tabs.",
        action: { type: "mode", mode: "realm" },
        actionLabel: "Open Realm tab",
      },
      {
        title: "Generate the adventure module",
        body:
          "Open Adventure, choose short session or one-nighter length, and optionally link your realm seed from the dropdown. Generate, then find the saved result under Library → Results.",
        action: { type: "mode", mode: "adventure" },
        actionLabel: "Open Adventure tab",
      },
      {
        title: "Generate a ready party",
        body:
          "Open Characters, set party size and SRD slot picks (or leave Any). Generate, then use Save party for VTT in the preview panel. The roster appears in Library → Parties, and each PC also becomes their own portable .md character sheet — download one from the Parties page or grab it from your auto-save folder's characters directory.",
        action: { type: "mode", mode: "characters" },
        actionLabel: "Open Characters tab",
      },
      {
        title: "Add locale and battle maps",
        body:
          "Open Maps, reference your adventure or seed in the dropdown, and generate locale and/or battle images. Saved maps land in Library → Results alongside your text.",
        action: { type: "mode", mode: "maps" },
        actionLabel: "Open Maps tab",
      },
      {
        title: "Review in the Library",
        body:
          "Open Library, browse All or filter by Results/Parties/Seeds. Click items to preview on the right — copy, export .md, print, or edit seeds and results before the table.",
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
          "Use one realm seed as your constant bible, then add a new adventure result per session. Maps and props accumulate in the Library; your party saves back from the VTT with HP and gear.",
      },
      {
        title: "Create the realm bible seed",
        body:
          "Generate or manually write a region-scale realm. Save it as a named seed in Library → Seeds. Every future session should reference this for consistent geography and factions.",
        action: { type: "mode", mode: "realm" },
        actionLabel: "Open Realm tab",
      },
      {
        title: "Session 1 adventure",
        body:
          "On Adventure, link your realm seed, pick length, and generate (or paste your own module and save as a seed). Store the output under Library → Results for session notes and exports.",
        action: { type: "mode", mode: "adventure" },
        actionLabel: "Open Adventure tab",
      },
      {
        title: "Establish the party once",
        body:
          "Build or generate the party once, then Save party for VTT. Use the Party library page for campaign notes between sessions — plot threads, downtime, treasure. Each character has their own Download button there too, so a guest PC can carry their .md sheet between arcs, parties, or devices.",
        action: { type: "link", href: "/parties" },
        actionLabel: "Open Party library",
      },
      {
        title: "Build a location kit over time",
        body:
          "Add an overland map once, then battle maps per key location as the arc progresses. Filter Library → Results → Maps to reuse assets instead of regenerating.",
        action: { type: "library-category", category: "results" },
        actionLabel: "Library → Results",
      },
      {
        title: "Between sessions: manual seeds",
        body:
          "Before session 2+, add a short Adventure seed with bullet hooks — no AI required. Edit existing Results in the preview panel if you need to patch last session's module.",
        action: { type: "open-seed-editor" },
        actionLabel: "Add adventure seed",
      },
      {
        title: "Save progress from the VTT",
        body:
          "Link a campaign roster when loading the VTT so Save to party library writes HP, gear, and sheet changes back. With an auto-save folder set, every PC's individual .md sheet in the characters folder stays current too — your arc stays in sync on this device and in your backups.",
        action: { type: "link", href: "/table" },
        actionLabel: "Open Virtual Table",
      },
    ],
  },
  {
    id: "full-campaign",
    title: "Full campaign (control tower)",
    subtitle: "Long-running prep: SRD pickers, private imports, layered seeds, and a weekly session loop.",
    estimatedTime: "Ongoing",
    aiLabel: "AI when stuck",
    steps: [
      {
        title: "Workshop as campaign HQ",
        body:
          "The Library holds two kinds of data: included rules (SRD) that ship with the app, and everything that's yours — imports you bring in and creations made in the app (seeds, generated results, workshop parties), which save once together and are told apart by a Creation tag. Only the SRD is hosted by the app — everything else lives on this device. AI is for bursts; manual curation is the default.",
        tip: "Non-SRD spells and subclasses from books you own go in character Notes — never the included SRD catalogue.",
      },
      {
        title: "Know what's included (SRD)",
        body:
          "Open Library → SRD rules to browse the full English SRD 5.2.1 (SRD_CC_v5.2.1): playing the game, classes, spells, monsters, magic items, and more. These are read-only, ship with the app, and never need backing up. Character pickers use the structured index; custom content stays in Notes or your imports.",
        action: { type: "library-category", category: "srd" },
        actionLabel: "Library → SRD rules",
      },
      {
        title: "Import and own your book content",
        body:
          "Use Add party to type, paste, or load characters — including the From D&D Beyond tab for sheets your players built there (copied by hand or uploaded as a .json they saved; converted in your browser only). Put custom material straight into sheets. Your imports stay on your devices — never on a server. Set the Library's auto-save folder (local or cloud-synced like OneDrive or Drive) so everything is saved automatically as you work.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Library → Parties",
      },
      {
        title: "Layer world seeds by scale",
        body:
          "Maintain separate realm seeds (world, country, region) as you zoom in. Edit seeds in place rather than regenerating whole worlds. Seeds live under Library → Seeds.",
        action: { type: "library-category", category: "seeds" },
        actionLabel: "Library → Seeds",
      },
      {
        title: "Catalogue adventures and assets",
        body:
          "Adventures, maps, and props accumulate under Library → Results. Preview, export, and print from the right panel before each session.",
        action: { type: "library-category", category: "results" },
        actionLabel: "Library → Results",
      },
      {
        title: "Link one party to the campaign",
        body:
          "Keep a single saved party per group with campaign notes on the Party library page. Load with Link campaign on the VTT so save-back updates the same roster.",
        action: { type: "link", href: "/parties" },
        actionLabel: "Open Party library",
      },
      {
        title: "Weekly session loop",
        body:
          "Before game night: edit a seed or preview Results → optional generate → export if needed. After: save party from VTT. Repeat without rebuilding from scratch.",
        action: { type: "mode", mode: "library" },
        actionLabel: "Open Library",
      },
      {
        title: "Auto-save and mind the policy",
        body:
          "Included SRD material is CC BY 4.0 and hosted by the app; everything yours saves once, with creations carrying a Creation tag. With an auto-save folder set, every change writes to your chosen local or cloud folder automatically — the full library backup plus one portable .md sheet per PC in the characters folder. Nothing to remember before or after sessions.",
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
          "Open Library → SRD rules to see the full included SRD 5.2.1 reference under CC BY 4.0. Anything not in that document — subclasses, spells, monsters, and adventures from purchased books — is licensed WotC IP. The app will never add it to the built-in catalogue, and generators won't reproduce it; you enter it yourself as private data.",
        action: { type: "library-category", category: "srd" },
        actionLabel: "Library → SRD rules",
      },
      {
        title: "Character options: use sheet Notes",
        body:
          "Playing a subclass or casting spells that aren't in the SRD? Open the character's sheet and type the features and spell effects you need into Notes, in your own words or as short personal reference notes with book page numbers. SRD spells still come from the built-in picker; book spells live in Notes alongside them.",
        action: { type: "link", href: "/parties" },
        actionLabel: "Open Party library",
      },
      {
        title: "Import a party built with book options",
        body:
          "If your players made characters using purchased books on D&D Beyond, open Add party → From D&D Beyond. You can copy stats from each character sheet into the template, or upload a .json backup you saved on your device — conversion runs in your browser only; we never log into D&D Beyond. The party lands in Library → Parties as your import — stored privately, never merged into the app's rules.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Library → Parties",
      },
      {
        title: "Running a published adventure",
        body:
          "Don't paste chapters of a purchased module. Instead, add an Adventure seed with your own prep summary: scene list, NPC names, page references (\"see p. 74 for the trap\"), and your changes. Your book stays the source at the table; the seed keeps the Workshop and generators grounded in your campaign.",
        action: { type: "open-seed-editor" },
        actionLabel: "Add adventure seed",
      },
      {
        title: "Keep it private, keep it safe",
        body:
          "Everything you typed or imported stays on your devices — the app never uploads it, and the auto-save folder only receives copies (one-way), including each PC's own .md sheet in the characters folder. The one thing to watch: exports and prints you share with others should not contain verbatim book text. Share your original material; keep page references for the rest.",
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
          "In Library, click Add party to type, paste, or load your characters — the From D&D Beyond tab handles sheets your players built there (copy from the sheet or upload a saved .json). Or save characters from an earlier generation. Confirm the roster under Library → Parties before loading to the table.",
        action: { type: "library-category", category: "parties" },
        actionLabel: "Library → Parties",
      },
      {
        title: "Run sessions on the VTT",
        body:
          "Sheets, tokens, grid, dice, and player view live here. Need to add one PC mid-campaign? Load character file (.md) in the Party panel drops a saved sheet onto the table with a token — no need to rebuild the party. Save to party library after sessions to keep HP and gear current; Link campaign for automatic save-back.",
        action: { type: "link", href: "/table" },
        actionLabel: "Open Virtual Table",
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
          "When you need a quick map or prop, use Maps or Props once, then return to the VTT. Add a manual seed after the session if you want notes for next time — no AI required.",
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
