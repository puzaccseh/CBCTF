/**
 * routes/idor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CHALLENGE [8] – Insecure Direct Object Reference
 *
 *  Endpoint:
 *    GET /user/:id              Get user data by ID
 *
 *  VULNERABILITY:
 *    No access control - any user can access any other user's data
 *    by changing the ID parameter in the URL.
 *
 *  Flag: CBCTF{idor_vulnerability}
 *    Stored in user ID 1's secret field.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router  = express.Router();

// Sample users data (insecure - no access control)
const users = {
    1: { id: 1, name: 'Alice', email: 'alice@example.com', secret: 'CBCTF{idor_vulnerability}' },
    2: { id: 2, name: 'Bob', email: 'bob@example.com', secret: 'This is Bob\'s secret' },
    3: { id: 3, name: 'Charlie', email: 'charlie@example.com', secret: 'Charlie\'s private data' }
};

router.get('/user/:id', (req, res) => {
    const id = req.params.id;
    const user = users[id];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // VULNERABLE: No authentication or authorization check
    res.json(user);
});

module.exports = router;