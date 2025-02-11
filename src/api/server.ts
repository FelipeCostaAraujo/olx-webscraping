import 'dotenv/config';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';

// Importa as configurações do projeto
import config from '../config/config';

// Importa as implementações dos ports (adaptadores)
import { MongoAdRepository } from '../infra/repositories/MongoAdRepository';
import { PuppeteerScraper } from '../infra/adapters/PuppeteerScraper';

// Importa o caso de uso
import { FetchAdsUseCase } from '../application/usecases/FetchAdsUseCase';

// --- Conexão com o MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("A variável de ambiente MONGODB_URI não está definida!");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("[API] Conectado ao MongoDB."))
  .catch((err) => {
    console.error("[API] Erro ao conectar no MongoDB:", err);
    process.exit(1);
  });

// --- Inicialização dos adaptadores e casos de uso ---
const adRepository = new MongoAdRepository();
const scraper = new PuppeteerScraper();
const fetchAdsUseCase = new FetchAdsUseCase(adRepository, scraper);

// --- Agendamento com Cron ---
// Agenda a execução do caso de uso de atualização de anúncios a cada 2 horas
//0 */2 * * *
cron.schedule('* * * * *', async () => {
    console.log("[Cron] Iniciando busca agendada...");
    try {
      await fetchAdsUseCase.execute();
      console.log("[Cron] Anúncios atualizados com sucesso.");
    } catch (err) {
      console.error("[Cron] Erro ao atualizar anúncios:", err);
    }
  });
  

// --- Configuração do Express ---
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 6000;

// Endpoint para atualizar os anúncios (executa o caso de uso)
app.get('/update-ads', async (req: Request, res: Response) => {
  try {
    await fetchAdsUseCase.execute();
    res.json({ message: 'Anúncios atualizados com sucesso.' });
  } catch (err) {
    console.error("[API] Erro ao atualizar anúncios:", err);
    res.status(500).json({ error: 'Erro ao atualizar anúncios.' });
  }
});

// Endpoint para listar os anúncios (não blacklisted)
app.get('/ads', async (req: Request, res: Response) => {
  try {
    // Aqui você pode interpretar query parameters e passá-los para o repositório,
    // mas por simplicidade, chamamos o método findAll que já retorna os anúncios ordenados por padrão.
    const ads = await adRepository.findAll();
    console.log(`[API] Retornando ${ads.length} anúncios.`);
    res.json(ads);
  } catch (err) {
    console.error("[API] Erro ao buscar anúncios:", err);
    res.status(500).json({ error: 'Erro ao buscar anúncios.' });
  }
});

// Endpoint para excluir (soft-delete) um anúncio
app.delete('/ads/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await adRepository.update(id, { blacklisted: true });
    console.log(`[API] Anúncio com ID ${id} marcado como blacklisted.`);
    res.json({ message: 'Anúncio excluído com sucesso.' });
  } catch (err) {
    console.error("[API] Erro ao excluir anúncio:", err);
    res.status(500).json({ error: 'Erro ao excluir o anúncio.' });
  }
});

// Inicia o servidor Express
app.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});
