/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           CYBER BANGLA CTF - Main Server Entry Point         ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  This platform is disguised as a professional cybersecurity  ║
 * ║  company website. Multiple CTF challenges are hidden inside. ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CHALLENGE ARCHITECTURE (For Challenge Authors):
 * -----------------------------------------------
 *  Each challenge is isolated in its own route module.
 *  Flags live in /flags/ and are only accessible via their own route.
 *  Cross-challenge flag access is blocked by sandboxed file paths.
 *
 *  Challenge Inventory:
 *  [1] Recon/View Source  → routes/main.js       (flag in HTML source comment)
 *  [2] robots.txt         → routes/robots_route.js (flag in /js/dev.js)
 *  [3] XSS Basic          → routes/xss_basic.js  (reflected XSS w/ cookie flag)
 *  [4] XSS Medium         → routes/xss_medium.js (stored XSS + admin bot sim)
 *  [5] XSS High (DOM)     → routes/xss_high.js   (DOM innerHTML manipulation)
 *  [6] File Upload        → routes/upload.js      (MIME type bypass)
 *  [7] Info Leak x3       → routes/info_leak.js  (log/base64/debug endpoints)
 *  [8] LFI                → routes/lfi.js         (path traversal)//  [9] IDOR               → routes/idor.js        (direct object reference) */

'use strict';

require('./db/init');

const express    = require('express');
const path       = require('path');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const session     = require('express-session');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));

// Session middleware
app.use(session({
    secret: 'cyber-bangla-ctf-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Serve static assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth middleware - require login for all routes except auth and static
function requireAuth(req, res, next) {
    if (req.session.user ||
        req.path === '/login' ||
        req.path === '/signup' ||
        req.path === '/logout' ||
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path === '/favicon.ico') {
        return next();
    }
    res.redirect('/login');
}
app.use(requireAuth);

// Set user in res.locals for templates
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// ─── Route Modules ────────────────────────────────────────────────────────────

// [AUTHENTICATION] Signup, Login, Logout
app.use('/', require('./routes/auth'));

// [MAIN WEBSITE] Home, About, Services, Academy landing, Blog landing, Contact
app.use('/', require('./routes/main'));

// [CHALLENGE 2] robots.txt + /admin + /internal
app.use('/', require('./routes/robots_route'));

// [CHALLENGE 3a] Basic Reflected XSS on Academy search page
app.use('/', require('./routes/xss_basic'));

// [CHALLENGE 3b] Stored XSS on Blog with admin-bot simulation
app.use('/', require('./routes/xss_medium'));

// [CHALLENGE 3c] DOM-based XSS on Academy demo page
app.use('/', require('./routes/xss_high'));

// [CHALLENGE 4] File upload with MIME type bypass
app.use('/', require('./routes/upload'));

// [CHALLENGE 5] Information disclosure (log / base64 API / debug endpoint)
app.use('/', require('./routes/info_leak'));

// [CHALLENGE 6] Local File Inclusion via Academy content viewer
app.use('/', require('./routes/lfi'));

// [CHALLENGE 8] IDOR - Insecure Direct Object Reference
app.use('/', require('./routes/idor'));

// ─── 404 & Error Handlers ────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 – Page Not Found | Cyber Bangla',
        active: ''
    });
});

// Generic error handler – avoid leaking stack traces to users
app.use((err, req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          CYBER BANGLA CTF  –  Server Ready               ║
╠══════════════════════════════════════════════════════════╣
║  URL  :  http://localhost:${PORT}                            ║
║  Mode :  CTF Challenge Platform                          ║
╚══════════════════════════════════════════════════════════╝

  Active Challenges:
  ✓  View Source Flag     →  http://localhost:${PORT}/
  ✓  robots.txt           →  http://localhost:${PORT}/robots.txt
  ✓  XSS Basic            →  http://localhost:${PORT}/academy/search?q=test
  ✓  XSS Medium           →  http://localhost:${PORT}/blog
  ✓  XSS High (DOM)       →  http://localhost:${PORT}/academy/demo
  ✓  File Upload          →  http://localhost:${PORT}/profile
  ✓  Info Disclosure      →  http://localhost:${PORT}/admin/log
  ✓  LFI                  →  http://localhost:${PORT}/academy/content?page=intro
`);
});

module.exports = app;
