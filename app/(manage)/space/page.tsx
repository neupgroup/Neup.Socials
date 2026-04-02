'use client';

import * as React from 'react';

import { createSpaceAction, listAssignableAccountsAction, listSpacesAction, updateSpaceAssetsAction } from '@/actions/space';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type Space = {
  id: string;
  name: string;
  assets: Array<{
    id: string;
    spaceId: string;
    platform: string;
    assetId: string;
  }>;
};

type AssignableAccount = {
  id: string;
  platform: string;
  name: string | null;
  username: string | null;
};

const OWNER = 'neupkishor';

export default function SpacePage() {
  const { toast } = useToast();

  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [accounts, setAccounts] = React.useState<AssignableAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newSpaceName, setNewSpaceName] = React.useState('');
  const [selectedSpaceId, setSelectedSpaceId] = React.useState<string>('');
  const [selectedAssetIds, setSelectedAssetIds] = React.useState<Set<string>>(new Set());

  const selectedSpace = React.useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [spaces, selectedSpaceId]
  );

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [spaceItems, accountItems] = await Promise.all([
        listSpacesAction(),
        listAssignableAccountsAction(OWNER),
      ]);

      setSpaces(spaceItems);
      setAccounts(accountItems);

      if (spaceItems.length > 0) {
        const nextSelected = selectedSpaceId && spaceItems.some((space) => space.id === selectedSpaceId)
          ? selectedSpaceId
          : spaceItems[0].id;

        setSelectedSpaceId(nextSelected);

        const space = spaceItems.find((item) => item.id === nextSelected);
        setSelectedAssetIds(new Set(space?.assets.map((asset) => asset.assetId) ?? []));
      } else {
        setSelectedSpaceId('');
        setSelectedAssetIds(new Set());
      }
    } catch (error) {
      console.error('Failed to load spaces', error);
      toast({ title: 'Failed to load spaces', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedSpaceId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    const space = spaces.find((item) => item.id === spaceId);
    setSelectedAssetIds(new Set(space?.assets.map((asset) => asset.assetId) ?? []));
  };

  const handleCreateSpace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newSpaceName.trim()) {
      toast({ title: 'Space name is required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const result = await createSpaceAction(newSpaceName);
      if (!result.success) {
        throw new Error(result.error);
      }

      setNewSpaceName('');
      toast({ title: 'Space created' });
      await fetchData();
      setSelectedSpaceId(result.space.id);
      setSelectedAssetIds(new Set());
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to create space', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleAsset = (assetId: string, checked: boolean) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(assetId);
      } else {
        next.delete(assetId);
      }
      return next;
    });
  };

  const handleSaveAssets = async () => {
    if (!selectedSpaceId) {
      toast({ title: 'Select a space first', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const selected = accounts
        .filter((account) => selectedAssetIds.has(account.id))
        .map((account) => ({
          platform: account.platform,
          assetId: account.id,
        }));

      const result = await updateSpaceAssetsAction(selectedSpaceId, selected);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({ title: 'Space assets saved' });
      await fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to save space assets', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Spaces</h1>
        <p className="text-muted-foreground">Choose which connected accounts are grouped into each space.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Space</CardTitle>
          <CardDescription>Create a new space and attach accounts you have permissions for.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSpace} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full md:max-w-sm space-y-2">
              <Label htmlFor="space-name">Space name</Label>
              <Input
                id="space-name"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                placeholder="Marketing Team"
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Space'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Available Spaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading spaces...</p>
            ) : spaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spaces yet.</p>
            ) : (
              spaces.map((space) => {
                const active = selectedSpaceId === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => handleSelectSpace(space.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                      active ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{space.name}</span>
                      <Badge variant="secondary">{space.assets.length}</Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Space Assets</CardTitle>
            <CardDescription>
              {selectedSpace ? `Assign accounts for ${selectedSpace.name}.` : 'Select a space to assign accounts.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedSpace ? (
              <p className="text-sm text-muted-foreground">No space selected.</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connected accounts available.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {accounts.map((account) => {
                    const checked = selectedAssetIds.has(account.id);
                    return (
                      <label
                        key={account.id}
                        className="flex cursor-pointer items-start justify-between gap-3 rounded-md border p-3 hover:bg-muted/30"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{account.name ?? account.username ?? account.id}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {account.platform} {account.username ? `· @${account.username}` : ''}
                          </p>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleAsset(account.id, Boolean(value))}
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveAssets} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Space Assets'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
