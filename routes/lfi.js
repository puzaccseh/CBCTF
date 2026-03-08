/**
 * routes/lfi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [6] – Local File Inclusion (LFI)
 *
 *  Endpoint: GET /academy/content?page=<filename>
 *
 *  VULNERABILITY:
 *    The page loader concatenates the user-supplied `page` parameter directly
 *    onto a base path using path.join(), with only a weak allowlist check
 *    that can be bypassed with path-traversal sequences (../).
 *
 *    Intended use:
 *      /academy/content?page=intro     → loads views/pages/intro.html
 *      /academy/content?page=advanced  → loads views/pages/advanced.html
 *
 *    Exploit:
 *      /academy/content?page=../../flag.txt
 *      Resolves to: [root]/views/pages/../../flag.txt → [root]/views/flag.txt
 *
 *  Flag: CBCTF{lfi_file_read}  (stored in views/flag.txt)
 *
 *  Security Isolation:
 *    - Base path is restricted to views/pages/
 *    - The "security check" verifies the resolved path still CONTAINS "pages"
 *      – but the check is flawed: a traversal that re-enters /pages/ in the
 *      filename string would also pass. A robust fix would use path.resolve()
 *      and prefix-check the result.
 *    - Only flags/lfi.txt is placed where traversal can reach it.
 *    - Other flag files live in routes/ (Node modules), not files/ dirs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

// Base directory for "safe" page files
const PAGES_DIR = path.join(__dirname, '..', 'views', 'pages');

router.get('/academy/content', (req, res) => {
    const page = req.query.page || 'intro';

    // Weak sanitisation: block null bytes and obvious absolute paths
    if (page.includes('\0') || path.isAbsolute(page)) {
        return res.status(400).send('<p>Invalid page parameter.</p>');
    }

    // VULNERABILITY: path.join does not prevent upward traversal.
    // Developer believed joining with PAGES_DIR was safe, but
    // path.join('views/pages', '../../flags/lfi.txt') resolves to 'flags/lfi.txt'.
    const filePath = path.join(PAGES_DIR, page);

    // Flawed security check: only verifies the string contains "pages"
    // Bypass: any path that still has "pages" somewhere in it would pass,
    // or just use ../../flags/lfi.txt which doesn't contain "pages" but
    // the check below is on the ORIGINAL `page` variable, not resolved path.
    // This is intentionally broken for CTF purposes.
    if (page.includes('..') ) {
        // Log the attempt but still process (developer oversight)
        console.log('[LFI-ATTEMPT] Path traversal detected in /academy/content:', page);
        // Developer thought logging was enough – no actual block!
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Course Content | Cyber Bangla Academy</title>
    <link rel="stylesheet" href="/css/style.css" />
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;500;600&family=Fira+Code:wght@400&display=swap" rel="stylesheet" />
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

<main style="padding:120px 40px 80px; max-width:900px; margin:0 auto;">
    <div class="section-badge">Academy – Course Content</div>
    <nav class="breadcrumb" style="margin-bottom:1rem; font-size:0.85em; color:#8ba3c7;">
        <a href="/academy" style="color:#00ffcc;">Academy</a> › Content Viewer
    </nav>

    <div class="card content-viewer" style="padding:2rem;">
        <pre style="white-space:pre-wrap; word-break:break-all; font-family:'Fira Code',monospace; font-size:0.9em; color:#e2e8f0; line-height:1.7;">${escapeHtml(content)}</pre>
    </div>

    <div style="margin-top:1rem; display:flex; gap:0.75rem;">
        <a href="/academy/content?page=intro"    class="btn btn-outline btn-sm">Introduction</a>
        <a href="/academy/content?page=advanced" class="btn btn-outline btn-sm">Advanced</a>
        <a href="/academy"                        class="btn btn-outline btn-sm">← Back to Academy</a>
    </div>
</main>

<footer class="footer"><div class="footer-inner"><p>© 2025 Cyber Bangla. All rights reserved.</p></div></footer>
<script src="/js/main.js"></script>
</body>
</html>`);
    } catch(err) {
        return res.status(404).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Not Found | Cyber Bangla</title>
<link rel="stylesheet" href="/css/style.css" />
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet" /></head>
<body><nav class="navbar"><div class="nav-container">
<a href="/" class="nav-logo"><span>CYBER</span><span class="accent"> BANGLA</span> <span class="logo-tag">CTF</span></a></div></nav>
<main style="padding:140px 40px; text-align:center;">
    <h1 style="font-family:'Orbitron',sans-serif; color:#ff3366;">404</h1>
    <p style="color:#8ba3c7;">Page "<code>${escapeHtml(page)}</code>" not found.</p>
    <a href="/academy" class="btn btn-primary" style="margin-top:1rem;">Back to Academy</a>
</main></body></html>`);
    }
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = router;
