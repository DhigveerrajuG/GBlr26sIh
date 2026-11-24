const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 8000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const SHARED_SECRET = 'sih2026-internal-EClub';
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

// In-memory rate-limiting cache for submissions
const deviceCooldowns = new Map();

// SSE clients for real-time updates
const sseClients = new Set();

// Default initial data (empty complaints - left blank for real tickets)
const INITIAL_DATA = {
  complaints: [],
  admins: [
    {
      name: 'Organizer Lead',
      key: 'SIH-OWNER-2026',
      role: 'Owner',
      active: true,
      addedBy: 'System Init',
      addedOn: new Date().toISOString()
    },
    {
      name: 'Volunteer Alex',
      key: 'VOL-ALEX',
      role: 'Volunteer',
      active: true,
      addedBy: 'Organizer Lead',
      addedOn: new Date().toISOString()
    },
    {
      name: 'Volunteer Priya',
      key: 'VOL-PRIYA',
      role: 'Volunteer',
      active: true,
      addedBy: 'Organizer Lead',
      addedOn: new Date().toISOString()
    },
    {
      name: 'Volunteer Rohan',
      key: 'VOL-ROHAN',
      role: 'Volunteer',
      active: true,
      addedBy: 'Organizer Lead',
      addedOn: new Date().toISOString()
    },
    {
      name: 'Desk Volunteer',
      key: 'SIH-ADMIN-2026',
      role: 'Volunteer',
      active: true,
      addedBy: 'Organizer Lead',
      addedOn: new Date().toISOString()
    }
  ]
};

// Database utilities
function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
  }
}

// Ensure database on startup
ensureDb();

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Database read error, restoring defaults:', err);
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  ensureDb();
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

// SSE broadcast
function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Request parsing helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Body payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ text: body });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with'
  });
  res.end(payload);
}

// Auth helpers
function findAdmin(key, db) {
  if (!key) return null;
  return db.admins.find(a => String(a.key).trim() === String(key).trim());
}

function requireAdmin(key, db) {
  const admin = findAdmin(key, db);
  if (!admin || !admin.active) return null;
  return admin;
}

