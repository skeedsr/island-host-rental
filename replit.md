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

## Authentication & Role System

Session-based admin auth (express-session) with **3 roles**:

| Role | Description |
|------|-------------|
| `super_admin` | Full access — all properties, all bookings, user management |
| `property_manager` | Scoped access — only sees/edits their assigned properties |
| guest | Public customer (no admin session) |

### Admin User Management (super_admin only)

- Admin users stored in `admin_users` DB table (id, username, passwordHash, role, displayName)
- Property assignments in `property_assignments` table (adminUserId → propertyId, unique)
- Passwords hashed with Node.js `crypto.scrypt` (see `artifacts/api-server/src/lib/password.ts`)
- **First login**: if `admin_users` table is empty, the `ADMIN_PASSWORD` secret is used to auto-seed a `super_admin` with username `admin`

### Key auth files
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAdmin` (any role), `requireSuperAdmin`, `canAccessProperty()`, `getAssignedPropertyIds()`
- `artifacts/api-server/src/routes/auth.ts` — login/logout/me, seeds super_admin on first login
- `artifacts/api-server/src/routes/adminUsers.ts` — CRUD for users and property assignments (super_admin only)
- `artifacts/api-server/src/types/session.d.ts` — session fields: `isAdmin`, `adminUserId`, `adminUsername`, `adminRole`
- Secrets required: `ADMIN_PASSWORD`, `SESSION_SECRET`

### Access control summary
- `GET /api/properties` — all admins, scoped by role
- `POST /api/properties` — super_admin only
- `PUT /api/properties/:id` — any admin, but property_manager only for assigned properties
- `DELETE /api/properties/:id` — super_admin only
- `GET /api/dashboard/*` — all admins, scoped by role
- `GET|POST|PUT|DELETE /api/admin/users` — super_admin only
- `GET|POST|DELETE /api/admin/property-assignments` — super_admin only

## Customer-Facing Routes (public, no login required)

- `/stay` — public landing page: hero + property cards grid + search + "why book direct" section
- `/stay/:id` — public property detail: photos, amenities, availability calendar, booking form (collects name/email/phone/dates, creates a pending booking, shows confirmation reference)

## Key Features

- **Property Management**: Full CRUD for properties with VV license number (Vivienda Vacacional), IGIC toggle (7% Canary Islands tax), nightly rate, max guests, and photo gallery (URL-based)
- **Property Forms**: Shared `PropertyFormPage` for creating (`/properties/new`) and editing (`/properties/:id/edit`) — includes photo URL management and iCal URL management inline; photos can be reordered (←/→ arrows) and deleted (trash icon); first photo tagged as "Copertina"
- **Bidirectional iCal Sync**: 
  - Inbound: fetches and parses external .ics feeds (Airbnb, Booking.com, VRBO) with conflict detection
  - Outbound: unique secret export token per property for external platform consumption
- **Bookings**: Full CRUD with source tracking (Direct, Airbnb, Booking.com, VRBO), status management, IGIC calculation
- **Dashboard**: Real-time stats — occupancy rate, revenue, active bookings, upcoming check-ins (scoped by role)
- **Multi-property Calendar**: Color-coded calendar view across all properties, filterable by property
- **iCal Engine**: `artifacts/api-server/src/lib/ical.ts` — parses .ics files, detects conflicts, generates outbound feeds
- **Public Photo Lightbox**: `/stay/:id` shows full-screen lightbox with keyboard navigation (←/→/Esc)

## DB Schema

- `properties` — id, name, location, description, vv_license, igic_enabled, nightly_rate, max_guests, photos[] (text array of URLs), ical_import_urls[], ical_export_token, last_sync_at, sync_status
- `bookings` — id, property_id, guest_name, guest_email, guest_phone, start_date, end_date, source, status, total_price, igic_amount, notes, external_uid
- `customers` — id, email, passwordHash, name, phone, createdAt
- `admin_users` — id, username, passwordHash, role ('super_admin'|'property_manager'), displayName, createdAt, updatedAt
- `property_assignments` — id, adminUserId, propertyId (unique pair), createdAt

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Endpoints

### Properties
- `GET /api/properties` — list properties (scoped by role)
- `POST /api/properties` — create property (super_admin only)
- `GET /api/properties/:id` — get property
- `PUT /api/properties/:id` — update property (property_manager: assigned only)
- `DELETE /api/properties/:id` — delete property (super_admin only)
- `POST /api/properties/:id/sync` — trigger iCal sync
- `GET /api/properties/:id/ical-export?token=<token>` — export iCal feed (public, token-gated)

### Bookings
- `GET /api/bookings` — list bookings (filters: propertyId, status)
- `POST /api/bookings` — create booking
- `GET /api/bookings/:id` — get booking
- `PUT /api/bookings/:id` — update booking
- `DELETE /api/bookings/:id` — delete booking

### Dashboard (scoped by role)
- `GET /api/dashboard/summary` — overview stats
- `GET /api/dashboard/upcoming` — upcoming bookings (30 days)
- `GET /api/dashboard/occupancy` — monthly occupancy stats
- `GET /api/dashboard/revenue` — revenue by source

### Admin User Management (super_admin only)
- `GET /api/admin/users` — list all admin users
- `POST /api/admin/users` — create admin user
- `GET /api/admin/users/:id` — get user detail + property assignments
- `PUT /api/admin/users/:id` — update user (role, displayName, password)
- `DELETE /api/admin/users/:id` — delete user (cascades assignments)
- `GET /api/admin/property-assignments` — list all assignments
- `GET /api/admin/customers` — list all registered customers/guests (read-only)
- `PUT /api/admin/users/:id` — also accepts `linkedCustomerId: number|null` to link/unlink a customer account
- `POST /api/admin/property-assignments` — assign property to property_manager
- `DELETE /api/admin/property-assignments/:id` — remove assignment

## File Structure

```
artifacts/
  api-server/
    src/
      routes/
        auth.ts          — login/logout/me, seeds super_admin on first login
        properties.ts    — property CRUD + iCal sync/export routes (role-scoped)
        bookings.ts      — booking CRUD routes
        dashboard.ts     — summary/stats routes (role-scoped)
        adminUsers.ts    — admin user CRUD + property assignments (super_admin only)
      middlewares/
        auth.ts          — requireAdmin, requireSuperAdmin, canAccessProperty, getAssignedPropertyIds
      lib/
        ical.ts          — iCal parser, feed generator, sync engine
        password.ts      — scrypt-based hashPassword / verifyPassword
      types/
        session.d.ts     — session type augmentation (isAdmin, adminUserId, adminUsername, adminRole)
  canary-rentals/
    src/
      pages/
        Dashboard.tsx    — overview stats + charts
        Properties.tsx   — property list/management
        PropertyDetail.tsx — property detail + photo gallery tab + calendar + iCal config
        PropertyFormPage.tsx — shared create/edit form (photos with reorder/delete, iCal URLs)
        Bookings.tsx     — booking list with filters + add dialog
        BookingDetail.tsx — booking detail + edit + IGIC display
        CalendarPage.tsx — multi-property monthly calendar
        PublicLanding.tsx — /stay public page
        PublicProperty.tsx — /stay/:id public page with lightbox
      components/
        layout/Shell.tsx — app shell with sidebar
        layout/Sidebar.tsx — navigation sidebar
lib/
  api-spec/openapi.yaml  — OpenAPI contract (source of truth)
  api-client-react/      — generated React Query hooks
  api-zod/               — generated Zod schemas
  db/
    src/schema/
      properties.ts        — Drizzle property schema
      bookings.ts          — Drizzle booking schema
      customers.ts         — Drizzle customer schema
      adminUsers.ts        — Drizzle admin_users schema + AdminRole type
      propertyAssignments.ts — Drizzle property_assignments schema
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
