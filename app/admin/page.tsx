"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────
interface DbEvent {
    _id: string;
    title: string;
    description: string;
    shortSummary: string;
    dateTime: { start: string; end: string | null };
    venue: { name: string; address: string; city: string };
    category: string[];
    imageUrl: string | null;
    source: { name: string; eventUrl: string };
    status: "new" | "updated" | "inactive" | "imported";
    scrapeMeta: { lastScrapedAt: string };
}

interface Pagination { page: number; total: number; pages: number; limit: number }

const FALLBACK = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80";

function statusStyle(s: string) {
    if (s === "new") return { badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", dot: "bg-emerald-500 animate-pulse", label: "LIVE" };
    if (s === "imported") return { badge: "bg-[#3713ec]/10 text-[#3713ec] border-[#3713ec]/20", dot: "bg-[#3713ec]", label: "IMPORTED" };
    if (s === "inactive") return { badge: "bg-slate-500/10 text-slate-500 border-slate-500/20", dot: "bg-slate-500", label: "ARCHIVED" };
    return { badge: "bg-amber-500/10 text-amber-500 border-amber-500/20", dot: "bg-amber-500", label: "UPDATED" };
}

function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) + " · " +
        d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

// ─── Event Drawer ─────────────────────────────────────────────
function EventDrawer({
    event,
    onClose,
    onStatusChange,
}: {
    event: DbEvent;
    onClose: () => void;
    onStatusChange: (id: string, newStatus: string) => void;
}) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const st = statusStyle(event.status);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/events/${event._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "imported" }),
            });
            if (res.ok) {
                setSaved(true);
                onStatusChange(event._id, "imported");
                setTimeout(() => setSaved(false), 2000);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async () => {
        setArchiving(true);
        try {
            const res = await fetch(`/api/admin/events/${event._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            });
            if (res.ok) {
                onStatusChange(event._id, "inactive");
                onClose();
            }
        } finally {
            setArchiving(false);
        }
    };

    return (
        <div className="absolute inset-0 flex z-20">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-[480px] bg-[#131022] border-l border-[#24213d] shadow-2xl flex flex-col">
                {/* Hero image */}
                <div className="relative w-full h-44 flex-shrink-0 overflow-hidden">
                    <img src={event.imageUrl || FALLBACK} alt={event.title} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131022] via-[#131022]/10 to-transparent" />
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 backdrop-blur rounded-full p-2 text-white hover:bg-black/60 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
                    </button>
                    <div className="absolute bottom-4 left-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur border ${st.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold flex-1 pr-4 leading-snug">{event.title}</h2>
                        <a href={event.source.eventUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#3713ec] flex-shrink-0">
                            <span className="material-symbols-outlined">open_in_new</span>
                        </a>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-y border-[#24213d] py-5">
                        {[
                            { icon: "calendar_today", label: "Date & Time", value: fmtDate(event.dateTime.start) },
                            { icon: "location_on", label: "Venue", value: `${event.venue.name || "—"}` },
                            { icon: "public", label: "City", value: event.venue.city || "—" },
                            { icon: "database", label: "Source", value: event.source.name },
                        ].map((m) => (
                            <div key={m.label} className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{m.label}</p>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#3713ec]" style={{ fontSize: "16px" }}>{m.icon}</span>
                                    <span className="text-sm font-medium truncate">{m.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {event.shortSummary && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Summary</p>
                            <p className="text-sm text-slate-400 leading-relaxed">{event.shortSummary}</p>
                        </div>
                    )}

                    {event.description && event.description !== event.shortSummary && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Description</p>
                            <p className="text-sm text-slate-400 leading-relaxed line-clamp-6">{event.description}</p>
                        </div>
                    )}

                    {event.category.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Categories</p>
                            <div className="flex flex-wrap gap-2">
                                {event.category.map((c) => (
                                    <span key={c} className="text-xs px-2 py-0.5 bg-[#3713ec]/10 text-[#3713ec] rounded-full border border-[#3713ec]/20">{c}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Last Scraped</p>
                        <p className="text-sm text-slate-400">{fmtDate(event.scrapeMeta.lastScrapedAt)}</p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-[#24213d] flex flex-col gap-3 flex-shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving || event.status === "imported"}
                            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-[#3713ec] hover:bg-[#3713ec]/90 text-white shadow-lg shadow-[#3713ec]/20"
                                }`}
                        >
                            {saving ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{saved ? "check" : "save"}</span>
                            )}
                            {saved ? "Marked as Imported" : event.status === "imported" ? "Already Imported" : "Mark as Imported"}
                        </button>
                        <a
                            href={event.source.eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#24213d] hover:bg-[#24213d]/70 text-slate-100 px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>open_in_new</span>
                        </a>
                    </div>
                    <button
                        onClick={handleArchive}
                        disabled={archiving || event.status === "inactive"}
                        className="w-full text-slate-500 hover:text-rose-400 text-[11px] font-bold uppercase tracking-widest py-1 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                        {archiving ? (
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>archive</span>
                        )}
                        {event.status === "inactive" ? "Already Archived" : "Archive Event"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Loading Skeleton ─────────────────────────────────────────
function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04] animate-pulse">
                    <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex-shrink-0" />
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded w-40" />
                                <div className="h-2.5 bg-white/5 rounded w-24" />
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-5 bg-white/10 rounded-full w-16" /></td>
                    <td className="px-6 py-5"><div className="h-3 bg-white/10 rounded w-28" /></td>
                    <td className="px-6 py-5"><div className="h-3 bg-white/10 rounded w-16" /></td>
                    <td className="px-6 py-5 text-right"><div className="h-3 bg-white/10 rounded w-12 ml-auto" /></td>
                    <td className="px-6 py-5" />
                </tr>
            ))}
        </>
    );
}

