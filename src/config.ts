/**
 * 🔹 **Configuration file for OLX webscraping.**
 * 
 * Contains the maximum number of pages to scrape and the search configurations.
 */
export default {
  maxPages: 20,
  searches: [
    {
      query: "rtx 3080",
      maxPrice: 3000,
      superPriceThreshold: 2500,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080&o=1",
      regex: /RTX\s*3080\s*/i
    },
    {
      query: "rtx 2080 ti",
      maxPrice: 3000,
      superPriceThreshold: 2000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&o=1",
      regex: /RTX\s*2080\s*Ti/i
    },
    {
      query: "rtx 3090",
      maxPrice: 5000,
      superPriceThreshold: 4000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3090&o=1",
      regex: /RTX\s*3090\s*/i
    },
    {
      query: "gtx 1080 ti",
      maxPrice: 2000,
      superPriceThreshold: 1400,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=gtx+1080+ti&o=1",
      regex: /GTX\s*1080\s*Ti/i
    },
    {
      query: "rtx 3080 ti",
      maxPrice: 4500,
      superPriceThreshold: 3500,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&o=1",
      regex: /RTX\s*3080\s*Ti/i
    },
  ],
  carSearches: [
    {
      query: "Audi A3",
      maxPrice: 70000,
      superPriceThreshold: 60000,
      baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?pe=80000&q=audi%20a3&motp=10&o=1",
      regex: /AUDI\s*a3\s*/i,
      isCarSearch: true
    },
    {
      query: "Audi S3",
      maxPrice: 170000,
      superPriceThreshold: 100000,
      baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?cf=19&q=audi+s3&motp=10&o=1",
      regex: /AUDI\s*S3\s*/i,
      isCarSearch: true
    },
    {
      query: "Audi Q3",
      maxPrice: 100000,
      superPriceThreshold: 80000,
      baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?cf=19&q=audi+q3&motp=10&o=1",
      regex: /AUDI\s*Q3\s*/i,
      isCarSearch: true
    },
  ]
};
