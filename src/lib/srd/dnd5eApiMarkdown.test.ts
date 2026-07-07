import { describe, expect, it } from "vitest";
import { dnd5eResourceToMarkdown } from "@/lib/srd/dnd5eApiMarkdown";

describe("dnd5eResourceToMarkdown", () => {
  it("formats a spell with level and school", () => {
    const md = dnd5eResourceToMarkdown("spells", {
      name: "Fireball",
      level: 3,
      school: { name: "Evocation" },
      casting_time: "1 action",
      range: "150 feet",
      components: ["V", "S", "M"],
      duration: "Instantaneous",
      desc: ["A bright streak flashes from your finger."],
      classes: [{ name: "Sorcerer" }, { name: "Wizard" }],
      url: "/api/2014/spells/fireball",
    });
    expect(md).toContain("# Fireball");
    expect(md).toContain("3rd-level");
    expect(md).toContain("Evocation");
    expect(md).toContain("Casting Time");
    expect(md).toContain("CC BY 4.0");
  });

  it("formats a monster stat block", () => {
    const md = dnd5eResourceToMarkdown("monsters", {
      name: "Goblin",
      size: "Small",
      type: "humanoid",
      subtype: "goblinoid",
      alignment: "neutral evil",
      armor_class: [{ value: 15, type: "armor" }],
      hit_points: 7,
      hit_dice: "2d6",
      speed: { walk: "30 ft." },
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
      challenge_rating: 0.25,
      xp: 50,
      actions: [
        {
          name: "Scimitar",
          desc: "Melee Weapon Attack: +4 to hit.",
        },
      ],
      url: "/api/2014/monsters/goblin",
    });
    expect(md).toContain("# Goblin");
    expect(md).toContain("**Armor Class**");
    expect(md).toContain("| DEX | 14 (+2) |");
    expect(md).toContain("### Scimitar");
  });

  it("formats rule sections with markdown desc", () => {
    const md = dnd5eResourceToMarkdown("rule-sections", {
      name: "Ability Checks",
      desc: "## Ability Checks\n\nAn ability check tests talent.",
      url: "/api/2014/rule-sections/ability-checks",
    });
    expect(md).toContain("# Ability Checks");
    expect(md).toContain("An ability check tests talent.");
    expect(md.match(/Ability Checks/g)?.length).toBe(1);
  });

  it("does not duplicate rule chapter titles from API desc", () => {
    const md = dnd5eResourceToMarkdown("rules", {
      name: "Combat",
      desc: "# Combat\n",
      subsections: [{ name: "The Order of Combat", index: "the-order-of-combat" }],
      url: "/api/2014/rules/combat",
    });
    expect(md.match(/^# Combat$/m)?.length).toBe(1);
    expect(md).toContain("The Order of Combat");
  });

  it("formats a magic item with rarity and attunement", () => {
    const md = dnd5eResourceToMarkdown("magic-items", {
      name: "Bag of Holding",
      rarity: { name: "Uncommon" },
      equipment_category: { name: "Wondrous item" },
      requires_attunement: false,
      desc: ["This bag has an interior space considerably larger than its outside dimensions."],
      url: "/api/2014/magic-items/bag-of-holding",
    });
    expect(md).toContain("# Bag of Holding");
    expect(md).toContain("Uncommon");
    expect(md).toContain("Wondrous item");
    expect(md).toContain("interior space");
  });
});
