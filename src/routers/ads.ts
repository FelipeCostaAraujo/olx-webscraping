import { Router, Request, Response } from 'express';
import Ad from '../models/Ad';
import { buildPriceContext, extractFeaturesFromAd } from '../ml/features';
import { predictAdQuality } from '../ml/predictor';
import { createLogger } from '../utils/logger';

const router = Router();
const log = createLogger('Ads API');

/**
 * 🔹 **GET /ads - Lists all ads that are not blacklisted, sorted based on query parameters.
 * 
 * Query Parameters (optional):
 *   - superPrice: if "true", sorts ads with superPrice (true) first.
 *   - price: "asc" to sort by price ascending, or "desc" for descending.
 *   - published: "first" to sort by createdAt descending (most recent first) or "last" for ascending (oldest first).
 *   - category: filter ads by category ("hardware" or "car"). If not provided, all categories are returned.
 *   - trend: if "downFirst" is passed, ads that have had a price drop (priceTrend === "down") are listed first.
 *   - dealFirst: if "true", scores ads with ML and sorts by best deal first.
 * 
 * Default ordering is by published first (createdAt descending).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sortCriteria: any = {};

    if (req.query.superPrice === 'true') {
      sortCriteria.superPrice = -1;
    }
    if (req.query.price) {
      sortCriteria.price = req.query.price === 'asc' ? 1 : -1;
    }
    if (req.query.published) {
      sortCriteria.createdAt = req.query.published === 'first' ? -1 : 1;
    } else {
      sortCriteria.createdAt = -1;
    }

    const filter: any = { blacklisted: { $ne: true } };
    if (req.query.category) {
      const category = (req.query.category as string).toLowerCase();
      if (category === 'hardware' || category === 'car') {
        filter.category = category;
      }
    }

    const ads = await Ad.find(filter).sort(sortCriteria);
    const adsWithPriceData = ads.map(ad => {
      const adObj = ad.toObject();
      const priceData = calculatePriceData(adObj);
      adObj.priceTrend = priceData.trend;
      adObj.priceDifference = priceData.diff;
      return adObj;
    });

    let responseAds = adsWithPriceData;

    if (req.query.dealFirst === 'true') {
      try {
        const adsWithMlScore = await scoreAdsByDeal(responseAds);
        responseAds = adsWithMlScore.sort((a: any, b: any) => {
          const scoreA = typeof a.mlScore === 'number' ? a.mlScore : -1;
          const scoreB = typeof b.mlScore === 'number' ? b.mlScore : -1;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } catch (error) {
        log.warn('Falha ao ordenar por score de ML, retornando ordenação padrão', {
          erro: error instanceof Error ? error.message : error,
        });
      }
    }

    log.info('Anúncios retornados', {
      total: responseAds.length,
      dealFirst: req.query.dealFirst === 'true',
    });
    res.json(responseAds);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar anúncios.' });
  }
});

/**
 * 🔹 **DELETE /ads/:id - Marks an ad as blacklisted (soft deletion) so that it is not scraped or listed again.
 * @param {string} id - The ID of the ad to blacklist.
 */
router.delete('/:id', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const ad = await Ad.findByIdAndUpdate(id, { blacklisted: true }, { new: true });
    if (!ad) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    console.log(`[API] Anúncio excluído: ${ad.title}`);
    res.json({ message: 'Anúncio excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir o anúncio.' });
  }
});

function calculatePriceData(ad: any): { trend: string, diff: number } {
  if (!ad.priceHistory || ad.priceHistory.length < 2) {
    return { trend: "initial", diff: 0 };
  }
  const sortedHistory = [...ad.priceHistory].sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const previousPrice = sortedHistory[sortedHistory.length - 2].price;
  const lastPrice = sortedHistory[sortedHistory.length - 1].price;
  const diff = lastPrice - previousPrice;
  
  let trend = "";
  if (diff < 0) {
    trend = "down";
  } else if (diff > 0) {
    trend = "up";
  } else {
    trend = "stable";
  }
  return { trend, diff };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dealGroupKey(ad: any): string {
  const category = String(ad?.category || 'unknown').toLowerCase();
  const searchQuery = String(ad?.searchQuery || 'unknown').toLowerCase().trim();
  return `${category}::${searchQuery}`;
}

async function scoreAdsByDeal(ads: any[]): Promise<any[]> {
  const groupedPrices = new Map<string, number[]>();
  const allPrices: number[] = [];

  for (const ad of ads) {
    const price = toNumber(ad?.price);
    if (price <= 0) continue;
    allPrices.push(price);
    const key = dealGroupKey(ad);
    const list = groupedPrices.get(key) || [];
    list.push(price);
    groupedPrices.set(key, list);
  }

  const globalContext = buildPriceContext(allPrices);
  const groupedContexts = new Map<string, ReturnType<typeof buildPriceContext>>();
  for (const [key, prices] of groupedPrices.entries()) {
    groupedContexts.set(key, buildPriceContext(prices));
  }

  const now = new Date();
  const scoredAds = await Promise.all(
    ads.map(async (ad) => {
      const context = groupedContexts.get(dealGroupKey(ad)) || globalContext;
      const features = extractFeaturesFromAd(ad, { priceContext: context, now });
      const mlScore = await predictAdQuality(features);
      return { ...ad, mlScore };
    })
  );

  return scoredAds;
}


export default router;
