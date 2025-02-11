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

  // Extração simplificada de palavras-chave a partir da contribuição de cada palavra:
  interface CalculationItem {
    [word: string]: number;
  }
  const keywords: string[] = result.calculation
    .map((item: CalculationItem) => Object.keys(item)[0])
    .filter((word: string) => word && word.length > 2);

  // Verificação manual de palavras-chave que indicam defeito.
  // Você pode adicionar ou ajustar os termos conforme necessário.
  const defectKeywords = ['defeito', 'com defeito', 'danificado', 'quebrado', 'ruim', 'estragado'];
  const textLower = text.toLowerCase();
  const containsDefect = defectKeywords.some(keyword => textLower.includes(keyword));

  // Definição do label com base na presença de palavras-chave e no score do Sentiment.
  let label = '';
  if (containsDefect) {
    label = 'defeito';
  } else if (result.score > 3) {
    label = 'bom estado';
  } else if (result.score < -3) {
    label = 'defeito';
  } else {
    label = 'indefinido';
  }

  return {
    sentimentScore: result.score,
    label,
    keywords,
  };
}