function requireOwner(key, db) {
  const admin = requireAdmin(key, db);
  if (!admin || admin.role !== 'Owner') return null;
  return admin;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with'
    });
    return res.end();
  }

  // --- API Routes ---

  // Health check
  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
  }

  // Server-Sent Events (SSE) for live push updates
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Submit Complaint (POST /api/tickets or Google Apps Script POST style)
  if ((pathname === '/api/tickets' || pathname === '/exec') && req.method === 'POST') {
    try {
      const data = await parseBody(req);

      // Verify honeypot
      if (data.website) {
        // Silent rejection for spam bots
        return sendJson(res, 200, { result: 'success', ticketId: 'SIH-BOT-CAUGHT' });
      }

      // Check rate-limiting cooldown per device
      const deviceId = data.deviceId || req.socket.remoteAddress || 'unknown';
      const lastSubmit = deviceCooldowns.get(deviceId);
      const isTestBypass = req.headers['x-bypass-cooldown'] === 'true';

      if (!isTestBypass && lastSubmit && Date.now() - lastSubmit < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - (Date.now() - lastSubmit);
        return sendJson(res, 429, {
          result: 'cooldown',
          message: 'You can submit another application in ' + Math.ceil(remainingMs / 1000) + 's.',
          remainingMs
        });
      }

      const db = readDb();
      const count = db.complaints.length + 1;
      const ticketId = 'SIH-' + String(count).padStart(4, '0');

      const newTicket = {
        ticketId,
        timestamp: new Date().toISOString(),
        teamName: (data.teamName || 'Anonymous Team').trim(),
        teamNo: (data.tableNumber || data.teamNo || 'Table ?').trim(),
        category: (data.category || 'Other').trim(),
        issue: (data.issue || '').trim(),
        venue: (data.venue || 'Main Hall').trim(),
        status: 'Pending',
        remarks: '',
        lastUpdated: new Date().toISOString(),
        handledBy: '',
        priority: data.priority || 'Normal'
      };

      db.complaints.unshift(newTicket);
      writeDb(db);

      deviceCooldowns.set(deviceId, Date.now());

      // Broadcast new ticket event
      broadcastSSE('ticket_created', newTicket);

      return sendJson(res, 201, {
        result: 'success',
        ticketId,
        ticket: newTicket
      });
    } catch (err) {
      console.error('Submit error:', err);
      return sendJson(res, 500, { error: 'Failed to create ticket' });
    }
  }

  // Get single ticket by ID (GET /api/tickets/:id)
  const ticketIdMatch = pathname.match(/^\/api\/tickets\/([A-Za-z0-9-]+)$/);
  if (ticketIdMatch && req.method === 'GET') {
    const targetId = ticketIdMatch[1].toUpperCase();
    const db = readDb();
    const ticket = db.complaints.find(c => c.ticketId.toUpperCase() === targetId);
    if (!ticket) {
      return sendJson(res, 404, { error: 'Ticket not found' });
    }
    return sendJson(res, 200, { ticket });
  }

  // Update ticket (PATCH /api/tickets/:id or Google Apps Script ?action=update)
  if (ticketIdMatch && (req.method === 'PATCH' || req.method === 'POST')) {
    const targetId = ticketIdMatch[1].toUpperCase();
    try {
      const data = await parseBody(req);
      const db = readDb();
      const ticketIndex = db.complaints.findIndex(c => c.ticketId.toUpperCase() === targetId);

      if (ticketIndex === -1) {
        return sendJson(res, 404, { error: 'Ticket not found' });
      }

      const ticket = db.complaints[ticketIndex];
      if (data.status) ticket.status = data.status;
      if (data.remarks !== undefined) ticket.remarks = data.remarks;
      if (data.handledBy) ticket.handledBy = data.handledBy;
      if (data.priority) ticket.priority = data.priority;
      ticket.lastUpdated = new Date().toISOString();

      db.complaints[ticketIndex] = ticket;
      writeDb(db);

      broadcastSSE('ticket_updated', ticket);

      return sendJson(res, 200, { result: 'success', ticket });
    } catch (err) {
      console.error('Update error:', err);
      return sendJson(res, 500, { error: 'Failed to update ticket' });
    }
  }

  // List tickets (GET /api/tickets or Google Apps Script ?action=list)
  if ((pathname === '/api/tickets' || pathname === '/exec') && req.method === 'GET') {
    const db = readDb();
    const action = query.action;

    // Handle Google Apps Script GET dispatching
    if (action === 'adminLogin') {
      const admin = requireAdmin(query.key, db);
      if (!admin) return sendJson(res, 200, { valid: false });
      return sendJson(res, 200, { valid: true, name: admin.name, role: admin.role });
    }

    if (action === 'listAdmins') {
      const admin = requireOwner(query.key, db);
      if (!admin) return sendJson(res, 401, { error: 'unauthorized' });
      const admins = db.admins.map(a => ({
        name: a.name,
        maskedKey: a.key.length > 4 ? '••••' + a.key.slice(-4) : '••••',
        key: a.key,
        role: a.role,
        active: a.active,
        addedBy: a.addedBy,
        addedOn: a.addedOn
      }));
      return sendJson(res, 200, { admins });
    }

    if (action === 'addAdmin') {
      const admin = requireOwner(query.key, db);
      if (!admin) return sendJson(res, 401, { error: 'unauthorized' });
      const newName = (query.newName || '').trim();
      if (!newName) return sendJson(res, 400, { error: 'missing name' });
      
      let newKey = (query.newKey || '').trim().toUpperCase();
      if (!newKey) {
        newKey = 'VOL-' + crypto.randomBytes(2).toString('hex').toUpperCase();
      }
      if (db.admins.some(a => String(a.key).toUpperCase() === newKey)) {
        return sendJson(res, 400, { error: 'Access code already exists. Please choose a different code.' });
      }

      db.admins.push({
        name: newName,
        key: newKey,
        role: 'Volunteer',
        active: true,
        addedBy: admin.name,
        addedOn: new Date().toISOString()
      });
      writeDb(db);
      return sendJson(res, 200, { result: 'success', name: newName, key: newKey, role: 'Volunteer' });
    }

    if (action === 'setAdminActive') {
      const admin = requireOwner(query.key, db);
      if (!admin) return sendJson(res, 401, { error: 'unauthorized' });
      const target = db.admins.find(a => a.key === query.targetKey);
      if (!target) return sendJson(res, 404, { error: 'admin not found' });
      if (target.role === 'Owner') return sendJson(res, 400, { error: 'cannot deactivate Owner' });
      target.active = query.active === 'true';
      writeDb(db);
      return sendJson(res, 200, { result: 'success' });
    }

    if (action === 'update') {
      const admin = requireAdmin(query.key, db);
      if (!admin) return sendJson(res, 401, { error: 'unauthorized' });
      const targetId = (query.ticketId || '').toUpperCase();
      const ticket = db.complaints.find(c => c.ticketId.toUpperCase() === targetId);
      if (!ticket) return sendJson(res, 404, { error: 'ticket not found' });
      if (query.status) ticket.status = query.status;
      if (query.remarks !== undefined) ticket.remarks = query.remarks;
      ticket.lastUpdated = new Date().toISOString();
      ticket.handledBy = admin.name;
      writeDb(db);
      broadcastSSE('ticket_updated', ticket);
      return sendJson(res, 200, { result: 'success', ticket });
    }

    // Default: list complaints with filter & search
    let list = [...db.complaints];
    const statusFilter = (query.status || '').toLowerCase();
    const categoryFilter = (query.category || '').toLowerCase();
    const searchFilter = (query.search || query.q || '').toLowerCase();

    if (statusFilter && statusFilter !== 'all') {
      list = list.filter(c => (c.status || '').toLowerCase() === statusFilter);
    }
    if (categoryFilter && categoryFilter !== 'all') {
      list = list.filter(c => (c.category || '').toLowerCase() === categoryFilter);
    }
    if (searchFilter) {
      list = list.filter(c =>
        [c.ticketId, c.teamName, c.teamNo, c.venue, c.issue, c.category, c.handledBy]
          .join(' ')
          .toLowerCase()
          .includes(searchFilter)
      );
    }

    return sendJson(res, 200, {
      total: db.complaints.length,
      filtered: list.length,
      complaints: list
    });
  }

  // Admin Login (POST /api/admin/login)
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const data = await parseBody(req);
    const key = (data.key || '').trim();
    const db = readDb();
    const admin = requireAdmin(key, db);
    if (!admin) {
      return sendJson(res, 401, { valid: false, error: 'Invalid or revoked admin key' });
    }
    return sendJson(res, 200, { valid: true, name: admin.name, role: admin.role, key: admin.key });
  }

  // Analytics Stats (GET /api/stats)
  if (pathname === '/api/stats' && req.method === 'GET') {
    const db = readDb();
    const all = db.complaints;
    const stats = {
      total: all.length,
      pending: all.filter(c => (c.status || '').toLowerCase() === 'pending').length,
      ongoing: all.filter(c => (c.status || '').toLowerCase() === 'ongoing').length,
      solved: all.filter(c => (c.status || '').toLowerCase() === 'solved').length,
      categories: {},
      venues: {}
    };
    all.forEach(c => {
      stats.categories[c.category] = (stats.categories[c.category] || 0) + 1;
      const v = (c.venue || 'Unknown').split(',')[0].trim();
      stats.venues[v] = (stats.venues[v] || 0) + 1;
    });
    return sendJson(res, 200, stats);
  }

  // --- Static Files Serving ---
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/admin.html';

  // Search in both root and GBlr26sIh folder
  const candidatePaths = [
    path.join(__dirname, 'GBlr26sIh', reqPath),
    path.join(__dirname, reqPath)
  ];

  let filePath = null;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      filePath = candidate;
      break;
    }
  }

  // If path is missing, try looking for images or assets inside GBlr26sIh
  if (!filePath && reqPath.startsWith('/images/')) {
    const imgCandidate = path.join(__dirname, 'GBlr26sIh', reqPath);
    if (fs.existsSync(imgCandidate) && fs.statSync(imgCandidate).isFile()) {
      filePath = imgCandidate;
    }
  }

  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found - Smart India Hackathon Support Desk');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SIH Support Desk Server running on http://localhost:${PORT}`);
  console.log(`📋 Participant Portal : http://localhost:${PORT}/index.html`);
  console.log(`🛡️ Admin Dashboard    : http://localhost:${PORT}/admin.html`);
  console.log(`⚡ API Health Check   : http://localhost:${PORT}/api/health`);
  console.log(`🔒 Authentication     : Configured via environment / database`);
  console.log(`======================================================\n`);
});
