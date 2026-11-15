/**
 * SIH Support Desk - Unified Client API Adapter
 * Connects seamlessly to Node.js Backend, Google Apps Script, or Local Storage Demo.
 */

const SCRIPT_URL_DEFAULT = "https://script.google.com/macros/s/AKfycbx-0b1JFIeRDCbab_71a0uvZPfHJ6e-AW2A01TyGj3gMIFPd9J0yXRtVIi6W6lutpUD/exec";
const SHARED_SECRET_DEFAULT = "sih2026-internal-EClub";

// Fallback demo complaints for offline/file:// mode
const DEMO_COMPLAINTS = [
  {
    ticketId: 'SIH-0001',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    teamName: 'CodeCrafters',
    teamNo: 'Table 14',
    category: 'Internet / Wi-Fi',
    issue: 'Intermittent Wi-Fi dropouts on primary router. Unable to push code to GitHub.',
    venue: 'Main Arena, Hall A',
    status: 'Solved',
    remarks: 'Rebooted AP-04 and provided 5GHz credentials. Connectivity verified.',
    lastUpdated: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    handledBy: 'Organizer Lead',
    priority: 'High'
  },
  {
    ticketId: 'SIH-0002',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    teamName: 'NeuralByte',
    teamNo: 'Table 32',
    category: 'Power / Electrical',
    issue: 'Spike guard socket #3 is loose and sparking intermittently when charger is inserted.',
    venue: 'Main Arena, Hall B',
    status: 'Ongoing',
    remarks: 'Technician Rohan dispatched with replacement heavy-duty surge protector.',
    lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    handledBy: 'Desk Volunteer Alex',
    priority: 'Critical'
  },
  {
    ticketId: 'SIH-0003',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    teamName: 'EcoVanguard',
    teamNo: 'Table 08',
    category: 'Hardware Components',
    issue: 'ESP32 board GPIO pin 4 fried during sensor testing. Need one spare ESP32 module.',
    venue: 'Hardware Lab, 1st Floor',
    status: 'Pending',
    remarks: '',
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    handledBy: '',
    priority: 'Normal'
  },
  {
    ticketId: 'SIH-0004',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    teamName: 'QuantumLeap',
    teamNo: 'Table 51',
    category: 'Tech Support',
    issue: 'Docker container network bridge error blocking local database port 5432.',
    venue: 'Main Arena, Hall C',
    status: 'Ongoing',
    remarks: 'Mentor assisting with WSL2 port forwarding configuration.',
    lastUpdated: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    handledBy: 'Desk Volunteer Alex',
    priority: 'Normal'
  },
  {
    ticketId: 'SIH-0005',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    teamName: 'SmartGrid AI',
    teamNo: 'Table 22',
    category: 'Internet / Wi-Fi',
    issue: 'DNS resolution failure when trying to pull npm dependencies.',
    venue: 'Main Arena, Hall A',
    status: 'Pending',
    remarks: '',
    lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    handledBy: '',
    priority: 'High'
  }
];

class SihApi {
  constructor() {
    this.scriptUrl = window.SIH_CONFIG?.scriptUrl || SCRIPT_URL_DEFAULT;
    this.sharedSecret = window.SIH_CONFIG?.sharedSecret || SHARED_SECRET_DEFAULT;
    this.isLocalBackend = window.location.protocol.startsWith('http') && !this.isDirectFile();
    this.initFallbackStorage();
  }

  isDirectFile() {
    return window.location.protocol === 'file:';
  }

  initFallbackStorage() {
    if (!localStorage.getItem('sih_demo_complaints')) {
      localStorage.setItem('sih_demo_complaints', JSON.stringify(DEMO_COMPLAINTS));
    }
    if (!localStorage.getItem('sih_demo_admins')) {
      localStorage.setItem('sih_demo_admins', JSON.stringify([
        { name: 'Organizer Lead', key: 'SIH-OWNER-2026', role: 'Owner', active: true },
        { name: 'Desk Volunteer Alex', key: 'SIH-ADMIN-2026', role: 'Admin', active: true }
      ]));
    }
  }

