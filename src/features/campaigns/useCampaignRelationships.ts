"use client";

import { useCallback, useEffect, useState } from "react";
import type { CfRelationship } from "@/lib/workshop/containerCf";
import {
  loadContainerRelationshipsFor,
  onContainerRelationshipsChanged,
} from "@/lib/workshop/containerRelationships";
import { mergeRelationshipRows } from "@/lib/campaignBuilder/zoneCards";

/**
 * Relationship rows owned by one campaign, kept in sync with storage.
 * `addOptimistic` shows a just-dropped instance before the reload lands.
 */
export function useCampaignRelationships(campaignId: string | null) {
  const [rows, setRows] = useState<CfRelationship[]>([]);

  const reload = useCallback(async () => {
    if (!campaignId) {
      setRows([]);
      return;
    }
    const loaded = await loadContainerRelationshipsFor(campaignId);
    setRows(loaded);
  }, [campaignId]);

  useEffect(() => {
    void reload();
    return onContainerRelationshipsChanged(() => void reload());
  }, [reload]);

  const addOptimistic = useCallback((incoming: CfRelationship | undefined) => {
    if (!incoming) return;
    setRows((current) => mergeRelationshipRows(current, [incoming]));
  }, []);

  return { relationships: rows, addOptimistic, reload };
}
