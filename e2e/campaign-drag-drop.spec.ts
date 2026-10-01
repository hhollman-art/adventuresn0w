import { randomUUID } from "node:crypto";
import { test as base, expect, type Dialog, type Page } from "@playwright/test";
import { Html5DragSession, type DragCargo } from "./helpers/html5DragDrop";

/**
 * Library → Scrying Glass → Campaign / Live Session drag-and-drop, end to end.
 *
 * Every test runs in a fresh browser context (empty IndexedDB + localStorage),
 * seeds only what it needs, and asserts against the same storage the App reads.
 */

/** Drop → card painted (page clock). Override for slow CI runners via E2E_DROP_RENDER_BUDGET_MS. */
const DROP_RENDER_BUDGET_MS = Number(process.env.E2E_DROP_RENDER_BUDGET_MS ?? 50);

const CAMPAIGNS_MIRROR_KEY = "ddeasy-campaigns-v1";
const ACTIVE_CAMPAIGN_KEY = "ddeasy-active-campaign-v1";
const RELATIONSHIPS_DB = "ddeasy-container-relationships-v1";
const RELATIONSHIPS_MIRROR_KEY = "ddeasy-container-relationships-v1";

const GOBLIN: DragCargo = {
  kind: "vault",
  payload: {
    vaultKind: "cf",
    id: "monster:goblin-warrior",
    ciClass: "monster.srd-entry",
    title: "Goblin Warrior",
    detail: "static-srd:monster:goblin-warrior",
  },
};

const FIREBALL: DragCargo = { kind: "srd", entityId: "spell:fireball", name: "Fireball" };

type StoredRelationship = {
  id: string;
  parentId: string;
  parentCiClass: string;
  childId: string;
  childCiClass: string;
  slot: string;
  kind: string;
  instanceId?: string;
  _source?: string;
  sourceSrdEntityId?: string | null;
};

type Fixtures = {
  /** Every native dialog (alert / confirm / prompt) the page tried to open — auto-dismissed. */
  dialogs: Dialog[];
  /** Uncaught page exceptions. */
  pageErrors: Error[];
};

const test = base.extend<Fixtures>({
  dialogs: async ({ page }, provide) => {
    const seen: Dialog[] = [];
    page.on("dialog", (dialog) => {
      seen.push(dialog);
      void dialog.dismiss().catch(() => undefined);
    });
    await provide(seen);
  },
  pageErrors: async ({ page }, provide) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    await provide(errors);
  },
});

/** Wait for SrdAssetGate to swap its "Opening the rulebooks…" placeholder for the App shell. */
async function waitForAppShell(page: Page): Promise<void> {
  await expect(page.getByText("Opening the rulebooks…")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText("The included rules could not be loaded")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /D&D EASY/i }).first()).toBeVisible();
}

/**
 * Seed one active campaign through the campaigns store's localStorage mirror —
 * `loadCampaigns()` adopts the mirror whenever IndexedDB is empty, which it is
 * in a fresh context.
 */
async function seedActiveCampaign(page: Page): Promise<{ id: string; name: string }> {
  const now = new Date().toISOString();
  const campaign = {
    id: randomUUID(),
    name: `E2E Drop Test ${Date.now()}`,
    description: "Seeded by campaign-drag-drop.spec.ts",
    createdAt: now,
    updatedAt: now,
    partyId: null,
    seedIds: [],
    resultIds: [],
    characterIds: [],
    itemIds: [],
    unassignedLootIds: [],
    npcIds: [],
    locationIds: [],
    sessionRecordIds: [],
    monsterIds: [],
  };
  await page.goto("/");
  await waitForAppShell(page);
  await page.evaluate(
    ({ campaign, mirrorKey, activeKey }) => {
      localStorage.setItem(mirrorKey, JSON.stringify([campaign]));
      localStorage.setItem(activeKey, campaign.id);
    },
    { campaign, mirrorKey: CAMPAIGNS_MIRROR_KEY, activeKey: ACTIVE_CAMPAIGN_KEY },
  );
  return { id: campaign.id, name: campaign.name };
}

