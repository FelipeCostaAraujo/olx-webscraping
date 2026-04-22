import fs from 'fs';
import path from 'path';
import { FEATURE_INDEX, FEATURE_NAMES, hasCriticalRisk } from './features';

const MODEL_PATH = path.resolve(__dirname, '../../artifacts/model/model.json');

interface NormalizationStats {
  means: number[];
  stdDevs: number[];
}

interface TrainedDealModel {
  version: number;
  modelType: string;
  featureCount: number;
  featureNames: string[];
  weights: number[];
  bias: number;
  threshold: number;
  normalization: NormalizationStats;
}

type RiskAdjustment = {
  score: number;
  adjusted: boolean;
  reason?: string;
};

export interface PredictionResult {
  score: number;
  rawScore: number;
  threshold: number;
  isDeal: boolean;
  confidence: number;
  modelVersion: number;
  riskAdjusted: boolean;
  riskReason?: string;
}

let cachedModel: TrainedDealModel | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function dot(a: number[], b: number[]): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    total += a[i] * b[i];
  }
  return total;
}

function normalizeFeatures(features: number[], normalization: NormalizationStats): number[] {
  return features.map((value, index) => {
    const mean = normalization.means[index] ?? 0;
    const std = normalization.stdDevs[index] ?? 1;
    const safeStd = Math.abs(std) > 1e-8 ? std : 1;
    return (value - mean) / safeStd;
  });
}

function alignFeaturesToModel(features: number[], model: TrainedDealModel): number[] {
  if (features.length === model.featureCount) return features;

  const sourceByName = new Map<string, number>();
  for (let i = 0; i < FEATURE_NAMES.length; i++) {
    sourceByName.set(FEATURE_NAMES[i], features[i] ?? 0);
  }

  if (Array.isArray(model.featureNames) && model.featureNames.length === model.featureCount) {
    return model.featureNames.map((featureName, index) => {
      if (sourceByName.has(featureName)) return sourceByName.get(featureName) as number;
      return features[index] ?? 0;
    });
  }

  if (features.length > model.featureCount) return features.slice(0, model.featureCount);

  return [
    ...features,
    ...new Array<number>(model.featureCount - features.length).fill(0),
  ];
}

function applyRiskAdjustment(rawScore: number, originalFeatures: number[]): RiskAdjustment {
  const defectRisk = originalFeatures[FEATURE_INDEX.defectRiskFlag] ?? 0;
  const severeDefect = originalFeatures[FEATURE_INDEX.severeDefectFlag] ?? 0;
  const legalRisk = originalFeatures[FEATURE_INDEX.auctionOrLegalRiskFlag] ?? 0;

  if (severeDefect >= 1) {
    return {
      score: Math.min(rawScore * 0.08, 0.08),
      adjusted: true,
      reason: 'Risco crítico: anúncio com indicação forte de defeito/sem funcionamento.',
    };
  }

  if (defectRisk >= 1 && legalRisk >= 1) {
    return {
      score: Math.min(rawScore * 0.1, 0.12),
      adjusted: true,
      reason: 'Risco crítico: anúncio com defeito e menção a risco legal/leilão.',
    };
  }

  if (defectRisk >= 1) {
    return {
      score: Math.min(rawScore * 0.14, 0.16),
      adjusted: true,
      reason: 'Risco crítico: anúncio com indicação de defeito.',
    };
  }

  if (legalRisk >= 1) {
    return {
      score: Math.min(rawScore * 0.16, 0.18),
      adjusted: true,
      reason: 'Risco crítico: anúncio com menção a leilão/sinistro/risco legal.',
    };
  }

  return { score: rawScore, adjusted: false };
}

function parseModel(raw: unknown): TrainedDealModel {
  const candidate = raw as TrainedDealModel;

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Arquivo de modelo inválido.');
  }

  if (candidate.modelType !== 'logistic-regression') {
    throw new Error(
      'Modelo incompatível com o novo predictor. Rode novamente o treino em src/ml/trainModel.ts.'
    );
  }

  if (!Array.isArray(candidate.weights) || !Array.isArray(candidate.featureNames)) {
    throw new Error('Modelo inválido: pesos ou featureNames ausentes.');
  }

  if (
    !candidate.normalization ||
    !Array.isArray(candidate.normalization.means) ||
    !Array.isArray(candidate.normalization.stdDevs)
  ) {
    throw new Error('Modelo inválido: normalização ausente.');
  }

  return candidate;
}

function computeRawScore(features: number[], model: TrainedDealModel): number {
  const alignedFeatures = alignFeaturesToModel(features, model);
  const normalizedFeatures = normalizeFeatures(alignedFeatures, model.normalization);
  const linear = dot(model.weights, normalizedFeatures) + model.bias;
  const score = sigmoid(linear);
  return clamp(score, 0, 1);
}

/**
 * Carrega o modelo salvo no disco.
 */
export async function loadModel(): Promise<TrainedDealModel> {
  if (cachedModel) return cachedModel;

  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Modelo não encontrado em ${MODEL_PATH}. Execute o treino antes de prever.`);
  }

  const raw = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
  cachedModel = parseModel(raw);
  return cachedModel;
}

/**
 * Limpa cache do modelo (útil após re-treino em runtime).
 */
export function clearModelCache(): void {
  cachedModel = null;
}

/**
 * Retorna score de qualidade/oportunidade no intervalo [0, 1].
 */
export async function predictAdQuality(features: number[]): Promise<number> {
  const model = await loadModel();
  const rawScore = computeRawScore(features, model);
  const adjusted = applyRiskAdjustment(rawScore, features);
  return clamp(adjusted.score, 0, 1);
}

/**
 * Predição completa com score + decisão baseada no threshold treinado.
 */
export async function predictAdQualityDetailed(features: number[]): Promise<PredictionResult> {
  const model = await loadModel();
  const rawScore = computeRawScore(features, model);
  const adjusted = applyRiskAdjustment(rawScore, features);
  const score = clamp(adjusted.score, 0, 1);

  const threshold = Number.isFinite(model.threshold) ? model.threshold : 0.5;
  const hasRisk = hasCriticalRisk(features);
  const isDeal = !hasRisk && score >= threshold;
  const distance = Math.abs(score - threshold);
  const confidence = clamp(distance / 0.5, 0, 1);

  return {
    score,
    rawScore,
    threshold,
    isDeal,
    confidence,
    modelVersion: model.version,
    riskAdjusted: adjusted.adjusted,
    riskReason: adjusted.reason,
  };
}
