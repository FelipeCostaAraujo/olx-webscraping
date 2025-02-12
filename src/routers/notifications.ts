import { Router, Request, Response } from 'express';
import Notification from '../models/Notification';
import NotificationService from '../services/notification-service';

const router = Router();

/**
 * POST /notifications/test
 * Dispara uma notificação de teste e salva a notificação no banco de dados.
 * O corpo da requisição deve conter: adId, title, price e url.
 */
router.post('/test', async (req: any, res: any) => {
    try {
        const { adId, title, price, url } = req.body;
        if (!adId || !title || !price || !url) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
        }
        const testAd = { _id: adId, title, price, url };

        const notificationService = new NotificationService();
        await notificationService.sendPushNotification({
            title: testAd.title,
            price: testAd.price,
            url: testAd.url,
            adId: testAd._id,
            imageUrl: null,
            createdAt: new Date(),
        });

        const notification = new Notification({
            adId,
            title,
            price,
            url,
        });
        await notification.save();

        res.json({ message: "Notificação de teste enviada e salva com sucesso.", notification });
    } catch (error) {
        console.error('Erro ao enviar notificação de teste:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação de teste.' });
    }
});

/**
 * GET /notifications
 * Lista todas as notificações disparadas.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro ao buscar notificações.' });
    }
});

export default router;
