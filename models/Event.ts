import mongoose, { Schema, Document, Types } from 'mongoose';

export type EventStatus = 'new' | 'updated' | 'inactive' | 'imported';

export interface IEvent extends Document {
    title: string;
    description: string;
    shortSummary: string;
    dateTime: {
        start: Date;
        end: Date | null;
    };
    venue: {
        name: string;
        address: string;
        city: string;
    };
    category: string[];
    imageUrl: string | null;
    source: {
        name: string;
        eventUrl: string;
    };
    status: EventStatus;
    scrapeMeta: {
        firstScrapedAt: Date;
        lastScrapedAt: Date;
        lastChangedAt: Date;
    };
    importedMeta?: {
        importedAt: Date;
        importedBy: Types.ObjectId;
        importNotes?: string;
    };
}

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        shortSummary: { type: String, default: '' },
        dateTime: {
            start: { type: Date, required: true },
            end: { type: Date, default: null },
        },
        venue: {
            name: { type: String, default: '' },
            address: { type: String, default: '' },
            city: { type: String, default: 'Sydney' },
        },
        category: [{ type: String }],
        imageUrl: { type: String, default: null },
        source: {
            name: { type: String, required: true },
            eventUrl: { type: String, required: true, unique: true },
        },
        status: {
            type: String,
            enum: ['new', 'updated', 'inactive', 'imported'],
            default: 'new',
        },
        scrapeMeta: {
            firstScrapedAt: { type: Date, default: Date.now },
            lastScrapedAt: { type: Date, default: Date.now },
            lastChangedAt: { type: Date, default: Date.now },
        },
        importedMeta: {
            importedAt: { type: Date },
            importedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            importNotes: { type: String },
        },
    },
    { timestamps: true }
);

// Index for fast status lookups and date sorting
EventSchema.index({ status: 1 });
EventSchema.index({ 'dateTime.start': 1 });
EventSchema.index({ category: 1 });

export const Event =
    mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
