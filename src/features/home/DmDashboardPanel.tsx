"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onCampaignsChanged } from "@/lib/campaigns";
import { onCharactersChanged } from "@/lib/tabletop/characterLibrary";
import { onItemsChanged } from "@/lib/itemLibrary";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { dmTip } from "@/lib/ui/dmTips";
import {
  formatDashboardKindLabel,
  formatDashboardPartyLine,
  loadDmDashboardSnapshot,
  type DmDashboardSnapshot,
  type QuickCreateAction,
} from "@/lib/workshop/dmDashboard";

type DmDashboardPanelProps = {
  onQuickCreate: (action: QuickCreateAction) => void;
};

const QUICK_CREATE: {
  action: QuickCreateAction;
  label: string;
  icon: string;
  tipKey: Parameters<typeof dmTip>[0];
}[] = [
  { action: "npc", label: "NPC", icon: APP_ICONS.combat, tipKey: "quickNpc" },
  { action: "item", label: "Item", icon: APP_ICONS.chest, tipKey: "quickItem" },
  { action: "location", label: "Location", icon: APP_ICONS.map, tipKey: "quickLocation" },
  { action: "quest", label: "Quest", icon: APP_ICONS.scroll, tipKey: "quickQuest" },
];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DmDashboardPanel({ onQuickCreate }: DmDashboardPanelProps) {
  const [snapshot, setSnapshot] = useState<DmDashboardSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void loadDmDashboardSnapshot().then((data) => {
        if (!cancelled) setSnapshot(data);
      });
    };
    refresh();
    const offCampaigns = onCampaignsChanged(refresh);
    const offCharacters = onCharactersChanged(refresh);
    const offItems = onItemsChanged(refresh);
    return () => {
      cancelled = true;
      offCampaigns();
      offCharacters();
      offItems();
    };
  }, []);

  const active = snapshot?.activeCampaign ?? null;

  return (
    <section
      className="forge-forest-card dm-dashboard-panel"
      aria-labelledby="dm-dashboard-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="dm-dashboard-heading" className="workshop-welcome-section-title font-display">
            <span aria-hidden="true">{APP_ICONS.campaign} </span>
            Prep dashboard
          </h2>
          <p className="workshop-welcome-muted mt-1 text-xs leading-relaxed">
            Your active chronicle, recent table work, and the Creation Files you touched last.
          </p>
        </div>
        <Link href="/campaigns" className="btn btn-sm btn-accent">
          Manage campaigns
        </Link>
      </div>

      <div className="dm-dashboard-grid mt-4">
        <article className="dm-dashboard-card">
          <h3 className="font-display text-sm font-bold text-[var(--text)]">Active campaign</h3>
          {active ? (
            <>
              <p className="mt-2 font-display text-lg font-bold text-[var(--accent-dim)]">
                {active.name}
              </p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">
                {formatDashboardPartyLine(snapshot?.partyName ?? null)}
              </p>
              {active.description ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)] line-clamp-2">
                  {active.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/campaigns" className="btn btn-sm">
                  Open chronicle
                </Link>
                <Link href="/table" className="btn btn-sm btn-primary">
                  {APP_ICONS.virtualTable} Virtual Table
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                No campaign is active yet — pick one on the Campaigns page to scope your Library.
              </p>
              <Link href="/campaigns" className="btn btn-sm btn-accent mt-3">
                Start a chronicle
              </Link>
            </>
          )}
        </article>

        <article className="dm-dashboard-card">
          <h3 className="font-display text-sm font-bold text-[var(--text)]">Recent table sessions</h3>
          {snapshot?.recentSessions.length ? (
            <ul className="mt-2 space-y-2">
              {snapshot.recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={session.href}
                    className="dm-dashboard-link-row block rounded-md border px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-[var(--text)]">{session.label}</span>
                    <span className="mt-0.5 block text-[var(--muted)]">
                      {session.mapName} · {formatWhen(session.updatedAt)}
                    </span>
                    {session.logPreview ? (
                      <span className="mt-1 block text-[var(--text-soft)] line-clamp-1">
                        {session.logPreview}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-soft)]">
              No shelved tables yet — open the Virtual Table to begin a session.
            </p>
          )}
        </article>

        <article className="dm-dashboard-card">
          <h3 className="font-display text-sm font-bold text-[var(--text)]">Recently touched</h3>
          {snapshot?.recentCreations.length ? (
            <ul className="mt-2 space-y-2">
              {snapshot.recentCreations.map((row) => (
                <li key={`${row.ciClass}-${row.id}`}>
                  <Link
                    href={row.href}
                    className="dm-dashboard-link-row block rounded-md border px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-[var(--text)]">{row.title}</span>
                    <span className="mt-0.5 block text-[var(--muted)]">
                      {formatDashboardKindLabel(row.ciClass)} · {formatWhen(row.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-soft)]">
              Nothing saved yet — plant a CF or craft something in the Fantasy Forge.
            </p>
          )}
          <Link href="/library" className="btn btn-sm mt-3">
            {APP_ICONS.library} Browse Library
          </Link>
        </article>

        <article className="dm-dashboard-card">
          <h3 className="font-display text-sm font-bold text-[var(--text)]">Quick create</h3>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            Jump straight to the workplace for common prep tasks.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {QUICK_CREATE.map((entry) => (
              <div key={entry.action} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onQuickCreate(entry.action)}
                  className="btn btn-sm w-full justify-center"
                  title={dmTip(entry.tipKey)}
                >
                  <span aria-hidden="true">{entry.icon} </span>
                  {entry.label}
                </button>
                <p className="text-[10px] leading-snug text-[var(--muted)]">{dmTip(entry.tipKey)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