// ─── Main Admin Page ──────────────────────────────────────────
export default function AdminDashboardPage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();

    const [events, setEvents] = useState<DbEvent[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1, limit: 20 });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<DbEvent | null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Auth guard
    useEffect(() => {
        if (sessionStatus === "unauthenticated") {
            router.replace("/admin/login");
        }
    }, [sessionStatus, router]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // Fetch events
    const fetchEvents = useCallback(async () => {
        if (sessionStatus !== "authenticated") return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "15" });
            if (statusFilter !== "ALL") params.set("status", statusFilter.toLowerCase());
            if (debouncedSearch) params.set("search", debouncedSearch);

            const res = await fetch(`/api/admin/events?${params}`);
            if (res.status === 401) { router.replace("/admin/login"); return; }
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setEvents(data.events || []);
            setPagination(data.pagination || { page: 1, total: 0, pages: 1, limit: 15 });
        } catch {
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [sessionStatus, page, statusFilter, debouncedSearch, router]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    function showToast(msg: string) {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    }

    function handleStatusChange(id: string, newStatus: string) {
        setEvents((prev) => prev.map((e) => e._id === id ? { ...e, status: newStatus as DbEvent["status"] } : e));
        showToast(`Event ${newStatus === "imported" ? "marked as imported" : "archived"} ✓`);
    }

    // Metrics derived from events
    const liveCount = events.filter((e) => e.status === "new" || e.status === "updated").length;
    const importedCount = events.filter((e) => e.status === "imported").length;

    if (sessionStatus === "loading") {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-[#3713ec]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-slate-400 text-sm">Loading session…</span>
                </div>
            </div>
        );
    }

    if (sessionStatus === "unauthenticated") return null;

    const user = session?.user;

    return (
        <div className="bg-[#0a0a0a] text-slate-100 min-h-screen flex">
            {/* Toast */}
            {toastMsg && (
                <div className="fixed top-4 right-4 z-[200] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
                    {toastMsg}
                </div>
            )}

            {/* ─── Sidebar ─── */}
            <aside className="w-64 border-r border-white/[0.08] flex flex-col h-screen sticky top-0 bg-[#0a0a0a] flex-shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-white/[0.08]">
                    <div className="w-8 h-8 bg-[#3713ec] rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: "20px" }}>auto_awesome</span>
                    </div>
                    <h1 className="font-bold text-lg tracking-tight">Eventscape</h1>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    {[
                        { icon: "dashboard", label: "Dashboard", active: true },
                        { icon: "calendar_month", label: "Events" },
                        { icon: "group", label: "Attendees" },
                        { icon: "bar_chart", label: "Analytics" },
                    ].map((item) => (
                        <a key={item.label} href="#" className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${item.active ? "bg-[#3713ec]/10 text-[#3713ec]" : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`}>
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{item.icon}</span>
                            {item.label}
                        </a>
                    ))}
                    <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Admin</div>
                    {[{ icon: "settings", label: "Settings" }].map((item) => (
                        <a key={item.label} href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{item.icon}</span>
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/[0.08] space-y-2">
                    <button
                        onClick={() => signOut({ callbackUrl: "/admin/login" })}
                        className="flex items-center gap-2 px-3 py-2 w-full text-xs text-slate-500 hover:text-rose-400 rounded-lg hover:bg-red-500/5 transition-colors"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>logout</span>
                        Sign Out
                    </button>
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                        {user?.image ? (
                            <img alt="Profile" className="w-8 h-8 rounded-full border-2 border-[#3713ec]/30 flex-shrink-0" src={user.image} />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#3713ec] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {user?.name?.[0] || "A"}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{user?.name || "Admin"}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ─── Main ─── */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 border-b border-white/[0.08] flex items-center justify-between px-8 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-10 flex-shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>Events</span>
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>chevron_right</span>
                            <span className="text-white font-medium">All Management</span>
                        </div>
                        <div className="h-4 w-px bg-white/[0.08] mx-2" />
                        <div className="relative max-w-sm w-full group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3713ec] transition-colors" style={{ fontSize: "16px" }}>search</span>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white/5 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-[#3713ec] outline-none placeholder:text-slate-600 text-white"
                                placeholder="Search events…"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchEvents}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 transition-colors"
                            title="Refresh"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span>
                        </button>
                        <Link href="/" className="flex items-center gap-2 bg-white/5 border border-white/[0.08] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
                            Homepage
                        </Link>
                    </div>
                </header>

                <div className="p-8 space-y-8 flex-1">
                    {/* Metrics */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: "Total Events", value: pagination.total, sub: "scraped from sources", badge: null },
                            { label: "Live / Updated", value: liveCount, sub: "of this page", badge: "+current" },
                            { label: "Imported", value: importedCount, sub: "marked by admin", badge: null },
                        ].map((m) => (
                            <div key={m.label} className="bg-[#161616] p-6 rounded-xl border border-white/[0.08]">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-slate-400">{m.label}</p>
                                    {m.badge && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{m.badge}</span>}
                                </div>
                                <p className="text-3xl font-bold tabular-nums">{loading ? "—" : m.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
                            </div>
                        ))}
                    </section>

                    {/* Table */}
                    <section className="bg-[#161616] rounded-xl border border-white/[0.08] overflow-hidden relative flex flex-col">
                        {/* Toolbar */}
                        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
                            <div className="flex gap-2">
                                {["ALL", "new", "updated", "imported", "inactive"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => { setStatusFilter(s); setPage(1); }}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${statusFilter === s
                                                ? "bg-[#3713ec] text-white"
                                                : "bg-white/5 border border-white/[0.08] text-slate-400 hover:bg-white/10"
                                            }`}
                                    >
                                        {s === "ALL" ? "All" : s}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">{pagination.total} total</span>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/[0.08]">
                                        <th className="px-6 py-4">Event</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Venue</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Source</th>
                                        <th className="px-6 py-4" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {loading ? (
                                        <TableSkeleton />
                                    ) : events.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                                <span className="material-symbols-outlined block mx-auto mb-2" style={{ fontSize: "40px" }}>search_off</span>
                                                No events match your filters
                                            </td>
                                        </tr>
                                    ) : (
                                        events.map((event) => {
                                            const st = statusStyle(event.status);
                                            return (
                                                <tr
                                                    key={event._id}
                                                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                                                    onClick={() => setSelected(event)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                                                                <img
                                                                    src={event.imageUrl || FALLBACK}
                                                                    alt={event.title}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold line-clamp-1 group-hover:text-[#3713ec] transition-colors">{event.title}</p>
                                                                <p className="text-xs text-slate-500">{fmtDate(event.dateTime.start)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.badge}`}>
                                                            <span className={`w-1 h-1 rounded-full ${st.dot}`} />
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4"><p className="text-xs text-slate-400 truncate max-w-[150px]">{event.venue.name || event.venue.city || "—"}</p></td>
                                                    <td className="px-6 py-4"><p className="text-xs text-slate-400">{new Date(event.dateTime.start).toLocaleDateString("en-AU")}</p></td>
                                                    <td className="px-6 py-4"><p className="text-xs text-slate-500">{event.source.name}</p></td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); setSelected(event); }} className="text-slate-500 hover:text-white transition-colors">
                                                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && pagination.pages > 1 && (
                            <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-center gap-1">
                                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 disabled:opacity-40">
                                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
                                </button>
                                {Array.from({ length: Math.min(pagination.pages, 8) }, (_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${page === p ? "bg-[#3713ec] text-white" : "hover:bg-white/10"}`}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(Math.min(pagination.pages, page + 1))} disabled={page === pagination.pages} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 disabled:opacity-40">
                                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
                                </button>
                            </div>
                        )}

                        {/* Drawer overlay */}
                        {selected && (
                            <EventDrawer
                                event={selected}
                                onClose={() => setSelected(null)}
                                onStatusChange={(id, status) => {
                                    handleStatusChange(id, status);
                                    setSelected(null);
                                }}
                            />
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
