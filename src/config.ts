const config = {
  gpuSearches: {
    maxPages: 5,
    items: [
      // ── 24 GB VRAM ─────────────────────────────────────────────────────────
      {
        query: "rtx 3090",
        maxPrice: 9000,
        superPriceThreshold: 4000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3090&o=1",
        regex: /RTX\s*3090\b/i
      },
      {
        query: "rtx 3090 ti",
        maxPrice: 11000,
        superPriceThreshold: 5500,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3090+ti&o=1",
        regex: /RTX\s*3090\s*Ti\b/i
      },
      {
        query: "rtx 4090",
        maxPrice: 18000,
        superPriceThreshold: 10000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+4090&o=1",
        regex: /RTX\s*4090\b/i
      },
      {
        query: "rtx a5000",
        maxPrice: 9000,
        superPriceThreshold: 2000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+a5000&o=1",
        regex: /RTX\s*A5000\b/i
      },
      {
        query: "quadro rtx 6000",
        maxPrice: 7000,
        superPriceThreshold: 2000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=quadro+rtx+6000&o=1",
        regex: /QUADRO\s*RTX\s*6000\b/i
      },
      {
        query: "rtx 4500 ada",
        maxPrice: 12000,
        superPriceThreshold: 3000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+4500+ada&o=1",
        regex: /RTX\s*4500\s*Ada\b/i
      },
      {
        query: "tesla m40",
        maxPrice: 1500,
        superPriceThreshold: 300,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=tesla+m40&o=1",
        regex: /TESLA\s*M40\b/i
      },

      // ── 48 GB VRAM ─────────────────────────────────────────────────────────
      {
        query: "rtx a6000",
        maxPrice: 14000,
        superPriceThreshold: 3000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+a6000&o=1",
        regex: /RTX\s*A6000\b/i
      },
      {
        query: "quadro rtx 8000",
        maxPrice: 12000,
        superPriceThreshold: 3000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=quadro+rtx+8000&o=1",
        regex: /(?:QUADRO\s*)?RTX\s*8000\b/i
      },
      {
        query: "rtx 6000 ada",
        maxPrice: 35000,
        superPriceThreshold: 8000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+6000+ada&o=1",
        regex: /RTX\s*6000\s*Ada\b/i
      },
      {
        query: "nvidia a40",
        maxPrice: 14000,
        superPriceThreshold: 3000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+a40&o=1",
        regex: /NVIDIA\s*A40\b/i
      },
      {
        query: "nvidia l40",
        maxPrice: 25000,
        superPriceThreshold: 5000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+l40&o=1",
        regex: /NVIDIA\s*L40\b(?!S)/i
      },
      {
        query: "nvidia l40s",
        maxPrice: 30000,
        superPriceThreshold: 6000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+l40s&o=1",
        regex: /NVIDIA\s*L40S\b/i
      },

      // ── 80 GB+ VRAM ────────────────────────────────────────────────────────
      {
        query: "tesla v100 32gb",
        maxPrice: 8000,
        superPriceThreshold: 2000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=tesla+v100+32gb&o=1",
        regex: /TESLA\s*V100\b/i
      },
      {
        query: "nvidia tesla a100",
        maxPrice: 40000,
        superPriceThreshold: 5000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+tesla+a100&o=1",
        regex: /(?:TESLA\s*)?A100\b/i
      },
      {
        query: "nvidia h100",
        maxPrice: 90000,
        superPriceThreshold: 15000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+h100&o=1",
        regex: /NVIDIA\s*H100\b/i
      },

      // ── Buscas genéricas / legado ───────────────────────────────────────────
      {
        query: "rtx 4000",
        maxPrice: 5000,
        superPriceThreshold: 1200,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+4000&o=1",
        regex: /RTX\s*4000\b/i
      },
      {
        query: "rtx a4000",
        maxPrice: 7000,
        superPriceThreshold: 2000,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+a4000&o=1",
        regex: /RTX\s*A4000\b/i
      },
      {
        query: "nvidia tesla",
        maxPrice: 10000,
        superPriceThreshold: 600,
        baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=nvidia+tesla&pdvme=9&pdvme=3&pdvme=2&pdvme=1&o=1",
        regex: /NVIDIA\s*TESLA\b/i
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
