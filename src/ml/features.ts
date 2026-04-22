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

export interface RiskSignals {
  defectRiskFlag: number;
  severeDefectFlag: number;
  auctionOrLegalRiskFlag: number;
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
  'defectRiskFlag',
  'severeDefectFlag',
  'auctionOrLegalRiskFlag',
] as const;

export const FEATURE_INDEX: Record<(typeof FEATURE_NAMES)[number], number> = FEATURE_NAMES
  .reduce((acc, featureName, index) => {
    acc[featureName] = index;
    return acc;
  }, {} as Record<(typeof FEATURE_NAMES)[number], number>);

const DEFECT_KEYWORDS = [
  'defeito',
  'com defeito',
  'danificado',
  'quebrado',
  'ruim',
  'estragado',
  'com problema',
  'com detalhe',
  'nao da video',
  'nao da imagem',
  'sem video',
  'sem imagem',
  'nao funciona',
  'nao liga',
  'queimado',
  'sucata',
  'para pecas',
  'pecas',
  'sem funcionamento',
];

const SEVERE_DEFECT_KEYWORDS = [
  'nao da video',
  'nao da imagem',
  'sem video',
  'sem imagem',
  'nao funciona',
  'nao liga',
  'queimado',
  'sucata',
  'sem funcionamento',
  'para pecas',
];

const LEGAL_RISK_KEYWORDS = [
  'leilao',
  'passagem por leilao',
  'recuperado',
  'sinistro',
  'media monta',
  'grande monta',
  'pequena monta',
  'perda total',
  'salvado',
  'enchente',
];

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

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

export function detectRiskSignals(text: string, classificationLabel?: string): RiskSignals {
  const normalizedText = normalizeForMatch(text || '');
  const normalizedLabel = normalizeForMatch(classificationLabel || '');

  const defectFromText = includesAny(normalizedText, DEFECT_KEYWORDS);
  const severeFromText = includesAny(normalizedText, SEVERE_DEFECT_KEYWORDS);
  const legalRiskFromText = includesAny(normalizedText, LEGAL_RISK_KEYWORDS);

  const defectFromLabel = normalizedLabel === 'defeito';
  const legalFromLabel = normalizedLabel === 'risco';

  const defectRiskFlag = defectFromText || defectFromLabel ? 1 : 0;
  const severeDefectFlag = severeFromText ? 1 : 0;
  const auctionOrLegalRiskFlag = legalRiskFromText || legalFromLabel ? 1 : 0;

  return {
    defectRiskFlag,
    severeDefectFlag,
    auctionOrLegalRiskFlag,
  };
}

export function hasCriticalRisk(features: number[]): boolean {
  const defectRisk = features[FEATURE_INDEX.defectRiskFlag] ?? 0;
  const severeDefect = features[FEATURE_INDEX.severeDefectFlag] ?? 0;
  const legalRisk = features[FEATURE_INDEX.auctionOrLegalRiskFlag] ?? 0;
  return defectRisk >= 1 || severeDefect >= 1 || legalRisk >= 1;
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
  return normalizeForMatch(label || '');
}

export function conditionScore(label?: string): number {
  const normalized = normalizeLabel(label);
  if (!normalized) return 0.5;
  if (normalized === 'novo') return 1;
  if (normalized === 'bom estado') return 0.8;
  if (normalized === 'risco') return 0.2;
  if (normalized === 'defeito') return 0.05;
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

  const combinedText = `${(ad as any).title || ''} ${(ad as any).description || ''}`.trim();
  const riskSignals = detectRiskSignals(combinedText, classification.label);

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
    riskSignals.defectRiskFlag,
    riskSignals.severeDefectFlag,
    riskSignals.auctionOrLegalRiskFlag,
  ];
}

/**
 * Score heurístico usado para rotular o dataset de treino.
 * Quanto maior o score, maior a chance de o anúncio ser um "bom negócio".
 */
export function computeDealHeuristic(features: number[]): number {
  const discountVsMedian = features[FEATURE_INDEX.discountVsMedian] ?? 0;
  const ageNormalized = features[FEATURE_INDEX.ageNormalized] ?? 0;
  const condition = features[FEATURE_INDEX.conditionScore] ?? 0;
  const sentiment = features[FEATURE_INDEX.sentimentScoreNormalized] ?? 0;
  const superPriceFlag = features[FEATURE_INDEX.superPriceFlag] ?? 0;
  const hasDrop = features[FEATURE_INDEX.hasRecentPriceDrop] ?? 0;
  const dropRatio = features[FEATURE_INDEX.dropRatio] ?? 0;
  const isCar = features[FEATURE_INDEX.isCar] ?? 0;
  const kilometersNormalized = features[FEATURE_INDEX.kilometersNormalized] ?? 0;
  const defectRiskFlag = features[FEATURE_INDEX.defectRiskFlag] ?? 0;
  const severeDefectFlag = features[FEATURE_INDEX.severeDefectFlag] ?? 0;
  const auctionOrLegalRiskFlag = features[FEATURE_INDEX.auctionOrLegalRiskFlag] ?? 0;

  const recencyBonus = 1 - clamp(ageNormalized, 0, 1);
  const mileageBonus = isCar ? 1 - clamp(kilometersNormalized, 0, 1) : 0.3;

  const baseScore = (
    0.42 * discountVsMedian +
    0.16 * condition +
    0.08 * sentiment +
    0.07 * recencyBonus +
    0.06 * dropRatio +
    0.05 * hasDrop +
    0.05 * superPriceFlag +
    0.03 * mileageBonus
  );

  const riskPenalty = (
    0.85 * defectRiskFlag +
    1.15 * severeDefectFlag +
    0.95 * auctionOrLegalRiskFlag
  );

  return baseScore - riskPenalty;
}
