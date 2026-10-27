backend/
├── server.js                      # entry: connect DB, start listening
├── app.js                         # Express app: middleware, routes, frontend files
├── config/
│   ├── env.js                     # all settings read from .env in one place
│   └── db.js                      # Supabase client + connection check
├── middleware/
│   ├── cors.js                    # CORS allow list
│   ├── notFound.js                # JSON 404 for unknown routes
│   └── errorHandler.js            # catches errors, returns a JSON 500
├── routes/
│   ├── index.js                   # puts everything under /suns
│   ├── health.routes.js           # GET /suns/health
│   └── db.routes.js               # GET /suns/db
├── controllers/
│   ├── health.controller.js       # builds the health response
│   └── db.controller.js           # Supabase connection status
└── utils/
    └── dateTime.js                # current date/time helper