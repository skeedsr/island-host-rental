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

Session-based auth (express-session). **Dual login path**:

### Path A — System accounts (`admin_users` table)
Username + scrypt password. Used for internal system accounts (e.g. `admin`, `skeedsr`).

### Path B — Customer-admins (`customers` table, `admin_role` column)
Email + bcrypt password. A regular customer becomes an admin by setting `customers.admin_role`.
**No separate account is created** — one person, one account, multiple roles.

| Role | Description |
|------|-------------|
| `super_admin` | Full access — all properties, all bookings, user management |
| `property_manager` | Scoped access — only sees/edits their assigned properties |
| `null` (customer only) | Public customer, no admin access |

### Session fields (`session.d.ts`)
- `isAdmin: boolean` — set for both admin_users and customer-admins
- `adminRole: "super_admin" | "property_manager"` — the active role
- `adminUserId?: number` — set only for admin_users logins
- `customerId?: number` — set for customer logins AND customer-admin logins
- `adminUsername?: string` — display name (username or email)

### Admin User Management (super_admin only)
- System accounts in `admin_users` (id, username, passwordHash, role, displayName)
- Customer-admins: set `customers.admin_role` via `PUT /api/admin/customers/:id/admin-role`
- Property assignments: `property_assignments` table supports both `admin_user_id` and `customer_id`
- Passwords: admin_users use scrypt (`lib/password.ts`); customers use bcrypt
- **First login**: if `admin_users` is empty, `ADMIN_PASSWORD` seeds a `super_admin` with username `admin`

### Key auth files
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAdmin`, `requireSuperAdmin`, `canAccessProperty()`, `getAssignedPropertyIds()` (supports both admin_user_id and customer_id)
- `artifacts/api-server/src/routes/auth.ts` — admin login/logout/me (tries username → admin_users, then email → customers with admin_role)
- `artifacts/api-server/src/routes/customer-auth.ts` — customer register/login/me/logout (isHost based on admin_role)
- `artifacts/api-server/src/routes/adminUsers.ts` — CRUD for system users, customer admin-role management, property assignments
- Secrets required: `ADMIN_PASSWORD`, `SESSION_SECRET`

## Customer-Facing Routes (public, `/stay`)

- `/stay` — public landing page: hero + property cards grid + search
- `/stay/:id` — property detail: photos lightbox, availability calendar, booking form
- Customer auth: register + login on the public site; session persists with admin login (same cookie)
- `isHost` flag on `/api/customer/me` — true when `customer.admin_role IS NOT NULL`; shows "Area Host" link in public navbar

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

## DB Schema

- `properties` — id, name, location, description, vv_license, igic_enabled, nightly_rate, max_guests, photos[] (text array of URLs), ical_import_urls[], ical_export_token, last_sync_at, sync_status
- `bookings` — id, property_id, guest_name, guest_email, guest_phone, start_date, end_date, source, status, total_price, igic_amount, notes, external_uid
- `customers` — id, email, passwordHash, firstName, lastName, phone, **admin_role** (null | 'property_manager' | 'super_admin'), createdAt
- `admin_users` — id, username, passwordHash, role ('super_admin'|'property_manager'), displayName, createdAt, updatedAt
- `property_assignments` — id, **admin_user_id** (nullable), **customer_id** (nullable, FK→customers), property_id, createdAt
  - Unique index on (admin_user_id, property_id) WHERE admin_user_id IS NOT NULL
  - Unique index on (customer_id, property_id) WHERE customer_id IS NOT NULL (partial: `uq_customer_property`)
  - At least one of admin_user_id or customer_id must be set

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- **DB migrations**: use `executeSql` via code_execution directly — `drizzle-kit push` is blocked by interactive prompts

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

### Auth
- `POST /api/auth/login` — admin login (username→admin_users OR email→customers with admin_role)
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/customer/register` / `POST /api/customer/login` / `POST /api/customer/logout`
- `GET /api/customer/me` — includes `isHost: boolean`

### Admin User Management (super_admin only)
- `GET /api/admin/users` — list system admin accounts
- `POST /api/admin/users` — create system admin account
- `GET /api/admin/users/:id` — get user detail + property assignments
- `PUT /api/admin/users/:id` — update (role, displayName, password)
- `DELETE /api/admin/users/:id` — delete
- `GET /api/admin/customers` — list all customers (with adminRole field)
- `PUT /api/admin/customers/:id/admin-role` — set/revoke host role `{ role: "property_manager"|"super_admin"|null }`
- `GET /api/admin/customers/:id/assignments` — get customer property assignments
- `POST /api/admin/customers/:id/assignments` — assign property to customer-admin
- `GET /api/admin/property-assignments` — list all assignments
- `POST /api/admin/property-assignments` — assign property to system admin user
- `DELETE /api/admin/property-assignments/:id` — remove any assignment

## File Structure

```
artifacts/
  api-server/
    src/
      routes/
        auth.ts          — admin login/logout/me (dual path: username or email)
        customer-auth.ts — customer register/login/logout/me (isHost from admin_role)
        properties.ts    — property CRUD + iCal sync/export routes (role-scoped)
        bookings.ts      — booking CRUD routes
        dashboard.ts     — summary/stats routes (role-scoped)
        adminUsers.ts    — system user CRUD + customer admin-role + property assignments
      middlewares/
        auth.ts          — requireAdmin, requireSuperAdmin, canAccessProperty, getAssignedPropertyIds
      lib/
        ical.ts          — iCal parser, feed generator, sync engine
        password.ts      — scrypt-based hashPassword / verifyPassword (for admin_users)
      types/
        session.d.ts     — session fields: isAdmin, adminUserId, customerId, adminUsername, adminRole
  canary-rentals/
    src/
      pages/
        Users.tsx        — admin panel: system users (Amministratori tab) + customers (Clienti tab)
                           Clienti tab: shows adminRole badge, "Rendi Host" / "Revoca" / "Proprietà" buttons
        Dashboard.tsx    — overview stats + charts
        Properties.tsx   — property list/management
        PropertyFormPage.tsx — shared create/edit form
        Bookings.tsx     — booking list with filters + add dialog
        CalendarPage.tsx — multi-property monthly calendar
        PublicLanding.tsx — /stay public page
        PublicProperty.tsx — /stay/:id public page with lightbox
      components/
        layout/PublicLayout.tsx — shows "Area Host" link when isHost=true
lib/
  db/
    src/schema/
      customers.ts         — Drizzle customer schema (includes adminRole)
      adminUsers.ts        — Drizzle admin_users schema + AdminRole type
      propertyAssignments.ts — Drizzle property_assignments (adminUserId nullable, customerId nullable)
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
