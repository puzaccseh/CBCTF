/**
 * routes/upload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [4] – File Upload with MIME Type Bypass
 *
 *  Endpoints:
 *    GET  /profile              Profile page with upload form
 *    POST /profile/upload       Handle file upload
 *    GET  /uploads/:filename    Serve uploaded files (static via express.static)
 *
 *  VULNERABILITY:
 *    The server validates the file type using ONLY the Content-Type header
 *    supplied by the client (e.g. multer's `file.mimetype`).
 *    It does NOT inspect the actual file magic bytes.
 *
 *    A player can upload a non-image file (e.g. an HTML file) by setting
 *    the request's Content-Type for that part to "image/jpeg".
 *    The file is stored under its original filename extension.
 *    When accessed via /uploads/{filename}, the browser renders it as HTML.
 *
 *  Flag: CBCTF{upload_bypass_success}
 *    Revealed in the JSON response when a non-image extension is uploaded.
 *
 *  Security Isolation:
 *    - Uploads land in /public/uploads/ only.
 *    - multer's storage is restricted to that directory.
 *    - All challenge flag files live in /flags/ which is NOT served statically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();

// Allowed image extensions (used for post-upload check, not pre-upload)
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

// ── Multer configuration ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: (_req, file, cb) => {
        // VULNERABILITY: Uses original filename – retains non-image extension
        const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '_' + safe);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
    fileFilter: (_req, file, cb) => {
        // VULNERABILITY: Trusts the client-supplied Content-Type header.
        // A player can set Content-Type: image/jpeg for any file type.
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed.'));
        }
    }
});

// ── GET /profile ──────────────────────────────────────────────────────────────
router.get('/profile', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>User Profile | Cyber Bangla</title>
    <link rel="stylesheet" href="/css/style.css" />
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
            <li><a href="/academy">Academy</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/contact">Contact</a></li>
        </ul>
    </div>
</nav>

<main style="padding:120px 40px 80px; max-width:700px; margin:0 auto;">
    <div class="section-badge">Member Area</div>
    <h1 class="section-title">Your Profile</h1>

    <div class="card" style="padding:2rem;">
        <div style="display:flex; align-items:center; gap:1.5rem; margin-bottom:2rem;">
            <div class="avatar-placeholder" id="avatarPreview">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="32" fill="#0d1a2e"/>
                    <circle cx="32" cy="24" r="12" fill="#1a2e4a"/>
                    <ellipse cx="32" cy="52" rx="20" ry="14" fill="#1a2e4a"/>
                </svg>
            </div>
            <div>
                <h3 style="margin:0; color:#e2e8f0;">Security Researcher</h3>
                <p style="margin:0; color:#8ba3c7; font-size:0.9em;">Member since 2024 &nbsp;|&nbsp; Level: CTF Player</p>
            </div>
        </div>

        <h3 class="form-section-title">Update Profile Picture</h3>
        <p style="color:#8ba3c7; font-size:0.9em; margin-bottom:1rem;">
            Accepted formats: JPG, PNG, GIF &nbsp;·&nbsp; Maximum size: 2 MB
        </p>

        <form action="/profile/upload" method="POST" enctype="multipart/form-data" class="upload-form">
            <div class="file-drop-zone" id="dropZone">
                <input type="file" name="avatar" id="avatarInput" accept="image/*" style="display:none;" />
                <label for="avatarInput" style="cursor:pointer;">
                    <div class="drop-icon">&#128444;</div>
                    <p>Click to select or drag &amp; drop your image</p>
                    <span id="fileName" style="color:#00ffcc; font-size:0.85em;"></span>
                </label>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:1rem;">Upload Profile Picture</button>
        </form>
    </div>
</main>

<footer class="footer"><div class="footer-inner"><p>© 2025 Cyber Bangla. All rights reserved.</p></div></footer>
<script src="/js/main.js"></script>
<script>
    document.getElementById('avatarInput').addEventListener('change', function() {
        const name = this.files[0] ? this.files[0].name : '';
        document.getElementById('fileName').textContent = name;
    });
</script>
</body>
</html>`);
});

// ── POST /profile/upload ──────────────────────────────────────────────────────
router.post('/profile/upload', (req, res) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        const filename  = req.file.filename;
        const origExt   = path.extname(req.file.originalname).toLowerCase();
        const isRealImg = IMAGE_EXTS.has(origExt);

        if (!isRealImg) {
            // Player successfully bypassed the MIME type check!
            // CHALLENGE FLAG revealed here.
            res.json({
                success:  true,
                bypassed: true,
                message:  'Profile picture updated.',
                filename,
                url:      `/uploads/${filename}`,
                flag:     'CBCTF{upload_bypass_success}',
                note:     'Interesting… that was not really an image file. Well done.'
            });

            // Auto-delete file after 3 minutes
            setTimeout(() => {
                fs.unlink(path.join(__dirname, '..', 'public', 'uploads', filename), (err) => {
                    if (err) console.error('Error deleting uploaded file:', err);
                });
            }, 3 * 60 * 1000); // 3 minutes
            return;
        }

        // Normal image upload
        res.json({
            success:  true,
            message:  'Profile picture updated!',
            filename,
            url:      `/uploads/${filename}`
        });

        // Auto-delete file after 3 minutes
        setTimeout(() => {
            fs.unlink(path.join(__dirname, '..', 'public', 'uploads', filename), (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        }, 3 * 60 * 1000); // 3 minutes
    });
});

module.exports = router;
