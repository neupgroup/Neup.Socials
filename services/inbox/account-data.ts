'use server';

import { prisma } from '#/core/database/prisma';

export const getInboxAccount = async (id: string) =>
  prisma.connectedAccount.findUnique({ where: { id } });
