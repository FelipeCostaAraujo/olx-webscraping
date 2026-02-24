import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';
import { FEATURE_NAMES } from './features';

const log = createLogger('ML Train');

const DATASET_PATH = path.resolve(__dirname, '../../artifacts/data/dataset.json');
const MODEL_PATH = path.resolve(__dirname, '../../artifacts/model/model.json');

interface DatasetRow {
  features: number[];
  target: number;
}

interface DatasetFileV2 {
  version?: number;
  featureNames?: readonly string[];
  rows: DatasetRow[];
}

interface NormalizationStats {
  means: number[];
  stdDevs: number[];
}

interface Metrics {
  loss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  positives: number;
  negatives: number;
}

interface TrainingConfig {
  learningRate: number;
  epochs: number;
  l2: number;
  logEvery: number;
}

interface TrainedDealModel {
  version: number;
  modelType: 'logistic-regression';
  createdAt: string;
  featureCount: number;
  featureNames: string[];
  weights: number[];
  bias: number;
  threshold: number;
  normalization: NormalizationStats;
  metrics: {
    train: Metrics;
    test: Metrics;
    datasetSize: number;
    trainSize: number;
    testSize: number;
    positiveRate: number;
  };
  training: TrainingConfig;
  source: {
    datasetPath: string;
  };
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function shuffleInPlace<T>(values: T[]): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = values[i];
    values[i] = values[j];
    values[j] = temp;
  }
  return values;
}

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

