import * as cheerio from 'cheerio';
import { createLogger } from '../utils/logger';

const log = createLogger('Parser');

/**
 * 🔹 **Parses the HTML to extract ads based on the search configuration.**
 * Also extracts the location, publication date/time, and whether the ad is a super price.
 * This parser is used for standard searches (e.g., placas de vídeo).
 * @param {string} html - The HTML content of the page.
 * @param {Object} search - The search configuration.
 * @returns {Array<Object>} - An array of ad objects.
 */
export function parseListings(html: string, search: any): any[] {
  const $ = cheerio.load(html);
  const listings: any[] = [];
  
  // Nova estrutura da OLX (2024): usa data-testid="adcard-link"
  $('a[data-testid="adcard-link"]').each((i, el) => {
    const link = $(el).attr('href');
    const title = $(el).attr('title') || $(el).find('h2').text().trim();
    
    // Buscar o card pai (section.olx-adcard)
    const card = $(el).closest('section.olx-adcard');
    
    // Extrair preço
    const priceText = card.find('h3.olx-adcard__price').text().trim();
    
    // Extrair imagem
    const imgElement = card.find('img').first();
    const imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || "";
    
    // Extrair localização e data (no bottombody)
    const bottomBody = card.find('.olx-adcard__bottombody');
    const locationText = bottomBody.find('.olx-adcard__location-date').text().trim();
    
    let location = "";
    let publishedAt = "";
    
    if (locationText) {
      // Formato típico: "São Paulo - SP • Hoje, 15:30"
      const parts = locationText.split('•');
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
  
  log.info('Anúncios extraídos', { query: search.query, anuncios: listings.length });
  return listings;
}

function getFirstNonEmptyText($root: any, selectors: string[]): string {
  for (const selector of selectors) {
    const value = $root.find(selector).first().text().trim();
    if (value) return value;
  }
  return "";
}

function parsePriceValue(priceText: string): number | null {
  if (!priceText) return null;
  const raw = priceText.replace(/[^\d.,]/g, '');
  if (!raw) return null;

  let normalized = raw;
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/\./g, '');
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeOlxUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://www.olx.com.br${url.startsWith('/') ? '' : '/'}${url}`;
}

function getImageUrl($root: any): string {
  const img = $root.find('img').first();
  const src = img.attr('src') || img.attr('data-src');
  if (src) return src;

  const srcset = img.attr('srcset');
  if (!srcset) return "";

  const firstSrc = srcset
    .split(',')
    .map((entry: string) => entry.trim().split(' ')[0])
    .find(Boolean);

  return firstSrc || "";
}

function parseLocationAndPublished(rawText: string): { location: string; publishedAt: string } {
  if (!rawText) return { location: "", publishedAt: "" };
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  if (!normalized) return { location: "", publishedAt: "" };

  const parts = normalized.split('•').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      location: parts[0],
      publishedAt: parts.slice(1).join(' • '),
    };
  }

  return { location: normalized, publishedAt: "" };
}

function parseKilometersFromCard($root: any): number | undefined {
  const ariaLabels = $root
    .find('[aria-label]')
    .toArray()
    .map((el: any) => el?.attribs?.['aria-label'] || "")
    .join(' ');

  const textSource = `${$root.text()} ${ariaLabels}`.replace(/\s+/g, ' ');
  const match = textSource.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(mil)?\s*(?:km|quil[oô]metros?(?:\s+rodados?)?)/i);
  if (!match) return undefined;

  let value = Number.parseInt(match[1].replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(value)) return undefined;
  if (match[2]) value *= 1000;
  return value;
}

function matchesSearch(search: any, title: string): boolean {
  if (!title) return false;
  const regex = search.regex instanceof RegExp ? search.regex : new RegExp(String(search.regex), 'i');
  if (regex.global || regex.sticky) regex.lastIndex = 0;
  return regex.test(title);
}

/**
 * 🔹 **Parses the HTML to extract car ads based on the search configuration.**
 * Uses selectors adapted to the car ads layout.
 * Also extracts location, publishedAt (if available) and calculates superPrice.
 * @param {string} html - The HTML content of the page.
 * @param {Object} search - The search configuration.
 * @returns {Array<Object>} - An array of car ad objects.
 */
export function parseCarAd(html: string, search: any): any[] {
  const $ = cheerio.load(html);
  const listings: any[] = [];

  const seenKeys = new Set<string>();
  const adcardLinks = $('a[data-testid="adcard-link"]');
  const legacyCards = $('section[data-ds-component="DS-AdCard"]');

  log.debug('Estrutura de cards detectada', {
    query: search.query,
    linksAdCard: adcardLinks.length,
    cardsLegado: legacyCards.length,
  });

  adcardLinks.each((i, el) => {
    const linkEl = $(el);
    const card = linkEl.closest('section.olx-adcard, section[data-ds-component="DS-AdCard"], section[data-testid="adcard"], article[data-testid="adcard"]');
    const genericContainer = linkEl.closest('article, section, li');
    const cardRoot = card.length ? card : (genericContainer.length ? genericContainer : linkEl.parent());

    const rawUrl = linkEl.attr('href') || "";
    const url = normalizeOlxUrl(rawUrl);
    const title = (
      linkEl.attr('title') ||
      linkEl.find('h2, h3').first().text().trim() ||
      getFirstNonEmptyText(cardRoot, ['h2', 'h3', '[data-testid="adcard-title"]'])
    ).trim();

    if (!matchesSearch(search, title)) return;

    const priceText = getFirstNonEmptyText(cardRoot, [
      'h3.olx-adcard__price',
      '[data-testid="adcard-price"]',
      '[data-testid="ad-price"]',
      '[class*="price"] h2',
      '[class*="price"] h3',
      '[class*="price"] span',
      'span:contains("R$")',
      'p:contains("R$")',
    ]);

    const price = parsePriceValue(priceText);
    if (price == null || price > search.maxPrice) return;

    const locationText = getFirstNonEmptyText(cardRoot, [
      '.olx-adcard__location-date',
      '[data-testid="adcard-location-date"]',
      '[data-testid="adcard-location"]',
      '[class*="location-date"]',
    ]);

    const { location, publishedAt } = parseLocationAndPublished(locationText);
    const kilometers = parseKilometersFromCard(cardRoot);
    const imageUrl = getImageUrl(cardRoot);
    const superPrice = price <= search.superPriceThreshold;

    const dedupeKey = `${title}::${url}`;
    if (seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);

    listings.push({
      title,
      price,
      url,
      imageUrl,
      searchQuery: search.query,
      superPrice,
      location,
      kilometers,
      publishedAt
    });
  });

  log.info('Anúncios de carros extraídos', { query: search.query, anuncios: listings.length });
  return listings;
}
