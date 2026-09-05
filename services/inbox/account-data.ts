'use server';

import { prisma } from '#/core/database/prisma';

/** Resolve either the connected-account record ID or the platform's account ID. */
export const getInboxAccount = async (id: string) => {
  const accountById = await prisma.connectedAccount.findUnique({ where: { id } });
  return accountById ?? prisma.connectedAccount.findFirst({ where: { platformId: id } });
};
