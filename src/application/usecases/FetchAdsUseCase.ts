import { IAdRepository } from "../../domain/ports/IAdRepository";
import { IScraper } from "../../domain/ports/IScraper";
import { Ad } from "../../domain/entities/Ad";
import config from "../../config/config";

/**
 * 🔹 **FetchAdsUseCase**
 * 
 * Orchestrates the process of scraping ads using the scraper adapter
 * and then saving them using the repository adapter.
 */
export class FetchAdsUseCase {
  constructor(
    private adRepository: IAdRepository,
    private scraper: IScraper
  ) {}

  async execute(): Promise<void> {
    for (const searchConfig of config.searches) {
      console.log(`[FetchAdsUseCase] Executando busca para: ${searchConfig.query}`);
      try {
        // Chama o scraper passando a configuração de busca
        const adsData = await this.scraper.scrapeAds(searchConfig);
        console.log(`[FetchAdsUseCase] ${adsData.length} anúncios retornados para ${searchConfig.query}`);
        for (const adData of adsData) {
          // Se o campo createdAt não estiver presente, usamos a data atual
          const createdAt = adData.createdAt ? new Date(adData.createdAt) : new Date();
          // Instancia a entidade Ad
          const ad = new Ad(
            adData.id || "",  // Caso o ID não seja fornecido, pode ser gerado pelo repositório
            adData.title,
            adData.price,
            adData.url,
            adData.imageUrl,
            adData.searchQuery,
            adData.superPrice,
            adData.location,
            adData.publishedAt,
            createdAt,
            adData.blacklisted || false
          );
          try {
            await this.adRepository.save(ad);
            console.log(`[FetchAdsUseCase] Anúncio salvo: ${ad.title}`);
          } catch (err) {
            console.error(`[FetchAdsUseCase] Erro ao salvar anúncio "${ad.title}": ${err}`);
          }
        }
      } catch (err) {
        console.error(`[FetchAdsUseCase] Erro na busca para "${searchConfig.query}": ${err}`);
      }
    }
  }
}
