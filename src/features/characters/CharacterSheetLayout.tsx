"use client";

import {
  abilityMod,
  effectiveAc,
  effectiveInitiative,
  effectiveMaxHp,
  effectivePassivePerception,
  effectiveSpeed,
  formatMod,
  proficiencyBonus,
} from "@/lib/tabletop/character";
import type {
  AbilityScores,
  CharacterAttack,
  CharacterCurrency,
  CharacterSkillProficiency,
  PlayerCharacter,
} from "@/lib/tabletop/types";

export type CharacterSheetLayoutProps = {
  characterData: PlayerCharacter;
  mode?: "read-only" | "editable";
  onChange?: (character: PlayerCharacter) => void;
  className?: string;
};

const ABILITIES: { key: keyof AbilityScores; label: string; short: string }[] = [
  { key: "str", label: "Strength", short: "STR" },
  { key: "dex", label: "Dexterity", short: "DEX" },
  { key: "con", label: "Constitution", short: "CON" },
  { key: "int", label: "Intelligence", short: "INT" },
  { key: "wis", label: "Wisdom", short: "WIS" },
  { key: "cha", label: "Charisma", short: "CHA" },
];

const SKILLS: {
  key: CharacterSkillProficiency;
  label: string;
  ability: keyof AbilityScores;
}[] = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animal-handling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleight-of-hand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

const EMPTY_CURRENCY: CharacterCurrency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 block text-center text-[8px] font-bold uppercase tracking-[0.12em] text-stone-700">
      {children}
    </span>
  );
}

function SheetBox({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border-2 border-stone-800 bg-white p-2 ${className}`}>
      <h3 className="mb-1.5 text-center text-[9px] font-black uppercase tracking-[0.12em] text-stone-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

function TextValue({
  value,
  editable,
  onChange,
  multiline = false,
  ariaLabel,
  className = "",
}: {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  if (editable) {
    if (multiline) {
      return (
        <textarea
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`min-h-16 w-full resize-y bg-transparent text-xs leading-relaxed text-stone-950 outline-none ${className}`}
        />
      );
    }
    return (
      <input
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-transparent text-stone-950 outline-none ${className}`}
      />
    );
  }
  return (
    <p className={`whitespace-pre-wrap text-xs leading-relaxed text-stone-950 ${className}`}>
      {value || "—"}
    </p>
  );
}

function DotToggle({
  active,
  editable,
  label,
  onToggle,
}: {
  active: boolean;
  editable: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={!editable}
      onClick={onToggle}
      className={`h-2.5 w-2.5 shrink-0 rounded-full border border-stone-900 ${
        active ? "bg-stone-900" : "bg-white"
      } disabled:cursor-default`}
    />
  );
}

