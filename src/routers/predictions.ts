import { Router } from 'express';
import Ad from '../models/Ad';
import { buildPriceContext, extractFeaturesFromAd } from '../ml/features';
import { predictAdQualityDetailed } from '../ml/predictor';
import { explainDealOpportunity } from '../ml/deal-intelligence';
import { createLogger } from '../utils/logger';

const router = Router();
const log = createLogger('Predictions API');

function toNumeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * GET /ads/:id/prediction
 * Retorna score de oportunidade de um anúncio.
 */
router.get('/ads/:id/prediction', async (req: any, res: any) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }

    const groupFilter = {
      blacklisted: { $ne: true },
      searchQuery: ad.searchQuery,
      category: ad.category,
      price: { $gt: 0 },
    };

    const peerAds = await Ad.find(groupFilter, { price: 1 }).lean();
    const prices = peerAds
      .map((item: any) => toNumeric(item.price))
      .filter((price) => price > 0);

    if (prices.length === 0 && toNumeric(ad.price) > 0) {
      prices.push(toNumeric(ad.price));
    }

    const priceContext = buildPriceContext(prices);
    const features = extractFeaturesFromAd(ad, {
      priceContext,
      now: new Date(),
    });

    const prediction = await predictAdQualityDetailed(features);
    const explanation = explainDealOpportunity(ad, priceContext, features, prediction);

    log.info('Predição calculada', {
      adId: String(ad._id),
      score: Number(prediction.score.toFixed(4)),
      isDeal: prediction.isDeal,
      contextoAmostras: priceContext.sampleSize,
      label: explanation.label,
    });

    res.json({
      adId: ad._id,
      title: ad.title,
      prediction,
      explanation,
      context: {
        searchQuery: ad.searchQuery,
        category: ad.category,
        medianPrice: priceContext.medianPrice,
        p25Price: priceContext.p25Price,
        p75Price: priceContext.p75Price,
        sampleSize: priceContext.sampleSize,
      },
      featureVector: features,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    log.error('Erro ao fazer previsão', { erro: message });
    res.status(500).json({ error: message });
  }
});

export default router;
