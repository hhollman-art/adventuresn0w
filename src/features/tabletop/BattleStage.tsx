"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { TabletopSession, TabletopToken } from "@/lib/tabletop/types";
import { brushCells, cellKey, clampTokenPosition, parseCellKey } from "@/lib/tabletop/grid";

export const CELL_PX = 44;

export type StageTool = "select" | "reveal" | "hide";

type BattleStageProps = {
  session: TabletopSession;
  mode: "dm" | "player";
  tool?: StageTool;
  brushRadius?: number;
  selectedTokenId?: string | null;
  activeTokenId?: string | null;
  onSelectToken?: (id: string | null) => void;
  onMoveToken?: (id: string, x: number, y: number) => void;
  onPaintCells?: (keys: string[], reveal: boolean) => void;
};

type Camera = { scale: number; x: number; y: number };

export default function BattleStage({
  session,
  mode,
  tool = "select",
  brushRadius = 1,
  selectedTokenId = null,
  activeTokenId = null,
  onSelectToken,
  onMoveToken,
  onPaintCells,
}: BattleStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<Camera>({ scale: 1, x: 24, y: 24 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const isDm = mode === "dm";
  const { cols, rows } = session.grid;
  const stageW = cols * CELL_PX;
  const stageH = rows * CELL_PX;

  // Drag state lives in refs; pointer events are frequent and re-renders come
  // from the session updates they trigger.
  const dragRef = useRef<
    | { kind: "pan"; startX: number; startY: number; camX: number; camY: number }
    | {
        kind: "token";
        id: string;
        size: number;
        offsetX: number;
        offsetY: number;
      }
    | { kind: "paint"; reveal: boolean }
    | null
  >(null);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cam = cameraRef.current;
    const px = clientX - (rect?.left ?? 0);
    const py = clientY - (rect?.top ?? 0);
    return { x: (px - cam.x) / cam.scale, y: (py - cam.y) / cam.scale };
  }, []);

  const paintAt = useCallback(
    (clientX: number, clientY: number, reveal: boolean) => {
      const world = toWorld(clientX, clientY);
      const cx = Math.floor(world.x / CELL_PX);
      const cy = Math.floor(world.y / CELL_PX);
      const keys = brushCells(cx, cy, brushRadius, cols, rows);
      if (keys.length > 0) onPaintCells?.(keys, reveal);
    },
    [toWorld, brushRadius, cols, rows, onPaintCells],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2 || !isDm || tool === "select") {
      // Pan: middle/right button always, or left button on empty ground.
      const target = e.target as HTMLElement;
      const tokenId = target.closest<HTMLElement>("[data-token-id]")?.dataset.tokenId;
      if (e.button === 0 && isDm && tool === "select" && tokenId) {
        const token = session.tokens.find((t) => t.id === tokenId);
        if (token) {
          const world = toWorld(e.clientX, e.clientY);
          dragRef.current = {
            kind: "token",
            id: token.id,
            size: token.size,
            offsetX: world.x / CELL_PX - token.x,
            offsetY: world.y / CELL_PX - token.y,
          };
          onSelectToken?.(token.id);
          e.currentTarget.setPointerCapture(e.pointerId);
          e.preventDefault();
          return;
        }
      }
      if (e.button === 0 && tool === "select") onSelectToken?.(null);
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (isDm && (tool === "reveal" || tool === "hide") && e.button === 0) {
      const reveal = tool === "reveal";
      dragRef.current = { kind: "paint", reveal };
      paintAt(e.clientX, e.clientY, reveal);
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "pan") {
      setCamera((cam) => ({
        ...cam,
        x: drag.camX + (e.clientX - drag.startX),
        y: drag.camY + (e.clientY - drag.startY),
      }));
    } else if (drag.kind === "token") {
      const world = toWorld(e.clientX, e.clientY);
      const pos = clampTokenPosition(
        world.x / CELL_PX - drag.offsetX,
        world.y / CELL_PX - drag.offsetY,
        drag.size,
        cols,
        rows,
        false,
      );
      onMoveToken?.(drag.id, pos.x, pos.y);
    } else {
      paintAt(e.clientX, e.clientY, drag.reveal);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === "token" && session.grid.snap) {
      const token = session.tokens.find((t) => t.id === drag.id);
      if (token) {
        const pos = clampTokenPosition(token.x, token.y, token.size, cols, rows, true);
        onMoveToken?.(drag.id, pos.x, pos.y);
      }
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setCamera((cam) => {
      const nextScale = Math.min(3, Math.max(0.25, cam.scale * (e.deltaY < 0 ? 1.12 : 0.89)));
      // Zoom toward the cursor: keep the world point under it fixed.
      const wx = (px - cam.x) / cam.scale;
      const wy = (py - cam.y) / cam.scale;
      return { scale: nextScale, x: px - wx * nextScale, y: py - wy * nextScale };
    });
  };

  // Fit the map on mount, when the grid dimensions change, and whenever the
  // viewport itself resizes (window resize, entering/leaving fullscreen).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const fitCamera = () => {
      if (el.clientWidth === 0 || el.clientHeight === 0) return;
      const fit = Math.min(el.clientWidth / (stageW + 48), el.clientHeight / (stageH + 48), 1.5);
      const scale = Math.max(0.25, fit);
      setCamera({
        scale,
        x: (el.clientWidth - stageW * scale) / 2,
        y: (el.clientHeight - stageH * scale) / 2,
      });
    };

    fitCamera();
    const observer = new ResizeObserver(fitCamera);
    observer.observe(el);
    return () => observer.disconnect();
  }, [stageW, stageH]);

  const revealedSet = new Set(session.fog.revealed);
  const fogOpacity = isDm ? 0.45 : 1;

  const cursor =
    isDm && (tool === "reveal" || tool === "hide")
      ? "crosshair"
      : dragRef.current?.kind === "pan"
        ? "grabbing"
        : "grab";

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full touch-none overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border)", background: "#1a1712", cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: stageW,
          height: stageH,
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Map surface */}
        {session.mapImageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.mapImageDataUrl}
            alt={session.mapName}
            draggable={false}
            className="absolute top-0 left-0 select-none"
            style={{ width: stageW, height: stageH, objectFit: "fill" }}
          />
        ) : (
          <div
            className="absolute top-0 left-0"
            style={{
              width: stageW,
              height: stageH,
              background:
                "radial-gradient(ellipse 80% 70% at 50% 40%, #4a4232, #322b1e 70%, #262114)",
            }}
          />
        )}

        {/* Grid, fog, and highlights */}
        <svg
          className="absolute top-0 left-0"
          width={stageW}
          height={stageH}
          viewBox={`0 0 ${stageW} ${stageH}`}
        >
          {session.grid.visible && (
            <g stroke="rgba(255,255,255,0.22)" strokeWidth={1}>
              {Array.from({ length: cols + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i * CELL_PX} y1={0} x2={i * CELL_PX} y2={stageH} />
              ))}
              {Array.from({ length: rows + 1 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * CELL_PX} x2={stageW} y2={i * CELL_PX} />
              ))}
            </g>
          )}
          {session.fog.enabled && (
            <g fill="#0b0a08" opacity={fogOpacity}>
              {Array.from({ length: rows }, (_, y) =>
                Array.from({ length: cols }, (_, x) =>
                  revealedSet.has(cellKey(x, y)) ? null : (
                    <rect
                      key={cellKey(x, y)}
                      x={x * CELL_PX}
                      y={y * CELL_PX}
                      width={CELL_PX}
                      height={CELL_PX}
                    />
                  ),
                ),
              )}
            </g>
          )}
        </svg>

        {/* Tokens */}
        {session.tokens.map((token) => (
          <TokenChip
            key={token.id}
            token={token}
            isDm={isDm}
            selected={token.id === selectedTokenId}
            active={token.id === activeTokenId}
            fogHidesIt={
              !isDm && session.fog.enabled && !tokenTouchesRevealed(token, revealedSet)
            }
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute right-2 bottom-2 rounded-md px-2 py-1 text-[11px]"
        style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.85)" }}
      >
        {session.mapName} &middot; {cols}&times;{rows} &middot; {Math.round(camera.scale * 100)}%
      </div>
    </div>
  );
}

