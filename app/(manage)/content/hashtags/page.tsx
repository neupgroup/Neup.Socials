'use client';

import * as React from 'react';
import { Plus, Hash, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const normalizeHashtag = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

type HashtagList = {
  id: string;
  name: string;
  tags: string[];
};

export default function HashtagListsPage() {
  const [lists, setLists] = React.useState<HashtagList[]>([]);
  const [listName, setListName] = React.useState('');
  const [tagInputById, setTagInputById] = React.useState<Record<string, string>>({});

  const handleCreateList = () => {
    const name = listName.trim();
    if (!name) return;

    setLists((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        tags: [],
      },
    ]);
    setListName('');
  };

  const handleAddTag = (listId: string) => {
    const raw = tagInputById[listId] ?? '';
    const tag = normalizeHashtag(raw);
    if (!tag) return;

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId && !list.tags.includes(tag)
          ? { ...list, tags: [...list.tags, tag] }
          : list
      )
    );

    setTagInputById((prev) => ({ ...prev, [listId]: '' }));
  };

  const handleRemoveTag = (listId: string, tag: string) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, tags: list.tags.filter((item) => item !== tag) }
          : list
      )
    );
  };

  const handleDeleteList = (listId: string) => {
    setLists((prev) => prev.filter((list) => list.id !== listId));
    setTagInputById((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hashtag Lists</h1>
        <p className="text-muted-foreground">
          Build reusable hashtag groups for your posts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a list</CardTitle>
          <CardDescription>Give your list a name (e.g. Product Launch, Travel).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="List name"
            value={listName}
            onChange={(event) => setListName(event.target.value)}
          />
          <Button onClick={handleCreateList} className="sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add list
          </Button>
        </CardContent>
      </Card>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hashtag lists yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    {list.name}
                  </CardTitle>
                  <CardDescription>{list.tags.length} tags</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteList(list.id)}
                  aria-label={`Delete ${list.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="#hashtag"
                    value={tagInputById[list.id] ?? ''}
                    onChange={(event) =>
                      setTagInputById((prev) => ({
                        ...prev,
                        [list.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddTag(list.id);
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => handleAddTag(list.id)}>
                    Add tag
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.tags.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No tags yet.</span>
                  ) : (
                    list.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="rounded-full border px-3 py-1 text-sm transition hover:bg-muted"
                        onClick={() => handleRemoveTag(list.id, tag)}
                      >
                        {tag}
                      </button>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a tag to remove it.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
