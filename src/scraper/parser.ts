import * as cheerio from 'cheerio';

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
  
  console.log(`[Parser] ${listings.length} anúncios extraídos para "${search.query}"`);
  return listings;
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

  $('section[data-ds-component="DS-AdCard"]').each((i, el) => {
    const linkEl = $(el).find('a[data-ds-component="DS-NewAdCard-Link"]');
    const url = linkEl.attr('href') || "";
    const title = linkEl.find('h2').text().trim();

    const priceText = $(el)
      .find('div.olx-ad-card__details-price--vertical h3.olx-ad-card__price')
      .text()
      .trim();
    let price = parseFloat(
      priceText.replace(/[^\d,]/g, '').replace(',', '.')
    );

    const location = $(el)
      .find('div.olx-ad-card__location-date-container--vertical p')
      .text()
      .trim() || "";

    let kmText = "";
    const kmSpan = $(el).find('li.olx-ad-card__labels-item span[aria-label*="quilômetros rodados"]');
    if (kmSpan.length > 0) {
      kmText = kmSpan.attr('aria-label') || "";
    }

    const kilometers = parseInt(kmText.replace(/[^0-9]/g, ''), 10);

    if (!search.regex.test(title)) return;
    if (price > search.maxPrice) return;

    const isSuperPrice = price <= search.superPriceThreshold;

    listings.push({
      title,
      price,
      url,
      imageUrl: $(el).find('div.olx-image-carousel picture img').attr('src') || "",
      searchQuery: search.query,
      superPrice: isSuperPrice,
      location,
      kilometers,
      publishedAt: ""
    });
  });

  console.log(`[ParserCar] ${listings.length} anúncios de carros extraídos para "${search.query}"`);
  return listings;
}
