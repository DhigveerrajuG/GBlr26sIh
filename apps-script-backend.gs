/**
 * SIH Support Desk - Google Apps Script Backend API
 * 
 * Author & Maintainer: Dhigveerraju Gadde (@DhigveerrajuG)
 * AI Pair Programmers & Collaborators:
 *   - Antigravity (Google DeepMind)
 *   - Claude (Anthropic)
 * 
 * Concurrency-safe spreadsheet storage, role-based auth, caching, and rate limiting.
 */

const SHARED_SECRET = "YOUR_SHARED_SECRET_HERE";

const COOLDOWN_SECONDS = 10 * 60;

const COMPLAINTS_SHEET = 'Complaints';
const ADMINS_SHEET = 'Admins';
const COMPLAINTS_CACHE_KEY = 'complaints_list_v2';
const COMPLAINTS_CACHE_SECONDS = 60;
const ADMIN_CACHE_PREFIX = 'admin_auth_v2_';
const ADMIN_CACHE_SECONDS = 600;

const COL = {
  TIMESTAMP: 1, TICKET: 2, TEAM_NAME: 3, TEAM_NO: 4, CATEGORY: 5,
  RESERVED: 6, ISSUE: 7, VENUE: 8, STATUS: 9, REMARKS: 10, UPDATED: 11, HANDLED_BY: 12
};

const ACOL = {
  NAME: 1,
  KEY: 2,
  ROLE: 3,
  ACTIVE: 4,
  ADDED_BY: 5,
  ADDED_ON: 6
};

function complaintsSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(COMPLAINTS_SHEET);
}

function adminsSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMINS_SHEET);
}

function setCachedJson(key, data, ttlSeconds) {
  try {
    const json = JSON.stringify(data);
    const cache = CacheService.getScriptCache();
    if (json.length < 95000) {
      cache.put(key, json, ttlSeconds);
    } else {
      const chunks = [];
      for (let i = 0; i < json.length; i += 90000) {
        chunks.push(json.substring(i, i + 90000));
      }
      const batch = {};
      batch[key + '_chunks'] = String(chunks.length);
      for (let i = 0; i < chunks.length; i++) {
        batch[key + '_' + i] = chunks[i];
      }
      cache.putAll(batch, ttlSeconds);
    }
  } catch (err) { }
}

function getCachedJson(key) {
  try {
    const cache = CacheService.getScriptCache();
    const single = cache.get(key);
    if (single) return JSON.parse(single);

    const chunkCount = cache.get(key + '_chunks');
    if (chunkCount) {
      const count = parseInt(chunkCount, 10);
      let full = '';
      for (let i = 0; i < count; i++) {
        const part = cache.get(key + '_' + i);
        if (!part) return null;
        full += part;
      }
      return JSON.parse(full);
    }
  } catch (err) { }
  return null;
}

function removeCachedJson(key) {
  try {
    const cache = CacheService.getScriptCache();
    const chunkCount = cache.get(key + '_chunks');
    cache.remove(key);
    cache.remove(key + '_chunks');
    if (chunkCount) {
      const count = parseInt(chunkCount, 10);
      for (let i = 0; i < count; i++) {
        cache.remove(key + '_' + i);
      }
    }
  } catch (err) { }
}

function doPost(e) {
  let data;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ result: 'error', message: 'Missing request payload' });
    }
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ result: 'error', message: 'Invalid JSON payload' });
  }

  if (data.secret !== SHARED_SECRET) return jsonResponse({ result: 'unauthorized' });
  if (data.website) return jsonResponse({ result: 'rejected' });

  const cache = CacheService.getScriptCache();
  const deviceId = data.deviceId || 'unknown';
  if (cache.get(deviceId)) return jsonResponse({ result: 'cooldown' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = complaintsSheet();
    const ticketNum = sheet.getLastRow();
    const ticketId = 'SIH-' + String(ticketNum).padStart(4, '0');

    sheet.appendRow([
      new Date(), ticketId, data.teamName || '', data.tableNumber || '', data.category || '',
      '', data.issue || '', data.venue || '', 'Pending', '', new Date(), ''
    ]);

    removeCachedJson(COMPLAINTS_CACHE_KEY);
    cache.put(deviceId, '1', COOLDOWN_SECONDS);
    return jsonResponse({ result: 'success', ticketId: ticketId });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  e = e || { parameter: {} };
  const params = e.parameter || {};
  const action = params.action;

  if (action === 'adminLogin') return adminLogin(params.key);

  if (action === 'list') {
    const admin = requireAdmin(params.key);
    if (!admin) return jsonResponse({ error: 'unauthorized' });
    const response = fetchComplaintsData(params.bust === '1');
    response.admin = { name: admin.name, role: admin.role };
    return jsonResponse(response);
  }

  if (action === 'update') {
    const admin = requireAdmin(params.key);
    if (!admin) return jsonResponse({ error: 'unauthorized' });
    return updateComplaint(params, admin.name);
  }

  if (action === 'listAdmins') {
    const admin = requireOwner(params.key);
    if (!admin) return jsonResponse({ error: 'unauthorized' });
    return listAdmins();
  }

  if (action === 'addAdmin') {
    const admin = requireOwner(params.key);
    if (!admin) return jsonResponse({ error: 'unauthorized' });
    return addAdmin(params.newName, admin.name);
  }

  if (action === 'setAdminActive') {
    const admin = requireOwner(params.key);
    if (!admin) return jsonResponse({ error: 'unauthorized' });
    return setAdminActive(params.targetKey, params.active === 'true');
  }

  if (action === 'ping') return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });

  return jsonResponse({ error: 'unknown action' });
}

