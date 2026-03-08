/**
 * routes/xss_basic.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [3a] – Basic Reflected XSS
 *
 *  Endpoint: GET /academy/search?q=<payload>
 *
 *  VULNERABILITY: The search query is reflected into the HTML response
 *  without any sanitisation (raw `q` value inserted via template literal).
 *
 *  The server sets a non-httpOnly cookie:
 *    xss_basic_flag=CBCTF{basic_xss_pwned}
 *
 *  Player solves it by executing: <script>alert(document.cookie)</script>
 *  or: <img src=x onerror="alert(document.cookie)">
 *
 *  Security Isolation:
 *  - Only this module sets the xss_basic_flag cookie.
 *  - The cookie is readable via JS (not httpOnly) to make it exploitable.
 *  - Path is scoped to /academy to avoid leaking outside challenge boundary.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router  = express.Router();

// ── Search handler ─────────────────────────────────────────────────────────────
router.get('/academy/search', (req, res) => {
    const q = req.query.q || '';

    // Set the challenge flag as a JS-readable cookie (non-httpOnly intentionally)
    res.cookie('xss_basic_flag', 'CBCTF{basic_xss_pwned}', {
        httpOnly: false,   // INTENTIONALLY insecure for CTF
        sameSite: 'Lax',
        path: '/academy'
    });

    // VULNERABILITY: `q` is embedded directly into HTML without escaping.
    // This is the reflected XSS sink.
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Search Results | Cyber Bangla Academy</title>
    <link rel="stylesheet" href="/css/style.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body>
<nav class="navbar">
    <div class="nav-container">
        <a href="/" class="nav-logo"><span>CYBER</span><span class="accent"> BANGLA</span> <span class="logo-tag">CTF</span></a>
        <ul class="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/services">Services</a></li>
            <li><a href="/academy" class="active">Academy</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/contact">Contact</a></li>
        </ul>
    </div>
</nav>

<main style="padding: 120px 40px 80px; max-width: 900px; margin: 0 auto;">
    <div class="section-badge">Academy Search</div>
    <h1 class="section-title">Search Results</h1>

    <form action="/academy/search" method="GET" class="search-form" style="margin-bottom:2rem;">
        <input type="text" name="q" value="${q}" placeholder="Search courses, topics…" class="search-input" autocomplete="off" />
        <button type="submit" class="btn btn-primary">Search</button>
    </form>

    <div class="result-box">
        <!-- VULNERABILITY: User input reflected without sanitisation -->
        <p class="result-text">You searched for: <strong>${q}</strong></p>
        ${q ? '<p class="result-sub">Showing results across all Academy modules…</p>' : '<p class="result-sub">Enter a keyword above to search our course catalogue.</p>'}
    </div>

    <div class="course-grid" style="margin-top:2rem;">
        <div class="course-card">
            <span class="course-tag">Beginner</span>
            <h3>Introduction to Ethical Hacking</h3>
            <p>Coverage: Recon, Enumeration, Exploitation basics.</p>
            <a href="/academy/content?page=intro" class="btn btn-outline btn-sm">View Course →</a>
        </div>
        <div class="course-card">
            <span class="course-tag">Intermediate</span>
            <h3>Web Application Penetration Testing</h3>
            <p>OWASP Top 10, BurpSuite, SQLi, XSS, SSRF.</p>
            <a href="/academy/content?page=webapp" class="btn btn-outline btn-sm">View Course →</a>
        </div>
        <div class="course-card">
            <span class="course-tag">Advanced</span>
            <h3>Red Team Operations</h3>
            <p>Advanced persistent threats, lateral movement, AD attacks.</p>
            <a href="/academy/content?page=advanced" class="btn btn-outline btn-sm">View Course →</a>
        </div>
    </div>
</main>

<footer class="footer">
    <div class="footer-inner">
        <p>© 2025 Cyber Bangla. All rights reserved.</p>
    </div>
</footer>
<script src="/js/main.js"></script>
</body>
</html>`);
});

module.exports = router;
