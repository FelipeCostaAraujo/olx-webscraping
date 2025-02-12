import { Document } from 'mongoose';
/**
 * Extrai features do anúncio para alimentar o modelo.
 * Exemplo: [price, daysSincePublication, goodStateIndicator]
 * Ajuste conforme as variáveis que você usou para treinar seu modelo.
 * @param ad Objeto do anúncio
 * @returns Array de números representando as features
 */
export function extractFeaturesFromAd(ad: Document): number[] {
  const currentDate = new Date();
  const publishedDate = new Date((ad as any).createdAt);
  const daysSincePublication = (currentDate.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const goodStateIndicator = ((ad as any).classification && (ad as any).classification.label === 'bom estado') ? 1 : 0;
  
  return [(ad as any).price, daysSincePublication, goodStateIndicator];
}