function tokenTouchesRevealed(token: TabletopToken, revealed: Set<string>): boolean {
  for (const key of revealed) {
    const cell = parseCellKey(key);
    if (!cell) continue;
    if (
      cell.x >= Math.floor(token.x) &&
      cell.x < token.x + token.size &&
      cell.y >= Math.floor(token.y) &&
      cell.y < token.y + token.size
    ) {
      return true;
    }
  }
  return false;
}

function TokenChip({
  token,
  isDm,
  selected,
  active,
  fogHidesIt,
}: {
  token: TabletopToken;
  isDm: boolean;
  selected: boolean;
  active: boolean;
  fogHidesIt: boolean;
}) {
  if (fogHidesIt) return null;
  const px = token.size * CELL_PX;
  const hpPct =
    token.hp && token.hp.max > 0
      ? Math.min(100, Math.max(0, (token.hp.current / token.hp.max) * 100))
      : null;

  return (
    <div
      data-token-id={token.id}
      className="absolute select-none"
      style={{
        left: token.x * CELL_PX,
        top: token.y * CELL_PX,
        width: px,
        height: px,
        opacity: token.hidden ? 0.45 : 1,
        cursor: isDm ? "move" : "default",
      }}
      title={token.label}
    >
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-bold text-white"
        style={{
          background: token.imageDataUrl
            ? `${token.color} url("${token.imageDataUrl}") center / cover no-repeat`
            : token.color,
          border: token.hidden ? "2px dashed rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.85)",
          boxShadow: active
            ? "0 0 0 3px #facc15, 0 2px 6px rgba(0,0,0,0.5)"
            : selected
              ? "0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.5)"
              : "0 2px 6px rgba(0,0,0,0.5)",
          fontSize: Math.max(11, px * 0.3),
          textShadow: "0 1px 2px rgba(0,0,0,0.7)",
        }}
      >
        {token.imageDataUrl ? null : initials(token.label)}
      </div>
      {hpPct !== null && (
        <div
          className="absolute right-1 -bottom-1.5 left-1 h-1.5 overflow-hidden rounded-full"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${hpPct}%`,
              background: hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
      )}
      <div
        className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white"
        style={{ background: "rgba(0,0,0,0.65)" }}
      >
        {token.label}
      </div>
    </div>
  );
}

function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
