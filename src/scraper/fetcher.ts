import axios from 'axios';
import puppeteer from 'puppeteer';

/**
 * 🔹 **Performs auto-scroll on a Puppeteer page to load lazy-loaded content.**
 * @param {Object} page - The Puppeteer page instance.
 * @returns {Promise<void>}
 */
export async function autoScroll(page: any): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
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

/**
 * 🔹 **Fetches the HTML content of a page using Puppeteer as fallback.**
 * @param {string} url - The URL of the page.
 * @returns {Promise<string|null>} - The HTML content or null if failed.
 */
export async function fetchPageWithPuppeteer(url: string): Promise<string | null> {
  let browser;
  try {
    console.log(`[Puppeteer] Iniciando busca: ${url}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/105.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('a.olx-ad-card__link-wrapper', { timeout: 60000 });
    await autoScroll(page);
    console.log(`[Puppeteer] Página carregada: ${url}`);
    return await page.content();
  } catch (err: any) {
    console.error(`[Puppeteer] Erro ao buscar ${url}: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * 🔹 **Fetches the HTML content of a page using Axios, falling back to Puppeteer on 403 errors.**
 * @param {string} url - The URL of the page.
 * @returns {Promise<string|null>} - The HTML content or null if failed.
 */
export async function fetchPage(url: string): Promise<string | null> {
  try {
    console.log(`[Axios] Buscando: ${url}`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                      'Chrome/105.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    console.log(`[Axios] Página carregada: ${url}`);
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 403) {
      console.warn(`[Axios] 403 para ${url}. Usando Puppeteer...`);
      return await fetchPageWithPuppeteer(url);
    } else {
      console.error(`[Axios] Erro ao buscar ${url}: ${error.message}`);
      return null;
    }
  }
}
