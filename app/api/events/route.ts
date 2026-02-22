import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const filter: Record<string, any> = { status: { $ne: 'inactive' } };
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { shortSummary: { $regex: search, $options: 'i' } },
                { 'venue.name': { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [events, total] = await Promise.all([
            Event.find(filter).sort({ 'dateTime.start': 1 }).skip(skip).limit(limit).lean(),
            Event.countDocuments(filter),
        ]);

        return NextResponse.json({
            events,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('[GET /api/events]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