/** Read relationship rows from IndexedDB (primary) and the localStorage mirror, without creating the DB. */
async function readRelationships(
  page: Page,
): Promise<{ idb: StoredRelationship[]; mirror: StoredRelationship[] }> {
  return page.evaluate(
    async ({ dbName, mirrorKey }) => {
      const mirror = JSON.parse(localStorage.getItem(mirrorKey) ?? "[]") as StoredRelationship[];
      const exists = (await indexedDB.databases()).some((db) => db.name === dbName);
      if (!exists) return { idb: [], mirror };
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        if (!db.objectStoreNames.contains("kv")) return { idb: [], mirror };
        const rows = await new Promise<unknown>((resolve, reject) => {
          const get = db.transaction("kv", "readonly").objectStore("kv").get("relationships");
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        });
        return { idb: Array.isArray(rows) ? (rows as StoredRelationship[]) : [], mirror };
      } finally {
        db.close();
      }
    },
    { dbName: RELATIONSHIPS_DB, mirrorKey: RELATIONSHIPS_MIRROR_KEY },
  );
}

/** Open the Lore Vault drawer (floating layouts have a toggle; docked layouts are always open). */
async function openVaultDrawer(page: Page) {
  const drawer = page.locator("#lore-vault-drawer");
  const toggle = page.locator('button[aria-controls="lore-vault-drawer"]');
  if ((await toggle.count()) > 0 && (await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(drawer).toHaveClass(/vault-drawer--open/);
  return drawer;
}

/** No native dialog fired and no modal overlay is on screen. */
async function expectNoBlockingPrompt(page: Page, dialogs: Dialog[]): Promise<void> {
  expect(dialogs.map((d) => `${d.type()}: ${d.message()}`)).toEqual([]);
  await expect(page.locator('[role="alertdialog"]:visible')).toHaveCount(0);
  await expect(page.locator('[role="dialog"][aria-modal="true"]:visible')).toHaveCount(0);
}

/** Run one full drag from the Lore Vault drawer into `zoneSelector` and assert every UI phase. */
async function dragIntoZone(
  page: Page,
  { zoneSelector, cargo, cardTitle }: { zoneSelector: string; cargo: DragCargo; cardTitle: string },
): Promise<number> {
  const zone = page.locator(zoneSelector);
  await expect(zone).toBeVisible();
  await expect(zone).not.toContainText(cardTitle);
  const drawer = await openVaultDrawer(page);

  const drag = await Html5DragSession.start(page, drawer, cargo);

  // dragstart reached VaultDrawerContext → every zone arms before the pointer arrives.
  await expect(zone).toHaveClass(/border-sky-400\/50/);
  await expect(zone).toHaveAttribute("data-drop-active", "false");

  const over = await drag.over(zone);
  expect(over.accepted, "dragover must call preventDefault or the browser cancels the drop").toBe(true);
  expect(over.dropEffect).toBe("link");
  await expect(zone).toHaveAttribute("data-drop-active", "true");
  await expect(zone).toHaveClass(/(?:^|\s)border-sky-400(?:\s|$)/);
  await expect(zone).toHaveClass(/(?:^|\s)bg-sky-500\/10(?:\s|$)/);

  const dropped = await drag.drop(zone, { within: zone, text: cardTitle });
  expect(dropped.accepted).toBe(true);
  expect(dropped.renderMs).not.toBeNull();

  await expect(zone).toHaveAttribute("data-drop-active", "false");
  await expect(zone).not.toHaveClass(/bg-sky-500\/10/);
  await expect(
    zone.getByRole("button", { name: `Remove ${cardTitle} from campaign`, exact: true }),
  ).toBeVisible();
  return dropped.renderMs ?? Number.POSITIVE_INFINITY;
}

/** Poll storage until the SRD instance row for `entityId` under `campaignId` exists, then check provenance. */
async function expectSrdInstanceRelationship(
  page: Page,
  { campaignId, entityId, childCiClass, slot }: {
    campaignId: string;
    entityId: string;
    childCiClass: string;
    slot: string;
  },
): Promise<StoredRelationship> {
  const match = (rows: StoredRelationship[]) =>
    rows.find((r) => r.parentId === campaignId && r.sourceSrdEntityId === entityId);

  await expect
    .poll(async () => Boolean(match((await readRelationships(page)).idb)), {
      message: `relationship row for ${entityId} written to ${RELATIONSHIPS_DB}`,
      timeout: 5_000,
    })
    .toBe(true);

  const { idb, mirror } = await readRelationships(page);
  const row = match(idb)!;
  expect(row).toMatchObject({
    parentId: campaignId,
    parentCiClass: "campaign.record",
    childCiClass,
    slot,
    _source: "SRD",
    sourceSrdEntityId: entityId,
  });
  expect(row.instanceId).toMatch(/^instance_/);
  // The container links the local instance — never the global SRD id.
  expect(row.childId).toBe(row.instanceId);
  expect(row.childId).not.toBe(entityId);
  expect(match(mirror), "localStorage mirror carries the same row").toMatchObject({
    id: row.id,
    instanceId: row.instanceId,
    _source: "SRD",
  });
  return row;
}

test.describe("Campaign drag-and-drop", () => {
  test("app shell loads the SRD Assets and reaches the Library", async ({ page, pageErrors }) => {
    const srdResponses: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (/\/srd\/[^/?]+\.json(?:\?|$)/.test(response.url())) {
        srdResponses.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/");
    await waitForAppShell(page);
    await expect(page.getByRole("button", { name: /Prep Mode/i })).toBeVisible();

    expect(srdResponses.length, "SrdAssetGate fetched the static SRD Asset JSON").toBeGreaterThan(0);
    expect(srdResponses.filter((r) => r.status >= 400)).toEqual([]);

    await page.goto("/library");
    await waitForAppShell(page);
    await expect(page.getByRole("textbox", { name: "Search The Library" })).toBeVisible();
    expect(pageErrors.map((e) => e.message)).toEqual([]);
  });

  test("Scrying Glass renders a formatted Adult Black Dragon statblock", async ({ page, pageErrors }) => {
    await page.goto("/library");
    await waitForAppShell(page);

    await page.getByRole("textbox", { name: "Search The Library" }).fill("Adult Black Dragon");
    const result = page.getByRole("button", { name: /^Adult Black Dragon SRD monster/ }).first();
    await expect(result).toBeVisible();
    await result.click();

    const glass = page.getByRole("dialog", { name: /Scrying Glass/ });
    await expect(glass).toBeVisible();
    await expect(glass).toHaveClass(/scrying-glass-frame/);
    const backdrop = page.locator(".scrying-glass-backdrop");
    await expect(backdrop).toHaveCSS("position", "fixed");
    await expect(backdrop).toHaveCSS("z-index", "120");
    await expect(glass.getByRole("tab", { name: "View Details" })).toHaveAttribute("aria-selected", "true");

    // The carousel mounts every page into one article; hidden pages still count.
    const article = glass.locator("article.adventure-md").first();
    await expect(article).toContainText("Adult Black Dragon");
    await expect
      .poll(() => glass.locator("strong.md-trait-name > em").count(), {
        message: "bold-italic trait lead-ins rendered",
      })
      .toBeGreaterThan(0);

    const text = (await article.textContent()) ?? "";
    expect(text).not.toContain("#####");
    expect(text).not.toContain("**");
    expect(text).not.toMatch(/&(?:emsp|nbsp|mdash);/);
    expect(text, "no raw _italic_ markers").not.toMatch(/(?:^|[\s(])_[^_\s][^_\n]*_(?=[\s.,;:)]|$)/m);

    await page.keyboard.press("Escape");
    await expect(glass).toBeHidden();

    await result.click();
    await expect(glass).toBeVisible();
    await glass.getByRole("button", { name: "Close Scrying Glass" }).click();
    await expect(glass).toBeHidden();
    expect(pageErrors.map((e) => e.message)).toEqual([]);
  });

  test("Live Session: a Lore Vault Goblin drops into Quests & Encounters without blocking", async ({
    page,
    dialogs,
    pageErrors,
  }, testInfo) => {
    const campaign = await seedActiveCampaign(page);
    await page.goto("/table");
    await waitForAppShell(page);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await expect(page.getByText(campaign.name)).toBeVisible();

    const zoneSelector = `[data-zone-id="session-${campaign.id}-quests"]`;
    const renderMs = await dragIntoZone(page, { zoneSelector, cargo: GOBLIN, cardTitle: "Goblin Warrior" });
    testInfo.annotations.push({ type: "drop-render-ms", description: renderMs.toFixed(1) });
    expect(renderMs, `card rendered ${renderMs.toFixed(1)}ms after drop`).toBeLessThanOrEqual(
      DROP_RENDER_BUDGET_MS,
    );

    await expectNoBlockingPrompt(page, dialogs);
    const row = await expectSrdInstanceRelationship(page, {
      campaignId: campaign.id,
      entityId: "monster:goblin-warrior",
      childCiClass: "monster.srd-entry",
      slot: "encounters",
    });

    // Persistence: a full reload rebuilds the card from storage alone.
    await page.reload();
    await waitForAppShell(page);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await expect(page.locator(zoneSelector)).toContainText("Goblin Warrior");
    const { idb } = await readRelationships(page);
    expect(idb.filter((r) => r.instanceId === row.instanceId)).toHaveLength(1);
    expect(pageErrors.map((e) => e.message)).toEqual([]);
  });

  test("Campaign Workspace: a Library Fireball drops into Encounters & Monsters without blocking", async ({
    page,
    dialogs,
    pageErrors,
  }, testInfo) => {
    const campaign = await seedActiveCampaign(page);
    await page.goto("/campaigns");
    await waitForAppShell(page);
    await page.getByRole("button", { name: `Open ${campaign.name} workspace` }).click();

    const zoneSelector = `[data-zone-id="campaign-${campaign.id}-encounters"]`;
    const renderMs = await dragIntoZone(page, { zoneSelector, cargo: FIREBALL, cardTitle: "Fireball" });
    testInfo.annotations.push({ type: "drop-render-ms", description: renderMs.toFixed(1) });
    expect(renderMs, `card rendered ${renderMs.toFixed(1)}ms after drop`).toBeLessThanOrEqual(
      DROP_RENDER_BUDGET_MS,
    );

    await expectNoBlockingPrompt(page, dialogs);
    await expectSrdInstanceRelationship(page, {
      campaignId: campaign.id,
      entityId: "spell:fireball",
      childCiClass: "spell.srd-entry",
      slot: "encounters",
    });
    expect(pageErrors.map((e) => e.message)).toEqual([]);
  });
});

const LORE_VAULT_CONTAINER = "LORE_VAULT_CONTAINER";

/** Poll until a vault row for `entityId` exists (or, with `absent`, until none does). */
async function expectVaultRow(
  page: Page,
  entityId: string,
  { absent = false }: { absent?: boolean } = {},
): Promise<StoredRelationship | null> {
  const find = (rows: StoredRelationship[]) =>
    rows.find((r) => r.parentId === LORE_VAULT_CONTAINER && r.sourceSrdEntityId === entityId) ?? null;
  await expect
    .poll(async () => Boolean(find((await readRelationships(page)).idb)), {
      message: `${entityId} ${absent ? "removed from" : "parked in"} the Lore Vault`,
      timeout: 5_000,
    })
    .toBe(!absent);
  return find((await readRelationships(page)).idb);
}

test.describe("Lore Vault global parking lot", () => {
  test("park an SRD card, drag it out to the Live Session, then purge without a prompt", async ({
    page,
    dialogs,
    pageErrors,
  }) => {
    const campaign = await seedActiveCampaign(page);
    await page.goto("/table");
    await waitForAppShell(page);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await expect(page.getByText(campaign.name)).toBeVisible();

    const drawer = await openVaultDrawer(page);
    const parkZone = drawer.locator('[data-zone-id="lore-vault"]');
    const grid = drawer.getByTestId("vault-parked-grid");

    // —— Step 1: drag in → instance parked on LORE_VAULT_CONTAINER ——
    let drag = await Html5DragSession.start(page, drawer, GOBLIN);
    const overPark = await drag.over(parkZone);
    expect(overPark.accepted).toBe(true);
    await expect(parkZone).toHaveAttribute("data-drop-active", "true");
    const parkedDrop = await drag.drop(parkZone, { within: parkZone, text: "Goblin Warrior" });
    expect(parkedDrop.accepted).toBe(true);
    await expect(grid).toContainText("Goblin Warrior");

    const parkedRow = (await expectVaultRow(page, "monster:goblin-warrior"))!;
    expect(parkedRow).toMatchObject({
      parentCiClass: "campaign.lore-vault",
      kind: "park",
      slot: "vault",
      childCiClass: "monster.srd-entry",
      _source: "SRD",
    });
    expect(parkedRow.instanceId).toMatch(/^instance_/);
    expect(parkedRow.childId).toBe(parkedRow.instanceId);

    // —— Step 2: drag out from the real parked card → re-parented onto the session ——
    const quests = page.locator(`[data-zone-id="session-${campaign.id}-quests"]`);
    await expect(quests).not.toContainText("Goblin Warrior");
    drag = await Html5DragSession.start(page, grid.locator("li", { hasText: "Goblin Warrior" }), {
      kind: "native",
    });
    const overQuests = await drag.over(quests);
    expect(overQuests.accepted).toBe(true);
    const outDrop = await drag.drop(quests, { within: quests, text: "Goblin Warrior" });
    expect(outDrop.accepted).toBe(true);
    await expect(grid).toHaveCount(0);

    await expectVaultRow(page, "monster:goblin-warrior", { absent: true });
    const { idb } = await readRelationships(page);
    const moved = idb.filter((r) => r.instanceId === parkedRow.instanceId);
    expect(moved, "same instance, exactly one container").toHaveLength(1);
    expect(moved[0]).toMatchObject({
      parentId: campaign.id,
      parentCiClass: "campaign.record",
      slot: "encounters",
      _source: "SRD",
    });

    // —— Step 3a: hover "Purge from Vault" → every row for the instance is gone, Undo offered ——
    drag = await Html5DragSession.start(page, drawer, FIREBALL);
    await drag.over(parkZone);
    await drag.drop(parkZone, { within: parkZone, text: "Fireball" });
    await expect(grid).toContainText("Fireball");
    const fireballRow = (await expectVaultRow(page, "spell:fireball"))!;

    const fireballCard = grid.locator("li", { hasText: "Fireball" });
    await fireballCard.hover();
    await fireballCard.getByRole("button", { name: "Purge Fireball from Vault" }).click();
    await expect(grid).toHaveCount(0);
    await expectVaultRow(page, "spell:fireball", { absent: true });
    expect(
      (await readRelationships(page)).idb.filter((r) => r.childId === fireballRow.childId),
    ).toEqual([]);

    await drawer.getByRole("button", { name: "Undo" }).click();
    await expect(grid).toContainText("Fireball");
    await expectVaultRow(page, "spell:fireball");

    // —— Step 3b: drop the parked card on the Trash → purged, no confirm ——
    drag = await Html5DragSession.start(page, grid.locator("li", { hasText: "Fireball" }), {
      kind: "native",
    });
    const trash = drawer.locator("[data-vault-trash]");
    expect((await drag.over(trash)).accepted).toBe(true);
    await drag.drop(trash);
    await expect(grid).toHaveCount(0);
    await expectVaultRow(page, "spell:fireball", { absent: true });

    // The session's Goblin was never touched by the purges.
    expect(
      (await readRelationships(page)).idb.filter((r) => r.instanceId === parkedRow.instanceId),
    ).toHaveLength(1);
    await expectNoBlockingPrompt(page, dialogs);
    expect(pageErrors.map((e) => e.message)).toEqual([]);
  });
});
