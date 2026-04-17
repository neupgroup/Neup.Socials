'use server';

import { dataStore } from '@/core/lib/data-store';

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

export async function createSpaceAction(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: 'Space name is required.' } as const;
  }

  const space = await dataStore.spaces.create({ name: trimmed });
  return { success: true, space: { id: space.id, name: space.name } } as const;
}

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

export async function listAssignableAccountsAction(owner?: string) {
  const accounts = await dataStore.accounts.list({ owner, skip: 0, take: 500 });
  return accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    name: account.name,
    username: account.username,
  }));
}
