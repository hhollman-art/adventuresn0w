import { getActiveCampaignId, setActiveCampaignId } from "@/lib/campaigns";
import { switchCampaignTable } from "@/lib/tabletop/store";

/**
 * Make a campaign (or none) the active one: shelve the current Virtual Table
 * under the outgoing campaign's slot and restore the incoming campaign's
 * shelved table. Callers on /table must reload after this so the live page
 * doesn't overwrite the swapped session with stale state.
 */
export async function activateCampaign(id: string | null): Promise<void> {
  const current = getActiveCampaignId();
  if (current === id) return;
  await switchCampaignTable(current, id);
  setActiveCampaignId(id);
}
