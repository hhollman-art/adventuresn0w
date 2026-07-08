# SRD source PDF

Place the official **SRD_CC_v5.2.1.pdf** here:

```
data/srd-source/SRD_CC_v5.2.1.pdf
```

This is the default input for PDF-driven parser scripts. The file is gitignored (local only).

## Commands

```bash
# Unified macro files (create_a_character, fighter, gameplay_mechanics)
npm run build:macro-srd -- --dry-run
npm run build:macro-srd

# Legacy: all 12 class files + macro bundles
npm run consolidate:srd-macro -- --dry-run

# PDF extraction → srd_database.json
npm run parse:srd-pdf -- --dry-run
npm run parse:srd-pdf
```

Outputs:
- `data/srd/srd_database.json`
- `data/srd/macro/` (create_a_character, classes/*, gameplay_mechanics)

Cursor rule: `.cursor/rules/srd-pdf-source.mdc`
