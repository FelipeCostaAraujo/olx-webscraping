import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export interface Classification {
  sentimentScore: number;
  label: string;
  keywords: string[];
}

/**
 * Função que analisa o texto do anúncio e retorna uma classificação.
 * @param text - Texto do anúncio (ex: título ou combinação de título e descrição)
 * @returns Objeto com o score, label e palavras-chave.
 */
export function classifyAd(text: string): Classification {
  const result = sentiment.analyze(text);

  const keywords: string[] = result.calculation
    .map(item => Object.keys(item)[0])
    .filter(word => word && word.length > 2);

  const textLower = text.toLowerCase();

  const defectKeywords = ['defeito', 'com defeito', 'danificado', 'quebrado', 'ruim', 'estragado', 'com detalhe', 'não da video', 'não da imagem'];
  const newKeywords = ['novo', 'na caixa', 'novo em folha', 'intacto', 'zero uso'];
  const goodKeywords = ['bom estado', 'ótimo estado', 'como novo'];

  const containsNew = newKeywords.some((keyword) => textLower.includes(keyword));
  const containsGood = goodKeywords.some((keyword) => textLower.includes(keyword));
  const containsDefect = defectKeywords.some((keyword) => textLower.includes(keyword));

  let label = 'indefinido';
  if (containsNew) {
    label = 'novo';
  } else if (containsDefect) {
    label = 'defeito';
  } else if (containsGood || result.score > 3) {
    label = 'bom estado';
  } else if (result.score < -3) {
    label = 'defeito';
  }

  return {
    sentimentScore: result.score,
    label,
    keywords,
  };
}