function findAdminByKey(key) {
  if (!key) return null;
  const cleanKey = String(key).trim();
  const cacheKey = ADMIN_CACHE_PREFIX + cleanKey;

  const cached = getCachedJson(cacheKey);
  if (cached) {
    return cached.invalid ? null : cached;
  }

  const sheet = adminsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    setCachedJson(cacheKey, { invalid: true }, 60);
    return null;
  }

  const values = sheet.getRange(1, 1, lastRow, 6).getValues();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[ACOL.KEY - 1]).trim() === cleanKey) {
      const adminData = {
        row: i + 1,
        name: row[ACOL.NAME - 1],
        role: row[ACOL.ROLE - 1],
        active: String(row[ACOL.ACTIVE - 1]).toLowerCase() === 'yes'
      };
      setCachedJson(cacheKey, adminData, ADMIN_CACHE_SECONDS);
      return adminData;
    }
  }
  setCachedJson(cacheKey, { invalid: true }, 60);
  return null;
}

function requireAdmin(key) {
  const admin = findAdminByKey(key);
  if (!admin || !admin.active) return null;
  return admin;
}

function requireOwner(key) {
  const admin = requireAdmin(key);
  if (!admin || admin.role !== 'Owner') return null;
  return admin;
}

function adminLogin(key) {
  const admin = requireAdmin(key);
  if (!admin) return jsonResponse({ valid: false });
  return jsonResponse({ valid: true, name: admin.name, role: admin.role });
}

function listAdmins() {
  const sheet = adminsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ admins: [] });

  const values = sheet.getRange(1, 1, lastRow, 6).getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[ACOL.NAME - 1]) continue;
    const fullKey = String(row[ACOL.KEY - 1]);
    out.push({
      name: row[ACOL.NAME - 1],
      maskedKey: fullKey.length > 4 ? '••••' + fullKey.slice(-4) : '••••',
      key: fullKey,
      role: row[ACOL.ROLE - 1],
      active: String(row[ACOL.ACTIVE - 1]).toLowerCase() === 'yes',
      addedBy: row[ACOL.ADDED_BY - 1],
      addedOn: row[ACOL.ADDED_ON - 1]
    });
  }
  return jsonResponse({ admins: out });
}

function addAdmin(newName, addedByName) {
  if (!newName) return jsonResponse({ error: 'missing name' });
  const sheet = adminsSheet();
  const newKey = generateAdminKey();
  sheet.appendRow([newName, newKey, 'Admin', 'Yes', addedByName, new Date()]);
  return jsonResponse({ result: 'success', name: newName, key: newKey });
}

function setAdminActive(targetKey, active) {
  const admin = findAdminByKey(targetKey);
  if (!admin) return jsonResponse({ error: 'admin not found' });
  if (admin.role === 'Owner') return jsonResponse({ error: 'cannot deactivate an Owner' });
  const sheet = adminsSheet();
  sheet.getRange(admin.row, ACOL.ACTIVE).setValue(active ? 'Yes' : 'No');
  removeCachedJson(ADMIN_CACHE_PREFIX + String(targetKey).trim());
  return jsonResponse({ result: 'success' });
}

function generateAdminKey() {
  return 'SIH-' + Utilities.getUuid().split('-')[0].toUpperCase();
}

function fetchComplaintsData(bustCache) {
  if (!bustCache) {
    const cached = getCachedJson(COMPLAINTS_CACHE_KEY);
    if (cached) return cached;
  } else {
    removeCachedJson(COMPLAINTS_CACHE_KEY);
  }

  const sheet = complaintsSheet();
  const lastRow = sheet.getLastRow();
  const out = [];

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      if (!row[COL.TICKET - 1]) continue;
      out.push({
        ticketId: row[COL.TICKET - 1],
        timestamp: row[COL.TIMESTAMP - 1],
        teamName: row[COL.TEAM_NAME - 1],
        teamNo: row[COL.TEAM_NO - 1],
        category: row[COL.CATEGORY - 1],
        issue: row[COL.ISSUE - 1],
        venue: row[COL.VENUE - 1],
        status: row[COL.STATUS - 1],
        remarks: row[COL.REMARKS - 1],
        lastUpdated: row[COL.UPDATED - 1],
        handledBy: row[COL.HANDLED_BY - 1]
      });
    }
  }

  const response = { complaints: out };
  setCachedJson(COMPLAINTS_CACHE_KEY, response, COMPLAINTS_CACHE_SECONDS);
  return response;
}

function updateComplaint(params, adminName) {
  const ticketId = params.ticketId;
  if (!ticketId) return jsonResponse({ error: 'missing ticketId' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = complaintsSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResponse({ error: 'ticket not found' });

    const ticketIds = sheet.getRange(1, COL.TICKET, lastRow, 1).getValues();
    const targetTicket = String(ticketId).trim().toUpperCase();
    let targetRowIndex = -1;

    for (let i = 1; i < ticketIds.length; i++) {
      if (String(ticketIds[i][0]).trim().toUpperCase() === targetTicket) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return jsonResponse({ error: 'ticket not found' });
    }

    const current = sheet.getRange(targetRowIndex, COL.STATUS, 1, 2).getValues()[0];
    const newStatus = params.status || current[0];
    const newRemarks = params.remarks !== undefined ? params.remarks : current[1];

    sheet.getRange(targetRowIndex, COL.STATUS, 1, 4).setValues([[
      newStatus,
      newRemarks,
      new Date(),
      adminName
    ]]);

    removeCachedJson(COMPLAINTS_CACHE_KEY);
    return jsonResponse({ result: 'success' });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
