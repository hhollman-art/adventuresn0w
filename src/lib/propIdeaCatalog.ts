import type { PropType } from "@/lib/propImagePrompt";

export type PropIdea = {
  title: string;
  bodyText: string;
  propType: PropType;
  style: string;
  ageWear: string;
  settingHint: string;
  extraNotes?: string;
};

export type PropIdeaCategory = {
  id: string;
  label: string;
  description: string;
  ideas: PropIdea[];
};

/**
 * Browsing lists for the standalone Props mode. Each idea is a full starter you can
 * apply and edit before generating.
 */
export const PROP_IDEA_CATEGORIES: PropIdeaCategory[] = [
  {
    id: "weapons_armor",
    label: "Weapons & armor",
    description: "Armories, quartermaster tags, and martial gear.",
    ideas: [
      {
        title: "Quartermaster receipt — maul",
        bodyText: [
          "RECEIPT — issued to: 2nd company",
          "Item: steel maul, ash haft, leather grip",
          "Condition on issue: good / haft oiled / head true",
          "Return by muster or pay double replacement in crown weight.",
        ].join("\n"),
        propType: "letter",
        style: "faded military ink, stamped with a unit mark",
        ageWear: "creased, fold lines, a ring stain from a cup",
        settingHint: "standing army, stone barracks, winter campaign",
        extraNotes: "Legible table numbers; no modern fonts.",
      },
      {
        title: "Rack label — “blunted only”",
        bodyText: [
          "TRAINING RACK",
          "Blunted weapons only. Live steel locked with the sergeant.",
          "If you need an edge, you bring a chit signed in red.",
        ].join("\n"),
        propType: "notice",
        style: "chalk and ink on rough board, tacked to wood",
        ageWear: "nail holes, smudged chalk, corner chipped",
        settingHint: "garrison training yard, muddy boots",
        extraNotes: "Keep type plain and in-world.",
      },
      {
        title: "Smith’s tag — failed temper",
        bodyText: [
          "Work order #18 — breastplate, riveted bands",
          "NOTE: re-temper required — spider crack at left shoulder. Not safe to wear.",
          "Hold at forge; customer to be notified at the Copper Jug.",
        ].join("\n"),
        propType: "scroll",
        style: "narrow strip of parchment tied with twine to a small nail tag",
        ageWear: "oiled fingerprint smudges, soot dust",
        settingHint: "city forge, coals, bell-street district",
      },
      {
        title: "Rune warding — “iron sleeps”",
        bodyText: [
          "INSCRIPTION (carved, shallow, then repainted in silver limewash):",
          "“Iron sleeps until the last bell. Wake it only under oath of three.”",
          "Small chisel tick marks in the margin count days — seven filled, two empty.",
        ].join("\n"),
        propType: "rune_tablet",
        style: "weathered dark stone, shallow carved strokes; paint in worn grooves",
        ageWear: "chipped corner, green-gray lichen in recesses",
        settingHint: "temple steps or vault threshold",
        extraNotes: "In-world runes/letters only; not decorative gibberish blocks.",
      },
    ],
  },
  {
    id: "kitchen_tavern",
    label: "Kitchen & tavern",
    description: "Menus, tab slips, and back-room notes.",
    ideas: [
      {
        title: "Chalkboard — today’s cauldron",
        bodyText: [
          "TODAY",
          "Salt-apple stew 4 cp",
          "Black bread 2 cp",
          "Small beer refills while the cask lasts",
          "PAY THE BAR before you start another round.",
        ].join("\n"),
        propType: "notice",
        style: "chalk on darkened board, a few smudged erasures",
        ageWear: "chalk dust in the frame groove, a beer ring in one corner",
        settingHint: "coastal common room, low beams, oil lamps",
        extraNotes: "Read as a tavern board, not a restaurant menu layout.",
      },
      {
        title: "Hand tally — larder count",
        bodyText: [
          "Larder count — 8th of the wet moon",
          "Barrels: 3 salt, 1 vinegar, 2 small beer (LOW)",
          "Sacks: flour (good), oats (mice — move sack #2 to top shelf)",
          "Cheese: hard wheel, soft wheel (cut half yesterday)",
        ].join("\n"),
        propType: "journal",
        style: "pencil and ink in a small ruled ledger page",
        ageWear: "grease smear, flour fingerprints on margin",
        settingHint: "back-kitchen, stone floor, root cellar access",
      },
      {
        title: "Scroll — “no meat after the third bell”",
        bodyText: [
          "KITCHEN RULE (posted by order of the house):",
          "No raw meat on the main prep table after the third evening bell. Board must be scoured with lime.",
          "If you do not like the rule, you may sleep in the rain.",
        ].join("\n"),
        propType: "scroll",
        style: "sealed with cheap wax, pinned above the prep table",
        ageWear: "spatter stains, a torn lower edge",
        settingHint: "riverside inn, frequent barges, damp stone",
      },
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse & trade",
    description: "Crates, manifests, dock chits, and storage marks.",
    ideas: [
      {
        title: "Crate end — stenciled",
        bodyText: [
          "Crate mark (stencil, large, slightly uneven):",
          "GRAIN — 12 BUSH — KEEP DRY",
          "From: Saltmarch Co-op",
          "Consign: East Gate warehouse row C",
        ].join("\n"),
        propType: "letter",
        style: "stencil paint on rough pine boards, a few over-spray blots",
        ageWear: "chipped paint, scuffed corner, old strap marks",
        settingHint: "docks, river trade, fog mornings",
        extraNotes: "Stencil look; avoid modern barcode language.",
      },
      {
        title: "Count sheet — barge unload",
        bodyText: [
          "Unload tally — barge 7, rope crew morning shift",
          "Expected: 40 sacks flour, 8 crates nails, 2 casks oil",
          "Short: 1 sack (marked wet — quarantine pile)",
          "Sign: R / foreman: K under rope badge",
        ].join("\n"),
        propType: "journal",
        style: "carbon/ink on thin paper, clipped to a board impression",
        ageWear: "torn top edge, mud thumbprint, fold creases",
        settingHint: "wharf, counting shed, gulls, rope smell",
      },
      {
        title: "Map fragment — storehouse rows",
        bodyText: [
          "WHS floor sketch (not to scale) — for runners only",
          "Row C = grain, Row D = oils (NO TORCH), Row F = quarantine (rope off)",
          "Stairs to catwalk: north; privy: east; DO NOT block the well door.",
        ].join("\n"),
        propType: "map_handout",
        style: "pencil, ruled lines, small arrows; coffee stain at corner",
        ageWear: "torn from a notebook, punch holes, rubbed pencil",
        settingHint: "busy mercantile city, fire-conscious clerks",
        extraNotes: "Hand-drawn plan feel; not a city poster.",
      },
    ],
  },
  {
    id: "alchemy",
    label: "Alchemy & healer",
    description: "Formulas, vial labels, and cautions.",
    ideas: [
      {
        title: "Bottle label — tincture",
        bodyText: [
          "Tincture: wound wash (bitter) — 3 drops in water, no more / no less",
          "Do not mix with nightshade preparations.",
          "Batch sealed on wax seal color: green ring = safe storage cold.",
        ].join("\n"),
        propType: "letter",
        style: "small printed/woodblock look on a narrow paper strip glued to glass",
        ageWear: "faded script, a crack in the paper strip",
        settingHint: "apothecary behind a market square",
      },
      {
        title: "Caution notice — “open east window”",
        bodyText: [
          "LAYER FUMES: when heating resin of ashthorn, open the east window and bank the brazier low.",
          "If the room goes sweet-smelling, stop. Sweet means wrong. Leave and bar the door. Send for a senior alchemist.",
        ].join("\n"),
        propType: "notice",
        style: "inked broadside, pinned with four nails, corners curling",
        ageWear: "fume-yellowed paper, ink bleed at edges",
        settingHint: "cliffside workshop, seaglass bottles",
      },
      {
        title: "Rune — “sealed vessel”",
        bodyText: [
          "CIRCLE and THREE MARKS (carved, shallow): a seal meaning “vessel closed — heat risk.”",
          "Margin scratch note: “Do not pry. Ask.”",
        ].join("\n"),
        propType: "rune_tablet",
        style: "small tablet tied to a crate / lid with wire",
        ageWear: "chips, soot specks in the grooves",
        settingHint: "adventuring supply yard or guild vault",
      },
    ],
  },
  {
    id: "temple_library",
    label: "Temple & library",
    description: "Sermon scraps, call slips, and archive warnings.",
    ideas: [
      {
        title: "Reading-room slip",
        bodyText: [
          "CALL SLIP — reading room, west aisle, shelf 4",
          "Requested: Chronicle of the Third Silt, volume II",
          "Return by second bell. Quill in chain only at desk 2.",
        ].join("\n"),
        propType: "letter",
        style: "small formal card, red wax seal, ribbon hole",
        ageWear: "thumb-smudged edge, a faint oil spot",
        settingHint: "university or cathedral archive, beeswax smell",
      },
      {
        title: "Hymn line — “hold the door”",
        bodyText: [
          "Hymn fragment (two verses only, for procession practice):",
          "“When salt meets iron at the step, the ward remembers teeth.”",
          "“Hold the door until the third voice — then let the choir breathe.”",
        ].join("\n"),
        propType: "scroll",
        style: "music and text interleaved, ink on vellum, ruled lines",
        ageWear: "worn fold, a candle wax drop at margin",
        settingHint: "sunken sanctuary, choir gallery above flood line",
      },
    ],
  },
  {
    id: "crime_law",
    label: "Crime, law, guilds",
    description: "Warrants, by-laws, and rough warnings.",
    ideas: [
      {
        title: "Posted fine schedule",
        bodyText: [
          "CITY WATCH — FINES (EAST GATE WARD)",
          "Brawling: 2 sp first offense (night) / 1 sp (day, no broken teeth)",
          "Carrying a naked blade: 5 sp or a day in the lockbox",
          "False call for the watch: 1 gp or community labor",
        ].join("\n"),
        propType: "notice",
        style: "ink on rough broadsheet, tacked to a public board",
        ageWear: "tears, rain blurring, one replaced corner",
        settingHint: "crowded gate ward, market noise",
      },
      {
        title: "Thieves’ guild token note",
        bodyText: [
          "Not for strangers: if the wax is blue, the roof is open. If the wax is red, walk away and forget you saw a door.",
          "Owe nothing on the first favor. Owe a story on the second. Owe a life on the third — so do not take the third.",
        ].join("\n"),
        propType: "letter",
        style: "tiny folded paper, wax signet (abstract symbol, not a real trademark)",
        ageWear: "worn fold, a torn corner",
        settingHint: "gritty port city, fog, bell towers",
        extraNotes: "Fictional crime lore only; not instructional for real activity.",
      },
    ],
  },
  {
    id: "nature_travel",
    label: "Nature & travel",
    description: "Trail notes, fords, and weathered directions.",
    ideas: [
      {
        title: "Trail head — “ford closed”",
        bodyText: [
          "FORD — CLOSED TILL MELT",
          "Wagon teams: use the high switchback. Expect mud at marker stone (white paint fading).",
          "If the river speaks loud at night, do not test the ford even if it looks calm.",
        ].join("\n"),
        propType: "notice",
        style: "carved and painted with river guild colors; weather-beaten",
        ageWear: "split wood grain, lichen, nail rust",
        settingHint: "frontier track, pines, spring thaw",
      },
      {
        title: "Traveler’s scrawl",
        bodyText: [
          "Met the shepherd at the crook oak — 2 days south of the pass.",
          "Wolves thick after snow. Do not run from the ridge at dusk. Camp low.",
          "Cairn 7 is wrong — cairn 8 is the true turn west.",
        ].join("\n"),
        propType: "journal",
        style: "pencil and ink, rushed handwriting",
        ageWear: "smudged rain drops, a boot stamp on margin",
        settingHint: "high road, shepherds, cold wind",
      },
    ],
  },
  {
    id: "dungeon",
    label: "Dungeon & ruin",
    description: "Warnings scratched where adventurers look.",
    ideas: [
      {
        title: "Depth marker",
        bodyText: [
          "SCRATCH PLATE (riveted) — 40 ft. below street grid",
          "Next ladder: 60 ft, east (water drip louder now)",
          "If the mold glows, back up. If the air tastes sweet, mask up. If the bell rings, do not follow it.",
        ].join("\n"),
        propType: "notice",
        style: "metal plate, stamped letters, rivets, a little rust bleeding",
        ageWear: "damp corrosion at edges, oily finger marks",
        settingHint: "sewer, old cistern, undercity maintenance",
        extraNotes: "Safety phrasing in-world, not a real workplace sign.",
      },
      {
        title: "Map scrap — “don’t”",
        bodyText: [
          "Rough sketch: stairs down, a fork, a left turn at the tilted arch.",
          "Big X over a small side passage with one word: DON’T (underlined three times, shaky).",
        ].join("\n"),
        propType: "map_handout",
        style: "pencil, urgent, dirty thumbprints",
        ageWear: "torn, folded many times, ring stain",
        settingHint: "ruins, chalk dust, crumbling basalt",
      },
    ],
  },
  {
    id: "noble_court",
    label: "Noble & court",
    description: "Invitations, petitions, and palace scraps.",
    ideas: [
      {
        title: "Summons — “third hour, east gallery”",
        bodyText: [
          "The Lady’s household requests your attendance",
          "Third hour, east gallery, before the small council.",
          "Bring no more than one blade; leave cloaks with the ushers.",
        ].join("\n"),
        propType: "letter",
        style: "cream laid paper, fine ink, wax seal in corner",
        ageWear: "faint ring from a goblet, one fold crack",
        settingHint: "baronial keep, heralds, laced gloves",
      },
      {
        title: "Petition docket line",
        bodyText: [
          "COURT OF PETITIONS — morning list",
          "Your matter: “bridge toll dispute, Millbrook”. Number 14.",
          "Do not leave the antechamber until called; the clerk will stamp your palm.",
        ].join("\n"),
        propType: "scroll",
        style: "narrow official strip, ink, numbered margin",
        ageWear: "ink smear where a thumb rested, crumpled",
        settingHint: "palace outbuilding, scribes, rain against shutters",
      },
      {
        title: "Notice — “no retainers in the rose court”",
        bodyText: [
          "By order of the castellan: no more than two retainers in the rose court during audiences.",
          "Coats of arms to be read by the sergeant-at-arms. Duels of honor must be registered before noon.",
        ].join("\n"),
        propType: "notice",
        style: "broadside on deckled paper, tacked to a post stand",
        ageWear: "nail head rust, a tear repaired with paste",
        settingHint: "walled palace, gravel paths, peacocks",
      },
    ],
  },
  {
    id: "naval_coast",
    label: "Naval & coast",
    description: "Ships, customs, and tide-touched paper.",
    ideas: [
      {
        title: "Harbor chit — berthing",
        bodyText: [
          "BERTHING CHIT — pier 3, eastern slip",
          "Vessel: two-masted cog (name rubbed)",
          "Fees paid through next full moon. No open flame on the pier after bell.",
        ].join("\n"),
        propType: "letter",
        style: "salt-stiff paper, smeared stamp, string hole",
        ageWear: "dried salt rim, a corner torn",
        settingHint: "busy harbor, gulls, tar and rope",
      },
      {
        title: "Tide scrawl — “bar exposed”",
        bodyText: [
          "FERRY NOTE — for crew eyes only",
          "Low water exposes the old bar. Do not cut the line until the cairn on Sallow Point lines with the steeple.",
          "If fog drops before slack, hold at the little buoy — do not guess.",
        ].join("\n"),
        propType: "map_handout",
        style: "pencil and ink, damp-smudged margin, on thin pasteboard",
        ageWear: "soft corners, a rust fleck from a nail",
        settingHint: "muddy estuary, ferry rope, estuary light",
      },
      {
        title: "Wharf tally — offloaded",
        bodyText: [
          "TALLY — sloop “Grey Fin”",
          "Offload: 12 crates (marked fish), 2 casks (marked oil — NO TORCH nearness)",
          "Short one crate — reported to the harbormaster, chalk X on the manifest.",
        ].join("\n"),
        propType: "journal",
        style: "carbon copy sheet, smudged with coal dust, clipped corner",
        ageWear: "oily black thumbprint, fold lines",
        settingHint: "docks at night, lamplight, creaking lines",
      },
    ],
  },
  {
    id: "market_fair",
    label: "Market & festival",
    description: "Stalls, permits, and fair-day noise.",
    ideas: [
      {
        title: "Booth chit — market day",
        bodyText: [
          "CITY MARKET — booth permit",
          "Row: copper lane, stall 7 (spice) — one day, rain or sun",
          "Fire bucket required behind the brazier. The inspector signs in red on both copies.",
        ].join("\n"),
        propType: "letter",
        style: "cheap paper, two-part receipt with torn edge",
        ageWear: "spice dust in the crease, a boot print",
        settingHint: "crowded square, colored awnings, buskers",
      },
      {
        title: "Fair handbill — joust (fragment)",
        bodyText: [
          "GRAND MIDSUMMER FAYRE",
          "Lists open after the third bell. Blue ribbon — east gate, red — west.",
          "No wagers with the man in the crow mask. That is a rule, not a joke.",
        ].join("\n"),
        propType: "notice",
        style: "woodblock-style ink, a little splatter, tacked to a board",
        ageWear: "rain-run ink on one line, a corner dog-eared",
        settingHint: "tournament field, pennants, dust and hoofprints",
      },
      {
        title: "Rotating ring map — maypole & cider",
        bodyText: [
          "VILLAGE GREEN — (rough sketch) maypole in center, cider tent east, mummers’ ring west.",
          "Path from the old oak is muddy — stiles at the fence if you are sober enough to use them.",
        ].join("\n"),
        propType: "map_handout",
        style: "childlike pencil with adult corrections in ink",
        ageWear: "grass smear, a sticky thumb edge",
        settingHint: "village summer fair, late afternoon, fiddles",
      },
    ],
  },
  {
    id: "farm_village",
    label: "Farm & village",
    description: "Tithes, wells, and parish scraps.",
    ideas: [
      {
        title: "Tithe tally — “grain good, lambs light”",
        bodyText: [
          "TITHE ROLL — parish of Ash Hollow, harvest name-day",
          "Grain: 12 sacks (as sworn) / Lambs: 4 (2 short — noted for spring make-up)",
          "Oats: 1 sack, wet — re-weighed at the reeve’s beam.",
        ].join("\n"),
        propType: "journal",
        style: "ruled paper, reeve’s hand, ink and pencil mix",
        ageWear: "straw bits stuck to tape, a wax drip",
        settingHint: "wattle barn, tithe day, overcast",
      },
      {
        title: "Village well rotation",
        bodyText: [
          "WELL ROSTER — by agreement of the cottars",
          "Morning: north row, then east. If the rope frays, stop and call the wright.",
          "“Sweet” water means stop drawing — that word is the old sign for taint this season.",
        ].join("\n"),
        propType: "notice",
        style: "nailed to the well casing, oiled to resist rain, chalk marks",
        ageWear: "nail greening, a crack across one line of ink",
        settingHint: "village common, stone curb, yoked oxen passing",
      },
      {
        title: "Stray — black ewe, crooked mark",
        bodyText: [
          "LOST STOCK / FOUND STOCK (circle one)",
          "Black ewe, crooked S mark, white sock on the left fore — last seen in the thistle fold.",
          "If found, bring to the moot before slaughter; reward in cider and a thank-you from the elder.",
        ].join("\n"),
        propType: "letter",
        style: "rough hand on cheap rag paper, a smudged thumbprint of mud",
        ageWear: "smeared on one line, a hole from a thorn",
        settingHint: "upland pasture, stone walls, mist mornings",
      },
    ],
  },
  {
    id: "military_camp",
    label: "Military camp & march",
    description: "Watches, fires, and the road behind the line.",
    ideas: [
      {
        title: "Password slip — “iron river”",
        bodyText: [
          "TODAY — watchword for pickets: IRON / counter: RIVER (say the river first to strangers)",
          "If challenged twice with no answer, use the whistle, not a shout. Shouts mean arrows.",
        ].join("\n"),
        propType: "letter",
        style: "tiny slip, block letters, charred edge from camp smoke",
        ageWear: "sweat smear, a boot tread corner",
        settingHint: "picket line, trampled grass, low fires",
        extraNotes: "Fictional camp security flavor only; not real passcode guidance.",
      },
      {
        title: "Water rotation — 2nd company",
        bodyText: [
          "FILL ORDER — 2nd company, evening",
          "Barrels to the brook in pairs. One guard with eyes upstream for riders.",
          "If the water tastes of iron, do not fill — report. That has happened twice this march.",
        ].join("\n"),
        propType: "notice",
        style: "ink on canvas scrap glued to a strip board",
        ageWear: "damp-warped, mud flecks",
        settingHint: "marching column, muddied boots, rainfly tents",
      },
      {
        title: "Cooks’ mark — who gets the first kettle",
        bodyText: [
          "CAMP KITCHEN — not a real fight, a ritual",
          "First kettle: scouts (they return empty-handed again, they lose the bet next time).",
          "Hard bread day if the supply wagon is late. Check your teeth; we are not a hospital.",
        ].join("\n"),
        propType: "scroll",
        style: "greasy thumbprints, tied with twine, wax blob informal",
        ageWear: "sauce stain, a burn hole near the top",
        settingHint: "siege camp, smoke, iron pots",
      },
    ],
  },
  {
    id: "academy_arcane",
    label: "Academy & arcane",
    description: "Exams, vault rules, and careful margins.",
    ideas: [
      {
        title: "Exam chit — practical hall",
        bodyText: [
          "PRACTICAL EXAM — Hall of Lesser Bindings, booth 2",
          "Time: one sand. Materials: as issued. If your flame goes green, stop and call an instructor.",
          "If your flame goes white, you already stopped reading this too late. (Joke. Mostly.)",
        ].join("\n"),
        propType: "letter",
        style: "embossed school crest, light ink, formal narrow columns",
        ageWear: "nervous thumb smudge, a tiny ink drop",
        settingHint: "magical college, oiled wood, chalk circle smell",
        extraNotes: "Humor in-world only; not real lab safety.",
      },
      {
        title: "Restricted stack coupon",
        bodyText: [
          "ARCHIVES — day pass, restricted third shelf only",
          "Subject search: pre-unification warding. No candles. A cold lamp is issued at the desk.",
          "If a book whispers, close it and back away. The librarian does not pay for your curiosity.",
        ].join("\n"),
        propType: "scroll",
        style: "ribbon tie, light purple wax, neat capitals",
        ageWear: "a tear along the fold, shelf dust in the dimple",
        settingHint: "university spire, spiral stairs, old dust",
      },
      {
        title: "Rune — “closed circle” (practice room)",
        bodyText: [
          "PRACTICE ROOM INSCRIPTION: circle closed, anchor at north, students only beyond this line",
          "If the door sticks, the room is in use. If the door opens easy when it should be locked, do not enter — fetch staff.",
        ].join("\n"),
        propType: "rune_tablet",
        style: "light stone, student-carved, shallow, paint in the grooves",
        ageWear: "chalk haze, a chip from a dropped book",
        settingHint: "academy basement practice vaults, damp",
      },
    ],
  },
  {
    id: "mine_underground",
    label: "Mine & underhold",
    description: "Claims, air, and stone that remembers work.",
    ideas: [
      {
        title: "Claim post — “two spans east of the old winze”",
        bodyText: [
          "CLAIM — registered at the Thanes’ table",
          "Mark: three notches, red paint, stone set at the seam where the lode pinches",
          "Disputes in blood are not law; bring chisels, not fists, to the moot line.",
        ].join("\n"),
        propType: "map_handout",
        style: "pencil, grease and grit, a circle around a key squiggle",
        ageWear: "torn, taped with linen strip, coal dust in creases",
        settingHint: "dwarven or frontier mine head, timbers, cold",
      },
      {
        title: "Air shaft check — “blue flame only”",
        bodyText: [
          "SAFETY — air shaft 7, morning draw",
          "Blue flame on the test wick. Yellow means go back, seal the mat, call the wind crew.",
          "Do not unpin the brattice alone. Pairs, always.",
        ].join("\n"),
        propType: "notice",
        style: "stamped on thin metal sheet, riveted, soot edge",
        ageWear: "oil prints, a dent on one edge",
        settingHint: "underground, timber supports, oil lamps",
        extraNotes: "Fictional mine lore; in-world only.",
      },
      {
        title: "Haul day tally — kobold scratch",
        bodyText: [
          "CARTS UP — 14th span",
          "Good ore: 6 carts / slate waste: 3 carts / “spark” rock: quarantine pile (2 sacks)",
          "If the quarantine sack ticks, you did not read the second line. You should not be laughing.",
        ].join("\n"),
        propType: "journal",
        style: "carbon, grease pencil, a thumb of tunnel grit",
        ageWear: "a tear where a tool caught, ink thumb",
        settingHint: "underhold delivery gate, winches, shouting foreman",
      },
    ],
  },
];
