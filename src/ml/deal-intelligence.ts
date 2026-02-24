import { PriceContext } from './features';
import { PredictionResult } from './predictor';

const FEATURE_INDEX = {
  discountVsMedian: 1,
  ageNormalized: 3,
  conditionScore: 4,
  superPriceFlag: 6,
  hasRecentDrop: 7,
  dropRatio: 8,
  isCar: 10,
  kilometersNormalized: 11,
} as const;

export type DealLabel = 'alta' | 'media' | 'neutra' | 'baixa';

export interface DealExplanation {
  label: DealLabel;
  reasons: string[];
  highlights: string[];
  cautions: string[];
  metrics: {
    discountPct: number;
    dropPct: number;
    ageDaysEstimate: number;
    sampleSize: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number): number {
  return Number((value * 100).toFixed(1));
}

function inferLabel(prediction: PredictionResult): DealLabel {
  const highCut = Math.max(prediction.threshold + 0.2, 0.82);
  const mediumCut = Math.max(prediction.threshold + 0.08, 0.65);
  const neutralCut = Math.max(prediction.threshold - 0.05, 0.45);

  if (prediction.score >= highCut) return 'alta';
  if (prediction.score >= mediumCut) return 'media';
  if (prediction.score >= neutralCut) return 'neutra';
  return 'baixa';
}

export function isStrongDeal(prediction: PredictionResult): boolean {
  return prediction.isDeal && prediction.score >= Math.max(prediction.threshold + 0.12, 0.72);
}

export function explainDealOpportunity(
  ad: any,
  priceContext: PriceContext,
  features: number[],
  prediction: PredictionResult
): DealExplanation {
  const discount = features[FEATURE_INDEX.discountVsMedian] ?? 0;
  const ageNormalized = features[FEATURE_INDEX.ageNormalized] ?? 0;
  const condition = features[FEATURE_INDEX.conditionScore] ?? 0;
  const superPriceFlag = features[FEATURE_INDEX.superPriceFlag] ?? 0;
  const hasRecentDrop = features[FEATURE_INDEX.hasRecentDrop] ?? 0;
  const dropRatio = features[FEATURE_INDEX.dropRatio] ?? 0;
  const isCar = features[FEATURE_INDEX.isCar] ?? 0;
  const kmNormalized = features[FEATURE_INDEX.kilometersNormalized] ?? 0;

  const highlights: string[] = [];
  const cautions: string[] = [];

  if (discount >= 0.08) {
    highlights.push(`Preço ${toPercent(discount)}% abaixo da mediana da busca`);
  } else if (discount <= -0.06) {
    cautions.push(`Preço ${toPercent(Math.abs(discount))}% acima da mediana da busca`);
  }

  if (superPriceFlag === 1) {
    highlights.push('Anúncio marcado como super preço pelo filtro');
  }

  if (hasRecentDrop === 1 && dropRatio > 0.02) {
    highlights.push(`Preço caiu ${toPercent(dropRatio)}% no último movimento`);
  } else if (dropRatio < -0.05) {
    cautions.push(`Preço subiu ${toPercent(Math.abs(dropRatio))}% no último movimento`);
  }

  if (condition >= 0.75) {
    highlights.push('Descrição/classificação indica bom estado');
  } else if (condition <= 0.2) {
    cautions.push('Descrição/classificação indica possível defeito');
  }

  if (ageNormalized <= 0.2) {
    highlights.push('Anúncio recente');
  } else if (ageNormalized >= 1) {
    cautions.push('Anúncio antigo no marketplace');
  }

  if (isCar === 1) {
    if (kmNormalized <= 0.35) {
      highlights.push('Quilometragem relativamente baixa para a faixa');
    } else if (kmNormalized >= 0.9) {
      cautions.push('Quilometragem elevada');
    }
  }

  if (priceContext.sampleSize < 4) {
    cautions.push('Amostra pequena para comparação de preço');
  }

  const reasons = [...highlights.slice(0, 3), ...cautions.slice(0, 2)];
  const label = inferLabel(prediction);

  return {
    label,
    reasons,
    highlights,
    cautions,
    metrics: {
      discountPct: toPercent(discount),
      dropPct: toPercent(dropRatio),
      ageDaysEstimate: Number((clamp(ageNormalized, 0, 2) * 45).toFixed(1)),
      sampleSize: priceContext.sampleSize,
    },
  };
}
