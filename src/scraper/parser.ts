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
      detailsText = parent.find('span')
        .filter((index, el) => $(el).text().trim().startsWith("•"))
        .first().text().trim();
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
    
    // Remove caracteres indesejados e converte para número
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
  
  // Seleciona os cards de carro; no exemplo, utilizamos a classe "AdCard_root__Jkql_"
  $('section.AdCard_root__Jkql_').each((i, el) => {
    const title = $(el).find('a[data-testid="adcard-link"] h2').text().trim();
    const url = $(el).find('a[data-testid="adcard-link"]').attr('href');
    const priceText = $(el).find('h3.AdCard_price___yY62').text().trim();
    const location = $(el).find('.AdCard_locationdate__CaIOt p').text().trim();
    const imageUrl = $(el).find('picture img').attr('src');
    
    // Se houver um elemento para data de publicação, extraia-o;
    // caso contrário, deixe como string vazia.
    let publishedAt = "";
    // Exemplo: se a data estiver dentro de um elemento com uma classe específica (ajuste conforme necessário)
    // publishedAt = $(el).find('.AdCard_date__someClass').text().trim();
    
    // Converte o preço, removendo "R$" e separadores
    let price = parseFloat(
      priceText.replace('R$', '')
               .replace(/\./g, '')
               .replace(',', '.')
    );
    
    // Se o título não bate com a regex, ignora
    if (!search.regex.test(title)) return;
    // Se o preço ultrapassar o máximo definido, ignora
    if (price > search.maxPrice) return;
    
    const isSuperPrice = price <= search.superPriceThreshold;
    
    listings.push({
      title,
      price,
      url,
      imageUrl,
      searchQuery: search.query,
      superPrice: isSuperPrice,
      location,
      publishedAt
    });
  });
  
  console.log(`[ParserCar] ${listings.length} anúncios de carros extraídos para "${search.query}"`);
  return listings;
}
