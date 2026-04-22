import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Ad from '../models/Ad';
import connectToDatabase from '../database';
import { createLogger } from '../utils/logger';
import {
  FEATURE_NAMES,
  PriceContext,
  buildPriceContext,
  computeDealHeuristic,
  extractFeaturesFromAd,
  hasCriticalRisk,
} from './features';

const log = createLogger('ML Dataset');

const DATASET_PATH = path.resolve(__dirname, '../../artifacts/data/dataset.json');
const MIN_GROUP_SAMPLE = 4;

interface DatasetRow {
  adId: string;
  searchQuery: string;
  category: string;
  price: number;
  features: number[];
  heuristicScore: number;
  target: 0 | 1;
}

interface DatasetFile {
  version: number;
  generatedAt: string;
  featureNames: readonly string[];
  targetDefinition: string;
  threshold: number;
  stats: {
    rows: number;
    positives: number;
    negatives: number;
    positiveRate: number;
    minGroupSample: number;
  };
  rows: DatasetRow[];
}

export interface DatasetSummary {
  rows: number;
  positives: number;
  negatives: number;
  threshold: number;
  positiveRate: number;
  path: string;
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function keyFor(ad: any): string {
  const category = String(ad?.category || 'unknown').toLowerCase();
  const search = String(ad?.searchQuery || 'unknown').toLowerCase().trim();
  return `${category}::${search}`;
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getContextForAd(
  ad: any,
  groupContexts: Map<string, PriceContext>,
  globalContext: PriceContext
): PriceContext {
  const context = groupContexts.get(keyFor(ad));
  if (!context) return globalContext;
  return context.sampleSize >= MIN_GROUP_SAMPLE ? context : globalContext;
}

function assignTargetsByRank(rows: Array<Omit<DatasetRow, 'target'>>): {
  rows: DatasetRow[];
  threshold: number;
} {
  if (rows.length <= 1) {
    const single = rows.map((row) => ({
      ...row,
      target: (hasCriticalRisk(row.features) ? 0 : 1) as 0 | 1,
    }));
    return {
      rows: single,
      threshold: single[0]?.heuristicScore ?? 0,
    };
  }

  const lowRisk = rows.filter((row) => !hasCriticalRisk(row.features));
  const highRisk = rows.filter((row) => hasCriticalRisk(row.features));
  const rankedLowRisk = [...lowRisk].sort((a, b) => b.heuristicScore - a.heuristicScore);

  if (rankedLowRisk.length <= 1) {
    const allNegative = [...rows].map((row) => ({ ...row, target: 0 as 0 | 1 }));
    return {
      rows: allNegative,
      threshold: rankedLowRisk[0]?.heuristicScore ?? rows[0]?.heuristicScore ?? 0,
    };
  }

  const positivesTarget = Math.max(1, Math.min(rankedLowRisk.length - 1, Math.round(rankedLowRisk.length * 0.3)));
  const threshold = rankedLowRisk[positivesTarget - 1].heuristicScore;

  const lowRiskWithTargets = rankedLowRisk.map((row, index) => ({
    ...row,
    target: (index < positivesTarget ? 1 : 0) as 0 | 1,
  }));

  const highRiskForcedNegative = highRisk.map((row) => ({ ...row, target: 0 as 0 | 1 }));
  const withTargets = [...lowRiskWithTargets, ...highRiskForcedNegative];

  return { rows: withTargets, threshold };
}

export async function generateDataset(): Promise<DatasetSummary> {
  const ads = await Ad.find({
    blacklisted: { $ne: true },
    price: { $gt: 0 },
  }).lean();

  if (ads.length === 0) {
    throw new Error('Não há anúncios suficientes para gerar dataset.');
  }

  const allPrices = ads.map((ad: any) => toFiniteNumber(ad.price)).filter((price) => price > 0);
  const globalContext = buildPriceContext(allPrices);

  const groupedPrices = new Map<string, number[]>();
  for (const ad of ads) {
    const price = toFiniteNumber((ad as any).price);
    if (price <= 0) continue;
    const groupKey = keyFor(ad);
    const current = groupedPrices.get(groupKey) || [];
    current.push(price);
    groupedPrices.set(groupKey, current);
  }

  const groupContexts = new Map<string, PriceContext>();
  for (const [groupKey, prices] of groupedPrices.entries()) {
    groupContexts.set(groupKey, buildPriceContext(prices));
  }

  const now = new Date();
  const rowsWithoutTarget: Array<Omit<DatasetRow, 'target'>> = ads.map((ad: any) => {
    const context = getContextForAd(ad, groupContexts, globalContext);
    const features = extractFeaturesFromAd(ad, { priceContext: context, now });
    const heuristicScore = computeDealHeuristic(features);

    return {
      adId: String(ad._id),
      searchQuery: String(ad.searchQuery || ''),
      category: String(ad.category || ''),
      price: toFiniteNumber(ad.price),
      features,
      heuristicScore,
    };
  });

  const { rows, threshold } = assignTargetsByRank(rowsWithoutTarget);
  const positives = rows.filter((row) => row.target === 1).length;
  const negatives = rows.length - positives;
  const positiveRate = rows.length > 0 ? positives / rows.length : 0;

  const dataset: DatasetFile = {
    version: 3,
    generatedAt: new Date().toISOString(),
    featureNames: FEATURE_NAMES,
    targetDefinition:
      'Top 30% dos anúncios de baixo risco ranqueados por score heurístico. Anúncios com risco crítico (defeito/leilão) são forçados para target 0.',
    threshold,
    stats: {
      rows: rows.length,
      positives,
      negatives,
      positiveRate,
      minGroupSample: MIN_GROUP_SAMPLE,
    },
    rows,
  };

  ensureParentDir(DATASET_PATH);
  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2));

  log.info('Dataset gerado', {
    linhas: rows.length,
    positivos: positives,
    negativos: negatives,
    taxaPositivos: Number((positiveRate * 100).toFixed(2)),
    threshold: Number(threshold.toFixed(4)),
    caminho: DATASET_PATH,
  });

  return {
    rows: rows.length,
    positives,
    negatives,
    threshold,
    positiveRate,
    path: DATASET_PATH,
  };
}

if (require.main === module) {
  (async () => {
    let exitCode = 0;
    try {
      await connectToDatabase();
      const summary = await generateDataset();
      log.info('Resumo do dataset', {
        linhas: summary.rows,
        positivos: summary.positives,
        negativos: summary.negatives,
        threshold: Number(summary.threshold.toFixed(4)),
      });
    } catch (error) {
      exitCode = 1;
      log.error('Erro ao gerar dataset', { erro: error instanceof Error ? error.message : error });
    } finally {
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        log.warn('Falha ao encerrar conexão com MongoDB após gerar dataset', {
          erro: disconnectError instanceof Error ? disconnectError.message : disconnectError,
        });
      }
      process.exit(exitCode);
    }
  })();
}
