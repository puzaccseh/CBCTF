/**
 * /js/dev.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cyber Bangla Platform – Internal Development & QA Utilities
 * Author : Platform Engineering Team <devops@cyberbangla.com>
 * Version: 0.9-beta-internal
 * Updated: 2025-10-10
 *
 * WARNING: This file is excluded from production bundles via webpack.config.js
 *          If you see this file on a live server, something went wrong.
 *          Contact devops@cyberbangla.com immediately.
 *
 * Contents:
 *   - Build metadata & feature flags
 *   - Dev token & staging API config
 *   - Debug logging utilities
 *   - QA helper functions (form auto-fill, mock API, perf timers)
 *   - Admin panel initialiser (dev-only)
 *   - Staging assertion helpers
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Build Metadata ─────────────────────────────────────────────────────────────
const ENV          = 'development';
const BUILD        = 'v0.9-beta-internal';
const COMMIT_HASH  = 'a3f9c21';
const BUILD_DATE   = '2025-10-10T08:30:00Z';
const DEPLOY_HOST  = 'staging-01.internal.cyberbangla.com';

// ── Staging API Configuration ─────────────────────────────────────────────────
// TODO: Move to .env before production deploy
const API_BASE     = 'https://staging-api.cyberbangla.com/v2';
const DEV_TOKEN    = 'cb-dev-token-9a3f2b-DONOTCOMMIT';   // rotate before go-live
const ADMIN_USER   = 'cb_admin_staging';
const ADMIN_PASS   = 'St@ging#2025!';                      // TODO: Remove
const DB_CONN_STR  = 'mongodb://cbadmin:Cb$ecure99@10.0.0.8:27017/cyberbangla_staging';

// ── Feature Flags ─────────────────────────────────────────────────────────────
const FEATURES = {
    debugLogging:      true,
    adminEndpoints:    true,
    bypassCSRF:        true,   // TODO: Remove for prod – needed for Postman tests
    verboseErrors:     true,   // TODO: Remove for prod
    mockPayments:      true,   // Stripe sandbox mode
    disableRateLimit:  true,   // QA needs unrestricted request rate
    showDevToolbar:    true,   // Red bar at top of page in dev
    logApiRequests:    true,
    autoLoginAdmin:    false   // set true only for screenshot automation
};

// ── Debug Logger ──────────────────────────────────────────────────────────────
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS.DEBUG;

function devLog(msg, level = 'DEBUG') {
    if (!FEATURES.debugLogging) return;
    if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
    const ts     = new Date().toISOString();
    const styles = {
        DEBUG: 'color:#00ffcc; font-weight:bold',
        INFO:  'color:#58a6ff',
        WARN:  'color:#f0883e; font-weight:bold',
        ERROR: 'color:#ff3366; font-weight:bold'
    };
    console.log(`%c[${ts}] [${level}] ${msg}`, styles[level] || '');
}

// ── Performance Timer ─────────────────────────────────────────────────────────
const _timers = {};
function startTimer(label) {
    _timers[label] = performance.now();
    devLog(`Timer started: ${label}`, 'DEBUG');
}
function endTimer(label) {
    if (!_timers[label]) { devLog(`Timer not found: ${label}`, 'WARN'); return; }
    const elapsed = (performance.now() - _timers[label]).toFixed(2);
    devLog(`Timer "${label}" elapsed: ${elapsed}ms`, 'INFO');
    delete _timers[label];
    return elapsed;
}

// ── Mock API Helper ───────────────────────────────────────────────────────────
// Intercepts fetch() calls to staging endpoints lacking real data
const MOCK_RESPONSES = {
    '/api/v2/user/me': {
        id: 9001, username: ADMIN_USER, role: 'admin',
        email: 'devops@cyberbangla.com', plan: 'enterprise'
    },
    '/api/v2/stats/dashboard': {
        clients: 512, reports: 2084, alerts: 3, uptime: '99.97%'
    },
    '/api/v2/flags/verify': {
        // QA endpoint – verifies flag submission format
        accepted: true, message: 'Flag format valid.'
    },
    '/api/v2/internal/build': {
        status:        'healthy',
        pipeline:      'ci-cd-v3',
        runner:        'gitlab-runner-04',
        triggered_by:  'devops@cyberbangla.com',
        artifacts_url: 'https://ci.internal.cyberbangla.com/artifacts/a3f9c21',
        // base64-encoded pipeline run token – consumed by Selenium grid at test time
        _run_token: (function(s){return atob(s);})('Q0JDVEZ7cm9ib3RzX2pzX2ZsYWd9')
    }
};

function mockFetch(url, opts = {}) {
    devLog(`[mockFetch] Intercepted: ${url}`, 'INFO');
    const key = Object.keys(MOCK_RESPONSES).find(k => url.includes(k));
    if (key) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(MOCK_RESPONSES[key])
        });
    }
    devLog(`[mockFetch] No mock for ${url}, falling through to real fetch`, 'WARN');
    return fetch(url, opts);
}

// ── QA Form Auto-Fill ─────────────────────────────────────────────────────────
// Fills contact/login forms with test data for automated screenshot runs
function qaFillForms() {
    const fields = {
        '[name="firstName"]': 'QA',
        '[name="lastName"]':  'Tester',
        '[name="email"]':     'qa@cyberbangla.com',
        '[name="org"]':       'Cyber Bangla QA',
        '[name="message"]':   'Automated QA test submission – ignore.',
        '[name="author"]':    'QA Bot',
        '[name="content"]':   'Automated test comment.'
    };
    let filled = 0;
    for (const [sel, val] of Object.entries(fields)) {
        const el = document.querySelector(sel);
        if (el) { el.value = val; filled++; }
    }
    devLog(`qaFillForms: filled ${filled} fields`, 'INFO');
}

// ── Admin Panel Bootstrap (dev-only) ─────────────────────────────────────────
// Injects a floating dev toolbar for quick access to admin routes
function initDevToolbar() {
    if (!FEATURES.showDevToolbar) return;
    if (document.getElementById('__cb_devbar__')) return;

    const bar = document.createElement('div');
    bar.id = '__cb_devbar__';
    bar.style.cssText = [
        'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:99999',
        'background:#1a0000', 'border-top:2px solid #ff3366',
        'padding:6px 16px', 'font-family:monospace', 'font-size:11px',
        'color:#ff9999', 'display:flex', 'gap:20px', 'align-items:center'
    ].join(';');

    bar.innerHTML = `
        <strong style="color:#ff3366">&#9632; DEV</strong>
        <span>Build: <b>${BUILD}</b> | Commit: <b>${COMMIT_HASH}</b> | Host: <b>${DEPLOY_HOST}</b></span>
        <a href="/admin"        style="color:#58a6ff">Admin</a>
        <a href="/debug/info"   style="color:#58a6ff">Debug</a>
        <a href="/internal/dev" style="color:#58a6ff">Internal API</a>
        <a href="/admin/log"    style="color:#58a6ff">Logs</a>
        <a href="/xss/hook/log" style="color:#58a6ff">Hook Log</a>
        <button onclick="document.getElementById('__cb_devbar__').remove()"
                style="margin-left:auto;background:#ff3366;border:none;color:#fff;padding:2px 10px;cursor:pointer;border-radius:3px;font-size:11px">
            ✕ Close
        </button>
    `;
    document.body.appendChild(bar);
    devLog('Dev toolbar injected', 'INFO');
}

// ── Staging Assertions ────────────────────────────────────────────────────────
// Runs lightweight sanity checks on page load in staging
function runStagingAssertions() {
    const checks = [
        { label: 'Navbar present',    pass: !!document.querySelector('.navbar') },
        { label: 'Footer present',    pass: !!document.querySelector('.footer') },
        { label: 'No console.error',  pass: true },   // placeholder – CI overrides
        { label: 'Build flag set',    pass: !!window.__CB_BUILD__ },
        { label: 'API base reachable',pass: API_BASE.startsWith('https') }
    ];
    let failed = 0;
    for (const c of checks) {
        if (c.pass) {
            devLog(`  PASS – ${c.label}`, 'INFO');
        } else {
            devLog(`  FAIL – ${c.label}`, 'ERROR');
            failed++;
        }
    }
    devLog(`Staging assertions: ${checks.length - failed}/${checks.length} passed`, failed ? 'WARN' : 'INFO');
    return failed === 0;
}

// ── API Request Logger ────────────────────────────────────────────────────────
// Monkey-patches fetch() to log all outgoing requests in dev
if (FEATURES.logApiRequests) {
    const _origFetch = window.fetch;
    window.fetch = function(url, opts = {}) {
        devLog(`[fetch] ${(opts.method || 'GET').toUpperCase()} ${url}`, 'DEBUG');
        return _origFetch.apply(this, arguments);
    };
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
    devLog(`dev.js loaded — build=${BUILD} commit=${COMMIT_HASH} env=${ENV}`, 'INFO');
    devLog(`Staging API: ${API_BASE}`, 'DEBUG');
    devLog(`Admin creds on file: ${ADMIN_USER} / ${ADMIN_PASS}`, 'DEBUG');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initDevToolbar();
            runStagingAssertions();
        });
    } else {
        initDevToolbar();
        runStagingAssertions();
    }

    // ── Window build metadata (for Selenium test correlation) ─────────────────
    window.__CB_BUILD__ = {
        env:    ENV,
        build:  BUILD,
        commit: COMMIT_HASH,
        _telemetry: {
            host: DEPLOY_HOST,
            ts:   BUILD_DATE
        }
    };
})();