function toNumericFeatures(features: unknown[]): number[] {
  return features.map((item) => {
    const parsed = Number(item);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

function normalizeTarget(target: unknown): number {
  const value = Number(target);
  return value >= 0.5 ? 1 : 0;
}

function loadDataset(): { rows: DatasetRow[]; featureNames: string[] } {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset não encontrado em ${DATASET_PATH}. Rode o generateDataset antes do treino.`);
  }

  const parsed = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8')) as DatasetFileV2 | DatasetRow[];

  if (Array.isArray(parsed)) {
    const rows = parsed
      .filter((row) => Array.isArray((row as any)?.features))
      .map((row) => ({
        features: toNumericFeatures((row as any).features),
        target: normalizeTarget((row as any).target),
      }));

    return {
      rows,
      featureNames: [...FEATURE_NAMES],
    };
  }

  if (!Array.isArray(parsed.rows)) {
    throw new Error('Formato de dataset inválido: propriedade rows não encontrada.');
  }

  const rows = parsed.rows
    .filter((row) => Array.isArray((row as any)?.features))
    .map((row) => ({
      features: toNumericFeatures((row as any).features),
      target: normalizeTarget((row as any).target),
    }));

  const datasetFeatureNames = parsed.featureNames && parsed.featureNames.length > 0
    ? [...parsed.featureNames]
    : [...FEATURE_NAMES];

  return {
    rows,
    featureNames: datasetFeatureNames,
  };
}

function validateRows(rows: DatasetRow[]): void {
  if (rows.length < 8) {
    throw new Error(`Dataset insuficiente para treino (${rows.length} linhas).`);
  }

  const featureCount = rows[0].features.length;
  if (featureCount === 0) {
    throw new Error('Dataset inválido: features vazias.');
  }

  for (const row of rows) {
    if (row.features.length !== featureCount) {
      throw new Error('Dataset inválido: tamanho de feature inconsistente entre linhas.');
    }
  }

  const positives = rows.filter((row) => row.target === 1).length;
  const negatives = rows.length - positives;
  if (positives === 0 || negatives === 0) {
    throw new Error('Dataset inválido: apenas uma classe encontrada (alvo precisa ter 0 e 1).');
  }
}

function splitDataset(rows: DatasetRow[], testRatio = 0.2): { train: DatasetRow[]; test: DatasetRow[] } {
  const copy = shuffleInPlace([...rows]);
  const minTest = 2;
  const computedTestSize = Math.round(copy.length * testRatio);
  const testSize = clamp(computedTestSize, minTest, copy.length - minTest);
  return {
    train: copy.slice(0, copy.length - testSize),
    test: copy.slice(copy.length - testSize),
  };
}

function buildNormalizationStats(rows: DatasetRow[]): NormalizationStats {
  const featureCount = rows[0].features.length;
  const means = new Array<number>(featureCount).fill(0);
  const stdDevs = new Array<number>(featureCount).fill(0);

  for (const row of rows) {
    for (let i = 0; i < featureCount; i++) {
      means[i] += row.features[i];
    }
  }

  for (let i = 0; i < featureCount; i++) {
    means[i] /= rows.length;
  }

  for (const row of rows) {
    for (let i = 0; i < featureCount; i++) {
      const delta = row.features[i] - means[i];
      stdDevs[i] += delta * delta;
    }
  }

  for (let i = 0; i < featureCount; i++) {
    const variance = stdDevs[i] / rows.length;
    const std = Math.sqrt(variance);
    stdDevs[i] = std > 1e-8 ? std : 1;
  }

  return { means, stdDevs };
}

function normalizeFeatures(features: number[], stats: NormalizationStats): number[] {
  return features.map((value, index) => (value - stats.means[index]) / stats.stdDevs[index]);
}

function normalizeRows(rows: DatasetRow[], stats: NormalizationStats): DatasetRow[] {
  return rows.map((row) => ({
    target: row.target,
    features: normalizeFeatures(row.features, stats),
  }));
}

function computeLoss(rows: DatasetRow[], weights: number[], bias: number, l2: number): number {
  if (rows.length === 0) return 0;
  let loss = 0;
  const epsilon = 1e-9;

  for (const row of rows) {
    const probability = sigmoid(dot(weights, row.features) + bias);
    const y = row.target;
    loss += -(y * Math.log(probability + epsilon) + (1 - y) * Math.log(1 - probability + epsilon));
  }

  const regularization = 0.5 * l2 * weights.reduce((acc, weight) => acc + weight * weight, 0);
  return loss / rows.length + regularization;
}

function trainLogisticRegression(rows: DatasetRow[], config: TrainingConfig): { weights: number[]; bias: number } {
  const featureCount = rows[0].features.length;
  const weights = new Array<number>(featureCount).fill(0);
  let bias = 0;

  for (let epoch = 1; epoch <= config.epochs; epoch++) {
    const gradW = new Array<number>(featureCount).fill(0);
    let gradB = 0;

    for (const row of rows) {
      const prediction = sigmoid(dot(weights, row.features) + bias);
      const error = prediction - row.target;

      for (let i = 0; i < featureCount; i++) {
        gradW[i] += error * row.features[i];
      }
      gradB += error;
    }

    for (let i = 0; i < featureCount; i++) {
      const regularizedGrad = gradW[i] / rows.length + config.l2 * weights[i];
      weights[i] -= config.learningRate * regularizedGrad;
    }
    bias -= config.learningRate * (gradB / rows.length);

    if (epoch % config.logEvery === 0 || epoch === 1 || epoch === config.epochs) {
      const loss = computeLoss(rows, weights, bias, config.l2);
      log.info('Progresso do treino', {
        epoca: epoch,
        loss: Number(loss.toFixed(6)),
      });
    }
  }

  return { weights, bias };
}

function evaluate(rows: DatasetRow[], weights: number[], bias: number, threshold: number, l2 = 0): Metrics {
  if (rows.length === 0) {
    return {
      loss: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1: 0,
      positives: 0,
      negatives: 0,
    };
  }

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const row of rows) {
    const probability = sigmoid(dot(weights, row.features) + bias);
    const predicted = probability >= threshold ? 1 : 0;

    if (row.target === 1 && predicted === 1) tp++;
    else if (row.target === 0 && predicted === 0) tn++;
    else if (row.target === 0 && predicted === 1) fp++;
    else if (row.target === 1 && predicted === 0) fn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = (tp + tn) / rows.length;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const loss = computeLoss(rows, weights, bias, l2);

  return {
    loss,
    accuracy,
    precision,
    recall,
    f1,
    positives: rows.filter((row) => row.target === 1).length,
    negatives: rows.filter((row) => row.target === 0).length,
  };
}

function optimizeThreshold(rows: DatasetRow[], weights: number[], bias: number): number {
  let bestThreshold = 0.5;
  let bestF1 = -1;

  for (let threshold = 0.2; threshold <= 0.8; threshold += 0.02) {
    const metrics = evaluate(rows, weights, bias, Number(threshold.toFixed(2)));
    if (metrics.f1 > bestF1) {
      bestF1 = metrics.f1;
      bestThreshold = Number(threshold.toFixed(2));
    }
  }

  return bestThreshold;
}

export async function trainModel(): Promise<TrainedDealModel> {
  const { rows, featureNames } = loadDataset();
  validateRows(rows);

  const { train, test } = splitDataset(rows, 0.2);
  const positiveRate = rows.filter((row) => row.target === 1).length / rows.length;

  const normalization = buildNormalizationStats(train);
  const normalizedTrain = normalizeRows(train, normalization);
  const normalizedTest = normalizeRows(test, normalization);

  const trainingConfig: TrainingConfig = {
    learningRate: 0.05,
    epochs: 450,
    l2: 0.0008,
    logEvery: 50,
  };

  const { weights, bias } = trainLogisticRegression(normalizedTrain, trainingConfig);
  const threshold = optimizeThreshold(normalizedTrain, weights, bias);

  const trainMetrics = evaluate(normalizedTrain, weights, bias, threshold, trainingConfig.l2);
  const testMetrics = evaluate(normalizedTest, weights, bias, threshold, trainingConfig.l2);

  const model: TrainedDealModel = {
    version: 2,
    modelType: 'logistic-regression',
    createdAt: new Date().toISOString(),
    featureCount: rows[0].features.length,
    featureNames: featureNames.length === rows[0].features.length
      ? featureNames
      : [...FEATURE_NAMES],
    weights,
    bias,
    threshold,
    normalization,
    metrics: {
      train: trainMetrics,
      test: testMetrics,
      datasetSize: rows.length,
      trainSize: train.length,
      testSize: test.length,
      positiveRate,
    },
    training: trainingConfig,
    source: {
      datasetPath: DATASET_PATH,
    },
  };

  ensureParentDir(MODEL_PATH);
  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2));

  log.info('Modelo treinado e salvo', {
    caminho: MODEL_PATH,
    datasetSize: model.metrics.datasetSize,
    threshold: Number(model.threshold.toFixed(3)),
    trainAccuracy: Number(model.metrics.train.accuracy.toFixed(4)),
    testAccuracy: Number(model.metrics.test.accuracy.toFixed(4)),
    testF1: Number(model.metrics.test.f1.toFixed(4)),
  });

  return model;
}

if (require.main === module) {
  trainModel()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log.error('Erro durante o treino do modelo', { erro: error instanceof Error ? error.message : error });
      process.exit(1);
    });
}
