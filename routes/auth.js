/**
 * routes/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTICATION SYSTEM – Signup/Login/Logout
 *
 *  In-memory user storage (resets on server restart)
 *  No password hashing (CTF environment)
 *
 *  Endpoints:
 *    GET  /signup              Signup page
 *    POST /signup              Create account
 *    GET  /login               Login page
 *    POST /login               Authenticate
 *    GET  /logout              Logout
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');
const router  = express.Router();

// SQLite database for users (vulnerable to SQLi)

// ── GET /signup ──────────────────────────────────────────────────────────────
router.get('/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('signup', { active: 'signup' });
});

// ── POST /signup ─────────────────────────────────────────────────────────────
router.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('signup', { active: 'signup', error: 'Username and password required' });
    }

    // VULNERABLE: SQL Injection possible
    db.get(`SELECT username FROM users WHERE username = '${username}'`, (err, row) => {
        if (err) {
            return res.render('signup', { active: 'signup', error: 'Database error' });
        }
        if (row) {
            return res.render('signup', { active: 'signup', error: 'Username already exists' });
        }
        // VULNERABLE: SQL Injection possible
        db.run(`INSERT INTO users (username, password) VALUES ('${username}', '${password}')`, (err) => {
            if (err) {
                return res.render('signup', { active: 'signup', error: 'Database error' });
            }
            req.session.user = username;
            res.redirect('/');
        });
    });
});

// ── GET /login ───────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { active: 'login' });
});

// ── POST /login ──────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { active: 'login', error: 'Username and password required' });
    }

    // VULNERABLE: SQL Injection possible
    db.get(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`, (err, row) => {
        if (err) {
            return res.render('login', { active: 'login', error: 'Database error' });
        }
        if (!row) {
            return res.render('login', { active: 'login', error: 'Invalid credentials' });
        }
        req.session.user = row.username; // Use actual username from DB
        // Check if SQLi was used (simple detection)
        if (username.includes("OR") && username.includes("'1'='1")) {
            return res.render('login', { active: 'login', success: 'Login successful! Flag: CBCTF{sql_injection_success}' });
        }
        res.redirect('/');
    });
});

// ── GET /logout ──────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.redirect('/login');
    });
});

module.exports = router;