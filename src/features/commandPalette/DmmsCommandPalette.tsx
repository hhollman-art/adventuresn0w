"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { buildCommandPaletteItems } from "@/lib/commandPalette/buildCommandPaletteItems";
import { searchCommandCenterCatalog } from "@/lib/commandPalette/searchCommandCenterCatalog";
import {
  COMMAND_PALETTE_CATEGORY_LABEL,
  filterCommandPaletteItems,
  groupCommandPaletteItems,
  type CommandPaletteItem,
} from "@/lib/commandPalette/commandPaletteRegistry";
import { COMMAND_PALETTE_OPEN_EVENT } from "@/lib/commandPalette/commandPaletteEvents";

const OPEN_SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "\u2318K" : "Ctrl+K";

export default function DmmsCommandPalette() {
  const router = useRouter();
  const { setOpen: setVaultOpen } = useVaultDrawer();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [catalogItems, setCatalogItems] = useState<CommandPaletteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(
    () =>
      buildCommandPaletteItems({
        router,
        openVault: () => setVaultOpen(true),
      }),
    [router, setVaultOpen],
  );

  const filteredItems = useMemo(() => {
    const commands = filterCommandPaletteItems(allItems, query);
    return [...catalogItems, ...commands];
  }, [allItems, query, catalogItems]);

  const groupedItems = useMemo(() => groupCommandPaletteItems(filteredItems), [filteredItems]);

  const flatItems = useMemo(() => groupedItems.flatMap((group) => group.items), [groupedItems]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const runItem = useCallback(
    async (item: CommandPaletteItem) => {
      close();
      await item.run();
    },
    [close],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onOpenRequest = () => {
      setQuery("");
      setActiveIndex(0);
      setOpen(true);
    };
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenRequest);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, catalogItems]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setCatalogItems([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void searchCommandCenterCatalog(q, router).then((items) => {
        if (!cancelled) setCatalogItems(items);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, router]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "k") return;
      if (event.altKey) return;
      event.preventDefault();
      setOpen((current) => !current);
      if (open) {
        setQuery("");
        setActiveIndex(0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((index) => (index + 1) % flatItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((index) => (index - 1 + flatItems.length) % flatItems.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) void runItem(item);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  if (!mounted || !open) return null;

  let runningIndex = 0;

  return createPortal(
    <div
      className="dmms-command-palette-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="dmms-command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dmms-command-palette-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="dmms-command-palette-search-wrap" htmlFor="dmms-command-palette-input">
          <span id="dmms-command-palette-title" className="sr-only">
            Command palette
          </span>
          <span className="dmms-command-palette-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            id="dmms-command-palette-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search Creation Files and included rules…"
            className="dmms-command-palette-input"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-controls="dmms-command-palette-list"
            aria-activedescendant={
              flatItems[activeIndex] ? `command-item-${flatItems[activeIndex].id}` : undefined
            }
          />
          <kbd className="dmms-command-palette-kbd">{OPEN_SHORTCUT_LABEL}</kbd>
        </label>

        <div
          id="dmms-command-palette-list"
          ref={listRef}
          className="dmms-command-palette-list"
          role="listbox"
          aria-label="Commands"
        >
          {flatItems.length === 0 ? (
            <p className="dmms-command-palette-empty">No matching commands.</p>
          ) : (
            groupedItems.map((group) => (
              <section key={group.category} className="dmms-command-palette-group">
                <h2 className="dmms-command-palette-group-label">
                  {COMMAND_PALETTE_CATEGORY_LABEL[group.category]}
                </h2>
                <ul className="dmms-command-palette-group-list">
                  {group.items.map((item) => {
                    const index = runningIndex;
                    runningIndex += 1;
                    const active = index === activeIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          id={`command-item-${item.id}`}
                          data-command-index={index}
                          role="option"
                          aria-selected={active}
                          className={`dmms-command-palette-item${active ? " is-active" : ""}`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => void runItem(item)}
                        >
                          <span className="dmms-command-palette-item-icon" aria-hidden="true">
                            {item.icon ?? "•"}
                          </span>
                          <span className="dmms-command-palette-item-copy">
                            <span className="dmms-command-palette-item-label">{item.label}</span>
                            {item.hint ? (
                              <span className="dmms-command-palette-item-hint">{item.hint}</span>
                            ) : null}
                          </span>
                          {active ? (
                            <kbd className="dmms-command-palette-enter-hint" aria-hidden="true">
                              ↵
                            </kbd>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <footer className="dmms-command-palette-footer">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
