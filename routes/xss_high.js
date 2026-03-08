'use strict';
/**
 * routes/xss_high.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [3c] – Stored DOM XSS + Authentication Bypass (High Difficulty)
 *
 *  Application: Internal Issue Tracker
 *
 *  Endpoints:
 *    GET  /issues              → Submit form  (EJS: views/issues.ejs)
 *    GET  /issues/admin        → Admin panel  (requires Basic Auth)
 *    POST /api/submit-issue    → Store issue in memory
 *    GET  /api/issues          → Return all issues as JSON
 *    DELETE /api/delete-issue/:id → Delete an issue
 *
 *  VULNERABILITIES:
 *    1. Weak credentials leaked in /debug/info (admin:Cyber@2024)
 *    2. Stored issues with NO sanitisation (no HTML escaping)
 *    3. Admin panel uses innerHTML to render issues → DOM XSS sink
 *       When issue.title/description contain malicious HTML, they execute
 *
 *  Flag: "CBCTF{dom_xss_executed}" — accessed via XSS when auth is bypassed
 *
 *  Intended DOM XSS payloads (submit as issue title or description):
 *    <svg onload="alert(flag)">
 *    <img src=x onerror="alert(flag)">
 *    <body onload="alert(flag)">
 *    These execute when innerHTML renders the malicious payload.
 *
 *  How to solve:
 *    1. Visit /debug/info → find admin credentials (admin:Cyber@2024)
 *    2. Go to /issues
 *    3. Submit issue with DOM XSS payload in title or description
 *    4. Click "Admin Panel" → enter Basic Auth credentials
 *    5. Admin panel renders issues via innerHTML → DOM XSS payload executes
 *    6. flag variable is accessible in page context → payload runs → alert fires
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

// ─── In-memory stores ─────────────────────────────────────────────────────────
const issues = [];
let _idCounter = 1;

// Admin flag – displayed when authenticated user visits admin panel
const ADMIN_FLAG = 'CBCTF{dom_xss_executed}';

// Admin credentials (weak, discoverable via info leak endpoint)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Cyber@2024';

// ─── Auto-clear every 5 minutes ──────────────────────────────────────────────
// Prevents one player's entries from being visible to others
setInterval(function () {
    issues.splice(0);
    _idCounter = 1;
}, 5 * 60 * 1000);
function basicAuthMiddleware(req, res, next) {
    var authHeader = req.headers.authorization;
    
    // No auth header কেই 401 return করুন
    if (!authHeader || authHeader.trim() === '') {
        res.set('WWW-Authenticate', 'Basic realm="Issue Tracker Admin"');
        return res.status(401).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unauthorized</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
                    h1 { color: #ff3366; }
                </style>
            </head>
            <body>
                <h1>401 Unauthorized</h1>
                <p>This page requires Basic Authentication.</p>
                <p>Please provide admin credentials to access.</p>
            </body>
            </html>
        `);
    }
    
    if (!authHeader.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Issue Tracker Admin"');
        return res.status(401).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unauthorized</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
                    h1 { color: #ff3366; }
                </style>
            </head>
            <body>
                <h1>401 Unauthorized</h1>
                <p>Invalid auth format.</p>
            </body>
            </html>
        `);
    }

    var credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    var [username, password] = credentials.split(':');

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        next();
    } else {
        res.set('WWW-Authenticate', 'Basic realm="Issue Tracker Admin"');
        return res.status(401).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unauthorized</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
                    h1 { color: #ff3366; }
                </style>
            </head>
            <body>
                <h1>401 Unauthorized</h1>
                <p>Invalid credentials.</p>
            </body>
            </html>
        `);
    }
}

// ─── GET /issues – Submit form ────────────────────────────────────────────────
router.get('/issues', function (req, res) {
    res.render('issues', { title: 'Issue Tracker | Cyber Bangla', active: 'academy' });
});

// ─── GET /issues/admin – Admin panel (Requires Basic Auth) ──────────────────
// Protected by basic auth middleware
router.get('/issues/admin', basicAuthMiddleware, function (req, res) {
    res.render('issues_admin', { 
        title: 'Admin Panel | Issue Tracker', 
        active: '',
        authenticated: true
    });
});

// ─── POST /api/submit-issue ───────────────────────────────────────────────────
router.post('/api/submit-issue', function (req, res) {
    var title       = String(req.body.title       || '').trim().slice(0, 200);
    var description = String(req.body.description || '').trim().slice(0, 2000);
    var category    = String(req.body.category    || 'Other').slice(0, 50);

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required.' });
    }

    var issue = {
        id:          _idCounter++,
        title:       title,       // Stored raw – no sanitisation (intentional)
        description: description, // Stored raw – no sanitisation (intentional)
        category:    category,
        createdAt:   new Date().toISOString(),
        // Per-player isolation: tag each issue with submitter's IP + UA
        _ip:         req.ip,
        _ua:         req.headers['user-agent'] || 'unknown'
    };

    issues.push(issue);
    res.json({ success: true, id: issue.id });
});

// ─── GET /api/issues ──────────────────────────────────────────────────────────
// Returns only the issues submitted by the requesting player (IP + UA match).
router.get('/api/issues', function (req, res) {
    var myIp = req.ip;
    var myUa = req.headers['user-agent'] || 'unknown';
    var myIssues = issues.filter(function (issue) {
        return issue._ip === myIp && issue._ua === myUa;
    });
    // Strip internal tracking fields before sending to client
    var sanitised = myIssues.map(function (issue) {
        return {
            id:          issue.id,
            title:       issue.title,
            description: issue.description,
            category:    issue.category,
            createdAt:   issue.createdAt
        };
    });
    res.json(sanitised);
});

// ─── DELETE /api/delete-issue/:id ────────────────────────────────────────────
// Players can only delete their own issues.
router.delete('/api/delete-issue/:id', function (req, res) {
    var myIp = req.ip;
    var myUa = req.headers['user-agent'] || 'unknown';
    var id    = parseInt(req.params.id, 10);
    var index = issues.findIndex(function (i) {
        return i.id === id && i._ip === myIp && i._ua === myUa;
    });
    if (index === -1) {
        return res.status(404).json({ error: 'Issue not found.' });
    }
    issues.splice(index, 1);
    res.json({ success: true });
});

module.exports = router;
module.exports.adminCredentials = { username: ADMIN_USER, password: ADMIN_PASS };
