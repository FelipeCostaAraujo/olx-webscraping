
import { extractFeaturesFromAd } from './features';
import Ad from '../models/Ad';
import { predictAdQuality } from './predictor';
import connectToDatabase from '../database';

async function processPredictionForAd() {
  try {
    await connectToDatabase();
    const ad = await Ad.findById("67ad19d9f69d4278a38dc058");
    if (!ad) {
      console.error("Anúncio não encontrado!");
      return;
    }
    const features = extractFeaturesFromAd(ad);
    const prediction = await predictAdQuality(features);
    console.log(`Predição para o anúncio "${ad.title}": ${prediction}`);
  } catch (error) {
    console.error("Erro ao fazer a predição:", error);
  }
}

processPredictionForAd();
