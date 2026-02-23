import { Response, Router } from 'express';
import SearchConfig from '../models/SearchConfig';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const config = await SearchConfig.findOne();
        if (!config) {
            return res.status(404).json({ error: 'Config not found' });
        }
        return res.json(config);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch config' });
    }
});

router.put('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { maxPages, searches, carSearches } = req.body;

    if (maxPages == null || !Array.isArray(searches) || !Array.isArray(carSearches)) {
        return res.status(400).json({ error: 'maxPages, searches and carSearches are required' });
    }

    try {
        const config = await SearchConfig.findOneAndUpdate(
            {},
            { maxPages, searches, carSearches },
            { new: true, upsert: true }
        );
        return res.json(config);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update config' });
    }
});

export default router;
