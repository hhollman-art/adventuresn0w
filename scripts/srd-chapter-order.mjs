/** Canonical SRD 5.2.1 chapter order — matches scripts/build-srd-document.mjs concatenation. */
export const SRD_CHAPTER_ORDER = [
  { id: "playing-the-game", title: "Playing the Game" },
  { id: "character-creation", title: "Character Creation" },
  { id: "character-origins", title: "Character Origins" },
  { id: "classes", title: "Character Classes" },
  { id: "feats", title: "Feats" },
  { id: "equipment", title: "Equipment" },
  { id: "spells", title: "Spells" },
  { id: "rules-glossary", title: "Rules Glossary" },
  { id: "gameplay-toolbox", title: "Gameplay Toolbox" },
  { id: "magic-items", title: "Magic Items" },
  { id: "monsters", title: "Monsters" },
  { id: "monsters-a-z", title: "Monsters A–Z" },
  { id: "animals", title: "Animals" },
];

/** Find each chapter's start offset using sequential search (avoids false early matches). */
export function buildChapterMarkers(body) {
  let searchFrom = 0;
  const markers = [];
  for (const chapter of SRD_CHAPTER_ORDER) {
    const needle = `## ${chapter.title}\n`;
    const start = body.indexOf(needle, searchFrom);
    if (start < 0) continue;
    markers.push({ id: chapter.id, title: chapter.title, start });
    searchFrom = start + needle.length;
  }
  return markers;
}

export function chapterForOffset(markers, index) {
  let chapter = markers[0]?.id ?? "unknown";
  for (const marker of markers) {
    if (marker.start <= index) chapter = marker.id;
    else break;
  }
  return chapter;
}
