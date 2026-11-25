'use strict';

// Application Insights is optional: it starts only when the connection string is set.
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  require('applicationinsights').setup().start();
}

const express = require('express');
const dns = require('dns').promises;
const net = require('net');

const app = express();

// Scenario 1: the platform probes the port in the PORT variable (8080 on built-in Linux images).
// Setting APP_PORT to something else makes the app listen where the platform is not looking.
const PORT = process.env.APP_PORT || process.env.PORT || 8080;

const leaked = [];
const MAX_MS = 60000;

// Diagnostic endpoints can probe other hosts, so they require LAB_KEY when it is set.
function requireKey(req, res, next) {
  const key = process.env.LAB_KEY;
  if (!key) return next();
  if (req.query.key === key || req.get('x-lab-key') === key) return next();
  return res.status(401).json({ error: 'missing or invalid lab key' });
}

// One JSON line per request, visible in log stream and AppServiceConsoleLogs.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      })
    );
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    app: 'app-service-troubleshooting-lab',
    status: 'running',
    node: process.version,
    port: String(PORT),
    time: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// Scenario 2: fails with HTTP 500 until the DB_CONNECTION app setting exists.
app.get('/config', (req, res) => {
  if (!process.env.DB_CONNECTION) {
    throw new Error('Missing required app setting: DB_CONNECTION');
  }
  res.json({ dbConfigured: true });
});

// Scenario 3: slow responses, CPU load and a memory leak.
app.get('/slow', (req, res) => {
  const ms = Math.min(parseInt(req.query.ms || '3000', 10) || 3000, MAX_MS);
  setTimeout(() => res.json({ waitedMs: ms }), ms);
});

app.get('/cpu', (req, res) => {
  const ms = Math.min(parseInt(req.query.ms || '5000', 10) || 5000, 30000);
  const end = Date.now() + ms;
  while (Date.now() < end) {
    Math.sqrt(Math.random() * 1e9); // blocks the event loop on purpose
  }
  res.json({ burnedMs: ms });
});

app.get('/leak', (req, res) => {
  const mb = Math.min(parseInt(req.query.mb || '50', 10) || 50, 200);
  leaked.push(Buffer.alloc(mb * 1024 * 1024, 1));
  const m = process.memoryUsage();
  res.json({ allocatedMb: mb, chunks: leaked.length, rssMb: Math.round(m.rss / 1048576) });
});

app.get('/leak/reset', (req, res) => {
  leaked.length = 0;
  if (global.gc) global.gc();
  res.json({ cleared: true });
});

// Scenarios 4 and 5: DNS resolution and outbound connectivity checks.
app.get('/dns', requireKey, async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const addresses = await dns.lookup(name, { all: true });
    res.json({ name, addresses });
  } catch (err) {
    res.status(502).json({ name, error: err.code || err.message });
  }
});

app.get('/outbound', requireKey, (req, res) => {
  const host = req.query.host;
  const port = parseInt(req.query.port || '443', 10);
  const timeout = Math.min(parseInt(req.query.timeout || '5000', 10) || 5000, 15000);
  if (!host) return res.status(400).json({ error: 'host is required' });
  const start = Date.now();
  const socket = net.connect({ host, port });
  socket.setTimeout(timeout);
  const done = (result) => {
    socket.destroy();
    if (!res.headersSent) res.json({ host, port, ms: Date.now() - start, ...result });
  };
  socket.on('connect', () => done({ connected: true }));
  socket.on('timeout', () => done({ connected: false, error: 'timeout' }));
  socket.on('error', (err) => done({ connected: false, error: err.code || err.message }));
});

app.get('/http', requireKey, async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const start = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    res.json({ url, status: r.status, ms: Date.now() - start });
  } catch (err) {
    res.status(502).json({ url, error: err.cause?.code || err.message, ms: Date.now() - start });
  }
});

// Unhandled errors become HTTP 500 and a stack trace in the console log.
app.use((err, req, res, next) => {
  console.error(`ERROR ${req.method} ${req.path}: ${err.stack}`);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
