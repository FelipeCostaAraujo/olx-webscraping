const config = {
  gpuSearches: {
    maxPages: 5,
    items: [
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
        query: "nvidia tesla p4",
        maxPrice: 2200,
        superPriceThreshold: 500,
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
      {
        query: "rtx a5000",
        maxPrice: 9000,
        superPriceThreshold: 1000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+a5000&o=1",
        regex: /RTX\s*A5000\b/i
      },
    ]
  },

  carSearches: {
    maxPages: 3,
    items: [
      {
        query: "Audi A3",
        maxPrice: 70000,
        superPriceThreshold: 60000,
        baseUrl: "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-sp?pe=80000&q=audi%20a3&motp=10&o=1",
        regex: /AUDI\s*a3\s*/i
      },
    ]
  }
};

export default config;
