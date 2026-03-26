import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';

// Always load the repo-root .env (backend may start with different CWD).
// backend/src/index.js -> backend/src -> backend -> repo root => ../../.env
dotenv.config({
  path: new URL('../../.env', import.meta.url).pathname,
});

const app = express();

// #region agent log
fetch('http://127.0.0.1:7610/ingest/ce3d7b37-380d-41ea-9a03-1a0e0397f76f', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Debug-Session-Id': 'ee0d50',
  },
  body: JSON.stringify({
    sessionId: 'ee0d50',
    location: 'backend/src/index.js:startup',
    message: 'backend_process_started',
    hypothesisId: 'H1',
    data: {
      pid: process.pid,
      port: process.env.PORT || 4000,
      hasMongoUri: Boolean(process.env.MONGODB_URI),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

app.use(express.json());
app.use(cookieParser());

// Vite dev server may run on a different port; allow any origin for dev.
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use('/api/auth', authRouter);

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  // eslint-disable-next-line no-console
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    // Keep the server running so the client can still display meaningful API errors.
    console.error('MongoDB connection error (server will keep running):', err?.message || err);
  });

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

// Fallback error handler: return JSON instead of Express HTML stack traces.
// (Useful when auth endpoints fail due to MongoDB connectivity issues.)
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled backend error:', err?.message || err);

  // #region agent log
  fetch('http://127.0.0.1:7610/ingest/ce3d7b37-380d-41ea-9a03-1a0e0397f76f', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'ee0d50',
    },
    body: JSON.stringify({
      sessionId: 'ee0d50',
      location: 'backend/src/index.js:error_handler',
      message: 'unhandled_error_handler_hit',
      hypothesisId: 'H3',
      data: { pid: process.pid, errName: err?.name || null, statusSent: res.headersSent },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (res.headersSent) return next(err);
  return res.status(500).json({ message: 'Server error' });
});

