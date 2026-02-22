import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketLead extends Document {
    email: string;
    consent: boolean;
    eventId: mongoose.Types.ObjectId;
    eventUrl: string;
    timestamp: Date;
}

const TicketLeadSchema = new Schema<ITicketLead>(
    {
        email: { type: String, required: true, trim: true, lowercase: true },
        consent: { type: Boolean, required: true },
        eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
        eventUrl: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

TicketLeadSchema.index({ email: 1 });
TicketLeadSchema.index({ eventId: 1 });

export const TicketLead =
    mongoose.models.TicketLead ||
    mongoose.model<ITicketLead>('TicketLead', TicketLeadSchema);
