'use server';

import { prisma } from '@/core/database/prisma';

export const listFacebookInsightsAccounts = async (owner: string, take = 100) =>
  prisma.connectedAccount.findMany({
    where: { owner },
    skip: 0,
    take,
  });

export const getFacebookInsightsAccount = async (id: string) =>
  prisma.connectedAccount.findUnique({ where: { id } });
