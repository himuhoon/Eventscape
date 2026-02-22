# 🎟️ Eventscape — Event Discovery Platform

A full-stack event discovery platform built with **Next.js 16**, **MongoDB**, and **NextAuth**. It automatically scrapes real event data from the Ticketmaster API on a recurring schedule and presents them through a polished public-facing UI and a secure admin dashboard.

---

## ✨ Features

- 🔍 **Live Event Discovery** — Browse real events scraped from Ticketmaster
- 🔄 **Auto-Scraping Engine** — Background daemon refreshes data every 6 hours
- ☁️ **Vercel Cron Integration** — Serverless auto-scrape via `/api/scrape` on deploy
- 🔐 **Google OAuth Authentication** — Secure login via NextAuth
- 🛡️ **Admin Dashboard** — Manage events and view ticket leads (admin-only)
- 🎫 **Ticket Lead Capture** — Lets users express interest in events
- 📦 **MongoDB Atlas** — Persistent cloud database via Mongoose

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | NextAuth v5 (Google OAuth) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Scraping | Ticketmaster Discovery API v2 |
| Deployment | Vercel |

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx              # Public homepage (event grid + hero)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── admin/                # Admin dashboard pages
│   └── api/
│       ├── auth/             # NextAuth route handler
│       ├── events/           # Public event listing API
│       ├── tickets/          # Ticket lead submission API
│       ├── scrape/           # Cron-triggered scrape endpoint
│       └── admin/            # Admin-only API routes
│
├── scraper/
│   ├── index.ts              # Manual scrape entry point
│   ├── daemon.ts             # Long-running background scraper
│   ├── normalizer.ts         # Transforms raw API data → DB schema
│   ├── statusEngine.ts       # Upserts events, manages lifecycle
│   ├── clear-seed.ts         # Clears + re-seeds the database
│   └── sources/
│       ├── ticketmaster.ts   # Ticketmaster API scraper
│       ├── eventbrite.ts     # Eventbrite scraper
│       ├── humanitix.ts      # Humanitix scraper
│       ├── meetup.ts         # Meetup scraper
│       └── predicthq.ts      # PredictHQ scraper
│
├── models/
│   ├── Event.ts              # Event Mongoose model
│   ├── TicketLead.ts         # Ticket lead Mongoose model
│   └── User.ts               # User Mongoose model
│
├── lib/
│   └── db.ts                 # MongoDB connection helper
│
├── components/               # Shared React components
├── vercel.json               # Vercel Cron configuration
└── .env.example              # Environment variable template
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [MongoDB Atlas](https://cloud.mongodb.com/) cluster
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth 2.0 credentials
- A [Ticketmaster Developer](https://developer.ticketmaster.com/) API key

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd eventscape
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
# .env.local

MONGODB_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/eventdiscovery?retryWrites=true&w=majority

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

NEXTAUTH_SECRET=change_me_to_a_random_32char_string
NEXTAUTH_URL=http://localhost:3000

TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Optional: Protects the /api/scrape endpoint from unauthorised access
CRON_SECRET=your_random_secret_string
```

> **Tip:** Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`

### 3. Run in Development

```bash
npm run dev
```

This concurrently starts:
- **Next.js** dev server at `http://localhost:3000`
- **Scraper daemon** that fetches events in the background every 6 hours

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js + scraper daemon together |
| `npm run dev:web` | Start Next.js only (no scraper) |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run scrape` | Run a one-off scrape manually |
| `npm run scrape:daemon` | Run the background scraper daemon only |
| `npm run seed` | Seed the database with initial data |
| `npm run db:clear` | Clear all existing events and re-seed |

---

## 🔌 API Routes

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/events` | List all events | Public |
| `POST` | `/api/tickets` | Submit a ticket lead | Public |
| `GET` | `/api/scrape` | Trigger a scrape run | Cron / Bearer token |
| `GET/POST` | `/api/auth/...` | NextAuth OAuth handlers | — |
| `*` | `/api/admin/...` | Admin management routes | Admin only |

### Triggering a Manual Scrape

```bash
curl -H "Authorization: Bearer your_cron_secret" http://localhost:3000/api/scrape
```

---

## ⚙️ How the Scraper Works

1. **Sources** — Each file in `scraper/sources/` fetches events from a specific API and returns a `RawEvent[]` array.
2. **Normalizer** — `normalizer.ts` maps each raw event into a standardised schema.
3. **Status Engine** — `statusEngine.ts` upserts events into MongoDB, updating existing records and inserting new ones while preserving data integrity.
4. **Daemon** — `daemon.ts` runs the pipeline on a configurable interval (default: every 6 hours).
5. **Cron Endpoint** — On Vercel, `vercel.json` triggers `GET /api/scrape` every 6 hours automatically.

---

## ☁️ Deploying to Vercel

1. Push your code to GitHub and import the repo in [Vercel](https://vercel.com/).
2. Add all environment variables from `.env.local` in the Vercel project settings.
3. The `vercel.json` cron job automatically calls `/api/scrape` every 6 hours.

```json
{
  "crons": [
    {
      "path": "/api/scrape",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

> **Note:** Vercel Cron sends requests with the `Authorization: Bearer $CRON_SECRET` header. Make sure to set `CRON_SECRET` in your Vercel environment variables.

---

## 🔐 Authentication & Admin Access

Authentication is handled by **NextAuth v5** with Google OAuth. Users who sign in with an authorised Google account are granted admin privileges based on their email or a role field stored in the `User` model.

To set up Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI.
4. Copy the Client ID and Secret into your `.env.local`.

---

## 📄 License

MIT — feel free to use and adapt this project.
