/**
 * 🔹 **Configuration file for OLX webscraping.**
 * 
 * Contains the maximum number of pages to scrape and the search configurations.
 */
export default {
  maxPages: 25,
  searches: [
    {
      query: "rtx 2080 ti",
      maxPrice: 2500,
      superPriceThreshold: 2000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&o=1",
      regex: /RTX\s*2080\s*Ti/i
    },
    {
      query: "rtx 3080 ti",
      maxPrice: 3500,
      superPriceThreshold: 3000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&o=1",
      regex: /RTX\s*3080\s*Ti/i
    },
    ,
    {
      query: "rtx 3090",
      maxPrice: 4500,
      superPriceThreshold: 3500,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3090&o=1",
      regex: /RTX\s*3090\s*/i
    }
  ]
};
