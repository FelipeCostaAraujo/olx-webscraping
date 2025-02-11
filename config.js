/**
 * 🔹 **Configuration file for OLX webscraping.**
 * 
 * Contains the maximum number of pages to scrape and the search configurations.
 */
module.exports = {
    maxPages: 20, // Maximum number of pages to scrape for each search.
    searches: [
      {
        query: "rtx 2080 ti",
        maxPrice: 2500,
        superPriceThreshold: 2000, // A RTX 2080 Ti is considered "super preço" if <= 2000.
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&o=1",
        regex: /RTX\s*2080\s*Ti/i
      },
      {
        query: "rtx 3080 ti",
        maxPrice: 3500,
        superPriceThreshold: 3000, // A RTX 3080 Ti is considered "super preço" if <= 3000.
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&o=1",
        regex: /RTX\s*3080\s*Ti/i
      }
    ]
  };
  