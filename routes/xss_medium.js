'use strict';

const express = require('express');
const router  = express.Router();

// ─── In-memory stores ─────────────────────────────────────────────────────────
// blogComments is exported so routes/main.js can pass it to the /blog view.
const blogComments = [];
const hookLog      = [];

// Admin bot cookie – this is what players are trying to steal.
const ADMIN_COOKIE = 'adminSession=CBCTF{stored_xss_pwned}; role=admin';

// ─── Sequential ID helper (random start, re-seeded on clear) ─────────────────
let _seq = Math.floor(Math.random() * 8000) + 1000;
function nextId() { return ++_seq; }

// ─── Auto-clear every 5 minutes ──────────────────────────────────────────────
// Prevents one player's entries from being visible to others.
setInterval(function () {
    hookLog.splice(0);
    blogComments.splice(0);
    _seq = Math.floor(Math.random() * 8000) + 1000;
}, 3 * 60 * 1000);

// ─── POST /blog/comment ───────────────────────────────────────────────────────
// Stores comment with NO sanitisation – this is the stored XSS sink.
router.post('/blog/comment', function (req, res) {
    const author  = String(req.body.author  || 'Anonymous').slice(0, 80);
    const content = String(req.body.content || '').slice(0, 2000);

    if (content.trim().length > 0) {
        blogComments.push({
            id:        blogComments.length + 1,
            author:    author,
            content:   content,   // RAW – no escaping, no sanitisation
            timestamp: new Date().toLocaleString(),
            _ip:       req.ip,
            _ua:       req.headers['user-agent'] || 'unknown'
        });
    }

    res.redirect('/blog#comments');
});

// ─── GET /xss/trigger-bot ─────────────────────────────────────────────────────
// Simulates the admin bot visiting /blog and "executing" stored scripts.
// If a comment targets /xss/hook with document.cookie, the bot fires it.
router.get('/xss/trigger-bot', function (req, res) {
    let triggered = 0;
    var myIp = req.ip;
    var myUa = req.headers['user-agent'] || 'unknown';

    // Bot only processes comments posted by this player
    var myComments = blogComments.filter(function (cm) {
        return cm._ip === myIp && cm._ua === myUa;
    });

    for (var i = 0; i < myComments.length; i++) {
        var comment = myComments[i];
        var c = comment.content;

        // Check: does this comment try to send document.cookie to /xss/hook?
        var targetsHook   = c.indexOf('/xss/hook') !== -1;
        var usesCookie    = c.indexOf('document.cookie') !== -1;

        if (targetsHook && usesCookie) {
            hookLog.push({
                id:              nextId(),
                timestamp:       new Date().toISOString(),
                data:            Buffer.from(ADMIN_COOKIE).toString('base64'),
                source:          'admin-bot (script tag)',
                ip:              '127.0.0.1',
                ua:              'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/118.0.5993.70',
                comment_id:      comment.id,
                triggered_by:    req.ip,
                triggered_by_ua: req.headers['user-agent'] || 'unknown'
            });
            triggered++;
        }
    }

    res.json({
        status:           'Admin bot visit complete.',
        comments_scanned: myComments.length,
        payloads_hit:     triggered,
        bot_info: {
            agent:     'CB-InternalBot/1.4 (HeadlessChrome)',
            visited:   '/blog',
            collector: '/xss/hook',
            note:      'Scripts on the page that make outbound requests are captured at the collector. Append ?d=<base64> to send data.'
        },
        result: triggered === 0
            ? 'No suspicious payloads detected.'
            : 'Payload executed. Check the activity log.'
    });
});

// ─── GET /xss/hook ────────────────────────────────────────────────────────────
// Receives data sent by XSS payloads (via ?d= query param).
router.get('/xss/hook', function (req, res) {
    var data = String(req.query.d || req.query.data || '').slice(0, 4096);

    if (data.length > 0) {
        hookLog.push({
            id:        nextId(),
            timestamp: new Date().toISOString(),
            data:      data,
            source:    'browser-payload',
            ip:        req.ip || req.connection.remoteAddress,
            ua:        req.headers['user-agent'] || 'unknown'
        });
    }

    // Respond with a 1×1 transparent PNG (avoids CORS errors from <img> payloads)
    var pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
    );
    res.set('Content-Type', 'image/png');
    res.send(pixel);
});

// ─── GET /xss/hook/log ────────────────────────────────────────────────────────
// Shows all data captured by the hook endpoint.
router.get('/xss/hook/log', function (req, res) {

    // Static decoy entries – make the log look realistic
    var decoys = [
        {
            id:         1,
            timestamp:  '2025-10-11T09:17:44.381Z',
            source:     'browser-payload',
            ip:         '172.16.4.22',
            ua:         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Safari/537.36',
            data:       Buffer.from('_ga=GA1.2.1084732901.1696923411; _gid=GA1.2.394872011.1697018263').toString('base64'),
            comment_id: null
        },
        {
            id:         2,
            timestamp:  '2025-10-12T14:03:19.750Z',
            source:     'browser-payload',
            ip:         '10.10.2.88',
            ua:         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            data:       Buffer.from('PHPSESSID=r2t5uvjq435r4q7ib3vtdjq120; pref=dark').toString('base64'),
            comment_id: null
        },
        {
            id:         3,
            timestamp:  '2025-10-13T07:58:02.119Z',
            source:     'admin-bot (script tag)',
            ip:         '127.0.0.1',
            ua:         'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/118.0.5993.70',
            data:       Buffer.from('guestToken=eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiZ3Vlc3QifQ.fake; visited=1').toString('base64'),
            comment_id: 1
        }
    ];

    // Show only this requester's own entries.
    // Match on IP + UA together — prevents players sharing the same NAT IP
    // from seeing each other's entries if their browser/OS differs.
    var myIp = req.ip;
    var myUa = req.headers['user-agent'] || 'unknown';
    var myEntries = hookLog.filter(function (e) {
        // browser-payload: matched if both IP and UA match
        if (e.source === 'browser-payload') {
            return e.ip === myIp && e.ua === myUa;
        }
        // admin-bot: matched if the player who triggered it has same IP+UA
        return e.triggered_by === myIp && e.triggered_by_ua === myUa;
    });

    var allEntries = decoys.concat(myEntries);

    res.json({
        service:     'CB-XSS-Canary v1.2',
        description: 'Passive XSS data collection endpoint for red-team exercises.',
        total:       allEntries.length,
        entries:     allEntries
    });
});

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports        = router;
module.exports.blogComments = blogComments;
