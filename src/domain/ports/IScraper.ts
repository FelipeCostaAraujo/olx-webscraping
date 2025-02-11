import { Ad } from "../entities/Ad";

/**
 * 🔹 **IScraper**
 * 
 * Defines the contract for a scraper adapter.
 * The scraper must implement the method scrapeAds which,
 * given a search configuration, returns a Promise of an array of Ad objects.
 */
export interface IScraper {
  /**
   * Scrape ads based on the provided search configuration.
   * @param searchConfig - Object containing search parameters (baseUrl, regex, maxPrice, superPriceThreshold, etc.)
   * @returns Promise<Ad[]> - A promise that resolves to an array of Ad objects.
   */
  scrapeAds(searchConfig: any): Promise<Ad[]>;
}
