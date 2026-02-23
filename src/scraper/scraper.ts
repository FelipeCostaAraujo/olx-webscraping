import { getConfig } from '../models/SearchConfig';
import { fetchPage } from './fetcher';
import { parseListings, parseCarAd } from './parser';
import Ad from '../models/Ad';
import { classifyAd } from '../nlp/classifier';
import NotificationService from '../services/notification-service';
import { createLogger } from '../utils/logger';

type RunType = 'hardware' | 'cars';

type RunCounters = {
    searchesTotal: number;
    searchesCompleted: number;
    pagesAttempted: number;
    pagesWithHtml: number;
    listingsParsed: number;
    adsProcessed: number;
    adsSaved: number;
    adsUpdated: number;
    adsUnchanged: number;
    superPriceFound: number;
    superPriceNew: number;
    notificationsSent: number;
    errors: number;
};

type SearchCounters = {
    query: string;
    startedAtMs: number;
    pagesAttempted: number;
    pagesWithHtml: number;
    listingsParsed: number;
    adsProcessed: number;
    adsSaved: number;
    adsUpdated: number;
    adsUnchanged: number;
    superPriceFound: number;
    errors: number;
};

type RunContext = {
    id: string;
    type: RunType;
    startedAt: Date;
    startedAtMs: number;
    maxPages: number;
    counters: RunCounters;
    searches: Map<string, SearchCounters>;
};

const log = createLogger('Scraper');
const logDb = createLogger('Database');
const logUrl = createLogger('URL Builder');

export default class Scraper {
    constructor(protected readonly notificationService: NotificationService) {}
    private activeRun: RunContext | null = null;

    private createRunCounters(searchesTotal: number): RunCounters {
        return {
            searchesTotal,
            searchesCompleted: 0,
            pagesAttempted: 0,
            pagesWithHtml: 0,
            listingsParsed: 0,
            adsProcessed: 0,
            adsSaved: 0,
            adsUpdated: 0,
            adsUnchanged: 0,
            superPriceFound: 0,
            superPriceNew: 0,
            notificationsSent: 0,
            errors: 0,
        };
    }

    private createSearchCounters(query: string): SearchCounters {
        return {
            query,
            startedAtMs: Date.now(),
            pagesAttempted: 0,
            pagesWithHtml: 0,
            listingsParsed: 0,
            adsProcessed: 0,
            adsSaved: 0,
            adsUpdated: 0,
            adsUnchanged: 0,
            superPriceFound: 0,
            errors: 0,
        };
    }

    private startRun(type: RunType, searchesTotal: number, maxPages: number): RunContext {
        const startedAt = new Date();
        const runId = `${type}-${startedAt.getTime().toString(36)}`;
        const run: RunContext = {
            id: runId,
            type,
            startedAt,
            startedAtMs: startedAt.getTime(),
            maxPages,
            counters: this.createRunCounters(searchesTotal),
            searches: new Map(),
        };
        this.activeRun = run;
        log.info('Iniciando varredura', {
            runId,
            tipo: type,
            inicio: startedAt.toISOString(),
            buscas: searchesTotal,
            maxPaginas: maxPages,
        });
        return run;
    }

    private finishRun(run: RunContext, status: 'success' | 'error'): void {
        const endedAt = new Date();
        const durationMs = endedAt.getTime() - run.startedAtMs;
        log.info('Varredura finalizada', {
            runId: run.id,
            tipo: run.type,
            status,
            inicio: run.startedAt.toISOString(),
            fim: endedAt.toISOString(),
            duracaoMs: durationMs,
            duracaoSeg: Math.round(durationMs / 1000),
            buscasTotal: run.counters.searchesTotal,
            buscasConcluidas: run.counters.searchesCompleted,
            paginasTentadas: run.counters.pagesAttempted,
            paginasComHtml: run.counters.pagesWithHtml,
            anunciosEncontrados: run.counters.listingsParsed,
            anunciosProcessados: run.counters.adsProcessed,
            anunciosSalvos: run.counters.adsSaved,
            anunciosAtualizados: run.counters.adsUpdated,
            anunciosSemMudanca: run.counters.adsUnchanged,
            superPrecosEncontrados: run.counters.superPriceFound,
            superPrecosNovos: run.counters.superPriceNew,
            notificacoesEnviadas: run.counters.notificationsSent,
            erros: run.counters.errors,
        });
        this.activeRun = null;
    }

    private getSearchStats(run: RunContext, query: string): SearchCounters {
        const existing = run.searches.get(query);
        if (existing) return existing;
        const stats = this.createSearchCounters(query);
        run.searches.set(query, stats);
        return stats;
    }

