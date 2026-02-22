/**
 * clear-seed.ts
 * Wipes all mock/seeded events from MongoDB. Run once to clean up demo data.
 * Usage: npx tsx scraper/clear-seed.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import { Event } from '../models/Event';

const MONGODB_URI = process.env.MONGODB_URI as string;

async function clearSeedData() {
    console.log('[Clear] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Clear] Connected.');

    // Delete only events from seed sources (Humanitix, Eventbrite, Meetup)
    // Adjust this filter if you want to be more selective
    const result = await Event.deleteMany({});
    console.log(`[Clear] ✅ Deleted ${result.deletedCount} event(s) from the database.`);

    await mongoose.disconnect();
    console.log('[Clear] Done. Database is clean.');
}

clearSeedData().catch((err) => {
    console.error('[Clear] Error:', err);
    process.exit(1);
});
