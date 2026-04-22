'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const config = require('./config');
const logger = require('./logger');
const { runMigrations } = require('./db/migrate');
const { closeDb } = require('./db/database');

const authRoutes = require('./routes/auth.routes');
const tokenRoutes = require('./routes/token.routes');
const callsRoutes = require('./routes/calls.routes');
const contactsRoutes = require('./routes/contacts.routes');
const webhookRoutes = require('./routes/webhook.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://sdk.twilio.com',
        'https://fonts.googleapis.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://*.twilio.com', 'wss://*.twilio.com'],
      mediaSrc: ["'self'", 'blob:', 'https://*.twilio.com'],
      imgSrc: ["'self'", 'data:'],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: config.app.publicUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ── Body parsers ───────────────────────────────────────────────────────────
// Must come BEFORE session so Twilio signature validation can read req.body
app.use('/webhook', express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.server.isProduction && config.app.publicUrl.startsWith('https://'),
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// ── Trust proxy for rate limiting behind reverse proxy ─────────────────────
if (config.server.isProduction) {
  app.set('trust proxy', 1);
}

// ── Static files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Root redirect ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/pages/app.html');
  }
  res.redirect('/pages/login.html');
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Webhook Routes (Twilio) ────────────────────────────────────────────────
app.use('/webhook', webhookRoutes);

// ── Error handlers ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Startup ────────────────────────────────────────────────────────────────
function start() {
  try {
    runMigrations();
  } catch (err) {
    logger.error('Failed to run database migrations', { error: err.message });
    process.exit(1);
  }

  const server = app.listen(config.server.port, () => {
    logger.info('═══════════════════════════════════════════════');
    logger.info('  Twilio Softphone Server Started');
    logger.info(`  Port        : ${config.server.port}`);
    logger.info(`  Environment : ${config.server.nodeEnv}`);
    logger.info(`  Public URL  : ${config.app.publicUrl}`);
    logger.info(`  Twilio #    : ${config.twilio.phoneNumber}`);
    logger.info(`  App URL     : http://localhost:${config.server.port}`);
    logger.info('═══════════════════════════════════════════════');
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  function gracefulShutdown(signal) {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      closeDb();
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
}

start();
