/**
 * daemon.ts — 24/7 scraper loop
 * Runs all 4 sources every INTERVAL_HOURS, indefinitely.
 * Usage: npm run scrape:daemon   (started automatically by npm run dev)
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

import { scrapeTicketmaster } from './sources/ticketmaster';
import { normalize } from './normalizer';
import { runStatusEngine } from './statusEngine';

const MONGODB_URI = process.env.MONGODB_URI as string;

// ── Config ─────────────────────────────────────────────────────────────────
const INTERVAL_HOURS = 6;
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;
// ───────────────────────────────────────────────────────────────────────────

const SOURCES = [
    { name: 'Ticketmaster', scraper: scrapeTicketmaster },
];

async function runOnce() {
    const ts = new Date().toISOString();
    console.log(`\n${'='.repeat(48)}`);
    console.log(`[Daemon] 🚀 Scrape run started at ${ts}`);
    console.log(`${'='.repeat(48)}`);

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('[Daemon] ✅ DB connected');
    } catch (err) {
        console.error('[Daemon] ❌ DB connection failed:', (err as Error).message);
        return;
    }

    let totalEvents = 0;

    for (const { name, scraper } of SOURCES) {
        try {
            console.log(`\n[Daemon] ▶ ${name}`);
            const raw = await scraper();
            const normalized = raw.map(normalize);
            await runStatusEngine(normalized, name);
            console.log(`[Daemon] ✅ ${name}: ${normalized.length} events`);
            totalEvents += normalized.length;
        } catch (err) {
            console.error(`[Daemon] ❌ ${name} failed:`, (err as Error).message);
        }
    }

    await mongoose.disconnect();
    console.log(`\n[Daemon] ✅ Run complete — ${totalEvents} total events. Next run in ${INTERVAL_HOURS}h`);
}

async function main() {
    console.log(`[Daemon] Starting 4-source scraper — interval: ${INTERVAL_HOURS}h`);
    console.log('[Daemon] Source: Ticketmaster');
    console.log('[Daemon] Press Ctrl+C to stop\n');

    await runOnce();
    setInterval(() => runOnce(), INTERVAL_MS);
}

main().catch(err => {
    console.error('[Daemon] Fatal:', err);
    process.exit(1);
});
