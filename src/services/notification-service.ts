import { Message } from 'firebase-admin/messaging';
import * as admin from 'firebase-admin';
import Notification from '../models/Notification';

var serviceAccount = require("../../olx-webscraping.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

class NotificationService {
    constructor() { }

    private normalizeData(data?: Record<string, string | undefined | null>): Record<string, string> {
        if (!data) return {};
        const entries = Object.entries(data).filter(([, value]) => value !== undefined && value !== null);
        return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
    }

    /**
     * Envia uma notificação push para o dispositivo com o registrationToken informado.
     * @param ad Objeto do anúncio contendo pelo menos: _id, title, price e url.
     * @param registrationToken Token do dispositivo para onde a notificação deve ser enviada.
     */
    async sendPushNotification(ad: Ad, options?: NotificationOptions): Promise<void> {
        console.log('[NotificationService] Enviando notificação push...');
        console.log('[NotificationService] Ad:', ad);
        try {
            const topic = options?.topic ?? "superPriceAds";
            const notificationTitle = options?.title ?? 'Novo anúncio com Super Preço!';
            const notificationBody = options?.body ?? `Confira: ${ad.title} por ${ad.price}`;
            const dataPayload = this.normalizeData({
                id: ad.adId,
                url: ad.url,
                dealScore: options?.dealScore != null ? options.dealScore.toFixed(4) : undefined,
                dealLabel: options?.dealLabel,
                reason: options?.reason,
                ...(options?.data || {}),
            });

            const message: Message = {
                topic,
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                    imageUrl: ad.imageUrl ? ad.imageUrl : undefined,
                },
                data: dataPayload,
            };

            const notification = new Notification({
                adId: ad.adId,
                title: ad.title,
                price: ad.price,
                url: ad.url,
                imageUrl: ad.imageUrl,
                dealScore: options?.dealScore,
                dealLabel: options?.dealLabel,
                reason: options?.reason,
            });

            const notifity = await notification.save();

            console.log('[NotificationService] Notificação salva:', notifity);

            const response = await admin.messaging().send(message);
            console.log('Notificação enviada com sucesso. Message ID:', response);
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
        }
    }

    /**
    * Envia uma notificação para o tópico "superPriceAds".
    *
    * @param ad Objeto do anúncio contendo os campos _id, title, price, url e imageUrl.
    * @param previousPrice Valor anterior do anúncio, para calcular a variação.
    */
    async sendPriceDropNotification(ad: Ad, previousPrice: number, options?: NotificationOptions): Promise<void> {
        try {
            const topic = options?.topic ?? "superPriceAds";
            const notificationTitle = options?.title ?? 'Preço Atualizado!';
            const notificationBody =
                options?.body ??
                `O preço do anúncio "${ad.title}" caiu de ${previousPrice.toString()} para ${ad.price.toString()}`;
            const dataPayload = this.normalizeData({
                id: ad.adId,
                url: ad.url,
                previousPrice: previousPrice.toString(),
                currentPrice: ad.price.toString(),
                dealScore: options?.dealScore != null ? options.dealScore.toFixed(4) : undefined,
                dealLabel: options?.dealLabel,
                reason: options?.reason,
                ...(options?.data || {}),
            });

            const message: Message = {
                topic,
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                    imageUrl: ad.imageUrl ? ad.imageUrl : undefined,
                },
                data: dataPayload,
            };

            const notification = new Notification({
                adId: ad.adId,
                title: ad.title,
                price: ad.price,
                url: ad.url,
                imageUrl: ad.imageUrl,
                dealScore: options?.dealScore,
                dealLabel: options?.dealLabel,
                reason: options?.reason,
            });
            await notification.save();

            const response = await admin.messaging().send(message);
            console.log('Notificação enviada com sucesso. Message ID:', response);
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
        }
    }
}

interface Ad {
    adId: string;
    title: string;
    price: number;
    url: string;
    createdAt: Date;
    imageUrl: string | null | undefined;
}

interface NotificationOptions {
    topic?: string;
    title?: string;
    body?: string;
    data?: Record<string, string>;
    dealScore?: number;
    dealLabel?: string;
    reason?: string;
}

export default NotificationService;
