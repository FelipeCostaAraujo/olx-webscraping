import mongoose from 'mongoose';

/**
 * 🔹 **Defines the Ad schema and model.**
 * 
 * @property {String} title - Title of the ad.
 * @property {Number} price - Price of the ad.
 * @property {String} url - URL of the ad.
 * @property {String} imageUrl - URL of the ad image.
 * @property {String} searchQuery - The search query used to scrape the ad.
 * @property {Boolean} superPrice - Indicates if the ad is considered "super preço".
 * @property {String} location - The region and state where the ad was published.
 * @property {String} publishedAt - The date and time when the ad was published.
 * @property {Date} createdAt - Date and time when the ad was created.
 * @property {Boolean} blacklisted - Indicates if the ad is blacklisted.
 * 
 * @property {Object} classification - Resultado da classificação do anúncio.
 * @property {Number} classification.sentimentScore - Score de sentimento do anúncio.
 * @property {String} classification.label - Label resultante da classificação (ex: "bom estado", "defeito", "indefinido").
 * @property {String[]} classification.keywords - Lista de palavras-chave extraídas.
 * 
 * @property {Array} priceHistory - Histórico de preços do anúncio.
 * Cada item possui:
 *    - price: Número (valor do preço)
 *    - date: Data em que o preço foi registrado
 * 
 * @property {String} category - Categoria do anúncio, ex: "hardware" ou "car".
 */
const adSchema = new mongoose.Schema({
  title: String,
  price: Number,
  url: String,
  imageUrl: String,
  searchQuery: String,
  superPrice: { type: Boolean, default: false },
  location: { type: String, default: "" },
  publishedAt: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  blacklisted: { type: Boolean, default: false },
  classification: {
    sentimentScore: { type: Number, default: 0 },
    label: { type: String, default: '' },
    keywords: { type: [String], default: [] }
  },
  priceHistory: {
    type: [{
      price: Number,
      date: { type: Date, default: Date.now }
    }],
    default: []
  },
  category: {
    type: String,
    enum: ['hardware', 'car'],
    default: 'hardware'
  },
  priceTrend: { type: String, required: false },
  priceDifference: { type: Number, required: false },
  kilometers: { type: Number, required: false }
});

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
