/**
 * PredictHQ scraper
 * API: https://docs.predicthq.com/api/events/search-events
 * Auth: Authorization: Bearer <token>
 * Endpoint: GET https://api.predicthq.com/v1/events/
 * Covers: concerts, sports, conferences, community, festivals, expos + more
 */
import * as https from 'https';
import { RawEvent } from '../normalizer';

const SOURCE_NAME = 'PredictHQ';

function httpsGet(url: string, headers: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET', headers, timeout: 20000 },
            (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    try {
                        if (res.statusCode && res.statusCode >= 400) {
                            reject({ status: res.statusCode, body: data });
                        } else {
                            resolve(JSON.parse(data));
                        }
                    } catch { reject(new Error('JSON parse failed')); }
                });
            }
        );
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// Map PredictHQ categories → our categories
function mapCategory(phqCategory: string): string {
    const map: Record<string, string> = {
        concerts: 'Music',
        festivals: 'Festival',
        sports: 'Sport',
        community: 'Community',
        conferences: 'Technology',
        expos: 'Technology',
        performing_arts: 'Arts',
        school_holidays: 'Family',
        public_holidays: 'General',
        observances: 'General',
        politics: 'General',
        daylight_savings: 'General',
        academic: 'General',
        terror: 'General',
        health_warnings: 'General',
        disasters: 'General',
        airport_delays: 'General',
        severe_weather: 'General',
    };
    return map[phqCategory] || 'General';
}

export async function scrapePredicthq(): Promise<RawEvent[]> {
    const token = process.env.PREDICTHQ_API_KEY;
    if (!token) {
        console.warn('[PredictHQ] PREDICTHQ_API_KEY not set — skipping');
        return [];
    }

    const events: RawEvent[] = [];
    try {
        // Sydney coordinates: -33.8688, 151.2093 — search within 30km
        const params = new URLSearchParams({
            'within': '30km@-33.8688,151.2093',
            'active.gte': new Date().toISOString().split('T')[0],
            'active.lte': new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], // 90 days ahead
            'category': 'concerts,festivals,sports,community,conferences,expos,performing_arts',
            'country': 'AU',
            'sort': 'start',
            'limit': '50',
        });

        const data = await httpsGet(
            `https://api.predicthq.com/v1/events/?${params}`,
            { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        );

        const raw: any[] = data?.results ?? [];
        console.log(`[PredictHQ] API returned ${raw.length} events`);

        for (const ev of raw) {
            const title = ev.title?.trim();
            if (!title) continue;

            const startDate = ev.start ? new Date(ev.start) : new Date(Date.now() + 7 * 86400000);
            const endDate = ev.end ? new Date(ev.end) : null;

            const geo = ev.geo?.geometry?.coordinates; // [lng, lat]
            const description = ev.description || `${title} — ${ev.category} event in Sydney`;

            // PredictHQ doesn't always include venue name, use labels or title
            const venueName = ev.entities?.find((e: any) => e.type === 'venue')?.name || 'Sydney Venue';
            const venueAddress = ev.location ? `${ev.location[1].toFixed(4)}, ${ev.location[0].toFixed(4)}` : 'Sydney, NSW, Australia';

            events.push({
                title,
                description: String(description).slice(0, 2000),
                shortSummary: String(description).slice(0, 200),
                startDate,
                endDate,
                venueName,
                venueAddress,
                category: [mapCategory(ev.category)],
                imageUrl: null, // PredictHQ doesn't provide images
                eventUrl: ev.entities?.find((e: any) => e.type === 'organizer')?.url || `https://predicthq.com/events/${ev.id}`,
                sourceName: SOURCE_NAME,
            });
        }
        console.log(`[PredictHQ] ✅ ${events.length} events processed`);
    } catch (err: any) {
        const status = err?.status;
        if (status === 401) console.error('[PredictHQ] ❌ 401 — check PREDICTHQ_API_KEY');
        else console.error('[PredictHQ] ❌', status ?? err?.message ?? err);
    }

    return events;
}
