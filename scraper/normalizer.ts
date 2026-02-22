export interface RawEvent {
    title: string;
    description: string;
    shortSummary: string;
    startDate: Date;
    endDate: Date | null;
    venueName: string;
    venueAddress: string;
    category: string[];
    imageUrl: string | null;
    eventUrl: string;
    sourceName: string;
}

export interface NormalizedEvent {
    title: string;
    description: string;
    shortSummary: string;
    dateTime: { start: Date; end: Date | null };
    venue: { name: string; address: string; city: string };
    category: string[];
    imageUrl: string | null;
    source: { name: string; eventUrl: string };
}

export function normalize(raw: RawEvent): NormalizedEvent {
    return {
        title: raw.title.trim(),
        description: raw.description.trim(),
        shortSummary: raw.shortSummary.trim() || raw.description.slice(0, 200),
        dateTime: { start: raw.startDate, end: raw.endDate },
        venue: {
            name: raw.venueName.trim(),
            address: raw.venueAddress.trim(),
            city: 'Sydney',
        },
        category: raw.category,
        imageUrl: raw.imageUrl,
        source: { name: raw.sourceName, eventUrl: raw.eventUrl },
    };
}
