/**
 * Meetup scraper
 * API: GraphQL at https://api.meetup.com/gql (new v2025 API)
 * Auth: Authorization: Bearer <OAuth token>
 * Focus: community / tech meetups in Sydney
 *
 * Note: Meetup migrated to GraphQL in 2025.
 * OAuth token obtained via client_credentials flow using API key + secret.
 */
import * as https from 'https';
import { RawEvent } from '../normalizer';

const SOURCE_NAME = 'Meetup';

function httpsPost(url: string, body: string, headers: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const bodyBuf = Buffer.from(body);
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: { ...headers, 'Content-Length': bodyBuf.length },
                timeout: 20000,
            },
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
        req.write(bodyBuf);
        req.end();
    });
}

// Get OAuth access token from Meetup
async function getMeetupToken(apiKey: string, apiSecret: string): Promise<string> {
    const body = new URLSearchParams({
        client_id: apiKey,
        client_secret: apiSecret,
        grant_type: 'client_credentials',
    }).toString();

    const data = await httpsPost(
        'https://secure.meetup.com/oauth2/access',
        body,
        { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    if (!data.access_token) throw new Error('No access token returned');
    return data.access_token;
}

export async function scrapeMeetup(): Promise<RawEvent[]> {
    const apiKey = process.env.MEETUP_API_KEY;
    const apiSecret = process.env.MEETUP_API_SECRET;

    if (!apiKey || !apiSecret) {
        console.warn('[Meetup] MEETUP_API_KEY / MEETUP_API_SECRET not set — skipping');
        return [];
    }

    const events: RawEvent[] = [];
    try {
        const token = await getMeetupToken(apiKey, apiSecret);

        // GraphQL query — search events near Sydney
        const query = `
            query {
                keywordSearch(
                    filter: {
                        query: "technology community"
                        lat: -33.8688
                        lon: 151.2093
                        radius: 30
                        source: EVENTS
                        startDateRange: "${new Date().toISOString()}"
                    }
                    input: { first: 50 }
                ) {
                    edges {
                        node {
                            result {
                                ... on Event {
                                    id
                                    title
                                    description
                                    dateTime
                                    endTime
                                    eventUrl
                                    imageUrl
                                    venue {
                                        name
                                        address
                                        city
                                        state
                                    }
                                    group {
                                        name
                                        urlname
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = await httpsPost(
            'https://api.meetup.com/gql',
            JSON.stringify({ query }),
            { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
        );

        const edges: any[] = data?.data?.keywordSearch?.edges ?? [];
        console.log(`[Meetup] API returned ${edges.length} events`);

        for (const edge of edges) {
            const ev = edge?.node?.result;
            if (!ev || !ev.title) continue;

            const startDate = ev.dateTime ? new Date(ev.dateTime) : new Date(Date.now() + 7 * 86400000);
            const endDate = ev.endTime ? new Date(ev.endTime) : null;
            const description = ev.description || `${ev.title} — Meetup event in Sydney`;

            const venueName = ev.venue?.name || ev.group?.name || 'Sydney Venue';
            const venueAddress = [ev.venue?.address, ev.venue?.city, ev.venue?.state]
                .filter(Boolean).join(', ') || 'Sydney, NSW, Australia';

            events.push({
                title: ev.title.trim(),
                description: String(description).replace(/<[^>]+>/g, '').slice(0, 2000), // strip HTML
                shortSummary: String(description).replace(/<[^>]+>/g, '').slice(0, 200),
                startDate,
                endDate,
                venueName,
                venueAddress,
                category: ['Technology'],
                imageUrl: ev.imageUrl || null,
                eventUrl: ev.eventUrl || '',
                sourceName: SOURCE_NAME,
            });
        }
        console.log(`[Meetup] ✅ ${events.length} events processed`);
    } catch (err: any) {
        const status = err?.status;
        if (status === 401) console.error('[Meetup] ❌ 401 — check MEETUP_API_KEY / MEETUP_API_SECRET');
        else console.error('[Meetup] ❌', status ?? err?.message ?? err);
    }

    return events;
}
