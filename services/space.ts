'use server';

import { dataStore } from '@/services/repositories';

/** A space and its linked platform assets, in a plain serializable shape. */
type SerializedSpace = {
  id: string;
  name: string;
  assets: Array<{
    id: string;
    spaceId: string;
    platform: string;
    assetId: string;
  }>;
};

/**
 * Lists all spaces with their assets.
 *
 * @returns Spaces mapped to plain objects, safe to return from a server action.
 */
export async function listSpacesAction(): Promise<SerializedSpace[]> {
  const spaces = await dataStore.spaces.list();
  return spaces.map((space: Awaited<ReturnType<typeof dataStore.spaces.list>>[number]) => ({
    id: space.id,
    name: space.name,
    assets: space.assets.map((asset: Awaited<ReturnType<typeof dataStore.spaces.list>>[number]['assets'][number]) => ({
      id: asset.id,
      spaceId: asset.spaceId,
      platform: asset.platform,
      assetId: asset.assetId,
    })),
  }));
}

/**
 * Creates a space.
 *
 * @param name - Space name. Leading and trailing whitespace is trimmed.
 * @returns `{ success: true, space }` with the new space's `id` and `name`, or
 * `{ success: false, error }` if the trimmed name is empty.
 */
export async function createSpaceAction(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: 'Space name is required.' } as const;
  }

  const space = await dataStore.spaces.create({ name: trimmed });
  return { success: true, space: { id: space.id, name: space.name } } as const;
}

/**
 * Replaces all assets linked to a space.
 *
 * Entries missing a `platform` or `assetId` are dropped before saving. The
 * existing assets for the space are replaced by the remaining entries.
 *
 * @param spaceId - ID of the space to update.
 * @param assets - The full new set of platform assets for the space.
 * @returns `{ success: true }`, or `{ success: false, error }` if `spaceId` is empty.
 */
export async function updateSpaceAssetsAction(
  spaceId: string,
  assets: Array<{ platform: string; assetId: string }>
) {
  if (!spaceId) {
    return { success: false, error: 'Space id is required.' } as const;
  }

  const normalized = assets
    .filter((item) => item.assetId && item.platform)
    .map((item) => ({
      platform: item.platform,
      assetId: item.assetId,
    }));

  await dataStore.spaceAssets.replaceForSpace(spaceId, normalized);
  return { success: true } as const;
}

/**
 * Lists accounts that can be assigned to a space.
 *
 * Returns at most 500 accounts.
 *
 * @param owner - Optional owner to restrict the accounts to.
 * @returns Accounts reduced to `id`, `platform`, `name`, and `username`.
 */
export async function listAssignableAccountsAction(owner?: string) {
  const accounts = await dataStore.accounts.list({ owner, skip: 0, take: 500 });
  return accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    name: account.name,
    username: account.username,
  }));
}
