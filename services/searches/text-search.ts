import { Prisma } from '@/prisma/client';

import { parseSearchQuery, type SearchNode } from '@neup/core/search/query';

/**
 * A Prisma-style `where` object built from a search query.
 */
type SearchWhere = Record<string, unknown>;

/**
 * Builds a case-insensitive "contains" filter for a single value.
 * @param value The text the field should contain.
 * @returns A Prisma string filter that matches the value anywhere in the field, ignoring case.
 */
const containsFilter = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive,
});

/**
 * Builds a filter that matches a single search term against any of the given fields.
 * @param term The search term to look for.
 * @param fields The field names to search; a record matches if any one of them contains the term.
 * @returns A `where` object that combines one "contains" filter per field with OR.
 */
const buildTermWhere = (term: string, fields: string[]): SearchWhere => ({
  OR: fields.map((field) => ({ [field]: containsFilter(term) })),
});

/**
 * Converts a parsed search node into a `where` object. Term nodes search the
 * given fields, "not" nodes exclude records that match their term, and "and" /
 * "or" nodes combine the results of their child nodes.
 * @param node The parsed search node to convert.
 * @param fields The field names that terms are matched against.
 * @returns The `where` object for the node, or an empty object for unknown node types.
 */
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

/**
 * The result of building a text search filter.
 * @property where The `where` object to pass to the database query, present when the search is valid and non-empty.
 * @property error A message describing why the search could not be built, present on failure.
 */
export type TextSearchBuildResult = {
  where?: SearchWhere;
  error?: string;
};

/**
 * Converts a user's search text into a database `where` filter that matches
 * the text, case-insensitively, against the given fields. The text is parsed
 * for search operators (such as AND, OR, and NOT) before the filter is built.
 * @param input The raw search text entered by the user.
 * @param fields The field names to search, for example `['name', 'username']`.
 * @returns An empty object if the input is blank or cannot be parsed, an object
 * with `error` if no fields were given or the query is invalid, or an object
 * with `where` containing the filter.
 */
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
