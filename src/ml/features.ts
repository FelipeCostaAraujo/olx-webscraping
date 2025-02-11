import { Document } from 'mongoose';
// Caso você tenha uma interface para o Ad, importe-a. Por exemplo:
// import { IAd } from '../models/Ad';

/**
 * Extrai features do anúncio para alimentar o modelo.
 * Exemplo: [price, daysSincePublication, goodStateIndicator]
 * Ajuste conforme as variáveis que você usou para treinar seu modelo.
 * @param ad Objeto do anúncio
 * @returns Array de números representando as features
 */
export function extractFeaturesFromAd(ad: Document): number[] {
  const currentDate = new Date();
  // Supondo que ad.createdAt esteja disponível e seja uma data ou string compatível.
  const publishedDate = new Date((ad as any).createdAt);
  const daysSincePublication = (currentDate.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Exemplo: se o anúncio tiver uma classificação prévia que indica "bom estado".
  const goodStateIndicator = ((ad as any).classification && (ad as any).classification.label === 'bom estado') ? 1 : 0;
  
  // Retorne as features – ajuste conforme necessário.
  return [(ad as any).price, daysSincePublication, goodStateIndicator];
}
