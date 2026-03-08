/**
 * routes/robots_route.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [2] – robots.txt Recon Chain
 *
 *  Step 1 → GET /robots.txt          Players discover Disallowed paths
 *  Step 2 → GET /admin               Broken admin page references /js/dev.js
 *  Step 3 → GET /js/dev.js           (static file served from public/js/dev.js)
 *
 *  Flag: CBCTF{robots_js_flag}  (inside public/js/dev.js)
 *
 *  Also exposes /internal as a dead-end teaser directing toward info-leak
 *  challenges at /admin/log and /internal/dev.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router  = express.Router();

// ── robots.txt ────────────────────────────────────────────────────────────────
// VULNERABILITY: Robots.txt reveals sensitive internal paths.
// This is intentional – it guides the player through the challenge chain.
router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Disallow: /admin
Disallow: /internal
Disallow: /debug
Disallow: /js/dev.js

# Please do not crawl our internal systems.
# For security inquiries: security@cyberbangla.com
`);
});

// ── /admin ────────────────────────────────────────────────────────────────────
// An intentionally unfinished admin panel that leaks a JS file reference.
// VULNERABILITY: Developer left a <script src="/js/dev.js"> visible in source.
router.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Admin Panel – Cyber Bangla [DEV]</title>
    <!-- TODO: Style this page before handoff to design team -->
    <style>
        body { font-family: monospace; background: #0d1117; color: #58a6ff; margin: 40px; }
        h1   { color: #ff7b72; }
        .warn{ color: #f0883e; font-size: 0.9em; }
        a    { color: #58a6ff; }
    </style>

    <!-- DEV NOTE: Load development utilities – REMOVE BEFORE PRODUCTION! -->
    <!-- Reference: /js/dev.js -->
    <script src="/js/dev.js"></script>
</head>
<body>
    <h1>&#128274; Admin Portal (Development Build)</h1>
    <p class="warn">&#9888; This page is under construction. Do not expose to public.</p>
    <hr />
    <ul>
        <li><a href="/admin/log">System Logs</a></li>
        <li><a href="/internal/dev">Internal Dev API</a></li>
        <li><a href="/debug/info">Debug Info</a></li>
    </ul>
    <hr />
    <!--
        Dev checklist before go-live:
        [x] Set up prod DB
        [ ] Remove /js/dev.js reference above
        [ ] Disable /debug/info endpoint
        [ ] Rotate API tokens in /internal/dev
        [ ] Clean up /admin/log
    -->
    <p style="color:#888; font-size:0.8em;">Cyber Bangla Internal Tools v0.9-dev | Not for public access</p>
</body>
</html>`);
});

// ── /internal ─────────────────────────────────────────────────────────────────
// Teaser page that hints at /internal/dev (handled in info_leak.js)
router.get('/internal', (req, res) => {
    res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>403 – Restricted | Cyber Bangla</title>
    <style>
        body { font-family: monospace; background: #0d1117; color: #58a6ff; margin: 40px; }
        h1   { color: #ff7b72; }
    </style>
</head>
<body>
    <h1>403 – Access Restricted</h1>
    <p>This internal zone is restricted to authorised personnel only.</p>
    <!-- Try /internal/dev for the developer API endpoint -->
</body>
</html>`);
});

module.exports = router;
