import { Ad } from '../entities/Ad';

export interface IAdRepository {
  save(ad: Ad): Promise<void>;
  findAll(filter?: any): Promise<Ad[]>;
  update(id: string, updateData: Partial<Ad>): Promise<void>;
}
