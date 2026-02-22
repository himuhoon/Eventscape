import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { auth } from '@/lib/auth';

// PATCH /api/admin/events/[id] — update status or mark imported
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        await connectDB();

        const update: Record<string, any> = {};

        if (body.status) {
            update.status = body.status;
        }

        // If marking as imported, record who did it
        if (body.status === 'imported') {
            const dbUser = await User.findOne({ email: session.user?.email });
            if (dbUser) {
                update.importedMeta = {
                    importedAt: new Date(),
                    importedBy: dbUser._id,
                    importNotes: body.importNotes || '',
                };
            }
        }

        const updated = await Event.findByIdAndUpdate(id, update, { new: true });
        if (!updated) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, event: updated });
    } catch (err) {
        console.error('[PATCH /api/admin/events/[id]]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE /api/admin/events/[id] — soft-delete (set status inactive)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        await connectDB();

        const updated = await Event.findByIdAndUpdate(
            id,
            { status: 'inactive' },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/admin/events/[id]]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
