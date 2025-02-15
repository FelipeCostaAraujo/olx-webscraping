import config from '../config';
import { fetchPage } from './fetcher';
import { parseListings, parseCarAd } from './parser';
import Ad from '../models/Ad';
import { classifyAd } from '../nlp/classifier';
import NotificationService from '../services/notification-service';


export default class Scraper {
    constructor(protected readonly notificationService: NotificationService) {}

    /**
     * 🔹 **Saves an ad to the database if it does not already exist.
     * Ads that are blacklisted are not reinserted.
     * If the ad already exists and the price has changed, update the price and add a record to the price history.
     * @param {Object} ad - The ad object to save.
     * @returns {Promise<void>}
     */
    async saveAd(ad: any): Promise<void> {
        try {
            const existing = await Ad.findOne({ title: ad.title, searchQuery: ad.searchQuery });
            if (existing) {
                if (existing.price !== ad.price) {
                    existing.priceHistory.push({ price: ad.price, date: new Date() });
                    existing.price = ad.price;
                    await existing.save();
                    const sortedHistory = [...existing.priceHistory].sort(
                        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    const previousPrice = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].price : existing.price;
                    console.log(`[Database] Atualizado preço do anúncio: ${ad.title}`);
                    if (ad.superPrice && ad.price < (previousPrice ?? 0) && existing.category === 'hardware') {
                        this.notificationService.sendPriceDropNotification({
                            adId: existing._id.toString(),
                            title: existing.title as string,
                            price: existing.price as number,
                            url: existing.url as string,
                            imageUrl: existing.imageUrl,
                            createdAt: existing.createdAt,
                        }, previousPrice ?? 0);
                    }
                } else {
                    console.log(`[Database] Anúncio já existe sem alteração de preço: ${ad.title}`);
                }
                return;
            }
            ad.priceHistory = [{ price: ad.price, date: new Date() }];
            const newAd = await Ad.create(ad);
            if (newAd.superPrice && newAd.category === 'hardware') {
                this.notificationService.sendPushNotification({
                    adId: newAd._id.toString(),
                    title: newAd.title as string,
                    price: newAd.price as number,
                    url: newAd.url as string,
                    imageUrl: newAd.imageUrl,
                    createdAt: newAd.createdAt,
                });
            }
            console.log(`[Database] Anúncio salvo: ${ad.title}`);
        } catch (err) {
            console.error("[Database] Erro ao salvar o anúncio:", err);
        }
    }

    /**
     * 🔹 **Builds the URL for a given search and page number.
     * @param {Object} search - The search configuration object.
     * @param {number} page - The page number.
     * @returns {string} - The constructed URL.
     */
    private buildUrl(search: any, page: number): string {
        const url = page === 1 ? search.baseUrl : search.baseUrl.replace(/&o=1$/, `&o=${page}`);
        console.log(`[URL Builder] Page ${page} URL: ${url}`);
        return url;
    }

    /**
     * 🔹 **Processes an ad by running it through the classifier before saving it.
     * @param {Object} ad - The ad object to process and save.
     * @returns {Promise<void>}
     */
    private async processAd(ad: any, category: string): Promise<void> {
        const classification = classifyAd(ad.title);
        ad.classification = classification;
        ad.category = category;
        await this.saveAd(ad);
    }

    /**
     * 🔹 **Scrapes ads for a specific search across pages 1 to maxPages and saves them to the database.
     * Agora integra a classificação antes do salvamento e escolhe o parser adequado.
     * @param {Object} search - The search configuration.
     * @returns {Promise<void>}
     */
    async checkListingsForSearch(search: any): Promise<void> {
        console.log(`[Scraper] Iniciando busca para "${search.query}"`);
        for (let page = 1; page <= config.maxPages; page++) {
            const url = this.buildUrl(search, page);
            const html = await fetchPage(url, search.isCarSearch ?? false);
            if (!html) {
                console.warn(`[Scraper] HTML não encontrado na página ${page} para "${search.query}"`);
                continue;
            }

            console.log(`[Scraper] HTML snippet da página ${page}: ${html.substring(0, 300)}\n...\n`);

            const listings = search.isCarSearch ? parseCarAd(html, search) : parseListings(html, search);
            if (listings.length === 0) {
                console.log(`[Scraper] Nenhum anúncio encontrado na página ${page} para "${search.query}"`);
            } else {
                console.log(`[Scraper] Encontrados ${listings.length} anúncios na página ${page} para "${search.query}"`);
                for (const ad of listings) {
                    const category = search.isCarSearch ? 'car' : 'hardware';
                    await this.processAd(ad, category);
                }
            }
        }
    }

    /**
     * 🔹 **Executes all configured searches to scrape ads.
     * @returns {Promise<void>}
     */
    async checkAllSearches(): Promise<void> {
        console.log("[Scraper] Executando todas as buscas...");
        for (const search of config.searches) {
            await this.checkListingsForSearch(search);
        }
        console.log("[Scraper] Todas as buscas finalizadas.");
    }

    /**
     * 🔹 **Executes all configured car searches to scrape car ads.
     * @returns {Promise<void>}
     */
    async checkCarSearches(): Promise<void> {
        console.log("[Scraper] Iniciando buscas para carros...");
        for (const search of config.carSearches) {
            await this.checkListingsForSearch(search);
        }
        console.log("[Scraper] Buscas para carros finalizadas.");
    }
}