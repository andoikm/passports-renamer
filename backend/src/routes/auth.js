import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = express.Router();

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

function requireMongoConnected(res) {
  // #region agent log
  fetch('http://127.0.0.1:7610/ingest/ce3d7b37-380d-41ea-9a03-1a0e0397f76f', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'ee0d50',
    },
    body: JSON.stringify({
      sessionId: 'ee0d50',
      location: 'backend/src/routes/auth.js:requireMongoConnected',
      message: 'mongo_connection_guard_evaluated',
      hypothesisId: 'H4',
      data: {
        pid: process.pid,
        readyState: mongoose.connection.readyState,
        willAllow: mongoose.connection.readyState === 1,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // mongoose.connection.readyState:
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: 'MongoDB is not connected' });
    return false;
  }
  return true;
}

authRouter.post('/register', async (req, res) => {
  if (!requireMongoConnected(res)) return;
  // #region agent log
  fetch('http://127.0.0.1:7610/ingest/ce3d7b37-380d-41ea-9a03-1a0e0397f76f', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'ee0d50',
    },
    body: JSON.stringify({
      sessionId: 'ee0d50',
      location: 'backend/src/routes/auth.js:register_entry',
      message: 'register_route_entry',
      hypothesisId: 'H1',
      data: { pid: process.pid, readyState: mongoose.connection.readyState },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string') return res.status(400).json({ message: 'Username is required' });
    if (!password || typeof password !== 'string') return res.status(400).json({ message: 'Password is required' });

    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return res.status(400).json({ message: 'Username must be 3-30 characters' });
    }
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return res.status(409).json({ message: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username: normalizedUsername, passwordHash });

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, authCookieOptions());

    return res.status(201).json({ username: user.username });
  } catch (err) {
    console.error('Register error:', err?.message || err);

    // #region agent log
    fetch('http://127.0.0.1:7610/ingest/ce3d7b37-380d-41ea-9a03-1a0e0397f76f', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'ee0d50',
      },
      body: JSON.stringify({
        sessionId: 'ee0d50',
        location: 'backend/src/routes/auth.js:register_catch',
        message: 'register_catch_executed',
        hypothesisId: 'H3',
        data: { pid: process.pid, errName: err?.name || null, errMsgPrefix: String(err?.message || '').slice(0, 80) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return res.status(500).json({ message: 'Server error (check MongoDB connection)' });
  }
});

authRouter.post('/login', async (req, res) => {
  if (!requireMongoConnected(res)) return;
  try {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string') return res.status(400).json({ message: 'Username is required' });
    if (!password || typeof password !== 'string') return res.status(400).json({ message: 'Password is required' });

    const normalizedUsername = username.trim();

    const user = await User.findOne({ username: normalizedUsername });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, authCookieOptions());

    return res.json({ username: user.username });
  } catch (err) {
    console.error('Login error:', err?.message || err);
    return res.status(500).json({ message: 'Server error (check MongoDB connection)' });
  }
});

authRouter.post('/logout', async (req, res) => {
  res.clearCookie('auth_token', { path: '/', sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  return res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  if (!requireMongoConnected(res)) return;
  try {
    const user = await User.findById(req.userId).select('username');
    if (!user) return res.status(401).json({ message: 'User not found' });
    return res.json({ username: user.username });
  } catch (err) {
    console.error('Me error:', err?.message || err);
    return res.status(500).json({ message: 'Server error (check MongoDB connection)' });
  }
});

