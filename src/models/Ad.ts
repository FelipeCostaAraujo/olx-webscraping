import mongoose from 'mongoose';

/**
 * 🔹 **Defines the Ad schema and model.**
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
  blacklisted: { type: Boolean, default: false }
});

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
