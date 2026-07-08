"use client";

import { useCallback, useMemo, useState } from "react";
import WorkshopPageShell from "@/features/workshop/WorkshopPageShell";
import { useWorkspaceRouter } from "@/contexts/WorkspaceContextRouter";
import { parseEncounterCombatantsFromMarkdown } from "@/lib/encounter/parseEncounterMarkdown";
import type { EncounterCombatant } from "@/lib/encounter/types";
import type { TokenKind } from "@/lib/tabletop/types";
import { TOKEN_KIND_LABEL } from "@/lib/tabletop/types";

const EMPTY_COMBATANT = (): EncounterCombatant => ({
  label: "",
  kind: "monster",
  count: 1,
});

export default function EncounterPrepPage() {
  const { sendEncounterToCombat } = useWorkspaceRouter();
  const [name, setName] = useState("Tonight's encounter");
  const [mapName, setMapName] = useState("");
  const [notes, setNotes] = useState("");
  const [combatants, setCombatants] = useState<EncounterCombatant[]>([
    { label: "Goblin", kind: "monster", count: 3, maxHp: 7 },
  ]);
  const [status, setStatus] = useState<string | null>(null);

  const canSend = useMemo(
    () => name.trim().length > 0 && combatants.some((row) => row.label.trim().length > 0),
    [name, combatants],
  );

  const updateRow = useCallback((index: number, patch: Partial<EncounterCombatant>) => {
    setCombatants((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = useCallback((index: number) => {
    setCombatants((rows) => rows.filter((_, i) => i !== index));
  }, []);

  const importFromNotes = useCallback(() => {
    const parsed = parseEncounterCombatantsFromMarkdown(notes);
    if (parsed.length === 0) {
      setStatus("No **Encounter:** lines found in your notes yet.");
      return;
    }
    setCombatants(parsed);
    setStatus(`Imported ${parsed.length} combatant group${parsed.length === 1 ? "" : "s"} from notes.`);
  }, [notes]);

  const handleSend = useCallback(() => {
    const payload = {
      encounterName: name.trim(),
      mapName: mapName.trim() || name.trim(),
      combatants: combatants.filter((row) => row.label.trim().length > 0),
      openInitiativePanel: true,
    };
    sendEncounterToCombat(payload);
  }, [combatants, mapName, name, sendEncounterToCombat]);

  return (
    <WorkshopPageShell>
      <div className="encounter-prep-workspace flex min-h-0 flex-col gap-4">
        <header className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <h1 className="font-display text-xl font-bold text-[var(--text)]">Encounter Prep</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Stage monsters and allies for the next beat, then send the roster straight to the live
            initiative tracker — no copy-paste at the table.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section
            className="flex flex-col gap-3 rounded-xl border p-4"
            style={{ borderColor: "var(--border)" }}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Encounter name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Map label (optional)</span>
              <input
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="Crypt antechamber"
                className="rounded border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Scene notes / paste from adventure</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                placeholder="Paste a scene with **Encounter:** 3 goblins, 1 hobgoblin (11 hp) …"
                className="rounded border px-3 py-2 font-mono text-xs leading-relaxed"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </label>
            <button
              type="button"
              onClick={importFromNotes}
              className="self-start rounded-md border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--border)" }}
            >
              Parse combatants from notes
            </button>
          </section>

          <section
            className="flex flex-col gap-3 rounded-xl border p-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Combatants</h2>
              <button
                type="button"
                onClick={() => setCombatants((rows) => [...rows, EMPTY_COMBATANT()])}
                className="rounded-md border px-2 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--accent-dim)", color: "var(--accent)" }}
              >
                + Add row
              </button>
            </div>

            <ul className="flex flex-col gap-2">
              {combatants.map((row, index) => (
                <li
                  key={`${index}-${row.label}`}
                  className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))_auto]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                    placeholder="Creature name"
                    className="rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  />
                  <input
                    value={String(row.count ?? 1)}
                    onChange={(e) =>
                      updateRow(index, { count: Math.max(1, Number(e.target.value) || 1) })
                    }
                    inputMode="numeric"
                    aria-label="Count"
                    className="rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  />
                  <input
                    value={row.maxHp != null ? String(row.maxHp) : ""}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, ""));
                      updateRow(index, { maxHp: Number.isFinite(n) && n > 0 ? n : undefined });
                    }}
                    placeholder="HP"
                    inputMode="numeric"
                    aria-label="Max HP"
                    className="rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  />
                  <input
                    value={row.initiative != null ? String(row.initiative) : ""}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^\d-]/g, ""));
                      updateRow(index, {
                        initiative: Number.isFinite(n) ? n : undefined,
                      });
                    }}
                    placeholder="Init"
                    inputMode="numeric"
                    aria-label="Initiative"
                    className="rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  />
                  <select
                    value={row.kind}
                    onChange={(e) => updateRow(index, { kind: e.target.value as TokenKind })}
                    className="rounded border px-2 py-1.5 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  >
                    {(Object.keys(TOKEN_KIND_LABEL) as TokenKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {TOKEN_KIND_LABEL[kind]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rounded border px-2 py-1 text-xs text-red-800"
                    style={{ borderColor: "var(--border)" }}
                    aria-label="Remove combatant"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            {status ? (
              <p className="text-xs text-[var(--muted)]" role="status">
                {status}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!canSend}
              onClick={handleSend}
              className="encounter-send-to-combat mt-2 rounded-lg px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: "var(--accent)" }}
            >
              Send to Live Initiative Tracker
            </button>
          </section>
        </div>
      </div>
    </WorkshopPageShell>
  );
}
