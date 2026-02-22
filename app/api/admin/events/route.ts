import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const city = searchParams.get('city');
        const filter: Record<string, any> = {};
        if (city) filter['venue.city'] = city;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'venue.name': { $regex: search, $options: 'i' } },
            ];
        }
        if (dateFrom || dateTo) {
            filter['dateTime.start'] = {};
            if (dateFrom) filter['dateTime.start'].$gte = new Date(dateFrom);
            if (dateTo) filter['dateTime.start'].$lte = new Date(dateTo);
        }

        const skip = (page - 1) * limit;
        const [events, total] = await Promise.all([
            Event.find(filter).sort({ 'scrapeMeta.lastScrapedAt': -1 }).skip(skip).limit(limit).lean(),
            Event.countDocuments(filter),
        ]);

        return NextResponse.json({
            events,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('[GET /api/admin/events]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
