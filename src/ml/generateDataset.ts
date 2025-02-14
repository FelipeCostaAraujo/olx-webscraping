import Ad from '../models/Ad';
import fs from 'fs';
import { extractFeaturesFromAd } from './features';

export async function generateDataset() {
  try {
    const ads = await Ad.find({ blacklisted: false });
    const dataset = ads.map((ad) => {
      return {
        features: extractFeaturesFromAd(ad),
        target: 0.8,
      };
    });
    fs.writeFileSync('artifacts/data/dataset.json', JSON.stringify(dataset, null, 2));
    console.log('Dataset gerado com sucesso!');
  } catch (err) {
    console.error('Erro ao gerar dataset:', err);
  }
}

