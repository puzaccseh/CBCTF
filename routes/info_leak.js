/**
 * routes/info_leak.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [5] – Information Disclosure (3 sub-challenges)
 *
 *  [5a] GET /admin/log
 *       A server log file accidentally exposed.
 *       Contains credentials and the flag CBCTF{log_file_leak}.
 *
 *  [5b] GET /internal/dev
 *       An internal developer API that returns a Base64-encoded blob.
 *       Decoding reveals: CBCTF{internal_dev_flag}
 *       Encoded value: Q0JDVEZ7aW50ZXJuYWxfZGV2X2ZsYWd9
 *
 *  [5c] GET /debug/info
 *       A debug/diagnostic endpoint left enabled.
 *       Exposes server environment details and the flag CBCTF{debug_info_exposed}.
 *
 *  Security Isolation:
 *    - None of these routes access /flags/ or other challenge data.
 *    - Each flag is hard-coded or inline; they cannot be traversed from LFI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router  = express.Router();
const xssHighModule = require('./xss_high');

// ─────────────────────────────────────────────────────────────────────────────
// [5a] /admin/log – Exposed log file
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/log', (req, res) => {
    res.type('text/plain');
    res.send(`=== Cyber Bangla – Application Log (server.log) ===
Generated: 2025-10-14 07:58:44 UTC+6

[INFO]  2025-10-13 22:00:00 – Scheduled task: nightly-audit started
[INFO]  2025-10-13 22:00:03 – DB vacuum completed successfully (87ms)
[INFO]  2025-10-13 22:00:05 – Redis BGSAVE triggered
[INFO]  2025-10-13 22:01:12 – TLS certificate expiry check: 43 days remaining
[INFO]  2025-10-13 22:03:44 – Elasticsearch index refresh: 12,304 docs indexed
[INFO]  2025-10-13 22:05:00 – Cron: session_cleanup — removed 142 expired sessions
[WARN]  2025-10-13 22:07:19 – Rate limit hit: 85.208.96.14 (POST /contact, 32 req/min)
[INFO]  2025-10-13 22:08:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-13 22:09:33 – Backup agent: incremental snapshot pushed to S3
[INFO]  2025-10-13 22:12:01 – User registration: id=1042 email=user1042@gmail.com
[INFO]  2025-10-13 22:14:17 – User registration: id=1043 email=rafi.bd@protonmail.com
[INFO]  2025-10-13 22:16:50 – Academy enrolment: user_id=1041 course=webapp_pentest
[INFO]  2025-10-13 22:20:00 – Cron: metrics_flush — pushed 318 counters to Prometheus
[WARN]  2025-10-13 22:21:08 – Slow query (1243ms): SELECT * FROM audit_logs ORDER BY ts DESC LIMIT 500
[INFO]  2025-10-13 22:25:33 – Report download: report_id=2081 user_id=101
[INFO]  2025-10-13 22:30:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-13 22:31:14 – New contact form submission: org=Dutch-Bangla Bank
[INFO]  2025-10-13 22:35:09 – Password reset issued: user_id=998
[INFO]  2025-10-13 22:39:22 – File upload: user_id=1043 file=profile_1043.jpg size=84KB
[INFO]  2025-10-13 22:42:00 – Blog comment approved: comment_id=304 author=Tanvir
[INFO]  2025-10-13 22:45:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-13 22:47:18 – Academy quiz submitted: user_id=1038 score=87/100
[INFO]  2025-10-13 22:52:05 – Search query indexed: q="red team operations"
[INFO]  2025-10-13 22:55:39 – Nightly report email dispatched to 14 subscribers
[INFO]  2025-10-13 23:00:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-13 23:00:01 – Cron: nightly-audit completed (3 warnings, 0 errors)
[INFO]  2025-10-13 23:03:17 – User login: user_id=88 ip=103.68.114.9
[INFO]  2025-10-13 23:07:44 – Blog post viewed: slug=dom-xss-spas views=2,841
[INFO]  2025-10-13 23:11:00 – File download: resource=intro_slides.pdf user_id=1040
[WARN]  2025-10-13 23:14:09 – Failed login attempt: user=support ip=185.220.101.47
[WARN]  2025-10-13 23:14:11 – Failed login attempt: user=support ip=185.220.101.47
[WARN]  2025-10-13 23:14:13 – Failed login attempt: user=support ip=185.220.101.47
[INFO]  2025-10-13 23:14:14 – Account locked (too many failures): user=support
[INFO]  2025-10-13 23:18:22 – Admin login: user=admin ip=10.0.0.5
[INFO]  2025-10-13 23:20:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-13 23:22:55 – New pentest scope submitted: client=Islami Bank BD
[INFO]  2025-10-13 23:28:03 – Report generated: report_id=2082 pages=34
[INFO]  2025-10-13 23:33:47 – Academy lesson completed: user_id=1039 lesson=sqli-basics
[INFO]  2025-10-13 23:40:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-13 23:41:29 – Contact form: email=cto@bracbank.com service=VAPT
[INFO]  2025-10-13 23:45:00 – Cron: cache_warm — pre-loaded 22 blog pages
[INFO]  2025-10-13 23:48:11 – User logout: user_id=88
[INFO]  2025-10-13 23:52:34 – Blog comment submitted: comment_id=305 (pending review)
[INFO]  2025-10-13 23:58:00 – Redis keyspace: 4,102 active keys, 288MB used
[INFO]  2025-10-14 00:00:00 – Midnight integrity check started
[INFO]  2025-10-14 00:00:04 – File hash check: 1,204 files verified, 0 mismatches
[INFO]  2025-10-14 00:00:09 – Midnight integrity check completed OK
[INFO]  2025-10-14 00:05:14 – User registration: id=1044 email=s.hossain@yahoo.com
[INFO]  2025-10-14 00:10:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 00:14:38 – Academy enrolment: user_id=1044 course=ethical-hacking-intro
[INFO]  2025-10-14 00:18:05 – Elasticsearch: shard rebalance complete (4 shards)
[INFO]  2025-10-14 00:22:50 – Report download: report_id=2080 user_id=55
[INFO]  2025-10-14 00:30:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 00:35:19 – New blog post draft saved: slug=s3-misconfig-field-guide author=tanvir
[INFO]  2025-10-14 00:40:44 – Password change: user_id=1042
[INFO]  2025-10-14 00:45:00 – Cron: session_cleanup — removed 58 expired sessions
[WARN]  2025-10-14 00:48:27 – Disk usage at 74% on /dev/sda1 (warn threshold: 70%)
[INFO]  2025-10-14 00:50:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 00:55:03 – SMTP relay test: delivered to postmaster@cyberbangla.com (220ms)
[INFO]  2025-10-14 01:00:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 01:04:18 – User login: user_id=201 ip=202.4.96.33
[INFO]  2025-10-14 01:09:44 – Academy quiz submitted: user_id=201 score=91/100
[INFO]  2025-10-14 01:15:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 01:18:29 – Blog post viewed: slug=file-upload-2025 views=1,109
[INFO]  2025-10-14 01:23:55 – Report generated: report_id=2083 pages=18
[WARN]  2025-10-14 01:27:04 – Slow query (988ms): SELECT * FROM blog_comments WHERE approved=0
[INFO]  2025-10-14 01:30:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 01:34:22 – User logout: user_id=201
[INFO]  2025-10-14 01:40:09 – Cron: metrics_flush — pushed 201 counters to Prometheus
[INFO]  2025-10-14 01:45:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 01:49:33 – File upload: user_id=88 file=profile_88.png size=112KB
[INFO]  2025-10-14 01:55:47 – New contact form submission: org=GP Telecom
[INFO]  2025-10-14 02:00:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 02:04:11 – Academy enrolment: user_id=1043 course=red-team-ops
[INFO]  2025-10-14 02:09:38 – Search query indexed: q="VAPT for banks"
[INFO]  2025-10-14 02:15:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 02:20:02 – DB vacuum completed successfully (91ms)
[INFO]  2025-10-14 02:25:19 – TLS handshake stats: 4,821 OK, 3 failed, 1 timeout
[INFO]  2025-10-14 02:30:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 02:34:50 – Blog comment approved: comment_id=305 author=s.hossain
[INFO]  2025-10-14 02:38:44 – User login: user_id=101 ip=10.0.0.12
[INFO]  2025-10-14 02:45:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 02:48:09 – Report download: report_id=2083 user_id=101
[INFO]  2025-10-14 02:52:33 – Elasticsearch: document count=56,771
[INFO]  2025-10-14 03:00:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 03:00:01 – System boot completed. Node v20.9.0
[INFO]  2025-10-14 03:00:02 – Listening on port 3000
[INFO]  2025-10-14 03:04:17 – User login: user_id=55 ip=192.168.1.10
[INFO]  2025-10-14 03:07:29 – Academy lesson completed: user_id=55 lesson=red-team-intro
[INFO]  2025-10-14 03:09:58 – Blog post viewed: slug=s3-misconfig-field-guide views=412
[INFO]  2025-10-14 03:12:44 – Admin login: user=admin  passwd=Adm!nP@ss2025
[WARN]  2025-10-14 03:12:44 – Failed login attempt from 103.98.216.11
[INFO]  2025-10-14 03:14:05 – DB backup completed → /var/backups/cb_db_20251014.sql.gz
[INFO]  2025-10-14 03:15:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 03:16:33 – New pentest scope submitted: client=bKash Ltd
[WARN]  2025-10-14 03:18:30 – Debug endpoint /debug/info accessed externally
[INFO]  2025-10-14 03:19:44 – Cron: cache_warm — pre-loaded 18 blog pages
[INFO]  2025-10-14 03:22:11 – New report submitted by researcher@cyberbangla.com
[INFO]  2025-10-14 03:25:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 03:27:38 – Academy quiz submitted: user_id=55 score=76/100
[ERROR] 2025-10-14 03:30:07 – File upload error: Invalid MIME type from 192.168.1.42
[INFO]  2025-10-14 03:31:55 – User logout: user_id=55
[INFO]  2025-10-14 03:34:22 – Blog comment submitted: comment_id=306 (pending review)
[INFO]  2025-10-14 03:36:11 – Report generated: report_id=2084 pages=27
[INFO]  2025-10-14 03:38:04 – Elasticsearch: reindex triggered by schema migration
[INFO]  2025-10-14 03:39:48 – User login: user_id=201 ip=103.68.114.9
[INFO]  2025-10-14 03:41:09 – Internal dev API polled: /internal/dev
[DEBUG] 2025-10-14 03:42:00 – flag_debug=CBCTF{log_file_leak}
[INFO]  2025-10-14 03:42:18 – Log rotation complete
[INFO]  2025-10-14 03:43:05 – Redis BGSAVE triggered
[INFO]  2025-10-14 03:44:50 – Elasticsearch index refresh: 56,804 docs indexed
[INFO]  2025-10-14 03:46:12 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 03:48:33 – File upload: user_id=201 file=profile_201_new.jpg size=96KB
[INFO]  2025-10-14 03:50:00 – Cron: session_cleanup — removed 31 expired sessions
[WARN]  2025-10-14 03:52:17 – Slow query (1102ms): UPDATE sessions SET last_seen=NOW() WHERE active=1
[INFO]  2025-10-14 03:55:00 – Health check OK: db=UP cache=UP smtp=UP
[INFO]  2025-10-14 03:57:29 – Blog comment approved: comment_id=306 author=Anonymous
[INFO]  2025-10-14 03:58:44 – Academy enrolment: user_id=1045 course=webapp_pentest
[INFO]  2025-10-14 03:58:44 – Log snapshot saved to /var/log/archive/cb_20251014_0358.log.gz

===  END OF LOG  ===
`);
});

// ─────────────────────────────────────────────────────────────────────────────
// [5b] /internal/dev – Developer API with Base64-encoded response
// ─────────────────────────────────────────────────────────────────────────────
// Raw flag: CBCTF{internal_dev_flag}
// Base64:   Q0JDVEZ7aW50ZXJuYWxfZGV2X2ZsYWd9
router.get('/internal/dev', (req, res) => {
    res.json({
        status:   'ok',
        version:  'dev-1.4.2',
        env:      'staging',
        token:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dev',
        data:     'Q0JDVEZ7aW50ZXJuYWxfZGV2X2ZsYWd9',   // ← decode me
        hint:     'Response payload is Base64 encoded.',
        note:     'This endpoint is for internal dev use only. Do not expose.'
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// [5c] /debug/info – Debug endpoint leaking server internals
// ─────────────────────────────────────────────────────────────────────────────
router.get('/debug/info', (req, res) => {
    res.json({
        app:                  'Cyber Bangla Platform',
        version:              '2.3.1-beta',
        node_version:         'v20.11.0',
        platform:             'linux',
        arch:                 'x64',
        pid:                  18423,
        uptime_seconds:       74831,
        memory: {
            heap_used_mb:     '38.47',
            heap_total_mb:    '64.00',
            rss_mb:           '91.22',
            external_mb:      '2.14'
        },
        cpu_model:            'Intel(R) Core(TM) i7-1165G7 @ 2.80GHz',
        cpu_cores:            4,
        load_avg_1m:          0.12,
        env:                  'development',
        debug_mode:           true,
        verbose_errors:       true,
        log_level:            'DEBUG',
        db: {
            host:             'mongodb://localhost:27017/cyberbangla_dev',
            pool_size:        5,
            connected:        true,
            collections:      ['users', 'reports', 'blog_comments', 'sessions', 'audit_logs'],
            slow_query_ms:    42
        },
        cache: {
            driver:           'redis',
            host:             '127.0.0.1:6379',
            hit_rate:         '87.4%',
            keys_stored:      1284
        },
        mailer: {
            smtp_host:        'smtp.internal.cyberbangla.com',
            smtp_port:        587,
            smtp_user:        'noreply@cyberbangla.com',
            smtp_pass:        'Sm7p#M@il2025!'     // TODO: move to env
        },
        auth: {
            jwt_algorithm:    'HS256',
            jwt_secret:       '7f$Kx2!mQpL9vRn#wZoA4dYe8sUcBjTh',   // TODO: rotate
            jwt_expiry:       '7d',
            session_driver:   'redis',
            session_secret:   'HG7tz!9sXkQ2#mLpRv$4nWoD',
            session_ttl_sec:  86400,
            csrf_token:       'disabled_for_staging',               // TODO: re-enable
            oauth_client_id:  'cb-oauth-client-0x3fa9',
            oauth_secret:     'OAu7h$ecr3t-cb2025',
            admin_token:      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiY2JfYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.STAGING_DO_NOT_USE',
            password_hash:    'bcrypt',
            bcrypt_rounds:    10,
            issue_tracker_admin: {
                username:     xssHighModule.adminCredentials?.username || 'admin',
                password:     xssHighModule.adminCredentials?.password || 'Cyber@2024'
            }
        },
        storage: {
            driver:           'local',
            base_dir:         '/var/www/cyberbangla',
            upload_dir:       '/var/www/cyberbangla/public/uploads',
            temp_dir:         '/tmp/cb_uploads',
            max_file_mb:      10,
            allowed_types:    ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
            blocked_types:    ['application/x-php', 'text/html', 'application/javascript'],
            cdn_enabled:      false,
            cdn_base_url:     null,
            cleanup_cron:     '0 3 * * *'
        },
        flags_config: {
            // debug identifier injected by pipeline – used by /health checks
            debug_token:      'CBCTF{debug_info_exposed}'
        },
        routes_registered:    [
            'GET  /', 'GET  /about', 'GET  /services',
            'GET  /academy', 'GET  /academy/search', 'GET  /academy/demo', 'GET  /academy/content',
            'GET  /blog', 'POST /blog/comment',
            'GET  /contact', 'POST /contact',
            'GET  /profile', 'POST /profile',
            'GET  /dashboard', 'GET  /dashboard/reports',
            'GET  /api/v2/user/me', 'GET  /api/v2/stats/dashboard',
            'POST /api/v2/flags/verify', 'POST /api/v2/auth/login',
            'GET  /admin', 'GET  /admin/log', 'GET  /admin/users', 'GET  /admin/settings',
            'GET  /internal/dev', 'GET  /internal/health', 'GET  /internal/metrics',
            'GET  /debug/info', 'GET  /debug/routes',
            'GET  /robots.txt', 'GET  /sitemap.xml'
        ],
        request: {
            ip:               '::ffff:127.0.0.1',
            method:           'GET',
            path:             '/debug/info',
            user_agent:       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            forwarded_for:    null,
            referer:          'http://localhost:3000/admin'
        },
        timestamp:            '2025-10-14T04:07:22.000Z'
    });
});

module.exports = router;
