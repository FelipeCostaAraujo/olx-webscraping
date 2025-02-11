import { Router, Request, Response } from 'express';
import Ad from '../models/Ad';

const router = Router();

/**
* 🔹 **GET /ads - Lists all ads that are not blacklisted, sorted based on query parameters.
* 
* Query Parameters (optional):
*   - superPrice: if "true", sorts ads with superPrice (true) first.
*   - price: "asc" to sort by price ascending, or "desc" for descending.
*   - published: "first" to sort by createdAt descending (most recent first) or "last" for ascending (oldest first).
*   - category: filter ads by category ("hardware" or "car"). If not provided, all categories are returned.
* 
* Default ordering is by published first (createdAt descending).
*/
router.get('/', async (req: Request, res: Response) => {
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

   // Filtro padrão: anúncios que não estão blacklisted
   const filter: any = { blacklisted: { $ne: true } };

   // Se houver o parâmetro "category", adicione ao filtro.
   // Aceitamos "hardware" ou "car"; se o parâmetro não for um desses, ignoramos.
   if (req.query.category) {
     const category = (req.query.category as string).toLowerCase();
     if (category === 'hardware' || category === 'car') {
       filter.category = category;
     }
   }

   const ads = await Ad.find(filter).sort(sortCriteria);
   console.log(`[API] Retornando ${ads.length} anúncios.`);
   res.json(ads);
 } catch (err) {
   res.status(500).json({ error: 'Erro ao buscar anúncios.' });
 }
});


/**
 * 🔹 **DELETE /ads/:id - Marks an ad as blacklisted (soft deletion) so that it is not scraped or listed again.
 * @param {string} id - The ID of the ad to blacklist.
 */
router.delete('/:id', async (req: any, res: any) => {
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

export default router;
