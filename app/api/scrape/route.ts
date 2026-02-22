import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';

// Called by Vercel Cron every 6 hours: "0 */6 * * *"
// Also callable manually: GET /api/scrape
export async function GET(req: Request) {
    // Protect with a secret so only Vercel Cron (or you) can trigger it
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();


        const { scrapeTicketmaster } = await import('@/scraper/sources/ticketmaster');
        const results = await scrapeTicketmaster();

        return NextResponse.json({
            success: true,
            message: `Scrape complete — ${results} events processed`,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[GET /api/scrape]', err);
        return NextResponse.json({ error: 'Scrape failed', detail: String(err) }, { status: 500 });
    }
}
