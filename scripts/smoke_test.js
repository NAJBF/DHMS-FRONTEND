// Simple smoke-test script for AAU DHMS API
// Usage (Unix): API_BASE=http://localhost:8000/aau-dhms-api DEMO_USER=demo@aau DEMO_PASS=password node scripts/smoke_test.js
// Usage (Windows PowerShell): $env:API_BASE='http://localhost:8000/aau-dhms-api'; $env:DEMO_USER='demo@aau'; $env:DEMO_PASS='password'; node scripts/smoke_test.js

(async () => {
    const API_BASE = process.env.API_BASE || 'http://localhost:8000/aau-dhms-api';
    const DEMO_USER = process.env.DEMO_USER || '';
    const DEMO_PASS = process.env.DEMO_PASS || '';

    let fetchFn = global.fetch;
    if (!fetchFn) {
        try {
            fetchFn = require('node-fetch');
        } catch (e) {
            console.error('No global fetch and node-fetch not installed. Use Node 18+ or install node-fetch.');
            process.exit(1);
        }
    }

    async function postJson(path, body, token) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetchFn(API_BASE + path, { method: 'POST', headers, body: JSON.stringify(body) });
        const text = await res.text();
        try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, text }; }
    }

    async function get(path, token) {
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetchFn(API_BASE + path, { method: 'GET', headers });
        const text = await res.text();
        try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, text }; }
    }

    console.log('API base:', API_BASE);

    let token = null;
    let refresh = null;

    if (DEMO_USER && DEMO_PASS) {
        console.log('Attempting login with DEMO_USER...');
        try {
            const r = await postJson('/auth/login/', { username: DEMO_USER, password: DEMO_PASS });
            console.log('Login result:', r.status, r.ok ? 'OK' : 'FAIL');
            if (r.json && (r.json.access || r.json.token || r.json.data)) {
                token = r.json.access || r.json.token || (r.json.data && r.json.data.access);
                refresh = r.json.refresh || (r.json.data && r.json.data.refresh) || null;
                console.log('Received token (length):', token ? token.length : 0);
            } else {
                console.log('Login response body:', r.json || r.text);
            }
        } catch (err) { console.warn('Login failed:', err.message); }
    } else {
        console.log('No demo credentials provided; continuing unauthenticated.');
    }

    const endpoints = [
        { name: 'Student dashboard', path: '/students/dashboard/' },
        { name: 'Proctor dashboard', path: '/proctors/dashboard/' },
        { name: 'Security dashboard', path: '/security/dashboard/' },
        { name: 'Staff dashboard', path: '/staff/dashboard/' }
    ];

    for (const ep of endpoints) {
        try {
            const res = await get(ep.path, token);
            if (res.ok) {
                console.log(`${ep.name}: OK (${res.status})`);
                if (res.json) console.log('  sample:', JSON.stringify(res.json).slice(0, 300));
            } else {
                console.log(`${ep.name}: ${res.status} - ${res.text || JSON.stringify(res.json)}`);
            }
        } catch (err) {
            console.warn(`${ep.name} call failed:`, err.message);
        }
    }

    // Try refresh if we have a refresh token
    if (!token && refresh) {
        try {
            const r = await postJson('/auth/refresh/', { refresh });
            if (r.json && r.json.access) {
                token = r.json.access;
                console.log('Refresh succeeded, new token length:', token.length);
            }
        } catch (err) { console.warn('Refresh failed:', err.message); }
    }

    console.log('Smoke test complete.');
})();
