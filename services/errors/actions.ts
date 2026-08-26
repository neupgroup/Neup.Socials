'use server';

import { getError, listErrors } from '@/services/errors';

const toIso = (value?: Date | null) => (value ? value.toISOString() : null);
const serializeError = (error: Awaited<ReturnType<typeof getError>>) => error ? { ...error, timestamp: toIso(error.timestamp) } : null;

export async function listErrorsAction() { return (await listErrors()).map((error) => serializeError(error)!); }
export async function getErrorAction(id: string) { return serializeError(await getError(id)); }
