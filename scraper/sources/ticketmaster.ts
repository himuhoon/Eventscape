/**
 * Ticketmaster scraper
 * API: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * Auth: ?apikey=KEY query parameter
 * Endpoint: GET https://app.ticketmaster.com/discovery/v2/events.json
 * Rate limit: 5000/day, 5 req/sec
 */
import * as https from 'https';
import { RawEvent } from '../normalizer';

const SOURCE_NAME = 'Ticketmaster';

function httpsGet(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET', timeout: 20000 },
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

// Map Ticketmaster segment/classification names → our categories
function mapCategory(ev: any): string {
    const seg = ev.classifications?.[0]?.segment?.name || '';
    const genre = ev.classifications?.[0]?.genre?.name || '';
    const map: Record<string, string> = {
        'Music': 'Music',
        'Sports': 'Sport',
        'Arts & Theatre': 'Arts',
        'Film': 'Arts',
        'Miscellaneous': 'General',
        'Family': 'Family',
    };
    return map[seg] || genre || seg || 'General';
}

export async function scrapeTicketmaster(): Promise<RawEvent[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
        console.warn('[Ticketmaster] TICKETMASTER_API_KEY not set — skipping');
        return [];
    }

    const events: RawEvent[] = [];
    try {
        const params = new URLSearchParams({
            apikey: apiKey,
            city: 'Sydney',
            countryCode: 'AU',
            size: '50',
            sort: 'date,asc',
            startDateTime: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
        });

        const data = await httpsGet(
            `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
        );

        const raw: any[] = data?._embedded?.events ?? [];
        console.log(`[Ticketmaster] API returned ${raw.length} events`);

        for (const ev of raw) {
            const title = ev.name?.trim();
            if (!title) continue;

            const venue = ev._embedded?.venues?.[0];
            const image = ev.images?.find((i: any) => i.ratio === '16_9' && i.width > 500) ?? ev.images?.[0];

            const startStr = ev.dates?.start?.dateTime || ev.dates?.start?.localDate;
            const startDate = startStr ? new Date(startStr) : new Date(Date.now() + 7 * 86400000);

            const venueName = venue?.name || 'Sydney Venue';
            const venueAddress = [venue?.address?.line1, venue?.city?.name, venue?.state?.stateCode]
                .filter(Boolean).join(', ') || 'Sydney, NSW, Australia';

            const description = ev.info || ev.pleaseNote || `${title} at ${venueName}`;

            const eventUrl = ev.url || (ev.id ? `https://www.ticketmaster.com.au/event/${ev.id}` : null);
            if (!eventUrl) continue; // skip events with no URL whatsoever

            events.push({
                title,
                description: String(description).slice(0, 2000),
                shortSummary: String(description).slice(0, 200),
                startDate,
                endDate: null,
                venueName,
                venueAddress,
                category: [mapCategory(ev)],
                imageUrl: image?.url || null,
                eventUrl,
                sourceName: SOURCE_NAME,
            });
        }
        console.log(`[Ticketmaster] ✅ ${events.length} events processed`);
    } catch (err: any) {
        const status = err?.status;
        if (status === 401) console.error('[Ticketmaster] ❌ 401 — check TICKETMASTER_API_KEY');
        else console.error('[Ticketmaster] ❌', status ?? err?.message ?? err);
    }

    return events;
}
