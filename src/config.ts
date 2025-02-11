/**
 * 🔹 **Configuration file for OLX webscraping.**
 * 
 * Contains the maximum number of pages to scrape and the search configurations.
 */
export default {
  maxPages: 20,
  searches: [
    {
      query: "rtx 2080 ti",
      maxPrice: 2700,
      superPriceThreshold: 2000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&o=1",
      regex: /RTX\s*2080\s*Ti/i
    },
    {
      query: "rtx 3080 ti",
      maxPrice: 4000,
      superPriceThreshold: 3500,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&o=1",
      regex: /RTX\s*3080\s*Ti/i
    },
    {
      query: "rtx 3090",
      maxPrice: 4500,
      superPriceThreshold: 4000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3090&o=1",
      regex: /RTX\s*3090\s*/i
    },
  ],
  carSearches: [
    {
      query: "Audi a3",
      maxPrice: 70000,
      superPriceThreshold: 60000,
      baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp/sao-paulo-e-regiao?q=audi+a3&motp=10&o=1",
      regex: /AUDI\s*a3\s*/i,
      isCarSearch: true
    },
  ]
};
