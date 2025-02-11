/**
 * 🔹 **Main API file for scraping and serving OLX ads.**
 * 
 * This file connects to MongoDB, defines the Ad model, scrapes ads using Axios (with Puppeteer fallback),
 * and exposes endpoints to list and soft-delete (blacklist) ads.
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');

/**
 * 🔹 **Connects to MongoDB using the provided environment variable.**
 */
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("A variável de ambiente MONGODB_URI não está definida!");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log("Conectado ao MongoDB."))
  .catch((err) => {
    console.error("Erro ao conectar no MongoDB:", err);
    process.exit(1);
  });

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

/**
 * 🔹 **Builds the URL for a given search and page number.**
 * @param {Object} search - The search configuration object.
 * @param {number} page - The page number.
 * @returns {string} - The constructed URL.
 */
function buildUrl(search, page) {
  const url = page === 1 ? search.baseUrl : search.baseUrl.replace(/&o=1$/, `&o=${page}`);
  console.log(`[URL Builder] Page ${page} URL: ${url}`);
  return url;
}

/**
 * 🔹 **Performs auto-scroll on a Puppeteer page to load lazy-loaded content.**
 * @param {Object} page - The Puppeteer page instance.
 * @returns {Promise<void>}
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * 🔹 **Fetches the HTML content of a page using Puppeteer as fallback.**
 * @param {string} url - The URL of the page.
 * @returns {Promise<string|null>} - The HTML content or null if failed.
 */
