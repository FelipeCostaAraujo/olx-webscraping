import * as cheerio from 'cheerio';

/**
 * 🔹 **Parses the HTML to extract ads based on the search configuration.**
 * Also extracts the location and publication date/time.
 * @param {string} html - The HTML content of the page.
 * @param {Object} search - The search configuration.
 * @returns {Array<Object>} - An array of ad objects.
 */
export function parseListings(html: string, search: any): any[] {
  const $ = cheerio.load(html);
  const listings: any[] = [];
  
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
    
    // Extração de detalhes (ex: "• Santa Maria - RS | 14 de jan, 00:24")
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
    
    // Se o título não corresponder ao regex da busca, ignora
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
