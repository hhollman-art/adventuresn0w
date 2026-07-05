import { describe, expect, it } from "vitest";
import {
  buildRealmUserMessage,
  parseRealmSize,
  realmDmProvidedRaceSpecifics,
  REALM_RACE_MIX_DEFAULT_GUIDE,
  REALM_RACE_DM_PROVIDED_GUIDE,
  REALM_SIZES,
  REALM_SIZE_LABEL,
} from "@/lib/realmPrompt";

describe("realm sizes", () => {
  it("includes city in the selectable scope list", () => {
    expect(REALM_SIZES).toContain("city");
    expect(REALM_SIZE_LABEL.city.label).toContain("City");
  });

  it("parses city from API input", () => {
    expect(parseRealmSize("city")).toBe("city");
    expect(parseRealmSize("invalid")).toBe("country");
  });

  it("asks for Politics and Trade at city scope", () => {
    const msg = buildRealmUserMessage({
      realmSize: "city",
      titleHint: "Port of Ash",
      description: "A harbor metropolis with rival guilds.",
      extraNotes: "",
    });
    expect(msg).toContain("## Politics section");
    expect(msg).toContain("Urban **politics**");
    expect(msg).toContain("City trade");
  });
});

describe("realm race mix in prompts", () => {
  it("detects DM-provided race specifics in description or notes", () => {
    expect(
      realmDmProvidedRaceSpecifics("A volcanic coast with rival guilds.", ""),
    ).toBe(false);
    expect(
      realmDmProvidedRaceSpecifics("", "Human-only frontier; no tieflings."),
    ).toBe(true);
    expect(
      realmDmProvidedRaceSpecifics("An elven kingdom in the northern woods.", ""),
    ).toBe(true);
    expect(realmDmProvidedRaceSpecifics("", "Focus on trade routes only.")).toBe(
      false,
    );
  });

  it("includes default race mix guidance when the DM did not specify races", () => {
    const msg = buildRealmUserMessage({
      realmSize: "region",
      titleHint: "",
      description: "Border march with smuggling and old forts.",
      extraNotes: "",
    });
    expect(msg).toContain("## Peoples & ancestry");
    expect(msg).toContain(REALM_RACE_MIX_DEFAULT_GUIDE);
    expect(msg).not.toContain(REALM_RACE_DM_PROVIDED_GUIDE);
    expect(msg).toContain("Do **not** assume a human-default setting");
  });

  it("honors DM race specifics from notes instead of default mix guidance", () => {
    const msg = buildRealmUserMessage({
      realmSize: "country",
      titleHint: "",
      description: "A dry steppe with caravan cities.",
      extraNotes: "Mostly dwarven merchant clans; tiefling minorities in the ports.",
    });
    expect(msg).toContain(REALM_RACE_DM_PROVIDED_GUIDE);
    expect(msg).not.toContain("Do **not** assume a human-default setting");
  });
});
