import mongoose, { Schema, Document } from 'mongoose';
import defaultConfig from '../config';

export interface SearchItem {
    query: string;
    maxPrice: number;
    superPriceThreshold: number;
    baseUrl: string;
    regex: string;
}

export interface SearchGroup {
    maxPages: number;
    items: SearchItem[];
}

export interface SearchConfigDocument extends Document {
    gpuSearches: SearchGroup;
    carSearches: SearchGroup;
}

export interface RuntimeSearchItem extends Omit<SearchItem, 'regex'> {
    regex: RegExp;
}

export interface RuntimeSearchGroup {
    maxPages: number;
    items: RuntimeSearchItem[];
}

export interface RuntimeConfig {
    gpuSearches: RuntimeSearchGroup;
    carSearches: RuntimeSearchGroup;
}

const SearchItemSchema = new Schema<SearchItem>(
    {
        query: { type: String, required: true },
        maxPrice: { type: Number, required: true },
        superPriceThreshold: { type: Number, required: true },
        baseUrl: { type: String, required: true },
        regex: { type: String, required: true },
    },
    { _id: false }
);

const SearchGroupSchema = new Schema<SearchGroup>(
    {
        maxPages: { type: Number, required: true },
        items: [SearchItemSchema],
    },
    { _id: false }
);

const SearchConfigSchema = new Schema<SearchConfigDocument>({
    gpuSearches: { type: SearchGroupSchema, required: true },
    carSearches: { type: SearchGroupSchema, required: true },
});

const SearchConfig = mongoose.model<SearchConfigDocument>('SearchConfig', SearchConfigSchema);

function regexToString(r: RegExp): string {
    return r.toString();
}

function stringToRegex(s: string): RegExp {
    const match = s.match(/^\/(.+)\/([gimsuy]*)$/);
    if (match) return new RegExp(match[1], match[2]);
    return new RegExp(s);
}

function toRuntimeGroup(group: SearchGroup): RuntimeSearchGroup {
    return {
        maxPages: group.maxPages,
        items: group.items.map(item => ({ ...item, regex: stringToRegex(item.regex) })),
    };
}

export async function getConfig(): Promise<RuntimeConfig> {
    const existing = await SearchConfig.findOne().lean();

    if (existing?.gpuSearches && existing?.carSearches) {
        return {
            gpuSearches: toRuntimeGroup(existing.gpuSearches),
            carSearches: toRuntimeGroup(existing.carSearches),
        };
    }

    await SearchConfig.deleteMany({});
    const created = await SearchConfig.create({
        gpuSearches: {
            maxPages: defaultConfig.gpuSearches.maxPages,
            items: defaultConfig.gpuSearches.items.map(i => ({ ...i, regex: regexToString(i.regex) })),
        },
        carSearches: {
            maxPages: defaultConfig.carSearches.maxPages,
            items: defaultConfig.carSearches.items.map(i => ({ ...i, regex: regexToString(i.regex) })),
        },
    });
    const seeded = created.toObject() as any;
    return {
        gpuSearches: toRuntimeGroup(seeded.gpuSearches),
        carSearches: toRuntimeGroup(seeded.carSearches),
    };
}

export default SearchConfig;
