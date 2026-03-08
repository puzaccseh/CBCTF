/**
 * routes/main.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Main website routes: Home, About, Services, Academy, Blog, Contact.
 *
 * CHALLENGE [1] – Recon / View Source
 *   The home page HTML source contains a hidden developer comment at line ~220.
 *   Flag: CBCTF{view_source_flag}
 *   How players find it: Ctrl+U / View Page Source
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router  = express.Router();

// ── Home ──────────────────────────────────────────────────────────────────────
// VULNERABILITY [1]: Flag is embedded as an HTML comment in the rendered view.
// See: views/index.ejs  →  search for "CBCTF" in page source.
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Cyber Bangla – Bangladesh\'s Premier Cybersecurity Firm',
        active: 'home'
    });
});

// ── About ─────────────────────────────────────────────────────────────────────
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Us | Cyber Bangla',
        active: 'about'
    });
});

// ── Services ──────────────────────────────────────────────────────────────────
router.get('/services', (req, res) => {
    res.render('services', {
        title: 'Our Services | Cyber Bangla',
        active: 'services'
    });
});

// ── Academy ───────────────────────────────────────────────────────────────────
router.get('/academy', (req, res) => {
    res.render('academy', {
        title: 'Academy | Cyber Bangla',
        active: 'academy',
        searchQuery: null,
        searchResults: null
    });
});

// ── Blog ──────────────────────────────────────────────────────────────────────
// NOTE: Blog comment data is managed by routes/xss_medium.js
// which uses the shared `blogComments` store imported below.
router.get('/blog', (req, res) => {
    // Import shared comment store from xss_medium module
    const { blogComments } = require('./xss_medium');
    // Each player only sees their own comments (matched by IP + UA)
    const myIp = req.ip;
    const myUa = req.headers['user-agent'] || 'unknown';
    const myComments = blogComments.filter(c => c._ip === myIp && c._ua === myUa);
    res.render('blog', {
        title: 'Blog | Cyber Bangla',
        active: 'blog',
        comments: myComments
    });
});

// ── Contact ───────────────────────────────────────────────────────────────────
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us | Cyber Bangla',
        active: 'contact'
    });
});

router.post('/contact', (req, res) => {
    // Contact form – not a challenge, just visual polish
    res.render('contact', {
        title: 'Contact Us | Cyber Bangla',
        active: 'contact',
        success: 'Thank you! We will be in touch within 24 hours.'
    });
});

module.exports = router;
