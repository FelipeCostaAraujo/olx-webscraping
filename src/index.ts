import 'dotenv/config';
import cron from 'node-cron';
import connectToDatabase from './database';
import Scraper from './scraper/scraper';
import './server';
import NotificationService from './services/notification-service';
import { generateDataset } from './ml/generateDataset';

const scraper = new Scraper(new NotificationService());

async function main() {
  try {
    await connectToDatabase();
    console.log("Conexão com o MongoDB estabelecida.");

    await generateDataset();
    console.log("Dataset gerado com sucesso.");

    scraper.checkAllSearches();
    scraper.checkCarSearches();

    // Agenda as buscas para rodar a cada 2 horas
    cron.schedule('0 */2 * * *', () => {
      console.log("[Cron] Iniciando busca agendada...");
      scraper.checkAllSearches();
    });

    cron.schedule('0 */2 * * *', () => {
      console.log("[Cron] Iniciando buscas de carros agendadas...");
      scraper.checkCarSearches();
    });
  } catch (error) {
    console.error("Erro na inicialização:", error);
    process.exit(1);
  }
}

main();
