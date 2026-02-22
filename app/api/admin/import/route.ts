import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { eventId, importNotes } = await req.json();
        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        await connectDB();
        const dbUser = await User.findOne({ email: session.user?.email });
        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const updated = await Event.findByIdAndUpdate(
            eventId,
            {
                status: 'imported',
                importedMeta: {
                    importedAt: new Date(),
                    importedBy: dbUser._id,
                    importNotes: importNotes || '',
                },
            },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, event: updated });
    } catch (err) {
        console.error('[POST /api/admin/import]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
