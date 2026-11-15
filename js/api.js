/**
 * SIH Support Desk - Unified Client API Adapter
 * Connects securely to Node.js Backend or Google Apps Script.
 */

const SCRIPT_URL_DEFAULT = "";
const SHARED_SECRET_DEFAULT = "";

class SihApi {
  constructor() {
    this.scriptUrl = window.SIH_CONFIG?.scriptUrl || SCRIPT_URL_DEFAULT;
    this.sharedSecret = window.SIH_CONFIG?.sharedSecret || SHARED_SECRET_DEFAULT;
    this.isLocalBackend = window.location.protocol.startsWith('http') && !this.isDirectFile();
  }

  isDirectFile() {
    return window.location.protocol === 'file:';
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
        console.warn('Node backend submit error:', e);
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
        console.error('Google Apps Script submit error:', err);
      }
    }

    throw new Error('Could not connect to the backend server. Please verify your network connection.');
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
      } catch (e) {
        console.warn('Node backend ticket lookup error:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=getTicket&ticketId=${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const data = await res.json();
          return data.ticket || null;
        }
      } catch (err) {
        console.error('Apps Script ticket lookup error:', err);
      }
    }

    return null;
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
        console.warn('Node backend list complaints error:', e);
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
        console.error('Apps Script list complaints error:', err);
      }
    }

    return [];
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
        console.warn('Node backend update ticket error:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const url = `${this.scriptUrl}?action=update&key=${encodeURIComponent(adminKey)}`
          + `&ticketId=${encodeURIComponent(ticketId)}`
          + `&status=${encodeURIComponent(status)}`
          + `&remarks=${encodeURIComponent(remarks)}`
          + `&handledBy=${encodeURIComponent(adminName)}`;
        const res = await fetch(url);
        return await res.json();
      } catch (e) {
        console.error('Apps Script update ticket error:', e);
      }
    }

    throw new Error('Unable to update ticket. Backend server is unreachable.');
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
        console.warn('Node backend admin login error:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=adminLogin&key=${encodeURIComponent(cleanKey)}`);
        const data = await res.json();
        if (data.valid) return data;
      } catch (e) {
        console.error('Apps Script login error:', e);
      }
    }

    return { valid: false };
  }

  // Owner: List Admins
  async listAdmins(ownerKey) {
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets?action=listAdmins&key=${encodeURIComponent(ownerKey)}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Node backend list admins error:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=listAdmins&key=${encodeURIComponent(ownerKey)}`);
        return await res.json();
      } catch (e) {
        console.error('Apps Script list admins error:', e);
      }
    }

    return { admins: [] };
  }

  // Owner: Add Volunteer / Admin
  async addAdmin(ownerKey, newName, customKey = '') {
    const keyParam = customKey ? `&newKey=${encodeURIComponent(customKey)}` : '';
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets?action=addAdmin&key=${encodeURIComponent(ownerKey)}&newName=${encodeURIComponent(newName)}${keyParam}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Node backend add admin error:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=addAdmin&key=${encodeURIComponent(ownerKey)}&newName=${encodeURIComponent(newName)}${keyParam}`);
        return await res.json();
      } catch (e) {
        console.error('Apps Script add admin error:', e);
      }
    }

    throw new Error('Unable to add volunteer code. Backend server is unreachable.');
  }

  // Owner: Toggle Active
  async setAdminActive(ownerKey, targetKey, active) {
    if (this.isLocalBackend) {
      try {
        const res = await fetch(`/api/tickets?action=setAdminActive&key=${encodeURIComponent(ownerKey)}&targetKey=${encodeURIComponent(targetKey)}&active=${active}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Node backend set admin active error:', e);
      }
    }

    if (this.scriptUrl && !this.scriptUrl.includes('PASTE_YOUR')) {
      try {
        const res = await fetch(`${this.scriptUrl}?action=setAdminActive&key=${encodeURIComponent(ownerKey)}&targetKey=${encodeURIComponent(targetKey)}&active=${active}`);
        return await res.json();
      } catch (e) {
        console.error('Apps Script set admin active error:', e);
      }
    }

    throw new Error('Unable to toggle volunteer status. Backend server is unreachable.');
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
