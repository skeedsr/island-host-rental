# Isla Rentals — Canary Islands Vacation Rental Manager

## Overview

Full-stack vacation rental management web app built specifically for the Canary Islands market. Handles property CRUD, bidirectional iCal synchronization (Airbnb, Booking.com, VRBO), bookings management, IGIC tax calculation, and an interactive multi-property calendar.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/canary-rentals)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Routing (frontend)**: Wouter
- **State**: TanStack Query (React Query)
- **UI**: shadcn/ui + Radix + Tailwind

## Authentication

Clerk-based auth with role-based access control:
- **Admin** (`publicMetadata.role = "admin"`) — full dashboard access, user management
- **User** (`publicMetadata.role = "user"`) — can browse public pages and submit bookings

### Setup (required before admin dashboard is accessible)
1. Go to [clerk.com](https://clerk.com), create an app
2. In Replit Secrets, set:
   - `VITE_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard (starts with `pk_`)
   - `CLERK_SECRET_KEY` — from Clerk dashboard (starts with `sk_`)
   - `CLERK_PUBLISHABLE_KEY` — same value as `VITE_CLERK_PUBLISHABLE_KEY` (for backend proxy)
3. Make the first user an admin: use Clerk dashboard → Users → Metadata → set `{ "role": "admin" }`
   Or use the `/api/admin/users/:id/role` endpoint once you have one admin

### Key files
- `artifacts/api-server/src/middlewares/auth.ts` — `requireUser`, `requireAdmin` middleware
- `artifacts/api-server/src/routes/admin.ts` — `GET/PATCH /api/admin/users` endpoints
- `artifacts/canary-rentals/src/components/AdminGuard.tsx` — wraps all admin routes
- `artifacts/canary-rentals/src/pages/Users.tsx` — user role management UI
- `lib/api-client-react/src/custom-fetch.ts` — `setAuthTokenGetter` injects Bearer tokens

## Customer-Facing Routes (public, no login required)

- `/stay` — public landing page: hero + property cards grid + search + "why book direct" section
- `/stay/:id` — public property detail: photos, amenities, availability calendar, booking form (collects name/email/phone/dates, creates a pending booking, shows confirmation reference)

## Key Features

- **Property Management**: Full CRUD for properties with VV license number (Vivienda Vacacional), IGIC toggle (7% Canary Islands tax), nightly rate and max guests
- **Bidirectional iCal Sync**: 
  - Inbound: fetches and parses external .ics feeds (Airbnb, Booking.com, VRBO) with conflict detection
  - Outbound: unique secret export token per property for external platform consumption
- **Bookings**: Full CRUD with source tracking (Direct, Airbnb, Booking.com, VRBO), status management, IGIC calculation
- **Dashboard**: Real-time stats — occupancy rate, revenue, active bookings, upcoming check-ins
- **Multi-property Calendar**: Color-coded calendar view across all properties, filterable by property
- **iCal Engine**: `artifacts/api-server/src/lib/ical.ts` — parses .ics files, detects conflicts, generates outbound feeds

## DB Schema

- `properties` — id, name, location, description, vv_license, igic_enabled, nightly_rate, max_guests, ical_import_urls[], ical_export_token, last_sync_at, sync_status
- `bookings` — id, property_id, guest_name, guest_email, guest_phone, start_date, end_date, source, status, total_price, igic_amount, notes, external_uid

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Endpoints

- `GET /api/properties` — list all properties
- `POST /api/properties` — create property
- `GET /api/properties/:id` — get property
- `PUT /api/properties/:id` — update property
- `DELETE /api/properties/:id` — delete property
- `POST /api/properties/:id/sync` — trigger iCal sync
- `GET /api/properties/:id/ical-export?token=<token>` — export iCal feed
- `GET /api/bookings` — list bookings (filters: propertyId, status)
- `POST /api/bookings` — create booking
- `GET /api/bookings/:id` — get booking
- `PUT /api/bookings/:id` — update booking
- `DELETE /api/bookings/:id` — delete booking
- `GET /api/dashboard/summary` — overview stats
- `GET /api/dashboard/upcoming` — upcoming bookings (30 days)
- `GET /api/dashboard/occupancy` — monthly occupancy stats
- `GET /api/dashboard/revenue` — revenue by source

## File Structure

```
artifacts/
  api-server/
    src/
      routes/
        properties.ts    — property CRUD + iCal sync/export routes
        bookings.ts      — booking CRUD routes
        dashboard.ts     — summary/stats routes
      lib/
        ical.ts          — iCal parser, feed generator, sync engine
  canary-rentals/
    src/
      pages/
        Dashboard.tsx    — overview stats + charts
        Properties.tsx   — property list/management
        PropertyDetail.tsx — property detail + calendar + iCal config
        Bookings.tsx     — booking list with filters + add dialog
        BookingDetail.tsx — booking detail + edit + IGIC display
        CalendarPage.tsx — multi-property monthly calendar
      components/
        layout/Shell.tsx — app shell with sidebar
        layout/Sidebar.tsx — navigation sidebar
lib/
  api-spec/openapi.yaml  — OpenAPI contract (source of truth)
  api-client-react/      — generated React Query hooks
  api-zod/               — generated Zod schemas
  db/
    src/schema/
      properties.ts      — Drizzle property schema
      bookings.ts        — Drizzle booking schema
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
