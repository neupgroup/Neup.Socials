import { Prisma } from '@prisma/client';

import { parseSearchQuery, type SearchNode } from '@/core/search';

type SearchWhere = Record<string, unknown>;

const containsFilter = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive,
});

const buildTermWhere = (term: string, fields: string[]): SearchWhere => ({
  OR: fields.map((field) => ({ [field]: containsFilter(term) })),
});

const buildNodeWhere = (node: SearchNode, fields: string[]): SearchWhere => {
  switch (node.type) {
    case 'term':
      return buildTermWhere(node.value, fields);
    case 'not':
      return { NOT: buildTermWhere(node.node.value, fields) };
    case 'and':
      return { AND: node.nodes.map((child) => buildNodeWhere(child, fields)) };
    case 'or':
      return { OR: node.nodes.map((child) => buildNodeWhere(child, fields)) };
    default:
      return {};
  }
};

export type TextSearchBuildResult = {
  where?: SearchWhere;
  error?: string;
};

export const buildTextSearchWhere = (
  input: string | undefined,
  fields: string[]
): TextSearchBuildResult => {
  if (!input?.trim()) {
    return {};
  }

  if (!fields.length) {
    return { error: 'Search fields are required.' };
  }

  const parsed = parseSearchQuery(input);
  if (!parsed) {
    return {};
  }

  if ('error' in parsed) {
    return { error: parsed.error };
  }

  return { where: buildNodeWhere(parsed.ast, fields) };
};
