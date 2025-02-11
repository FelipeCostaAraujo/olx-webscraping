import { IAdRepository } from '../../domain/ports/IAdRepository';
import { Ad } from '../../domain/entities/Ad';
import mongoose, { Document, Model } from 'mongoose';

const adSchema = new mongoose.Schema({
  title: String,
  price: Number,
  url: String,
  imageUrl: String,
  searchQuery: String,
  superPrice: { type: Boolean, default: false },
  location: { type: String, default: "" },
  publishedAt: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  blacklisted: { type: Boolean, default: false }
});

interface IAdDocument extends Document {
  title: string;
  price: number;
  url: string;
  imageUrl: string;
  searchQuery: string;
  superPrice: boolean;
  location: string;
  publishedAt: string;
  createdAt: Date;
  blacklisted: boolean;
}

const AdModel: Model<IAdDocument> = mongoose.model<IAdDocument>('Ad', adSchema);

export class MongoAdRepository implements IAdRepository {
  async save(ad: Ad): Promise<void> {
    const adDoc = new AdModel(ad);
    await adDoc.save();
  }

  async findAll(filter: any = {}): Promise<Ad[]> {
    const docs = await AdModel.find({ blacklisted: { $ne: true }, ...filter }).sort({ createdAt: -1 });
    return docs.map(doc => new Ad(doc.id, doc.title, doc.price, doc.url, doc.imageUrl, doc.searchQuery, doc.superPrice, doc.location, doc.publishedAt, doc.createdAt, doc.blacklisted));
  }

  async update(id: string, updateData: Partial<Ad>): Promise<void> {
    await AdModel.findByIdAndUpdate(id, updateData);
  }
}
