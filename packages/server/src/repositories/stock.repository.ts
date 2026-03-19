import { prisma } from '../lib/prisma.ts';
import type { GicsSector, Prisma } from '@prisma/client';

/** حقول Stock المطلوبة — description و isShariaCompliant مضافة في الـ schema؛ عميل Prisma قديم قد لا يشملها في النوع */
const selectWithSector = {
  ticker: true,
  sector: true,
  description: true,
  isShariaCompliant: true,
} as Prisma.StockSelect;

const selectWithNames = {
  ticker: true,
  nameAr: true,
  nameEn: true,
  sector: true,
  description: true,
  isShariaCompliant: true,
} as Prisma.StockSelect;

export const StockRepository = {
  findTickersBySector(sector: GicsSector) {
    return prisma.stock.findMany({
      where: { sector },
      select: { ticker: true },
    });
  },

  findAllWithSector() {
    return prisma.stock.findMany({
      select: selectWithSector,
    });
  },

  findByTicker(ticker: string) {
    return prisma.stock.findUnique({
      where: { ticker: ticker.toUpperCase() },
      select: selectWithNames,
    });
  },
};
