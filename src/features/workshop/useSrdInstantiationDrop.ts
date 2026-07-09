"use client";

import { useCallback } from "react";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { vaultPayloadIsStaticSrd } from "@/lib/vault/cfDragDrop";
import type { ContainerSlot } from "@/lib/workshop/containerCf";
import {
  dropIntoCampaignContainer,
  dropIntoCharacterContainer,
  type ContainerMoveResult,
} from "@/lib/workshop/containerMoveWritePath";
import {
  instantiateSrdEntity,
  instantiateTargetForSlot,
  isStaticSrdDragId,
  type InstantiatedCF,
} from "@/lib/srd/instantiateSrdEntity";

/**
 * React helpers for seamless SRD → InstantiatedCF hydration on drop.
 * Keeps drag chess-piece tracking smooth: hydration runs once on drop,
 * never mutates the global SRD corpus.
 */
export function useSrdInstantiationDrop() {
  const hydrateIfNeeded = useCallback(
    (payload: VaultDragPayload, slot: ContainerSlot): InstantiatedCF | null => {
      if (!vaultPayloadIsStaticSrd(payload) && !isStaticSrdDragId(payload.id)) {
        return null;
      }
      return instantiateSrdEntity(payload.id, instantiateTargetForSlot(slot), {
        name: payload.title,
      });
    },
    [],
  );

  const dropOnCharacter = useCallback(
    async (options: {
      characterId: string;
      payload: VaultDragPayload;
      slot: ContainerSlot;
      fromCharacterId?: string | null;
      fromEmbeddedItemId?: string | null;
    }): Promise<ContainerMoveResult> => {
      return dropIntoCharacterContainer(options);
    },
    [],
  );

  const dropOnCampaign = useCallback(
    async (options: {
      campaignId: string;
      payload: VaultDragPayload;
      slot: ContainerSlot;
    }): Promise<ContainerMoveResult> => {
      return dropIntoCampaignContainer(options);
    },
    [],
  );

  return { hydrateIfNeeded, dropOnCharacter, dropOnCampaign };
}
