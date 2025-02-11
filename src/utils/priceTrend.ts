export interface PriceRecord {
    price: number;
    date: Date;
  }
  
  export interface PriceTrend {
    trend: 'upward' | 'downward' | 'stable';
    delta: number;  // Diferença entre o preço inicial e o preço mais recente
  }
  
  /**
   * Dado o histórico de preços, determina a tendência.
   * Se houver menos de 2 registros, retorna 'stable'.
   */
  export function detectPriceTrend(priceHistory: PriceRecord[]): PriceTrend {
    if (priceHistory.length < 2) return { trend: 'stable', delta: 0 };
  
    // Ordena o histórico por data (ascendente)
    priceHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
    const initialPrice = priceHistory[0].price;
    const latestPrice = priceHistory[priceHistory.length - 1].price;
    const delta = latestPrice - initialPrice;
  
    // Define um limiar de 5% do preço inicial para considerar mudanças significativas
    const threshold = 0.05 * initialPrice;
  
    if (delta > threshold) {
      return { trend: 'upward', delta };
    } else if (delta < -threshold) {
      return { trend: 'downward', delta };
    } else {
      return { trend: 'stable', delta };
    }
  }
  