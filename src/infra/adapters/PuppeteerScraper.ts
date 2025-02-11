import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { IScraper } from "../../domain/ports/IScraper";
import { Ad } from "../../domain/entities/Ad";

export class PuppeteerScraper implements IScraper {
    /**
     * Scrape ads based on the provided search configuration.
     * @param searchConfig - An object containing parameters (baseUrl, regex, maxPrice, superPriceThreshold, etc.)
     * @returns Promise<Ad[]> - A promise that resolves to an array of Ad objects.
     */
    async scrapeAds(searchConfig: any): Promise<Ad[]> {
        const ads: Ad[] = [];
        // Aqui vamos iterar pelo número de páginas, conforme definido no searchConfig (ou use um valor padrão)
        const maxPages = searchConfig.maxPages || 10;
        for (let page = 1; page <= maxPages; page++) {
            const url = page === 1 ? searchConfig.baseUrl : searchConfig.baseUrl.replace(/&o=1$/, `&o=${page}`);
            console.log(`[PuppeteerScraper] Buscando URL: ${url}`);
            const html = await this.fetchPage(url);
            if (!html) {
                console.warn(`[PuppeteerScraper] HTML não encontrado na página ${page} para "${searchConfig.query}"`);
                continue;
            }
            const pageAds = this.parseListings(html, searchConfig);
            console.log(`[PuppeteerScraper] Encontrados ${pageAds.length} anúncios na página ${page} para "${searchConfig.query}"`);
            ads.push(...pageAds);
        }
        console.log(`[PuppeteerScraper] Total de anúncios extraídos para "${searchConfig.query}": ${ads.length}`);
        return ads;
    }

    /**
     * Uses Puppeteer to fetch the HTML content of a page.
     * @param url - The URL to fetch.
     * @returns Promise<string | null> - The HTML content or null on error.
     */
    private async fetchPage(url: string): Promise<string | null> {
        let browser;
        try {
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
            const totalScrolled = await this.autoScroll(page);
            console.log(`[PuppeteerScraper] Total scrolled: ${totalScrolled}`);
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
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
            console.log(`[PuppeteerScraper] Página carregada: ${url}`);
            return await page.content();
        } catch (err: any) {
            console.error(`[PuppeteerScraper] Erro ao buscar ${url}: ${err.message}`);
            return null;
        } finally {
            if (browser) await browser.close();
        }
    }

    /**
   * 🔹 **Performs auto-scroll on a Puppeteer page to load lazy-loaded content.**
   * @param {Object} page - The Puppeteer page instance.
   * @returns {Promise<void>}
   */
    async autoScroll(page: any): Promise<number> {
        return await page.evaluate(async () => {
            return await new Promise<number>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve(totalHeight);
                    }
                }, 100);
            });
        });
    }



    /**
     * Parses the HTML content using Cheerio and extracts ads based on the search configuration.
     * @param html - The HTML content of the page.
     * @param searchConfig - The search configuration.
     * @returns Ad[] - An array of Ad objects.
     */
    private parseListings(html: string, searchConfig: any): Ad[] {
        const $ = cheerio.load(html);
        const ads: Ad[] = [];

        $('a.olx-ad-card__link-wrapper').each((i, el) => {
            const link = $(el).attr('href') || "";
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

            if (!searchConfig.regex.test(title)) {
                return;
            }

            const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
            if (price && price <= searchConfig.maxPrice) {
                const isSuperPrice = price <= searchConfig.superPriceThreshold;
                ads.push({
                    id: "", // O ID pode ser gerado pelo banco de dados se não estiver presente
                    title,
                    price,
                    url: link,
                    imageUrl,
                    searchQuery: searchConfig.query,
                    superPrice: isSuperPrice,
                    location,
                    publishedAt,
                    createdAt: new Date(), // Data atual como fallback
                    blacklisted: false
                });
            }
        });

        console.log(`[PuppeteerScraper] ${ads.length} anúncios extraídos para "${searchConfig.query}"`);
        return ads;
    }
}