export default function CharacterSheetLayout({
  characterData: character,
  mode = "read-only",
  onChange,
  className = "",
}: CharacterSheetLayoutProps) {
  const editable = mode === "editable" && Boolean(onChange);
  const patch = (next: Partial<PlayerCharacter>) => onChange?.({ ...character, ...next });
  const patchAbility = (key: keyof AbilityScores, raw: string) => {
    const score = Math.max(1, Math.min(30, Number.parseInt(raw, 10) || 1));
    patch({ abilities: { ...character.abilities, [key]: score } });
  };
  const saveProficiencies = new Set(character.proficientSavingThrows ?? []);
  const skillProficiencies = new Set(character.skillProficiencies ?? []);
  const prof = proficiencyBonus(character.level);
  const currency = character.currency ?? EMPTY_CURRENCY;
  const attacks: CharacterAttack[] =
    editable
      ? (character.attacks ?? [])
      : character.attacks?.length
      ? character.attacks
      : character.items.slice(0, 4).map((item) => ({
          id: item.id,
          name: item.name,
          attackBonus: "—",
          damageType: item.notes || "—",
        }));

  const toggleSave = (key: keyof AbilityScores) => {
    const next = new Set(saveProficiencies);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    patch({ proficientSavingThrows: [...next] });
  };
  const toggleSkill = (key: CharacterSkillProficiency) => {
    const next = new Set(skillProficiencies);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    patch({ skillProficiencies: [...next] });
  };
  const setNumber = (
    key:
      | "level"
      | "experiencePoints"
      | "ac"
      | "maxHp"
      | "speed"
      | "currentHp"
      | "temporaryHp",
    raw: string,
  ) => patch({ [key]: Number.parseInt(raw, 10) || 0 });

  return (
    <article
      className={`character-sheet-layout w-full min-w-0 rounded-xl border border-stone-400 bg-stone-100 p-3 font-sans text-stone-950 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none ${className}`}
      aria-label={`${character.name} character sheet`}
    >
      <header className="character-sheet-layout-header grid gap-2 rounded-lg border-2 border-stone-900 bg-white p-2">
        <div className="flex min-h-20 flex-col justify-end border-b-2 border-stone-900 px-2 pb-1">
          <TextValue
            value={character.name}
            editable={editable}
            onChange={(name) => patch({ name })}
            ariaLabel="Character name"
            className="font-serif text-2xl font-black"
          />
          <FieldLabel>Character Name</FieldLabel>
        </div>
        <div className="character-sheet-layout-meta grid grid-cols-2 gap-x-3 gap-y-2">
          <label className="border-b border-stone-900 px-1">
            {editable ? (
              <span className="grid grid-cols-[1fr_3.2rem] gap-1">
                <input
                  value={character.className}
                  onChange={(event) => patch({ className: event.target.value })}
                  aria-label="Character class"
                  className="min-w-0 bg-transparent text-sm font-semibold outline-none"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={character.level}
                  onChange={(event) => setNumber("level", event.target.value)}
                  aria-label="Character level"
                  className="w-full bg-transparent text-center text-sm font-semibold outline-none"
                />
              </span>
            ) : (
              <span className="block min-h-5 text-sm font-semibold">
                {character.className}
                {character.subclass ? ` (${character.subclass})` : ""} {character.level}
              </span>
            )}
            <FieldLabel>Class &amp; Level</FieldLabel>
          </label>
          <MetaField
            label="Background"
            value={character.background}
            editable={editable}
            onChange={(background) => patch({ background })}
          />
          <MetaField
            label="Player Name"
            value={character.playerName}
            editable={editable}
            onChange={(playerName) => patch({ playerName })}
          />
          <MetaField
            label="Race"
            value={character.species}
            editable={editable}
            onChange={(species) => patch({ species })}
          />
          <MetaField
            label="Alignment"
            value={character.alignment}
            editable={editable}
            onChange={(alignment) => patch({ alignment })}
          />
          <label className="border-b border-stone-900 px-1">
            {editable ? (
              <input
                type="number"
                min={0}
                value={character.experiencePoints ?? 0}
                onChange={(event) => setNumber("experiencePoints", event.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
                aria-label="Experience points"
              />
            ) : (
              <span className="block min-h-5 text-sm font-semibold">
                {character.experiencePoints ?? 0}
              </span>
            )}
            <FieldLabel>Experience Points</FieldLabel>
          </label>
        </div>
      </header>

      <div className="character-sheet-layout-columns mt-3 grid items-start gap-3">
        <div className="grid min-w-0 gap-2">
          <div className="grid grid-cols-[5.1rem_1fr] gap-2">
            <div className="grid gap-2">
              {ABILITIES.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex min-h-24 flex-col items-center rounded-[1.75rem_1.75rem_2.4rem_2.4rem] border-2 border-stone-900 bg-white px-1 py-1"
                >
                  <span className="text-[8px] font-black uppercase tracking-wide">{label}</span>
                  <strong className="my-1 text-2xl leading-none">
                    {formatMod(abilityMod(character.abilities[key]))}
                  </strong>
                  {editable ? (
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={character.abilities[key]}
                      onChange={(event) => patchAbility(key, event.target.value)}
                      aria-label={`${label} score`}
                      className="mt-auto w-10 rounded-full border border-stone-900 bg-white py-0.5 text-center text-sm font-bold outline-none"
                    />
                  ) : (
                    <span className="mt-auto min-w-10 rounded-full border border-stone-900 bg-white px-2 py-0.5 text-center text-sm font-bold">
                      {character.abilities[key]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="grid content-start gap-2">
              <div className="grid grid-cols-[3rem_1fr] items-center rounded-lg border-2 border-stone-900 bg-white p-1.5">
                <label className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={character.inspiration ?? false}
                    disabled={!editable}
                    onChange={(event) => patch({ inspiration: event.target.checked })}
                    aria-label="Inspiration"
                    className="h-5 w-5 accent-stone-900"
                  />
                </label>
                <span className="text-[9px] font-black uppercase tracking-wide">Inspiration</span>
              </div>
              <div className="grid grid-cols-[3rem_1fr] items-center rounded-lg border-2 border-stone-900 bg-white p-1.5">
                <strong className="text-center text-lg">{formatMod(prof)}</strong>
                <span className="text-[9px] font-black uppercase tracking-wide">
                  Proficiency Bonus
                </span>
              </div>
              <SheetBox title="Saving Throws">
                <ul className="grid gap-1">
                  {ABILITIES.map(({ key, label }) => {
                    const value =
                      abilityMod(character.abilities[key]) + (saveProficiencies.has(key) ? prof : 0);
                    return (
                      <li key={key} className="grid grid-cols-[0.75rem_1.8rem_1fr] items-center text-[10px]">
                        <DotToggle
                          active={saveProficiencies.has(key)}
                          editable={editable}
                          label={`Toggle ${label} saving throw proficiency`}
                          onToggle={() => toggleSave(key)}
                        />
                        <span className="border-b border-stone-600 text-center font-bold">
                          {formatMod(value)}
                        </span>
                        <span className="pl-1">{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </SheetBox>
              <SheetBox title="Skills">
                <ul className="grid gap-0.5">
                  {SKILLS.map((skill) => {
                    const value =
                      abilityMod(character.abilities[skill.ability]) +
                      (skillProficiencies.has(skill.key) ? prof : 0);
                    return (
                      <li
                        key={skill.key}
                        className="grid grid-cols-[0.75rem_1.8rem_1fr_1.4rem] items-center text-[9px]"
                      >
                        <DotToggle
                          active={skillProficiencies.has(skill.key)}
                          editable={editable}
                          label={`Toggle ${skill.label} proficiency`}
                          onToggle={() => toggleSkill(skill.key)}
                        />
                        <span className="border-b border-stone-600 text-center font-bold">
                          {formatMod(value)}
                        </span>
                        <span className="pl-1">{skill.label}</span>
                        <span className="text-right text-[8px] text-stone-500">
                          {skill.ability.toUpperCase()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </SheetBox>
            </div>
          </div>
          <div className="grid grid-cols-[3rem_1fr] items-center rounded-lg border-2 border-stone-900 bg-white p-2">
            <strong className="text-center text-lg">{effectivePassivePerception(character)}</strong>
            <span className="text-[9px] font-black uppercase tracking-wide">
              Passive Wisdom (Perception)
            </span>
          </div>
          <SheetBox title="Other Proficiencies & Languages">
            <TextValue
              value={character.otherProficiencies ?? ""}
              editable={editable}
              onChange={(otherProficiencies) => patch({ otherProficiencies })}
              multiline
              ariaLabel="Other proficiencies and languages"
            />
          </SheetBox>
        </div>

        <div className="grid min-w-0 gap-2">
          <div className="grid grid-cols-3 gap-2">
            <CombatPod
              label="Armor Class"
              value={effectiveAc(character)}
              editable={editable}
              onChange={(raw) => setNumber("ac", raw)}
            />
            <CombatPod
              label="Initiative"
              value={formatMod(effectiveInitiative(character))}
              editable={false}
              onChange={() => undefined}
            />
            <CombatPod
              label="Speed"
              value={`${effectiveSpeed(character)} ft`}
              editable={editable}
              onChange={(raw) => setNumber("speed", raw)}
            />
          </div>
          <SheetBox title="Hit Point Maximum">
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <label className="border-b border-stone-700">
                <span className="text-[8px] uppercase text-stone-500">Maximum</span>
                <NumberValue
                  value={effectiveMaxHp(character)}
                  editable={editable}
                  onChange={(raw) => setNumber("maxHp", raw)}
                  label="Maximum hit points"
                />
              </label>
              <label className="border-b border-stone-700">
                <span className="text-[8px] uppercase text-stone-500">Current</span>
                <NumberValue
                  value={character.currentHp ?? effectiveMaxHp(character)}
                  editable={editable}
                  onChange={(raw) => setNumber("currentHp", raw)}
                  label="Current hit points"
                />
              </label>
            </div>
          </SheetBox>
          <SheetBox title="Temporary Hit Points">
            <NumberValue
              value={character.temporaryHp ?? 0}
              editable={editable}
              onChange={(raw) => setNumber("temporaryHp", raw)}
              label="Temporary hit points"
            />
          </SheetBox>
          <div className="grid grid-cols-2 gap-2">
            <SheetBox title="Hit Dice">
              <TextValue
                value={character.hitDice || `${character.level}d8`}
                editable={editable}
                onChange={(hitDice) => patch({ hitDice })}
                ariaLabel="Hit dice"
                className="text-center text-lg font-bold"
              />
            </SheetBox>
            <SheetBox title="Death Saves">
              {(["Successes", "Failures"] as const).map((label) => {
                const key = label === "Successes" ? "deathSaveSuccesses" : "deathSaveFailures";
                const count = character[key] ?? 0;
                return (
                  <div key={label} className="flex items-center justify-between gap-1 text-[8px] uppercase">
                    <span>{label}</span>
                    <span className="flex gap-1">
                      {[1, 2, 3].map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!editable}
                          onClick={() => patch({ [key]: count === value ? value - 1 : value })}
                          className={`h-2.5 w-2.5 rounded-full border border-stone-900 ${
                            count >= value ? "bg-stone-900" : "bg-white"
                          } disabled:cursor-default`}
                          aria-label={`${label} ${value}`}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </SheetBox>
          </div>
          <SheetBox title="Attacks & Spellcasting">
            <div className="grid grid-cols-[1.35fr_0.65fr_1fr] border-b border-stone-900 pb-1 text-[8px] font-bold uppercase">
              <span>Name</span>
              <span>Atk Bonus</span>
              <span>Damage / Type</span>
            </div>
            <div className="grid min-h-28 content-start gap-1 pt-1">
              {(attacks.length ? attacks : [{ id: "empty", name: "", attackBonus: "", damageType: "" }]).map(
                (attack, attackIndex) => (
                  <div
                    key={attack.id}
                    className="grid grid-cols-[1.35fr_0.65fr_1fr] gap-1 text-[10px]"
                  >
                    {editable ? (
                      <>
                        {(["name", "attackBonus", "damageType"] as const).map((key) => (
                          <input
                            key={key}
                            value={attack[key]}
                            onChange={(event) => {
                              const next = [...(character.attacks ?? [])];
                              const row =
                                next[attackIndex] ??
                                ({
                                  id: attack.id === "empty" ? `attack-${Date.now()}` : attack.id,
                                  name: "",
                                  attackBonus: "",
                                  damageType: "",
                                } satisfies CharacterAttack);
                              next[attackIndex] = { ...row, [key]: event.target.value };
                              patch({ attacks: next });
                            }}
                            aria-label={`${key} for attack ${attackIndex + 1}`}
                            className="min-w-0 border-b border-stone-400 bg-transparent outline-none"
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        <span className="border-b border-stone-400">{attack.name || "—"}</span>
                        <span className="border-b border-stone-400">
                          {attack.attackBonus || "—"}
                        </span>
                        <span className="border-b border-stone-400">
                          {attack.damageType || "—"}
                        </span>
                      </>
                    )}
                  </div>
                ),
              )}
              {editable ? (
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      attacks: [
                        ...(character.attacks ?? []),
                        {
                          id: `attack-${Date.now()}`,
                          name: "",
                          attackBonus: "",
                          damageType: "",
                        },
                      ],
                    })
                  }
                  className="mt-1 justify-self-start text-[9px] font-bold uppercase text-stone-700"
                >
                  + Add attack
                </button>
              ) : null}
            </div>
          </SheetBox>
          <SheetBox title="Equipment" className="min-h-52">
            <div className="grid grid-cols-[3.3rem_1fr] gap-2">
              <div className="grid content-start gap-1">
                {(Object.keys(currency) as (keyof CharacterCurrency)[]).map((coin) => (
                  <label key={coin} className="grid grid-cols-[1.2rem_1fr] items-center">
                    <span className="text-[8px] font-bold uppercase">{coin}</span>
                    {editable ? (
                      <input
                        type="number"
                        min={0}
                        value={currency[coin]}
                        onChange={(event) =>
                          patch({
                            currency: {
                              ...currency,
                              [coin]: Number.parseInt(event.target.value, 10) || 0,
                            },
                          })
                        }
                        className="w-full rounded-full border border-stone-900 bg-white px-1 text-center text-[10px]"
                        aria-label={`${coin.toUpperCase()} currency`}
                      />
                    ) : (
                      <span className="rounded-full border border-stone-900 px-1 text-center text-[10px]">
                        {currency[coin]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <ul className="grid content-start gap-1 text-[10px]">
                {character.items.length ? (
                  character.items.map((item) => (
                    <li key={item.id} className="border-b border-stone-300 pb-0.5">
                      <strong>{item.name}</strong>
                      {item.notes ? ` — ${item.notes}` : ""}
                    </li>
                  ))
                ) : (
                  <li>—</li>
                )}
              </ul>
            </div>
          </SheetBox>
        </div>

        <div className="grid min-w-0 gap-2">
          {(
            [
              ["Personality Traits", "personalityTraits"],
              ["Ideals", "ideals"],
              ["Bonds", "bonds"],
              ["Flaws", "flaws"],
            ] as const
          ).map(([label, key]) => (
            <SheetBox key={key} title={label} className="min-h-24">
              <TextValue
                value={character[key] ?? ""}
                editable={editable}
                onChange={(value) => patch({ [key]: value })}
                multiline
                ariaLabel={label}
              />
            </SheetBox>
          ))}
          <SheetBox title="Features & Traits" className="min-h-80">
            <div className="max-h-[32rem] overflow-y-auto pr-1">
              <TextValue
                value={character.features || character.notes}
                editable={editable}
                onChange={(features) => patch({ features })}
                multiline
                ariaLabel="Features and traits"
                className="min-h-72"
              />
            </div>
          </SheetBox>
        </div>
      </div>
    </article>
  );
}

function MetaField({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="border-b border-stone-900 px-1">
      <TextValue
        value={value}
        editable={editable}
        onChange={onChange}
        ariaLabel={label}
        className="min-h-5 text-sm font-semibold"
      />
      <FieldLabel>{label}</FieldLabel>
    </label>
  );
}

function NumberValue({
  value,
  editable,
  onChange,
  label,
}: {
  value: number;
  editable: boolean;
  onChange: (value: string) => void;
  label: string;
}) {
  return editable ? (
    <input
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="w-full bg-transparent text-center text-xl font-bold outline-none"
    />
  ) : (
    <strong className="block text-center text-xl">{value}</strong>
  );
}

function CombatPod({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string | number;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center rounded-[2rem_2rem_0.75rem_0.75rem] border-2 border-stone-900 bg-white p-2">
      {editable ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="w-full bg-transparent text-center text-2xl font-black outline-none"
        />
      ) : (
        <strong className="text-2xl">{value}</strong>
      )}
      <FieldLabel>{label}</FieldLabel>
    </div>
  );
}
