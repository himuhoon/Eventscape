import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TicketLead } from '@/models/TicketLead';

export async function POST(req: NextRequest) {
    try {
        const { email, eventId, eventUrl, consent } = await req.json();

        if (!email || !eventId || !eventUrl) {
            return NextResponse.json(
                { error: 'email, eventId and eventUrl are required' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        await connectDB();

        // Upsert — same email + event only once
        const existing = await TicketLead.findOne({ email: email.toLowerCase(), eventId });
        if (existing) {
            return NextResponse.json({ success: true, alreadyRegistered: true });
        }

        await TicketLead.create({
            email: email.toLowerCase(),
            eventId,
            eventUrl,
            consent: consent ?? true,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[POST /api/tickets]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
