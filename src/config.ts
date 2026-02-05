/**
 * 🔹 **Configuration file for OLX webscraping.**
 * 
 * Contains the maximum number of pages to scrape and the search configurations.
 */
export default {
  maxPages: 5,
  searches: [
    {
      query: "rtx 4000",
      maxPrice: 5000,
      superPriceThreshold: 1200,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+4000&o=1",
      regex: /RTX\s*4000\s*/i
    },
    {
      query: "rtx a4000",
      maxPrice: 7000,
      superPriceThreshold: 2000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+a4000&o=1",
      regex: /RTX\s*A4000\s*/i
    },
    {
      query: "nvidia tesla",
      maxPrice: 10000,
      superPriceThreshold: 600,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+tesla&pdvme=9&pdvme=3&pdvme=2&pdvme=1&o=1",
      regex: /NVIDIA\s*TESLA\s*/i
    },
     {
      query: "rtx 3060 12gb",
      maxPrice: 2500,               // hard cap
      superPriceThreshold: 1000,    // aciona alerta forte
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3060+12gb&o=1",
      regex: /RTX\s*3060\b.*12\s*GB/i
    },
    {
      query: "rtx 2060 12gb",
      maxPrice: 2200,
      superPriceThreshold: 1000,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2060+12gb&o=1",
      regex: /RTX\s*2060\b.*12\s*GB/i
    },

    //
    // 🟢 Teslas específicas (boas pra IA)
    //
    {
      query: "nvidia tesla p4",
      maxPrice: 2200,
      superPriceThreshold: 500, // 300–600 vai apitar forte
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+tesla+p4&o=1",
      regex: /TESLA\s*P4\b/i
    },
    {
      query: "nvidia tesla t4",
      maxPrice: 4000,
      superPriceThreshold: 1500,
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+tesla+t4&o=1",
      regex: /TESLA\s*T4\b/i
    },
    // {
    //   query: "rtx 2080 ti",
    //   maxPrice: 2000,
    //   superPriceThreshold: 1500,
    //   baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&o=1",
    //   regex: /RTX\s*2080\s*Ti\b/i
    // },
    {
      query: "rtx a5000",
      maxPrice: 9000,
      superPriceThreshold: 1000, // se aparecer <7k, vale MUITO olhar
      baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+a5000&o=1",
      regex: /RTX\s*A5000\b/i
    },
    //
    // {
    //   query: "rtx 2080 ti",
    //   maxPrice: 3000,
    //   superPriceThreshold: 2000,
    //   baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&o=1",
    //   regex: /RTX\s*2080\s*Ti/i
    // },
    // {
    //   query: "rtx 3090",
    //   maxPrice: 5000,
    //   superPriceThreshold: 4000,
    //   baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3090&o=1",
    //   regex: /RTX\s*3090\s*/i
    // },
    // {
    //   query: "gtx 1080 ti",
    //   maxPrice: 2000,
    //   superPriceThreshold: 1400,
    //   baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=gtx+1080+ti&o=1",
    //   regex: /GTX\s*1080\s*Ti/i
    // },
    // {
    //   query: "rtx 3080 ti",
    //   maxPrice: 4500,
    //   superPriceThreshold: 3500,
    //   baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&o=1",
    //   regex: /RTX\s*3080\s*Ti/i
    // },
  ],
  carSearches: [
    // {
    //   query: "Audi A3",
    //   maxPrice: 70000,
    //   superPriceThreshold: 60000,
    //   baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?pe=80000&q=audi%20a3&motp=10&o=1",
    //   regex: /AUDI\s*a3\s*/i,
    //   isCarSearch: true
    // },
    // {
    //   query: "Audi S3",
    //   maxPrice: 170000,
    //   superPriceThreshold: 100000,
    //   baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?cf=19&q=audi+s3&motp=10&o=1",
    //   regex: /AUDI\s*S3\s*/i,
    //   isCarSearch: true
    // },
    // {
    //   query: "Audi Q3",
    //   maxPrice: 100000,
    //   superPriceThreshold: 80000,
    //   baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?cf=19&q=audi+q3&motp=10&o=1",
    //   regex: /AUDI\s*Q3\s*/i,
    //   isCarSearch: true
    // },
  ]
};
