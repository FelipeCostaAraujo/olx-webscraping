import config from '../config';
import { fetchPage } from './fetcher';
import { parseListings } from './parser';
import Ad from '../models/Ad';

/**
 * 🔹 **Saves an ad to the database if it does not already exist.
 * Ads that are blacklisted are not reinserted.
 * @param {Object} ad - The ad object to save.
 * @returns {Promise<void>}
 */
export async function saveAd(ad: any): Promise<void> {
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
 * 🔹 **Builds the URL for a given search and page number.**
 * @param {Object} search - The search configuration object.
 * @param {number} page - The page number.
 * @returns {string} - The constructed URL.
 */
function buildUrl(search: any, page: number): string {
  const url = page === 1 ? search.baseUrl : search.baseUrl.replace(/&o=1$/, `&o=${page}`);
  console.log(`[URL Builder] Page ${page} URL: ${url}`);
  return url;
}

/**
 * 🔹 **Scrapes ads for a specific search across pages 1 to maxPages and saves them to the database.**
 * @param {Object} search - The search configuration.
 * @returns {Promise<void>}
 */
export async function checkListingsForSearch(search: any): Promise<void> {
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
export async function checkAllSearches(): Promise<void> {
  console.log("[Scraper] Executando todas as buscas...");
  for (const search of config.searches) {
    await checkListingsForSearch(search);
  }
  console.log("[Scraper] Todas as buscas finalizadas.");
}
