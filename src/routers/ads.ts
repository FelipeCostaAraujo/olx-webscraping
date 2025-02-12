import { Router, Request, Response } from 'express';
import Ad from '../models/Ad';

const router = Router();

/**
 * 🔹 **GET /ads - Lists all ads that are not blacklisted, sorted based on query parameters.
 * 
 * Query Parameters (optional):
 *   - superPrice: if "true", sorts ads with superPrice (true) first.
 *   - price: "asc" to sort by price ascending, or "desc" for descending.
 *   - published: "first" to sort by createdAt descending (most recent first) or "last" for ascending (oldest first).
 *   - category: filter ads by category ("hardware" or "car"). If not provided, all categories are returned.
 *   - trend: if "downFirst" is passed, ads that have had a price drop (priceTrend === "down") are listed first.
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

    console.log(`[API] Retornando ${adsWithPriceData.length} anúncios.`);
    res.json(adsWithPriceData);
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


export default router;
