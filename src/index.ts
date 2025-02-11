/**
 * 🔹 **Main API file for scraping and serving OLX ads.**
 * 
 * This file connects to MongoDB, defines the Ad model, scrapes ads using Axios (with Puppeteer fallback),
 * and exposes endpoints to list and soft-delete (blacklist) ads.
 */

import 'dotenv/config';
import cron from 'node-cron';
import connectToDatabase from './database';
import { checkAllSearches, checkCarSearches } from './scraper/scraper';
import './server';

// Conecta ao MongoDB
connectToDatabase();

// Agenda as buscas para rodar a cada 2 horas.
cron.schedule('0 */2 * * *', () => {
  console.log("[Cron] Iniciando busca agendada...");
  checkAllSearches();
});

// Executa as buscas imediatamente ao iniciar a aplicação.
checkAllSearches();


// Chamada imediata:
checkCarSearches();

cron.schedule('0 */2 * * *', () => {
  console.log("[Cron] Iniciando buscas de carros agendadas...");
  checkCarSearches();
});
