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
  relationshipForInstance,
  type InstantiatedCF,
} from "@/lib/srd/instantiateSrdEntity";
import type { CiClass } from "@/lib/ciRegistry";
import type { CfRelationship } from "@/lib/workshop/containerCf";
import { recordContainerRelationship } from "@/lib/workshop/containerRelationships";

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

  /**
   * Build the `relationships[]` row for a hydrated instance and (optionally)
   * persist it on the parent's index. Use `persist: false` for draft
   * containers that are not saved yet (write on save instead).
   */
  const indexInstance = useCallback(
    async (
      inst: InstantiatedCF,
      parent: { id: string; ciClass: CiClass },
      slot: ContainerSlot,
      opts?: { persist?: boolean; libraryId?: string | null; active?: boolean },
    ): Promise<CfRelationship> => {
      const rel = relationshipForInstance(inst, parent, slot, opts);
      if (opts?.persist !== false) {
        try {
          await recordContainerRelationship(rel);
        } catch {
          /* index is a convenience view — never block the drop */
        }
      }
      return rel;
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

  return { hydrateIfNeeded, indexInstance, dropOnCharacter, dropOnCampaign };
}
