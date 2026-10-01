# D&D Easy — Project Glossary

These seven terms are the **strict, permanent domain vocabulary** for all backend
architecture, database schemas, storage modules, and folder structures going
forward. They were fixed at the start of the Strangler Rewrite (Phase 1,
Groundwork) and are not open to re-theming in code.

UI copy may still use fantasy flavour where it helps a Dungeon Master guess a
feature's purpose, but **identifiers, file names, storage keys, schema names,
and API paths use only the terms below.** When legacy code uses a replaced
term, the strangler port renames it to the canonical term in the same change.

## The seven terms

- **App**: The universal container (`ddeasy`). Completely replaces "DMMS".
- **Workshop**: The prep/management mode. Replaces "Forge", "Prep mode", and "Command Center".
- **Tabletop**: The live playing mode. Replaces "Virtual Table", "VTT", and "Live session".
- **Dashboard**: The landing route (`/`). Replaces "The Hearth" and "Home Page".
- **Library**: The central storage repository. Replaces all variations of "Vault" and "CMDB".
- **Document**: The atomic data row engine. This completely unifies "CI" and "CF".
- **Asset**: Static reference data (e.g., the SRD).

## How to apply them

| Canonical term | Code identifier form | Legacy terms it retires |
|---|---|---|
| App | `app`, `ddeasy` | DMMS, Dungeon Master Management System |
| Workshop | `workshop` | Fantasy Forge, Forge, Prep mode, Command Center, control tower, Power Workspace |
| Tabletop | `tabletop` | Virtual Table, VTT, Live session, Live mode, Battle stage, table |
| Dashboard | `dashboard` | The Hearth, Hearth, Home page, welcome, landing |
| Library | `library` | The Vault, Lore Vault, Arcane Vault, CMDB, configuration management database, repository |
| Document | `document` | CI, Configuration Item, CF, Creation File, CF card, mini-card, piece, artifact, entry, row |
| Asset | `asset` | bundled SRD data, `*.data.ts`, included rules (as a storage concept) |

Rules of use:

1. **One term per concept.** Do not introduce synonyms in code, even themed ones.
2. **Documents are user-owned; Assets are read-only.** A row the DM can edit or
   delete is a Document. Reference data that ships with the App is an Asset.
   The two never share a storage module.
3. **Modes, not zones.** The App has exactly two modes — Workshop and Tabletop.
   Screens inside a mode are routes, not "workspaces", "workplaces", "zones",
   "canvases", or "cores".
4. **The Dashboard is a route, not a mode.** It lives at `/` inside the Workshop.
5. **Assets live under `public/`** and are fetched on demand; they are never
   compiled into the JavaScript bundle (see `public/srd/`).
