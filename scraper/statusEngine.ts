import { Event, IEvent } from '@/models/Event';
import { NormalizedEvent } from './normalizer';

/**
 * For each incoming normalized event:
 *  - If URL not in DB   → status = "new"
 *  - If URL exists + fields changed → status = "updated"
 *  - Upserts the document with updated scrapeMeta
 *
 * After processing all incoming events, marks anything
 * NOT seen in this run as "inactive".
 */
export async function runStatusEngine(
    incoming: NormalizedEvent[],
    sourceName: string
): Promise<void> {
    const now = new Date();
    const incomingUrls = new Set(incoming.map((e) => e.source.eventUrl));

    for (const event of incoming) {
        const existing = await Event.findOne({
            'source.eventUrl': event.source.eventUrl,
        }).lean() as IEvent | null;

        if (!existing) {
            // 🟢 New event
            await Event.create({
                ...event,
                status: 'new',
                scrapeMeta: {
                    firstScrapedAt: now,
                    lastScrapedAt: now,
                    lastChangedAt: now,
                },
            });
        } else {
            // Check if anything meaningful changed
            const changed =
                existing.title !== event.title ||
                existing.description !== event.description ||
                existing.dateTime?.start?.toISOString() !== event.dateTime.start.toISOString() ||
                existing.venue?.name !== event.venue.name ||
                existing.venue?.address !== event.venue.address;

            const update: Record<string, any> = {
                'scrapeMeta.lastScrapedAt': now,
            };

            if (changed && existing.status !== 'imported') {
                // 🟡 Updated event
                update.title = event.title;
                update.description = event.description;
                update.shortSummary = event.shortSummary;
                update['dateTime.start'] = event.dateTime.start;
                update['dateTime.end'] = event.dateTime.end;
                update['venue.name'] = event.venue.name;
                update['venue.address'] = event.venue.address;
                update.imageUrl = event.imageUrl;
                update.status = 'updated';
                update['scrapeMeta.lastChangedAt'] = now;
            }

            await Event.updateOne({ 'source.eventUrl': event.source.eventUrl }, { $set: update });
        }
    }

    // 🔴 Mark inactive: events from this source not seen in this run
    await Event.updateMany(
        {
            'source.name': sourceName,
            'source.eventUrl': { $nin: Array.from(incomingUrls) },
            status: { $nin: ['inactive', 'imported'] },
        },
        {
            $set: {
                status: 'inactive',
                'scrapeMeta.lastScrapedAt': now,
            },
        }
    );

    console.log(`[StatusEngine] Processed ${incoming.length} events from ${sourceName}`);
}