  getDemoComplaints() {
    try {
      return JSON.parse(localStorage.getItem('sih_demo_complaints') || '[]');
    } catch {
      return DEMO_COMPLAINTS;
    }
  }

  saveDemoComplaints(items) {
    localStorage.setItem('sih_demo_complaints', JSON.stringify(items));
  }

  getDemoAdmins() {
    try {
      return JSON.parse(localStorage.getItem('sih_demo_admins') || '[]');
    } catch {
      return [];
    }
  }

  saveDemoAdmins(admins) {
    localStorage.setItem('sih_demo_admins', JSON.stringify(admins));
  }

  // Submit Ticket
  async submitTicket(ticketData) {
    // 1. Try local Node backend if served via HTTP
    if (this.isLocalBackend) {
      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ticketData)
        });
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 429) {
          const errData = await res.json();
          return { result: 'cooldown', ...errData };
        }
      } catch (e) {
        console.warn('Local backend submit failed, falling back...', e);
      }
    }

    // 2. Try Google Apps Script if URL configured
    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const payload = {
          secret: this.sharedSecret,
          ...ticketData
        };
        const res = await fetch(this.scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        console.warn('Google Apps Script submit failed, saving to local demo store...', err);
      }
    }

    // 3. Fallback to LocalStorage Demo Mode
    const complaints = this.getDemoComplaints();
    const ticketId = 'SIH-' + String(complaints.length + 1).padStart(4, '0');
    const newEntry = {
      ticketId,
      timestamp: new Date().toISOString(),
      teamName: ticketData.teamName || 'Team Demo',
      teamNo: ticketData.tableNumber || 'Table 1',
      category: ticketData.category || 'Other',
      issue: ticketData.issue || '',
      venue: ticketData.venue || 'Main Hall',
      status: 'Pending',
      remarks: '',
      lastUpdated: new Date().toISOString(),
      handledBy: '',
      priority: ticketData.priority || 'Normal'
    };
    complaints.unshift(newEntry);
    this.saveDemoComplaints(complaints);
    return { result: 'success', ticketId, ticket: newEntry, isDemo: true };
  }

  // Lookup Ticket by ID
  async getTicket(ticketId) {
    const cleanId = ticketId.trim().toUpperCase();

    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const data = await res.json();
          return data.ticket;
        }
      } catch {}
    }

    // Search in demo store or list
    const complaints = this.getDemoComplaints();
    return complaints.find(c => c.ticketId.toUpperCase() === cleanId) || null;
  }

  // List Complaints for Admin
  async listComplaints(adminKey, filters = {}) {
    if (this.isLocalBackend) {
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.category) params.set('category', filters.category);
        if (filters.search) params.set('search', filters.search);

        const res = await fetch(`/api/tickets?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          return data.complaints || [];
        }
      } catch (e) {
        console.warn('Local backend list failed:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=list&key=${encodeURIComponent(adminKey)}`);
        const data = await res.json();
        if (!data.error && data.complaints) {
          return data.complaints;
        }
      } catch (err) {
        console.warn('Apps Script list failed:', err);
      }
    }

    // Fallback
    return this.getDemoComplaints();
  }

  // Update Ticket Status & Remarks
  async updateTicket(adminKey, ticketId, status, remarks, adminName = '') {
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, remarks, handledBy: adminName })
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Local backend update failed:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const url = `${this.scriptUrl}?action=update&key=${encodeURIComponent(adminKey)}`
          + `&ticketId=${encodeURIComponent(ticketId)}`
          + `&status=${encodeURIComponent(status)}`
          + `&remarks=${encodeURIComponent(remarks)}`;
        const res = await fetch(url);
        return await res.json();
      } catch (e) {
        console.warn('Apps Script update failed:', e);
      }
    }

    // Fallback
    const complaints = this.getDemoComplaints();
    const t = complaints.find(c => c.ticketId.toUpperCase() === ticketId.toUpperCase());
    if (t) {
      if (status) t.status = status;
      if (remarks !== undefined) t.remarks = remarks;
      t.handledBy = adminName || 'Admin';
      t.lastUpdated = new Date().toISOString();
      this.saveDemoComplaints(complaints);
    }
    return { result: 'success', ticket: t };
  }

  // Admin Login
  async adminLogin(key) {
    const cleanKey = key.trim();

    if (this.isLocalBackend) {
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: cleanKey })
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Local backend admin login failed:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=adminLogin&key=${encodeURIComponent(cleanKey)}`);
        const data = await res.json();
        if (data.valid) return data;
      } catch (e) {
        console.warn('Apps Script login failed:', e);
      }
    }

    // Fallback Demo Admins check
    const admins = this.getDemoAdmins();
    const found = admins.find(a => a.key === cleanKey && a.active);
    if (found) {
      return { valid: true, name: found.name, role: found.role };
    }

    // Default keys fallback for instant testing
    if (cleanKey === 'SIH-OWNER-2026') return { valid: true, name: 'Organizer Lead', role: 'Owner' };
    if (cleanKey === 'SIH-ADMIN-2026') return { valid: true, name: 'Desk Volunteer Alex', role: 'Admin' };

    return { valid: false };
  }

  // Owner: List Admins
  async listAdmins(ownerKey) {
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets?action=listAdmins&key=${encodeURIComponent(ownerKey)}`);
        if (res.ok) return await res.json();
      } catch {}
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=listAdmins&key=${encodeURIComponent(ownerKey)}`);
        return await res.json();
      } catch {}
    }

    const admins = this.getDemoAdmins().map(a => ({
      ...a,
      maskedKey: a.key.length > 4 ? '••••' + a.key.slice(-4) : '••••'
    }));
    return { admins };
  }

  // Owner: Add Volunteer / Admin
  async addAdmin(ownerKey, newName, customKey = '') {
    const keyParam = customKey ? `&newKey=${encodeURIComponent(customKey)}` : '';
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets?action=addAdmin&key=${encodeURIComponent(ownerKey)}&newName=${encodeURIComponent(newName)}${keyParam}`);
        if (res.ok) return await res.json();
      } catch {}
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=addAdmin&key=${encodeURIComponent(ownerKey)}&newName=${encodeURIComponent(newName)}${keyParam}`);
        return await res.json();
      } catch {}
    }

    const admins = this.getDemoAdmins();
    const newKey = customKey ? customKey.trim().toUpperCase() : ('VOL-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    admins.push({
      name: newName,
      key: newKey,
      role: 'Volunteer',
      active: true,
      addedBy: 'Owner',
      addedOn: new Date().toISOString()
    });
    this.saveDemoAdmins(admins);
    return { result: 'success', name: newName, key: newKey, role: 'Volunteer' };
  }

  // Owner: Toggle Active
  async setAdminActive(ownerKey, targetKey, active) {
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets?action=setAdminActive&key=${encodeURIComponent(ownerKey)}&targetKey=${encodeURIComponent(targetKey)}&active=${active}`);
        if (res.ok) return await res.json();
      } catch {}
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=setAdminActive&key=${encodeURIComponent(ownerKey)}&targetKey=${encodeURIComponent(targetKey)}&active=${active}`);
        return await res.json();
      } catch {}
    }

    const admins = this.getDemoAdmins();
    const target = admins.find(a => a.key === targetKey);
    if (target) {
      target.active = active;
      this.saveDemoAdmins(admins);
    }
    return { result: 'success' };
  }

  // Live SSE listener (real-time push from backend)
  subscribeEvents(onMessage) {
    if (!this.isLocalBackend || !window.EventSource) return null;
    try {
      const evtSource = new EventSource('/api/events');
      evtSource.addEventListener('ticket_created', (e) => {
        onMessage({ type: 'ticket_created', data: JSON.parse(e.data) });
      });
      evtSource.addEventListener('ticket_updated', (e) => {
        onMessage({ type: 'ticket_updated', data: JSON.parse(e.data) });
      });
      return evtSource;
    } catch {
      return null;
    }
  }
}

// Global API instance
window.sihApi = new SihApi();
