import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import { scrapeTicketmaster } from './sources/ticketmaster';
import { normalize } from './normalizer';
import { runStatusEngine } from './statusEngine';

const MONGODB_URI = process.env.MONGODB_URI as string;

async function runScraper() {
    console.log('[Scraper] Starting scrape run...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Scraper] DB connected');

    const sources = [
        { name: 'Ticketmaster', scraper: scrapeTicketmaster },
    ];

    for (const { name, scraper } of sources) {
        try {
            console.log(`[Scraper] Running source: ${name}`);
            const raw = await scraper();
            const normalized = raw.map(normalize);
            await runStatusEngine(normalized, name);
            console.log(`[Scraper] ✓ ${name} done (${normalized.length} events)`);
        } catch (err) {
            console.error(`[Scraper] ✗ ${name} failed:`, err);
        }
    }

    await mongoose.disconnect();
    console.log('[Scraper] Run complete');
}

runScraper().catch(console.error);
