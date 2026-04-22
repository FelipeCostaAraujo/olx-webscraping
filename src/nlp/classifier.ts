import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export interface Classification {
  sentimentScore: number;
  label: string;
  keywords: string[];
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  const normalizedText = normalizeForMatch(text);

  const defectKeywords = [
    'defeito',
    'com defeito',
    'danificado',
    'quebrado',
    'ruim',
    'estragado',
    'com detalhe',
    'nao da video',
    'nao da imagem',
    'sem video',
    'sem imagem',
    'nao liga',
    'nao funciona',
    'com problema',
    'queimado',
    'para pecas',
    'pecas',
    'sucata',
    'sem funcionamento',
  ];

  const legalRiskKeywords = [
    'leilao',
    'passagem por leilao',
    'recuperado',
    'sinistro',
    'media monta',
    'grande monta',
    'pequena monta',
    'perda total',
    'salvado',
    'batido',
    'enchente',
  ];

  const newKeywords = ['novo', 'na caixa', 'novo em folha', 'intacto', 'zero uso'];
  const goodKeywords = ['bom estado', 'otimo estado', 'como novo'];

  const containsNew = newKeywords.some((keyword) => normalizedText.includes(keyword));
  const containsGood = goodKeywords.some((keyword) => normalizedText.includes(keyword));
  const containsDefect = defectKeywords.some((keyword) => normalizedText.includes(keyword));
  const containsLegalRisk = legalRiskKeywords.some((keyword) => normalizedText.includes(keyword));

  let label = 'indefinido';
  if (containsDefect) {
    label = 'defeito';
  } else if (containsLegalRisk) {
    label = 'risco';
  } else if (containsNew) {
    label = 'novo';
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
