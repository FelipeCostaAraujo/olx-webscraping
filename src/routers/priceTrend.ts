import { Router, Request, Response } from 'express';
import Ad from '../models/Ad';
import { detectPriceTrend } from '../utils/priceTrend';

const router = Router();

/**
 * GET /ads/:id/price-trend
 * Retorna a tendência de preço de um anúncio específico.
 */
router.get('/ads/:id/price-trend', async (req: any, res: any) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    // Mapeia o priceHistory para garantir que cada registro possua a propriedade price como number
    const priceHistory = ad.priceHistory.map((record: any) => ({
      date: record.date,
      price: record.price ?? 0
    }));
    const trend = detectPriceTrend(priceHistory);
    res.json(trend);
  } catch (error) {
    console.error("Erro ao obter tendência de preço:", error);
    res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
});

/**
 * (Opcional) GET /ads/price-trends
 * Retorna as tendências de preço de todos os anúncios.
 */
router.get('/ads/price-trends', async (req: any, res: any) => {
  try {
    const ads = await Ad.find();
    const trends = ads.map(ad => {
      const priceHistory = ad.priceHistory.map((record: any) => ({
        date: record.date,
        price: record.price ?? 0
      }));
      return {
        id: ad._id,
        title: ad.title,
        trend: detectPriceTrend(priceHistory)
      };
    });
    res.json(trends);
  } catch (error) {
    console.error("Erro ao obter tendências de preços:", error);
    res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
});

export default router;
