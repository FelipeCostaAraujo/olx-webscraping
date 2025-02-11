import express from 'express';
import Ad from './models/Ad';

/**
 * 🔹 **Sets up the Express server with endpoints for listing and soft-deleting (blacklisting) ads.**
 */
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

/**
 * 🔹 **GET /ads - Lists all ads that are not blacklisted, sorted based on query parameters.
 * 
 * Query Parameters (optional):
 *   - superPrice: if "true", sorts ads with superPrice (true) first.
 *   - price: "asc" to sort by price ascending, or "desc" for descending.
 *   - published: "first" to sort by createdAt descending (most recent first) or "last" for ascending (oldest first).
 * 
 * Default ordering is by published first (createdAt descending).
 */
app.get('/ads', async (req, res) => {
  try {
    const sortCriteria: any = {};

    if (req.query.superPrice === 'true') {
      sortCriteria.superPrice = -1;
    }
    if (req.query.price) {
      sortCriteria.price = req.query.price === 'asc' ? 1 : -1;
    }
    if (req.query.published) {
      sortCriteria.createdAt = req.query.published === 'first' ? -1 : 1;
    } else {
      sortCriteria.createdAt = -1;
    }

    const ads = await Ad.find({ blacklisted: { $ne: true } }).sort(sortCriteria);
    console.log(`[API] Retornando ${ads.length} anúncios.`);
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar anúncios.' });
  }
});

/**
 * 🔹 **DELETE /ads/:id - Marks an ad as blacklisted (soft deletion) so that it is not scraped or listed again.**
 * @param {string} id - The ID of the ad to blacklist.
 */
app.delete('/ads/:id', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const ad = await Ad.findByIdAndUpdate(id, { blacklisted: true }, { new: true });
    if (!ad) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    console.log(`[API] Anúncio excluído: ${ad.title}`);
    res.json({ message: 'Anúncio excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir o anúncio.' });
  }
});

app.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});

export default app;
