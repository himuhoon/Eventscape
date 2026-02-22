"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────
interface ApiEvent {
    _id: string;
    title: string;
    description: string;
    shortSummary: string;
    dateTime: { start: string; end: string | null };
    venue: { name: string; address: string; city: string };
    category: string[];
    imageUrl: string | null;
    source: { name: string; eventUrl: string };
    status: string;
}

const CATEGORIES = ["All Events", "Music", "Sports", "Arts", "Technology", "Food", "Comedy", "Family"];

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80";

function formatDate(iso: string) {
    const d = new Date(iso);
    return {
        day: d.toLocaleDateString("en-AU", { day: "2-digit", month: "short" }).toUpperCase(),
        time: d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
        full: d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
    };
}

// ─── Ticket Modal ─────────────────────────────────────────────
function TicketModal({ event, onClose }: { event: ApiEvent; onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(true);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");
    const [errMsg, setErrMsg] = useState("");
    const date = formatDate(event.dateTime.start);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        try {
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    eventId: event._id,
                    eventUrl: event.source.eventUrl,
                    consent,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrMsg(data.error || "Something went wrong");
                setStatus("error");
            } else if (data.alreadyRegistered) {
                setStatus("duplicate");
            } else {
                setStatus("success");
            }
        } catch {
            setErrMsg("Network error. Please try again.");
            setStatus("error");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#131022] border border-[#2b2839] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                {/* Hero */}
                <div className="relative h-40 overflow-hidden">
                    <img
                        src={event.imageUrl || FALLBACK_IMAGE}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131022] to-transparent" />
                    <button onClick={onClose} className="absolute top-3 right-3 bg-black/40 backdrop-blur rounded-full p-1.5 text-white hover:bg-black/60">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
                    </button>
                    {event.category[0] && (
                        <span className="absolute bottom-3 left-4 text-[10px] font-bold uppercase tracking-widest bg-[#3713ec]/80 text-white px-2 py-0.5 rounded">
                            {event.category[0]}
                        </span>
                    )}
                </div>

                <div className="p-6">
                    <h2 className="text-lg font-bold text-white leading-snug mb-1">{event.title}</h2>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-4">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>calendar_today</span>
                        <span>{date.full} · {date.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-5">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>location_on</span>
                        <span>{event.venue.name || event.venue.city}</span>
                    </div>

                    {status === "success" && (
                        <div className="flex flex-col items-center py-6 text-center">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: "32px" }}>check_circle</span>
                            </div>
                            <p className="font-bold text-white text-lg">You&apos;re in!</p>
                            <p className="text-slate-400 text-sm mt-1">We&apos;ll send event details to <strong className="text-white">{email}</strong></p>
                            <a href={event.source.eventUrl} target="_blank" rel="noopener noreferrer" className="mt-4 text-[#3713ec] text-sm font-medium hover:underline flex items-center gap-1">
                                View on {event.source.name}
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>open_in_new</span>
                            </a>
                        </div>
                    )}

                    {status === "duplicate" && (
                        <div className="flex flex-col items-center py-6 text-center">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-amber-500" style={{ fontSize: "32px" }}>info</span>
                            </div>
                            <p className="font-bold text-white">Already registered!</p>
                            <p className="text-slate-400 text-sm mt-1">You&apos;re already signed up for this event.</p>
                        </div>
                    )}

                    {(status === "idle" || status === "loading" || status === "error") && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5">Email address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full bg-[#0a0a0f] border border-[#2b2839] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#3713ec] outline-none"
                                />
                            </div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="mt-0.5 accent-[#3713ec]"
                                />
                                <span className="text-xs text-slate-400">I agree to receive event updates and reminders by email</span>
                            </label>
                            {status === "error" && (
                                <p className="text-xs text-rose-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>
                                    {errMsg}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full py-3 bg-[#3713ec] text-white font-bold rounded-xl hover:bg-[#3713ec]/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {status === "loading" ? (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : null}
                                {status === "loading" ? "Registering…" : "Register for this event"}
                            </button>
                            <p className="text-center text-xs text-slate-500">
                                Or <a href={event.source.eventUrl} target="_blank" rel="noopener noreferrer" className="text-[#3713ec] hover:underline">view on {event.source.name} →</a>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Loading Skeleton ─────────────────────────────────────────
function EventSkeleton() {
    return (
        <div className="bg-[#0d0d0d] rounded-xl border border-slate-800 overflow-hidden animate-pulse">
            <div className="bg-slate-800 h-48 w-full" />
            <div className="p-6 space-y-3">
                <div className="h-3 bg-slate-800 rounded w-1/4" />
                <div className="h-5 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
                <div className="h-px bg-slate-800 mt-4" />
                <div className="flex justify-between pt-2">
                    <div className="h-5 bg-slate-800 rounded w-12" />
                    <div className="h-8 bg-slate-800 rounded w-24" />
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────
export default function HomePage() {
    const eventsRef = useRef<HTMLElement>(null);
    const [events, setEvents] = useState<ApiEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("All Events");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);

    const LIMIT = 9;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch events
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(LIMIT),
            });
            if (activeCategory !== "All Events") params.set("category", activeCategory);
            if (debouncedSearch) params.set("search", debouncedSearch);

            const res = await fetch(`/api/events?${params}`);
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setEvents(data.events || []);
            setTotal(data.pagination?.total || 0);
            setTotalPages(data.pagination?.pages || 1);
        } catch {
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [page, activeCategory, debouncedSearch]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleCategory = (cat: string) => {
        setActiveCategory(cat);
        setPage(1);
        setSearch("");
        setDebouncedSearch("");
        eventsRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="bg-[#0a0a0a] text-slate-100 min-h-screen">
            {selectedEvent && <TicketModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

            {/* ─── HERO ─── */}
            <section className="relative min-h-screen flex flex-col overflow-x-hidden">
                {/* Fixed Nav */}
                <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
                    <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#3713ec] rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white" style={{ fontSize: "20px" }}>blur_on</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Eventscape</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            {["Discover", "Calendar", "Pricing", "About"].map((item) => (
                                <a
                                    key={item}
                                    href={item === "Discover" ? "#events" : "#"}
                                    onClick={item === "Discover" ? (e) => { e.preventDefault(); eventsRef.current?.scrollIntoView({ behavior: "smooth" }); } : undefined}
                                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    {item}
                                </a>
                            ))}
                        </div>
                        <button
                            onClick={() => eventsRef.current?.scrollIntoView({ behavior: "smooth" })}
                            className="px-5 py-2.5 rounded-lg bg-[#3713ec] text-white text-sm font-semibold hover:opacity-90 transition-all"
                        >
                            Get Started
                        </button>
                    </nav>
                </header>

                {/* Background */}
                <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />
                <div className="absolute inset-0 hero-glow pointer-events-none" />

                {/* Hero Content */}
                <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-5xl mx-auto z-10 pt-32">
                    <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3713ec] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3713ec]" />
                        </span>
                        <span className="text-xs font-medium tracking-wide text-slate-300 uppercase">Live Events · Updated Daily</span>
                    </div>

                    <h1
                        className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6"
                        style={{ background: "linear-gradient(to bottom, #ffffff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                    >
                        Discover What&apos;s On
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10">
                        A curated gateway to premium experiences, exclusive gatherings, and the world&apos;s best events — updated daily from top ticketing platforms.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
                        <button
                            onClick={() => eventsRef.current?.scrollIntoView({ behavior: "smooth" })}
                            className="w-full sm:w-auto px-8 py-4 bg-[#3713ec] rounded-xl text-white font-bold text-lg hover:shadow-[0_0_20px_rgba(55,19,236,0.4)] transition-all flex items-center justify-center gap-2"
                        >
                            Explore Events
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_forward</span>
                        </button>
                        <Link
                            href="/admin/login"
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all text-center"
                        >
                            Admin Dashboard
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-3xl pt-10 border-t border-white/5">
                        <div className="flex flex-col gap-1">
                            <span className="text-3xl font-bold text-white">{total > 0 ? `${total}+` : "—"}</span>
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Live Events</span>
                        </div>
                        <div className="flex flex-col gap-1 border-x border-white/5">
                            <span className="text-3xl font-bold text-white">4</span>
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Sources</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-3xl font-bold text-white">Daily</span>
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Auto-Updated</span>
                        </div>
                    </div>
                </div>

                <div className="pb-10 flex flex-col items-center gap-4 text-slate-500 relative z-10">
                    <div className="w-[1px] h-12 bg-gradient-to-b from-[#3713ec] to-transparent" />
                    <button onClick={() => eventsRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 hover:text-slate-300 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>mouse</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Scroll to Explore</span>
                    </button>
                </div>
            </section>

            {/* ─── EVENT DISCOVERY GRID ─── */}
            <section id="events" ref={eventsRef} className="bg-[#050505]">
                <div className="max-w-7xl mx-auto px-6 py-16">
                    {/* Section Header */}
                    <div className="flex flex-col items-center mb-16 space-y-8">
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Upcoming Events</h2>
                            <p className="text-slate-400 text-lg max-w-xl mx-auto">
                                Real events pulled live from Ticketmaster and top platforms — updated every 6 hours.
                            </p>
                        </div>

                        {/* Search */}
                        <div className="w-full max-w-[600px] relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#3713ec] transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>search</span>
                            </div>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-10 focus:ring-2 focus:ring-[#3713ec]/40 focus:border-[#3713ec] outline-none transition-all text-base text-white placeholder:text-slate-500"
                                placeholder="Search by title, venue or city..."
                                type="text"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-white">
                                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
                                </button>
                            )}
                        </div>

                        {/* Category Pills */}
                        <div className="flex gap-2 flex-wrap justify-center">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategory(cat)}
                                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                                            ? "bg-[#3713ec] text-white shadow-md shadow-[#3713ec]/30"
                                            : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results header */}
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-white">
                            {loading ? "Loading events…" : `${total} event${total !== 1 ? "s" : ""} found`}
                            {debouncedSearch && !loading && (
                                <span className="ml-2 text-sm text-slate-400 font-normal">for &quot;{debouncedSearch}&quot;</span>
                            )}
                        </h3>
                        <div className="text-xs text-slate-500">
                            Page {page} of {totalPages}
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                            <span className="material-symbols-outlined mb-4" style={{ fontSize: "48px" }}>search_off</span>
                            <p className="text-lg font-medium">No events found</p>
                            <p className="text-sm mt-1">Try adjusting your search or category</p>
                            <button onClick={() => { setSearch(""); setActiveCategory("All Events"); }} className="mt-4 text-[#3713ec] hover:underline text-sm">
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {events.map((event) => {
                                const date = formatDate(event.dateTime.start);
                                return (
                                    <div
                                        key={event._id}
                                        className="group event-card-hover flex flex-col bg-[#0d0d0d] rounded-xl overflow-hidden border border-slate-800 transition-all duration-300 cursor-pointer"
                                        onClick={() => setSelectedEvent(event)}
                                    >
                                        <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
                                            <div className="absolute top-4 left-4 z-10">
                                                <span className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md text-xs font-bold text-[#3713ec] border border-white/20">
                                                    {date.day}
                                                </span>
                                            </div>
                                            {event.category[0] && (
                                                <div className="absolute top-4 right-4 z-10">
                                                    <span className="px-2 py-1 rounded bg-[#3713ec]/80 backdrop-blur text-[10px] font-bold text-white uppercase tracking-wider">
                                                        {event.category[0]}
                                                    </span>
                                                </div>
                                            )}
                                            <img
                                                src={event.imageUrl || FALLBACK_IMAGE}
                                                alt={event.title}
                                                className="event-image w-full h-full object-cover transition-transform duration-500"
                                                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                        </div>
                                        <div className="p-6 flex flex-col flex-1">
                                            <h4 className="text-base font-bold text-white mb-2 leading-snug line-clamp-2 group-hover:text-[#3713ec] transition-colors">
                                                {event.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>location_on</span>
                                                <span className="truncate">{event.venue.name || event.venue.city}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                                                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>schedule</span>
                                                <span>{date.time}</span>
                                            </div>
                                            {event.shortSummary && (
                                                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{event.shortSummary}</p>
                                            )}
                                            <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4">
                                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{event.source.name}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                    className="bg-[#3713ec] hover:bg-[#3713ec]/90 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors"
                                                >
                                                    Get Tickets
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-16">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-[#3713ec] disabled:opacity-40 transition-all"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_left</span>
                            </button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${p === page ? "bg-[#3713ec] text-white" : "bg-slate-900 border border-slate-800 hover:border-[#3713ec]"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-[#3713ec] disabled:opacity-40 transition-all"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="border-t border-slate-800 bg-[#050505] py-12">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#3713ec] rounded flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white" style={{ fontSize: "14px" }}>blur_on</span>
                                </div>
                                <span className="text-lg font-bold text-white">Eventscape</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-xs">
                                Real-time event discovery powered by live data from Ticketmaster and top platforms.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-white">Platform</h5>
                            <ul className="space-y-2 text-sm text-slate-400">
                                {["Discover Events", "Pricing", "Help Center"].map((l) => (
                                    <li key={l}><a className="hover:text-[#3713ec] transition-colors cursor-pointer">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-white">Company</h5>
                            <ul className="space-y-2 text-sm text-slate-400">
                                {["About", "Privacy Policy", "Terms"].map((l) => (
                                    <li key={l}><a className="hover:text-[#3713ec] transition-colors cursor-pointer">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-xs text-slate-500">© 2024 Eventscape Inc.</span>
                        <span className="text-xs text-slate-500">Data from Ticketmaster API</span>
                    </div>
                </footer>
            </section>
        </div>
    );
}
