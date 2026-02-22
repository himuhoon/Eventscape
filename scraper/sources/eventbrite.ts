/**
 * Eventbrite scraper
 * API: https://www.eventbrite.com/platform/api
 * Auth: Bearer <private_token> in Authorization header
 * Endpoint: GET https://www.eventbriteapi.com/v3/events/search/
 */
import * as https from 'https';
import { RawEvent } from '../normalizer';

const SOURCE_NAME = 'Eventbrite';

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

export async function scrapeEventbrite(): Promise<RawEvent[]> {
    const token = process.env.EVENTBRITE_API_KEY;
    if (!token) {
        console.warn('[Eventbrite] EVENTBRITE_API_KEY not set — skipping');
        return [];
    }

    const events: RawEvent[] = [];
    try {
        const params = new URLSearchParams({
            'location.address': 'Sydney, NSW, Australia',
            'location.within': '30km',
            expand: 'venue,category',
            sort_by: 'date',
            page_size: '50',
            'start_date.range_start': new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
        });

        const data = await httpsGet(
            `https://www.eventbriteapi.com/v3/events/search/?${params}`,
            { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        );

        const raw: any[] = data?.events ?? [];
        console.log(`[Eventbrite] API returned ${raw.length} events`);

        for (const ev of raw) {
            const title = ev.name?.text?.trim();
            if (!title) continue;

            const description = ev.description?.text || ev.summary || title;
            const startDate = ev.start?.utc ? new Date(ev.start.utc) : new Date(Date.now() + 7 * 86400000);
            const endDate = ev.end?.utc ? new Date(ev.end.utc) : null;
            const venue = ev.venue;

            events.push({
                title,
                description: String(description).slice(0, 2000),
                shortSummary: String(description).slice(0, 200),
                startDate,
                endDate,
                venueName: venue?.name || 'Sydney Venue',
                venueAddress: venue?.address?.localized_address_display || 'Sydney, NSW, Australia',
                category: [ev.category?.name || 'General'],
                imageUrl: ev.logo?.url || null,
                eventUrl: ev.url || '',
                sourceName: SOURCE_NAME,
            });
        }
        console.log(`[Eventbrite] ✅ ${events.length} events processed`);
    } catch (err: any) {
        const status = err?.status;
        if (status === 401) console.error('[Eventbrite] ❌ 401 Unauthorized — check EVENTBRITE_API_KEY');
        else if (status === 403) console.error('[Eventbrite] ❌ 403 Forbidden — token may lack permissions');
        else console.error('[Eventbrite] ❌', status ?? err?.message ?? err);
    }

    return events;
}
