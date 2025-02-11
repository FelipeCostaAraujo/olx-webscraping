/**
 * 🔹 **Configuration file for OLX webscraping.**
 * 
 * Contains the maximum number of pages to scrape and the search configurations.
 */
export default {
  maxPages: 10,
  searches: [
    {
      query: "rtx 2080 ti",
      maxPrice: 2500,
      superPriceThreshold: 2000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&sp=2&pdvme=2&pdvme=1&o=1",
      regex: /RTX\s*2080\s*Ti/i
    },
    {
      query: "rtx 3080 ti",
      maxPrice: 3500,
      superPriceThreshold: 3000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&sp=2&pdvme=2&pdvme=1&o=1",
      regex: /RTX\s*3080\s*Ti/i
    }
  ]
};
