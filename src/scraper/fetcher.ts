import puppeteer from 'puppeteer';
import { createLogger } from '../utils/logger';

const log = createLogger('Puppeteer');

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
export async function fetchPage(url: string, isCarSearch: boolean = false): Promise<string | null> {
  let browser;
  try {
    log.info('Iniciando busca', { url });
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

    if (isCarSearch) {
      await page.waitForSelector('a[data-testid="adcard-link"]', { timeout: 60000 });
    } else {
      await page.waitForSelector('a[data-testid="adcard-link"]', { timeout: 60000 });
    }

    await autoScroll(page);
    log.info('Página carregada', { url });
    return await page.content();
  } catch (err: any) {
    log.error('Erro ao buscar', { url, erro: err?.message ?? err });
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
