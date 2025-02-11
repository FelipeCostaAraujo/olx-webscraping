import { Router, Request, Response } from 'express';
import Ad from '../models/Ad';
import { predictAdQuality } from '../ml/predictor';
import { extractFeaturesFromAd } from '../ml/features';

const router = Router();

/**
 * GET /ads/:id/prediction
 * Retorna a previsão de qualidade para um anúncio específico.
 */
router.get('/ads/:id/prediction', async (req: any, res: any) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    const features = extractFeaturesFromAd(ad);
    const prediction = await predictAdQuality(features);
    res.json({ prediction });
  } catch (error) {
    console.error('Erro ao fazer previsão:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
});

export default router;
