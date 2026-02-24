import { Document } from 'mongoose';

export interface PriceContext {
  medianPrice: number;
  p25Price: number;
  p75Price: number;
  stdPrice: number;
  sampleSize: number;
}

export interface FeatureContext {
  priceContext: PriceContext;
  now?: Date;
}

export interface PriceHistorySignal {
  hasDrop: number;
  dropRatio: number;
  lastDeltaRatio: number;
}

export const FEATURE_NAMES = [
  'priceToMedian',
  'discountVsMedian',
  'priceZScore',
  'ageNormalized',
  'conditionScore',
  'sentimentScoreNormalized',
  'superPriceFlag',
  'hasRecentPriceDrop',
  'dropRatio',
  'lastDeltaRatio',
  'isCar',
  'kilometersNormalized',
] as const;

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sortNumeric(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function quantile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = sortNumeric(values);
  if (sorted.length === 1) return sorted[0];
  const position = clamp(percentile, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function std(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((acc, current) => {
    const delta = current - mean;
    return acc + delta * delta;
  }, 0) / values.length;
  return Math.sqrt(variance);
}

export function buildPriceContext(prices: number[]): PriceContext {
  const validPrices = prices.filter((price) => Number.isFinite(price) && price > 0);
  if (validPrices.length === 0) {
    return {
      medianPrice: 1,
      p25Price: 1,
      p75Price: 1,
      stdPrice: 1,
      sampleSize: 0,
    };
  }

  const medianPrice = quantile(validPrices, 0.5);
  const p25Price = quantile(validPrices, 0.25);
  const p75Price = quantile(validPrices, 0.75);
  const avgPrice = validPrices.reduce((acc, current) => acc + current, 0) / validPrices.length;
  const stdPrice = std(validPrices, avgPrice);

  return {
    medianPrice: medianPrice > 0 ? medianPrice : 1,
    p25Price: p25Price > 0 ? p25Price : 1,
    p75Price: p75Price > 0 ? p75Price : 1,
    stdPrice: stdPrice > 0 ? stdPrice : 1,
    sampleSize: validPrices.length,
  };
}

function normalizeLabel(label?: string): string {
  return (label || '').toLowerCase().trim();
}

export function conditionScore(label?: string): number {
  const normalized = normalizeLabel(label);
  if (!normalized) return 0.5;
  if (normalized === 'novo') return 1;
  if (normalized === 'bom estado') return 0.8;
  if (normalized === 'defeito') return 0.1;
  return 0.5;
}

function daysSinceCreated(createdAt: unknown, now: Date): number {
  const created = new Date(createdAt as any);
  if (Number.isNaN(created.getTime())) return 0;
  const deltaMs = now.getTime() - created.getTime();
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return deltaMs / (1000 * 60 * 60 * 24);
}

function normalizeHistory(history: any[]): Array<{ price: number; dateMs: number }> {
  return history
    .map((point) => ({
      price: toFiniteNumber(point?.price),
      dateMs: new Date(point?.date as any).getTime(),
    }))
    .filter((point) => point.price > 0 && Number.isFinite(point.dateMs))
    .sort((a, b) => a.dateMs - b.dateMs);
}

export function priceHistorySignal(priceHistory: any[]): PriceHistorySignal {
  const normalizedHistory = normalizeHistory(Array.isArray(priceHistory) ? priceHistory : []);
  if (normalizedHistory.length < 2) {
    return { hasDrop: 0, dropRatio: 0, lastDeltaRatio: 0 };
  }

  const latest = normalizedHistory[normalizedHistory.length - 1].price;
  const previous = normalizedHistory[normalizedHistory.length - 2].price;
  if (previous <= 0 || latest <= 0) {
    return { hasDrop: 0, dropRatio: 0, lastDeltaRatio: 0 };
  }

  const lastDeltaRatio = clamp((previous - latest) / previous, -1, 1);
  return {
    hasDrop: lastDeltaRatio > 0 ? 1 : 0,
    dropRatio: lastDeltaRatio > 0 ? lastDeltaRatio : 0,
    lastDeltaRatio,
  };
}

/**
 * Extrai features numéricas para o modelo de detecção de oportunidade.
 */
export function extractFeaturesFromAd(ad: Document | any, context: FeatureContext): number[] {
  const now = context.now ?? new Date();
  const priceContext = context.priceContext;

  const price = Math.max(toFiniteNumber((ad as any).price), 1);
  const medianPrice = priceContext.medianPrice > 0 ? priceContext.medianPrice : 1;
  const stdPrice = priceContext.stdPrice > 0 ? priceContext.stdPrice : 1;

  const priceToMedian = clamp(price / medianPrice, 0, 5);
  const discountVsMedian = clamp((medianPrice - price) / medianPrice, -1, 1);
  const priceZScore = clamp((price - medianPrice) / stdPrice, -5, 5);

  const ageDays = daysSinceCreated((ad as any).createdAt, now);
  const ageNormalized = clamp(ageDays / 45, 0, 1.5);

  const classification = (ad as any).classification || {};
  const condition = conditionScore(classification.label);
  const sentimentScoreNormalized = clamp(toFiniteNumber(classification.sentimentScore) / 10, -1, 1);

  const superPriceFlag = (ad as any).superPrice ? 1 : 0;
  const signal = priceHistorySignal((ad as any).priceHistory || []);

  const isCar = String((ad as any).category || '').toLowerCase() === 'car' ? 1 : 0;
  const kilometers = toFiniteNumber((ad as any).kilometers);
  const kilometersNormalized = isCar ? clamp(kilometers / 250000, 0, 2) : 0;

  return [
    priceToMedian,
    discountVsMedian,
    priceZScore,
    ageNormalized,
    condition,
    sentimentScoreNormalized,
    superPriceFlag,
    signal.hasDrop,
    signal.dropRatio,
    signal.lastDeltaRatio,
    isCar,
    kilometersNormalized,
  ];
}

/**
 * Score heurístico usado para rotular o dataset de treino.
 * Quanto maior o score, maior a chance de o anúncio ser um "bom negócio".
 */
export function computeDealHeuristic(features: number[]): number {
  const discountVsMedian = features[1] ?? 0;
  const ageNormalized = features[3] ?? 0;
  const condition = features[4] ?? 0;
  const sentiment = features[5] ?? 0;
  const superPriceFlag = features[6] ?? 0;
  const hasDrop = features[7] ?? 0;
  const dropRatio = features[8] ?? 0;
  const isCar = features[10] ?? 0;
  const kilometersNormalized = features[11] ?? 0;

  const recencyBonus = 1 - clamp(ageNormalized, 0, 1);
  const mileageBonus = isCar ? 1 - clamp(kilometersNormalized, 0, 1) : 0.3;

  return (
    0.5 * discountVsMedian +
    0.18 * condition +
    0.1 * sentiment +
    0.08 * recencyBonus +
    0.06 * dropRatio +
    0.04 * hasDrop +
    0.04 * superPriceFlag +
    0.04 * mileageBonus
  );
}