    /**
     * 🔹 **Saves an ad to the database if it does not already exist.
     * Ads that are blacklisted are not reinserted.
     * If the ad already exists and the price has changed, update the price and add a record to the price history.
     * @param {Object} ad - The ad object to save.
     * @returns {Promise<void>}
     */
    async saveAd(ad: any, run?: RunContext, searchStats?: SearchCounters): Promise<void> {
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
                    run && run.counters.adsUpdated++;
                    searchStats && searchStats.adsUpdated++;
                    logDb.info('Atualizado preço do anúncio', { titulo: ad.title, runId: run?.id });
                    if (ad.superPrice && ad.price < (previousPrice ?? 0) && existing.category === 'hardware') {
                        this.notificationService.sendPriceDropNotification({
                            adId: existing._id.toString(),
                            title: existing.title as string,
                            price: existing.price as number,
                            url: existing.url as string,
                            imageUrl: existing.imageUrl,
                            createdAt: existing.createdAt,
                        }, previousPrice ?? 0);
                        run && run.counters.notificationsSent++;
                    }
                } else {
                    run && run.counters.adsUnchanged++;
                    searchStats && searchStats.adsUnchanged++;
                    logDb.info('Anúncio já existe sem alteração de preço', { titulo: ad.title, runId: run?.id });
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
                run && run.counters.notificationsSent++;
            }
            run && run.counters.adsSaved++;
            searchStats && searchStats.adsSaved++;
            if (newAd.superPrice) {
                run && run.counters.superPriceNew++;
            }
            logDb.info('Anúncio salvo', { titulo: ad.title, runId: run?.id });
        } catch (err) {
            run && run.counters.errors++;
            searchStats && searchStats.errors++;
            logDb.error('Erro ao salvar o anúncio', { runId: run?.id, erro: err });
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
        logUrl.debug('URL da página', { pagina: page, url });
        return url;
    }

    /**
     * 🔹 **Processes an ad by running it through the classifier before saving it.
     * @param {Object} ad - The ad object to process and save.
     * @returns {Promise<void>}
     */
    private async processAd(ad: any, category: string, run?: RunContext, searchStats?: SearchCounters): Promise<void> {
        const classification = classifyAd(ad.title);
        ad.classification = classification;
        ad.category = category;
        await this.saveAd(ad, run, searchStats);
    }

    /**
     * 🔹 **Scrapes ads for a specific search across pages 1 to maxPages and saves them to the database.
     * Agora integra a classificação antes do salvamento e escolhe o parser adequado.
     * @param {Object} search - The search configuration.
     * @returns {Promise<void>}
     */
    async checkListingsForSearch(search: any, run: RunContext, isCarSearch: boolean): Promise<void> {
        const startedAtMs = Date.now();
        const searchStats = this.getSearchStats(run, search.query);
        log.info('Iniciando busca', { query: search.query, runId: run.id });
        for (let page = 1; page <= run.maxPages; page++) {
            const url = this.buildUrl(search, page);
            run && run.counters.pagesAttempted++;
            searchStats && searchStats.pagesAttempted++;
            const html = await fetchPage(url, isCarSearch);
            if (!html) {
                run && run.counters.errors++;
                searchStats && searchStats.errors++;
                log.warn('HTML não encontrado', { pagina: page, query: search.query, runId: run?.id });
                continue;
            }

            run && run.counters.pagesWithHtml++;
            searchStats && searchStats.pagesWithHtml++;
            if (process.env.LOG_HTML_SNIPPET === 'true') {
                log.debug('HTML snippet', { pagina: page, query: search.query, snippet: html.substring(0, 300) });
            } else {
                log.debug('HTML carregado', { pagina: page, query: search.query, tamanho: html.length });
            }

            const listings = isCarSearch ? parseCarAd(html, search) : parseListings(html, search);
            run && (run.counters.listingsParsed += listings.length);
            searchStats && (searchStats.listingsParsed += listings.length);
            const superPriceFound = listings.filter((listing) => listing.superPrice).length;
            run && (run.counters.superPriceFound += superPriceFound);
            searchStats && (searchStats.superPriceFound += superPriceFound);
            if (listings.length === 0) {
                log.info('Nenhum anúncio encontrado na página', { pagina: page, query: search.query, runId: run?.id });
            } else {
                log.info('Anúncios encontrados na página', {
                    pagina: page,
                    query: search.query,
                    anuncios: listings.length,
                    superPrecos: superPriceFound,
                    runId: run?.id,
                });
                for (const ad of listings) {
                    const category = isCarSearch ? 'car' : 'hardware';
                    run && run.counters.adsProcessed++;
                    searchStats && searchStats.adsProcessed++;
                    await this.processAd(ad, category, run, searchStats);
                }
            }
        }
        const durationMs = Date.now() - startedAtMs;
        if (searchStats) {
            run && run.counters.searchesCompleted++;
            log.info('Resumo da busca', {
                query: search.query,
                runId: run?.id,
                duracaoMs: durationMs,
                duracaoSeg: Math.round(durationMs / 1000),
                paginasTentadas: searchStats.pagesAttempted,
                paginasComHtml: searchStats.pagesWithHtml,
                anunciosEncontrados: searchStats.listingsParsed,
                anunciosProcessados: searchStats.adsProcessed,
                anunciosSalvos: searchStats.adsSaved,
                anunciosAtualizados: searchStats.adsUpdated,
                anunciosSemMudanca: searchStats.adsUnchanged,
                superPrecosEncontrados: searchStats.superPriceFound,
                erros: searchStats.errors,
            });
        }
    }

    /**
     * 🔹 **Executes all configured searches to scrape ads.
     * @returns {Promise<void>}
     */
    async checkAllSearches(): Promise<void> {
        const config = await getConfig();
        const { maxPages, items } = config.gpuSearches;
        const run = this.startRun('hardware', items.length, maxPages);
        try {
            for (const search of items) {
                await this.checkListingsForSearch(search, run, false);
            }
            this.finishRun(run, 'success');
        } catch (err) {
            run.counters.errors++;
            log.error('Erro durante varredura', { runId: run.id, erro: err });
            this.finishRun(run, 'error');
        }
    }

    /**
     * 🔹 **Executes all configured car searches to scrape car ads.
     * @returns {Promise<void>}
     */
    async checkCarSearches(): Promise<void> {
        const config = await getConfig();
        const { maxPages, items } = config.carSearches;
        const run = this.startRun('cars', items.length, maxPages);
        try {
            for (const search of items) {
                await this.checkListingsForSearch(search, run, true);
            }
            this.finishRun(run, 'success');
        } catch (err) {
            run.counters.errors++;
            log.error('Erro durante varredura de carros', { runId: run.id, erro: err });
            this.finishRun(run, 'error');
        }
    }
}
