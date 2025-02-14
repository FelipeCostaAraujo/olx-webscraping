export interface PriceRecord {
    price: number;
    date: Date;
  }
  
  export interface PriceTrend {
    trend: 'upward' | 'downward' | 'stable';
    delta: number;
  }
  
  /**
   * Dado o histórico de preços, determina a tendência.
   * Se houver menos de 2 registros, retorna 'stable'.
   */
  export function detectPriceTrend(priceHistory: PriceRecord[]): PriceTrend {
    if (priceHistory.length < 2) return { trend: 'stable', delta: 0 };
  
    priceHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
    const initialPrice = priceHistory[0].price;
    const latestPrice = priceHistory[priceHistory.length - 1].price;
    const delta = latestPrice - initialPrice;
  
    const threshold = 0.05 * initialPrice;
  
    if (delta > threshold) {
      return { trend: 'upward', delta };
    } else if (delta < -threshold) {
      return { trend: 'downward', delta };
    } else {
      return { trend: 'stable', delta };
    }
  }
  