import { image } from '@tensorflow/tfjs-node';
import mongoose from 'mongoose';

/**
 * 🔹 **Defines the Notification schema and model.**
 *
 * Fields:
 * - adId: ID do anúncio (obrigatório)
 * - title: Título do anúncio (obrigatório)
 * - price: Preço do anúncio (obrigatório)
 * - url: URL do anúncio (obrigatório)
 * - createdAt: Data em que a notificação foi criada (default: agora)
 * - imageUrl: URL da imagem do anúncio (opcional)
 */
const notificationSchema = new mongoose.Schema({
  adId: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  imageUrl: { type: String, required: false },
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
