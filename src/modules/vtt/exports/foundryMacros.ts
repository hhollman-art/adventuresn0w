/** Foundry macro document — import via Macros directory → Import Data. */
export type FoundryMacroExport = {
  name: string;
  type: "script";
  scope: "global";
  command: string;
  author: string;
  img: string;
  folder: null;
  sort: number;
  ownership: { default: 3 };
  flags: {
    ddeasy: {
      pack: "dmms-vtt";
      version: 1;
      /** v11/v12 notes for maintainers. */
      apiNote?: string;
    };
  };
};

export type FoundryMacroPack = {
  meta: {
    source: "ddeasy";
    version: 1;
    exportedAt: string;
    platform: "foundry";
    targets: ["v11", "v12"];
    system: "dnd5e";
  };
  macros: FoundryMacroExport[];
  readme: string;
};

const ROLL_INITIATIVE_COMMAND = `// DMMS — Roll initiative for selected tokens (Foundry v11/v12)
// Requires: active scene with tokens selected on the canvas.
(async () => {
  // Guard: no canvas scene — common when the GM has not activated a scene yet.
  if (!canvas?.scene) {
    ui.notifications.warn("DMMS: Activate a scene before rolling initiative.");
    return;
  }

  const tokens = canvas.tokens.controlled;
  if (!tokens.length) {
    ui.notifications.warn("DMMS: Select one or more tokens first.");
    return;
  }

  // v12 prefers CombatEncounter.create; v11 uses Combat.create — try both.
  let combat = game.combat;
  if (!combat) {
    const CombatDoc = CONFIG.Combat.documentClass ?? Combat;
    combat = game.combat ?? (await CombatDoc.create({ scene: canvas.scene.id, active: true }));
  }

  for (const token of tokens) {
    const name = token.name ?? token.document.name;
    const existing = combat.combatants.find((c) => c.tokenId === token.id);
    const roll = await new Roll("1d20 + @init.mod", token.actor?.getRollData?.() ?? {}).evaluate();

    if (existing) {
      await existing.update({ initiative: roll.total });
    } else {
      await combat.createEmbeddedDocuments("Combatant", [{
        tokenId: token.id,
        actorId: token.actor?.id ?? null,
        hidden: false,
        initiative: roll.total,
      }]);
    }

    await roll.toMessage({ flavor: \`\${name} initiative\` });
  }

  ui.notifications.info(\`DMMS: Rolled initiative for \${tokens.length} token(s).\`);
})();`;

const LINK_SELECTED_TOKENS_COMMAND = `// DMMS — Link selected tokens to matching actors by name (Foundry v11/v12)
// Matches token label to an actor name (case-insensitive). Skips tokens already linked.
(async () => {
  if (!canvas?.scene) {
    ui.notifications.warn("DMMS: Activate a scene before linking tokens.");
    return;
  }

  const tokens = canvas.tokens.controlled;
  if (!tokens.length) {
    ui.notifications.warn("DMMS: Select unlinked tokens to match with actors.");
    return;
  }

  const actors = game.actors.contents;
  let linked = 0;

  for (const token of tokens) {
    if (token.actor) continue;
    const label = (token.document.name ?? "").trim().toLowerCase();
    if (!label) continue;

    const actor = actors.find((a) => a.name.trim().toLowerCase() === label);
    if (!actor) continue;

    // v11/v12: update the TokenDocument to reference the actor.
    await token.document.update({ actorId: actor.id, actorLink: true });
    linked += 1;
  }

  if (!linked) {
    ui.notifications.warn("DMMS: No matching actors found. Import DMMS actor JSON first.");
    return;
  }

  ui.notifications.info(\`DMMS: Linked \${linked} token(s) to actors.\`);
})();`;

const IMPORT_PARTY_COMMAND = `// DMMS — Import party bundle from clipboard (Foundry v11/v12)
// Copy a DMMS party JSON export, then run this macro. Creates actors in the open folder.
(async () => {
  let raw = "";
  try {
    raw = await navigator.clipboard.readText();
  } catch (err) {
    ui.notifications.error("DMMS: Clipboard access denied. Paste export into a dialog instead.");
    return;
  }

  let bundle;
  try {
    bundle = JSON.parse(raw);
  } catch {
    ui.notifications.error("DMMS: Clipboard does not contain valid JSON.");
    return;
  }

  const actors = bundle?.data?.actors ?? bundle?.actors;
  if (!Array.isArray(actors) || !actors.length) {
    ui.notifications.error("DMMS: No actors array found. Export a party bundle from D&D Easy.");
    return;
  }

  const folder = game.actors?.folder?.id ?? null;
  const created = await Actor.createDocuments(actors, { folder });

  ui.notifications.info(\`DMMS: Imported \${created.length} actor(s) from \${bundle?.data?.partyName ?? "party"}.\`);
})();`;

/** Three macros: initiative, token linking, and clipboard party import. */
export function buildFoundryMacroPack(): FoundryMacroPack {
  const exportedAt = new Date().toISOString();
  const macros: FoundryMacroExport[] = [
    {
      name: "DMMS — Roll Initiative",
      type: "script",
      scope: "global",
      command: ROLL_INITIATIVE_COMMAND,
      author: "D&D Easy",
      img: "icons/svg/dice-target.svg",
      folder: null,
      sort: 1,
      ownership: { default: 3 },
      flags: {
        ddeasy: {
          pack: "dmms-vtt",
          version: 1,
          apiNote: "v12: CombatEncounter.create; v11: Combat.create fallback in macro body.",
        },
      },
    },
    {
      name: "DMMS — Link Tokens to Actors",
      type: "script",
      scope: "global",
      command: LINK_SELECTED_TOKENS_COMMAND,
      author: "D&D Easy",
      img: "icons/svg/combat.svg",
      folder: null,
      sort: 2,
      ownership: { default: 3 },
      flags: {
        ddeasy: {
          pack: "dmms-vtt",
          version: 1,
          apiNote: "v11/v12: token.document.update({ actorId }) — same surface.",
        },
      },
    },
    {
      name: "DMMS — Import Party from Clipboard",
      type: "script",
      scope: "global",
      command: IMPORT_PARTY_COMMAND,
      author: "D&D Easy",
      img: "icons/svg/chest.svg",
      folder: null,
      sort: 3,
      ownership: { default: 3 },
      flags: {
        ddeasy: {
          pack: "dmms-vtt",
          version: 1,
          apiNote: "Requires https or localhost for clipboard.readText().",
        },
      },
    },
  ];

  const readme = [
    "D&D Easy — Foundry Macro Pack",
    "",
    "Import: Macros → Import Data → select dmms-foundry-macros.json",
    "",
    "Macros included:",
    "  1. DMMS — Roll Initiative — select tokens, roll 1d20+init for each",
    "  2. DMMS — Link Tokens to Actors — match token names to imported actor names",
    "  3. DMMS — Import Party from Clipboard — paste a DMMS party JSON export",
    "",
    "Targets Foundry v11 and v12 with the dnd5e system.",
    "No premium modules required.",
  ].join("\n");

  return {
    meta: {
      source: "ddeasy",
      version: 1,
      exportedAt,
      platform: "foundry",
      targets: ["v11", "v12"],
      system: "dnd5e",
    },
    macros,
    readme,
  };
}
