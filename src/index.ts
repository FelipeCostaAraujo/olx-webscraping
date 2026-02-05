import 'dotenv/config';
import cron from 'node-cron';
import connectToDatabase from './database';
import Scraper from './scraper/scraper';
import './server';
import NotificationService from './services/notification-service';
import { generateDataset } from './ml/generateDataset';
import { createLogger } from './utils/logger';

const scraper = new Scraper(new NotificationService());
const logApp = createLogger('App');
const logCron = createLogger('Cron');

async function main() {
  try {
    await connectToDatabase();
    logApp.info('Conexão com o MongoDB estabelecida.');

    await generateDataset();
    logApp.info('Dataset gerado com sucesso.');

    await scraper.checkAllSearches();
    await scraper.checkCarSearches();

    // Agenda as buscas para rodar a cada 2 horas
    cron.schedule('0 */2 * * *', async () => {
      logCron.info('Iniciando busca agendada...');
      await scraper.checkAllSearches();
    });

    cron.schedule('0 */2 * * *', async () => {
      logCron.info('Iniciando buscas de carros agendadas...');
      await scraper.checkCarSearches();
    });
  } catch (error) {
    logApp.error('Erro na inicialização', { erro: error });
    process.exit(1);
  }
}

main();
