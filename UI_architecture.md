frontend/                              # Next.js (App Router, TypeScript, Tailwind) - served by the Express server in backend/
├── package.json                       # deps + scripts (dev/build/start load the shared ../.env)
├── next.config.ts                     # Next.js config (no static export; rendered by the Express process)
├── tsconfig.json                      # strict TypeScript, "@/*" -> src/*
├── postcss.config.mjs                 # Tailwind CSS v4 via PostCSS
├── eslint.config.mjs                  # next/core-web-vitals + next/typescript
├── scripts/
│   └── run-next.js                    # runs the Next CLI standalone (FRONTEND_PORT for `npm run dev:frontend`)
└── src/
    ├── app/                           # routes (Server Components unless noted)
    │   ├── layout.tsx                 # html shell: theme init script, Header/Footer, QueryProvider, Toaster
    │   ├── globals.css                # Tailwind import + maps theme variables to utilities (bg-primary, ...)
    │   ├── (home)/                    # route group: keeps this loading skeleton from wrapping /shops/* (which needs real 404s)
    │   │   ├── page.tsx               # "/" landing: hero + shop cards (server fetch GET /api/shops)
    │   │   └── loading.tsx            # shop grid skeleton
    │   ├── error.tsx                  # (client) "Unable to load shops" + Try again
    │   ├── not-found.tsx              # unknown pages
    │   └── shops/[id]/
    │       ├── layout.tsx             # resolves the shop above loading.tsx so unknown ids return HTTP 404
    │       ├── page.tsx               # shop profile + BookingFlow (server fetch shop + services, generateMetadata)
    │       ├── loadShop.ts            # cached shop fetch shared by page + metadata; 404/400 -> notFound()
    │       ├── loading.tsx            # shop details skeleton
    │       ├── error.tsx              # (client) "Unable to load this shop" + Try again
    │       └── not-found.tsx          # "Shop not found"
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx             # SUNS brand + ThemeToggle
    │   │   ├── Footer.tsx
    │   │   ├── Container.tsx          # page width + padding
    │   │   └── ThemeToggle.tsx        # (client) light/dark switch, saved in localStorage
    │   ├── providers/
    │   │   └── QueryProvider.tsx      # (client) TanStack Query client
    │   ├── shops/
    │   │   ├── ShopGrid.tsx           # responsive grid / "No shops available"
    │   │   ├── ShopCard.tsx           # card with "View Shop" link
    │   │   ├── ShopDetails.tsx        # shop profile section
    │   │   └── ShopParts.tsx          # logo (with letter fallback) + address/phone/email list
    │   ├── services/
    │   │   ├── ServiceList.tsx        # service grid / "No services available"
    │   │   └── ServiceCard.tsx        # name, description, duration, price; click to select
    │   ├── booking/                   # all (client)
    │   │   ├── BookingFlow.tsx        # "Book Slot" -> services (skeleton / error + retry) -> modal
    │   │   ├── BookingModal.tsx       # accessible dialog: form or success view
    │   │   ├── BookingForm.tsx        # React Hook Form + Zod; field + API errors; values kept on failure
    │   │   ├── SubmissionStatus.tsx   # live "Sending... / Almost there... / Still working..." messages
    │   │   └── BookingSuccess.tsx     # "request submitted, salon will confirm" message
    │   ├── shared/
    │   │   ├── EmptyState.tsx         # empty message + BackHome link
    │   │   ├── ErrorState.tsx         # (client) error message + Try again
    │   │   └── LoadingSkeleton.tsx    # shop grid / shop details skeletons
    │   └── ui/                        # shadcn-style primitives
    │       ├── button.tsx             # variants: primary / outline / ghost
    │       ├── input.tsx              # Input, Textarea, Label
    │       ├── dialog.tsx             # (client) Radix Dialog (bottom sheet on mobile)
    │       └── skeleton.tsx           # pulsing placeholder
    ├── hooks/                         # (client) TanStack Query
    │   ├── useServices.ts             # useQuery: GET /api/services (server data first, retries on failure)
    │   └── useBooking.ts              # useMutation: POST /api/appointments (no auto-retry, no duplicates)
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts              # (server-only) fetch to Express over 127.0.0.1:PORT, timeout, typed errors
    │   │   ├── shops.ts               # (server-only) getShops, getShopById + response normalizer
    │   │   ├── services.ts            # (server-only) getServices, getServiceById, getServicesForShop
    │   │   └── normalize.ts           # normalizeService + browser API base (same origin by default)
    │   ├── validations/
    │   │   └── appointment.schema.ts  # Zod booking schema (name, phone, email, date/time not in past, notes)
    │   ├── theme.ts                   # theme names + pre-hydration init script
    │   └── utils.ts                   # cn() class merge, formatPrice (INR)
    ├── styles/
    │   └── themes.css                 # theme palettes: [data-theme='light'|'dark'] CSS variables (add new themes here)
    └── types/
        ├── shop.ts                    # Shop
        ├── service.ts                 # Service
        └── appointment.ts             # CreateAppointmentPayload, FieldError

Runtime (single service)
  backend/server.js -> backend/utils/frontend.js starts Next.js in the same process
  /api/*, /suns/*  -> Express routes
  everything else  -> Next.js (server-rendered pages)

Booking flow
  /  (shops)  ->  /shops/[id]  ->  Book Slot  ->  pick service  ->  modal form  ->  POST /api/appointments  ->  "request submitted"

Adding a theme (e.g. per shop)
  1. copy a [data-theme='...'] block in src/styles/themes.css and change the colors
  2. add the name to THEMES in src/lib/theme.ts
  3. apply it with data-theme="<name>" on <html> or on a shop page wrapper
