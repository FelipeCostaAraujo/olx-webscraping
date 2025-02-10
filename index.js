require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const express = require('express');
const mongoose = require('mongoose');

// ----------------------------------------------------
// 1. Conexão com o MongoDB (usando seu servidor local ou Dell)
const MONGODB_URI = process.env.MONGODB_URI; 
if (!MONGODB_URI) {
  console.error("A variável de ambiente MONGODB_URI não está definida!");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log("Conectado ao MongoDB."))
  .catch((err) => {
    console.error("Erro ao conectar no MongoDB:", err);
    process.exit(1);
  });

// ----------------------------------------------------
// 2. Definição do Schema e Model para anúncios
const adSchema = new mongoose.Schema({
  title: String,
  price: Number,
  url: String,
  searchQuery: String, // "rtx 2080 ti" ou "rtx 3080 ti"
  createdAt: { type: Date, default: Date.now }
});

const Ad = mongoose.model('Ad', adSchema);

// ----------------------------------------------------
// 3. Configuração das buscas
// Cada objeto representa uma busca com parâmetros específicos.
const searches = [
  {
    query: "rtx 2080 ti",
    maxPrice: 2500,
    baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+2080+ti&sp=2&pdvme=2&pdvme=1&o=1",
    regex: /RTX\s*2080\s*Ti/i
  },
  {
    query: "rtx 3080 ti",
    maxPrice: 3500,
    baseUrl: "https://www.olx.com.br/informatica/placas-de-video?q=rtx+3080+ti&sp=2&pdvme=2&pdvme=1&o=1",
    regex: /RTX\s*3080\s*Ti/i
  }
];

// Função para construir a URL com a página desejada.
// Se for a página 1, retorna a baseUrl (que já contém &o=1).
// Caso contrário, substitui o "&o=1" final por "&o=page".
function buildUrl(search, page) {
  if (page === 1) return search.baseUrl;
  return search.baseUrl.replace(/&o=1$/, `&o=${page}`);
}

// ----------------------------------------------------
// 4. Funções para Scraping

// Função para auto-scroll com Puppeteer (para carregar conteúdo lazy-loaded)
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Usa o Puppeteer para obter o HTML (fallback)
async function fetchPageWithPuppeteer(url) {
  let browser;
  try {
    console.log("Usando Puppeteer para buscar a página:", url);
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/105.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2' });
    await autoScroll(page);
    return await page.content();
  } catch (err) {
    console.error("Erro no Puppeteer:", err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// Tenta obter o HTML com Axios; se ocorrer 403, usa Puppeteer
async function fetchPage(url) {
  console.log("Buscando URL:", url);
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                      'Chrome/105.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    return data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.warn("Axios retornou 403. Usando Puppeteer...");
      return await fetchPageWithPuppeteer(url);
    } else {
      console.error("Erro ao buscar a página:", error.message);
      return null;
    }
  }
}

// Faz o parse do HTML para extrair os anúncios encontrados para uma busca específica
function parseListings(html, search) {
  const $ = cheerio.load(html);
  let listings = [];

  // Seleciona os anúncios usando o seletor de link (baseado na estrutura observada)
  $('a.olx-ad-card__link-wrapper').each((i, el) => {
    const link = $(el).attr('href');
    const titleId = $(el).attr('aria-labelledby');
    let title = "";
    if (titleId) {
      title = $(`#${titleId}`).text().trim();
    }
    // Supondo que o preço esteja em um elemento com a classe "olx-ad-card__price" próximo ao link
    const parent = $(el).parent();
    const priceText = parent.find('.olx-ad-card__price').text().trim();

    console.log(`DEBUG [${search.query}]: Anúncio ${i + 1} -> Título: "${title}" | Preço bruto: "${priceText}" | Link: "${link}"`);

    // Filtra o anúncio pelo título usando o regex específico
    if (!search.regex.test(title)) {
      console.log(`DEBUG [${search.query}]: Anúncio ${i + 1} ignorado (título não corresponde).`);
      return;
    }
    let price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
    console.log(`DEBUG [${search.query}]: Anúncio ${i + 1} -> Preço convertido: ${price}`);
    if (price && price <= search.maxPrice) {
      listings.push({ title, price, url: link, searchQuery: search.query });
      console.log(`DEBUG [${search.query}]: Anúncio ${i + 1} ACEITO.`);
    } else {
      console.log(`DEBUG [${search.query}]: Anúncio ${i + 1} rejeitado (preço fora do limite).`);
    }
  });

  if (listings.length === 0) {
    console.log(`DEBUG [${search.query}]: Nenhum anúncio válido encontrado com os seletores e filtro atuais.`);
  }
  return listings;
}

// Salva (ou atualiza) o anúncio no MongoDB, evitando duplicação (verificando título e preço)
async function saveAd(ad) {
  try {
    await Ad.findOneAndUpdate(
      { title: ad.title, price: ad.price },
      { $setOnInsert: ad },
      { upsert: true, new: true }
    );
    console.log(`Salvo: ${ad.title} (${ad.searchQuery}) - R$${ad.price}`);
  } catch (err) {
    console.error("Erro ao salvar anúncio:", err);
  }
}

// Para uma busca específica, percorre as páginas de 1 a 10 e salva os anúncios encontrados
async function checkListingsForSearch(search) {
  console.log(`Iniciando busca para "${search.query}"...`);
  for (let page = 1; page <= 10; page++) {
    const url = buildUrl(search, page);
    const html = await fetchPage(url);
    if (!html) {
      console.warn(`HTML não encontrado na página ${page} para "${search.query}". Pulando...`);
      continue;
    }
    const listings = parseListings(html, search);
    if (listings.length === 0) {
      console.log(`Nenhum anúncio encontrado na página ${page} para "${search.query}".`);
    } else {
      console.log(`Encontrados ${listings.length} anúncios na página ${page} para "${search.query}".`);
      for (const ad of listings) {
        await saveAd(ad);
      }
    }
  }
}

// Executa todas as buscas
async function checkAllSearches() {
  for (const search of searches) {
    await checkListingsForSearch(search);
  }
}

// Agendamento: Executa as buscas a cada hora
cron.schedule('0 * * * *', () => {
  console.log("Executando buscas agendadas...");
  checkAllSearches();
});

// Executa as buscas imediatamente ao iniciar o app
checkAllSearches();

// ----------------------------------------------------
// 5. Servidor Express com endpoints para listar e excluir anúncios
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Endpoint para listar todos os anúncios (ordenados por data, mais recentes primeiro)
app.get('/ads', async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar anúncios.' });
  }
});

// Endpoint para excluir um anúncio pelo _id_
app.delete('/ads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Ad.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    res.json({ message: 'Anúncio excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir o anúncio.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
