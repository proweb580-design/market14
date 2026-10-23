import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const hasValidDatabaseUrl = Boolean(
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.trim() !== '' &&
  !process.env.DATABASE_URL.includes('ep-sample')
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks if the database is reachable.
 * Returns true if connection succeeds, false otherwise without throwing.
 */
export async function isDatabaseConnected(): Promise<boolean> {
  if (!hasValidDatabaseUrl) {
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    console.warn('[DB] Database connection check failed:', (err as Error).message);
    return false;
  }
}