async function fetchPageWithPuppeteer(url) {
  let browser;
  try {
    console.log(`[Puppeteer] Iniciando busca: ${url}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/105.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('a.olx-ad-card__link-wrapper', { timeout: 60000 });
    await autoScroll(page);
    console.log(`[Puppeteer] Página carregada: ${url}`);
    return await page.content();
  } catch (err) {
    console.error(`[Puppeteer] Erro ao buscar ${url}: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * 🔹 **Fetches the HTML content of a page using Axios, falling back to Puppeteer on 403 errors.**
 * @param {string} url - The URL of the page.
 * @returns {Promise<string|null>} - The HTML content or null if failed.
 */
async function fetchPage(url) {
  try {
    console.log(`[Axios] Buscando: ${url}`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                      'Chrome/105.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    console.log(`[Axios] Página carregada: ${url}`);
    return data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.warn(`[Axios] 403 para ${url}. Usando Puppeteer...`);
      return await fetchPageWithPuppeteer(url);
    } else {
      console.error(`[Axios] Erro ao buscar ${url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * 🔹 **Parses the HTML to extract ads based on the search configuration.**
 * Also extracts the location and publication date/time.
 * @param {string} html - The HTML content of the page.
 * @param {Object} search - The search configuration.
 * @returns {Array<Object>} - An array of ad objects.
 */
function parseListings(html, search) {
  const $ = cheerio.load(html);
  let listings = [];
  
  $('a.olx-ad-card__link-wrapper').each((i, el) => {
    const link = $(el).attr('href');
    const titleId = $(el).attr('aria-labelledby');
    let title = "";
    if (titleId) {
      title = $(`#${titleId}`).text().trim();
    }
    const parent = $(el).parent();
    const priceText = parent.find('.olx-ad-card__price').text().trim();
    const imgElement = parent.find('img').first();
    const imageUrl = imgElement.attr('data-src') || imgElement.attr('src') || "";
    
    // Tenta extrair os detalhes (ex: "• Santa Maria - RS | 14 de jan, 00:24")
    let detailsText = parent.find('.olx-ad-card__bottom').text().trim();
    if (!detailsText) {
      detailsText = parent.find('span').filter((index, el) => $(el).text().trim().startsWith("•")).first().text().trim();
    }
    let location = "";
    let publishedAt = "";
    if (detailsText) {
      const parts = detailsText.replace('•', '').split('|');
      if (parts.length > 0) {
        location = parts[0].trim();
      }
      if (parts.length > 1) {
        publishedAt = parts[1].trim();
      }
    }
    
    if (!search.regex.test(title)) {
      return;
    }
    
    let price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
    if (price && price <= search.maxPrice) {
      const isSuperPrice = price <= search.superPriceThreshold;
      listings.push({
        title,
        price,
        url: link,
        imageUrl,
        searchQuery: search.query,
        superPrice: isSuperPrice,
        location,
        publishedAt
      });
    }
  });
  
  console.log(`[Parser] ${listings.length} anúncios extraídos para "${search.query}"`);
  return listings;
}

/**
 * 🔹 **Saves an ad to the database if it does not already exist.
 * Ads that are blacklisted are not reinserted.
 * @param {Object} ad - The ad object to save.
 * @returns {Promise<void>}
 */
async function saveAd(ad) {
  try {
    const existing = await Ad.findOne({ title: ad.title, price: ad.price });
    if (existing) {
      console.log(`[Database] Anúncio já existe: ${ad.title}`);
      return;
    }
    await Ad.create(ad);
    console.log(`[Database] Anúncio salvo: ${ad.title}`);
  } catch (err) {
    console.error("[Database] Erro ao salvar o anúncio:", err);
  }
}

/**
 * 🔹 **Scrapes ads for a specific search across pages 1 to maxPages and saves them to the database.**
 * @param {Object} search - The search configuration.
 * @returns {Promise<void>}
 */
async function checkListingsForSearch(search) {
  console.log(`[Scraper] Iniciando busca para "${search.query}"`);
  for (let page = 1; page <= config.maxPages; page++) {
    const url = buildUrl(search, page);
    const html = await fetchPage(url);
    if (!html) {
      console.warn(`[Scraper] HTML não encontrado na página ${page} para "${search.query}"`);
      continue;
    }
    const listings = parseListings(html, search);
    if (listings.length === 0) {
      console.log(`[Scraper] Nenhum anúncio encontrado na página ${page} para "${search.query}"`);
    } else {
      console.log(`[Scraper] Encontrados ${listings.length} anúncios na página ${page} para "${search.query}"`);
      for (const ad of listings) {
        await saveAd(ad);
      }
    }
  }
}

/**
 * 🔹 **Executes all configured searches to scrape ads.**
 * @returns {Promise<void>}
 */
async function checkAllSearches() {
  console.log("[Scraper] Executando todas as buscas...");
  for (const search of config.searches) {
    await checkListingsForSearch(search);
  }
  console.log("[Scraper] Todas as buscas finalizadas.");
}

// Schedules the searches to run every 2 hours.
cron.schedule('0 */2 * * *', () => {
  console.log("[Cron] Iniciando busca agendada...");
  checkAllSearches();
});

// Runs the searches immediately on startup.
checkAllSearches();

/**
 * 🔹 **Sets up the Express server with endpoints for listing and soft-deleting (blacklisting) ads.**
 */
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

/**
 * 🔹 **GET /ads - Lists all ads that are not blacklisted, sorted based on query parameters.
 * 
 * Query Parameters (optional):
 *   - superPrice: if "true", sorts ads with superPrice (true) first.
 *   - price: "asc" to sort by price ascending, or "desc" for descending.
 *   - published: "first" to sort by createdAt descending (most recent first) or "last" for ascending (oldest first).
 * 
 * Default ordering is by published first (createdAt descending).
 */
app.get('/ads', async (req, res) => {
  try {
    let sortCriteria = {};
  
    if (req.query.superPrice === 'true') {
      sortCriteria.superPrice = -1;
    }
  
    if (req.query.price) {
      if (req.query.price === 'asc') {
        sortCriteria.price = 1;
      } else if (req.query.price === 'desc') {
        sortCriteria.price = -1;
      }
    }
  
    if (req.query.published) {
      if (req.query.published === 'first') {
        sortCriteria.createdAt = -1;
      } else if (req.query.published === 'last') {
        sortCriteria.createdAt = 1;
      }
    } else {
      sortCriteria.createdAt = -1;
    }
  
    const ads = await Ad.find({ blacklisted: { $ne: true } }).sort(sortCriteria);
    console.log(`[API] Retornando ${ads.length} anúncios.`);
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar anúncios.' });
  }
});

/**
 * 🔹 **DELETE /ads/:id - Marks an ad as blacklisted (soft deletion) so that it is not scraped or listed again.**
 * @param {string} id - The ID of the ad to blacklist.
 */
app.delete('/ads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const ad = await Ad.findByIdAndUpdate(id, { blacklisted: true }, { new: true });
    if (!ad) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    console.log(`[API] Anúncio excluído: ${ad.title}`);
    res.json({ message: 'Anúncio excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir o anúncio.' });
  }
});

app.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});
