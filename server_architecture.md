backend/
├── server.js                      # entry: load config, connect DB, start listening, graceful shutdown
├── app.js                         # Express app: middleware, /suns + /api routes, frontend files
├── API.md                         # Phase 1 REST API documentation
├── config/
│   ├── env.js                     # all settings read from .env in one place (APP_ENV, SALON_TIMEZONE, ...)
│   └── db.js                      # Supabase client + connection check
├── middleware/
│   ├── cors.js                    # CORS allow list
│   ├── requestLogger.js           # logs every API request (blue) and response (green/red)
│   ├── adminAuth.js               # admin guard: bearer ADMIN_API_KEY required, closed if unset
│   ├── rateLimiter.js             # in-memory per-IP rate limiter (booking endpoint)
│   ├── validate.js                # runs validators on body/query/params -> req.validated
│   ├── notFound.js                # standard JSON 404 for unknown routes
│   └── errorHandler.js            # standard JSON error responses
├── routes/
│   ├── index.js                   # /suns diagnostics
│   ├── health.routes.js           # GET /suns/health
│   ├── db.routes.js               # GET /suns/db
│   ├── api.routes.js              # /api router
│   ├── shop.routes.js             # GET /api/shop
│   ├── service.routes.js          # GET /api/services
│   └── appointment.routes.js      # POST/GET /api/appointments, PATCH /api/appointments/:id/status
├── controllers/
│   ├── health.controller.js       # builds the health response
│   ├── db.controller.js           # Supabase connection status
│   ├── shop.controller.js
│   ├── service.controller.js
│   └── appointment.controller.js
├── services/                      # business logic + Supabase queries
│   ├── shop.service.js            # shop_settings
│   ├── service.service.js         # services
│   ├── customer.service.js        # customers (find-or-create by phone)
│   └── appointment.service.js     # appointments (create, list, status transitions)
├── utils/
│   ├── dateTime.js                # date/time helpers (validation, salon time zone)
│   ├── logger.js                  # LOG_LEVEL-aware colored console logger
│   ├── ApiError.js                # error with status + code
│   ├── response.js                # standard success/error response bodies
│   ├── supabaseError.js           # maps Supabase/Postgres errors to ApiError
│   ├── appointmentStatus.js       # status list + allowed transitions
│   └── validators.js              # request validators (pure functions)
└── tests/                         # node:test unit tests (no DB access)