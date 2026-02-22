import axios from 'axios';
import { RawEvent } from '../normalizer';

const SOURCE_NAME = 'Humanitix';
// Humanitix Public API — https://support.humanitix.com/hc/en-us/articles/4558779567759
const API_KEY = process.env.HUMANITIX_API_KEY || '';
const BASE_URL = 'https://developers.humanitix.com/api/v1';

export async function scrapeHumanitix(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    if (!API_KEY || API_KEY === 'your_key_here') {
        console.warn('[Humanitix] No API key set — skipping. Get one at: https://humanitix.com/au/organisers');
        return events;
    }

    try {
        // Fetch upcoming Sydney events
        const response = await axios.get(`${BASE_URL}/events`, {
            headers: {
                'x-api-key': API_KEY,
                Accept: 'application/json',
            },
            params: {
                city: 'Sydney',
                country: 'AU',
                status: 'published',
                limit: 50,
                sort: 'startDate',
            },
            timeout: 20000,
        });

        const rawEvents = response.data?.events || response.data?.data || [];
        console.log(`[Humanitix] API returned ${rawEvents.length} events`);

        for (const ev of rawEvents) {
            try {
                const title = ev.name || ev.title || '';
                if (!title) continue;

                const eventUrl = ev.url || ev.link || `https://humanitix.com/au/${ev.slug || ''}`;
                const description = ev.description || ev.summary || title;
                const imageUrl = ev.imageUrl || ev.image?.url || null;

                const startDate = ev.startDate ? new Date(ev.startDate) : new Date(Date.now() + 7 * 86400000);
                const endDate = ev.endDate ? new Date(ev.endDate) : null;

                const venueName = ev.venue?.name || ev.location?.name || 'Sydney Venue';
                const venueAddress = ev.venue?.address || ev.location?.address || 'Sydney, NSW, Australia';

                const category = ev.category ? [ev.category] : ['Community'];

                events.push({
                    title,
                    description: String(description).slice(0, 2000),
                    shortSummary: String(description).slice(0, 200),
                    startDate,
                    endDate,
                    venueName,
                    venueAddress,
                    category,
                    imageUrl,
                    eventUrl,
                    sourceName: SOURCE_NAME,
                });
            } catch {
                // Skip malformed events
            }
        }

        console.log(`[Humanitix] Processed ${events.length} events`);
    } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
            console.error('[Humanitix] ❌ Invalid API key — check HUMANITIX_API_KEY in .env.local');
            console.error('[Humanitix]    Get a key at: https://humanitix.com/au/organisers → API Access');
        } else {
            console.error('[Humanitix] ❌ Failed:', err.response?.status, err.message);
        }
    }

    return events;
}
