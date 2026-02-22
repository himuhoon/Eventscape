import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    name: string;
    image?: string;
    googleId: string;
    role: 'admin' | 'viewer';
    createdAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true },
        image: { type: String },
        googleId: { type: String, required: true, unique: true },
        role: { type: String, enum: ['admin', 'viewer'], default: 'admin' },
    },
    { timestamps: true }
);

export const User =
    mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
