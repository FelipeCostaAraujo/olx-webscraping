import fs from 'fs';
import path from 'path';

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

export interface PredictionResult {
  score: number;
  threshold: number;
  isDeal: boolean;
  confidence: number;
  modelVersion: number;
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
  if (features.length !== model.featureCount) {
    throw new Error(
      `Quantidade de features inválida: esperado ${model.featureCount}, recebido ${features.length}.`
    );
  }

  const normalizedFeatures = normalizeFeatures(features, model.normalization);
  const linear = dot(model.weights, normalizedFeatures) + model.bias;
  const score = sigmoid(linear);
  return clamp(score, 0, 1);
}

/**
 * Predição completa com score + decisão baseada no threshold treinado.
 */
export async function predictAdQualityDetailed(features: number[]): Promise<PredictionResult> {
  const model = await loadModel();
  const score = await predictAdQuality(features);
  const threshold = Number.isFinite(model.threshold) ? model.threshold : 0.5;
  const distance = Math.abs(score - threshold);
  const confidence = clamp(distance / 0.5, 0, 1);

  return {
    score,
    threshold,
    isDeal: score >= threshold,
    confidence,
    modelVersion: model.version,
  };
}
