import { Message } from 'firebase-admin/messaging';
import * as admin from 'firebase-admin';
import Notification from '../models/Notification';

var serviceAccount = require("../../olx-webscraping.json");

const deviceToken = "dIWe5vArQ--gYdBwxP-oHt:APA91bGP4m1TOl_q9L4ANQgH1mPNKMh77VQWMjPP_KXUKz0bK0Ital6WItkSCGJbeehdLhhUBhQl6y_TjyRnbrBxpPw0vNTf2ELwe3aGzJdEpcsdsKaDQEA";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

class NotificationService {
    constructor() { }

    /**
     * Envia uma notificação push para o dispositivo com o registrationToken informado.
     * @param ad Objeto do anúncio contendo pelo menos: _id, title, price e url.
     * @param registrationToken Token do dispositivo para onde a notificação deve ser enviada.
     */
    async sendPushNotification(ad: Ad): Promise<void> {
        console.log('[NotificationService] Enviando notificação push...');
        console.log('[NotificationService] Ad:', ad);
        try {
            const message: Message = {
                topic: "superPriceAds",
                notification: {
                    title: 'Novo anúncio com Super Preço!',
                    body: `Confira: ${ad.title} por ${ad.price}`
                },
                data: {
                    id: ad.adId,
                    url: ad.url,
                },
            };

            const notification = new Notification({
                adId: ad.adId,
                title: ad.title,
                price: ad.price,
                url: ad.url,
                imageUrl: ad.imageUrl,
            });

            const notifity = await notification.save();

            console.log('[NotificationService] Notificação salva:', notifity);


            // Envia a mensagem. A função retorna um ID de mensagem em caso de sucesso.
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
    async sendPriceDropNotification(ad: Ad, previousPrice: number): Promise<void> {
        try {
            // Constrói a mensagem para enviar via FCM para o tópico
            const message: Message = {
                topic: "superPriceAds", // Todos os dispositivos inscritos nesse tópico receberão a notificação.
                notification: {
                    title: 'Preço Atualizado!',
                    body: `O preço do anúncio "${ad.title}" caiu de ${previousPrice.toString()} para ${ad.price.toString()}`,
                    imageUrl: ad.imageUrl ? ad.imageUrl : undefined, // Inclui a imagem se existir.
                },
                data: {
                    id: ad.adId,
                    url: ad.url,
                    previousPrice: previousPrice.toString(),
                    currentPrice: ad.price.toString(),
                },
            };

            const notification = new Notification({
                adId: ad.adId,
                title: ad.title,
                price: ad.price,
                url: ad.url,
                imageUrl: ad.imageUrl,
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

export default NotificationService;
