import 'dotenv/config';
import mongoose from 'mongoose';
import connectToDatabase from '../database';
import Ad from '../models/Ad';
import { buildPriceContext, extractFeaturesFromAd } from './features';
import { predictAdQualityDetailed } from './predictor';

function toNumeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveRequestedAdId(): string | null {
  const argvId = process.argv[2];
  if (argvId && argvId.trim().length > 0) {
    return argvId.trim();
  }

  const envId = process.env.AD_ID;
  if (envId && envId.trim().length > 0) {
    return envId.trim();
  }

  return null;
}

async function processPredictionForAd() {
  let exitCode = 0;
  try {
    await connectToDatabase();

    const requestedAdId = resolveRequestedAdId();
    const ad = requestedAdId
      ? await Ad.findById(requestedAdId)
      : await Ad.findOne({
          blacklisted: { $ne: true },
          price: { $gt: 0 },
        }).sort({ createdAt: -1 });

    if (!ad) {
      if (requestedAdId) {
        throw new Error(`Anúncio não encontrado para o ID ${requestedAdId}.`);
      }
      throw new Error('Nenhum anúncio elegível encontrado para teste de predição.');
    }

    if (!requestedAdId) {
      console.log(`AD_ID não informado. Usando anúncio mais recente: ${ad._id}`);
    }

    const peerAds = await Ad.find({
      blacklisted: { $ne: true },
      searchQuery: ad.searchQuery,
      category: ad.category,
      price: { $gt: 0 },
    }, { price: 1 }).lean();

    const prices = peerAds.map((item: any) => toNumeric(item.price)).filter((price) => price > 0);
    if (prices.length === 0) prices.push(toNumeric(ad.price));

    const context = buildPriceContext(prices);
    const features = extractFeaturesFromAd(ad, { priceContext: context });
    const prediction = await predictAdQualityDetailed(features);

    console.log('--- Predição ---');
    console.log(`Título: ${ad.title}`);
    console.log(`Score: ${prediction.score.toFixed(4)}`);
    console.log(`Threshold: ${prediction.threshold.toFixed(4)}`);
    console.log(`É oportunidade? ${prediction.isDeal ? 'SIM' : 'NÃO'}`);
    console.log(`Confiança: ${prediction.confidence.toFixed(4)}`);
    console.log(`Amostra de contexto: ${context.sampleSize}`);
  } catch (error) {
    exitCode = 1;
    console.error('Erro ao fazer predição:', error);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Erro ao encerrar conexão do MongoDB:', disconnectError);
    }
    process.exit(exitCode);
  }
}

processPredictionForAd();
