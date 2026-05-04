import 'dotenv/config';
import cron from 'node-cron';
import connectToDatabase from './database';
import Scraper from './scraper/scraper';
import './server';
import NotificationService from './services/notification-service';
import { generateDataset } from './ml/generateDataset';
import { trainModel } from './ml/trainModel';
import { createLogger } from './utils/logger';
import Ad from './models/Ad';

const scraper = new Scraper(new NotificationService());
const logApp = createLogger('App');
const logCron = createLogger('Cron');

const AD_RETENTION_DAYS = Number(process.env.AD_RETENTION_DAYS ?? 30);

async function blacklistOldAds() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AD_RETENTION_DAYS);
  const result = await Ad.updateMany(
    { createdAt: { $lt: cutoff }, blacklisted: { $ne: true } },
    { $set: { blacklisted: true } }
  );
  logCron.info('Blacklist de anúncios antigos concluído', {
    atualizados: result.modifiedCount,
    retencaoDias: AD_RETENTION_DAYS,
    corte: cutoff.toISOString(),
  });
}

async function main() {
  try {
    await connectToDatabase();
    logApp.info('Conexão com o MongoDB estabelecida.');

    if (process.env.ML_AUTO_DATASET === 'true') {
      try {
        const summary = await generateDataset();
        logApp.info('Dataset de ML atualizado', {
          linhas: summary.rows,
          positivos: summary.positives,
          negativos: summary.negatives,
          threshold: Number(summary.threshold.toFixed(4)),
        });
      } catch (error) {
        logApp.warn('Falha ao gerar dataset de ML no boot', {
          erro: error instanceof Error ? error.message : error,
        });
      }
    }

    if (process.env.ML_AUTO_TRAIN === 'true') {
      try {
        const model = await trainModel();
        logApp.info('Modelo de ML treinado no boot', {
          datasetSize: model.metrics.datasetSize,
          threshold: Number(model.threshold.toFixed(4)),
          testAccuracy: Number(model.metrics.test.accuracy.toFixed(4)),
          testF1: Number(model.metrics.test.f1.toFixed(4)),
        });
      } catch (error) {
        logApp.warn('Falha ao treinar modelo de ML no boot', {
          erro: error instanceof Error ? error.message : error,
        });
      }
    }

    await scraper.checkAllSearches();
    await scraper.checkCarSearches();
    await blacklistOldAds();

    // Coleta a cada 1 hora
    cron.schedule('0 * * * *', async () => {
      logCron.info('Iniciando busca agendada...');
      await scraper.checkAllSearches();
    });

    // cron.schedule('0 * * * *', async () => {
    //   logCron.info('Iniciando buscas de carros agendadas...');
    //   await scraper.checkCarSearches();
    // });

    // Blacklist de anúncios antigos — todo dia às 03:00
    cron.schedule('0 3 * * *', async () => {
      logCron.info('Iniciando blacklist de anúncios antigos...');
      await blacklistOldAds();
    });
  } catch (error) {
    logApp.error('Erro na inicialização', { erro: error });
    process.exit(1);
  }
}

main();
