/**
 * api.js - Production API Client for SIH Support Desk
 * Handles REST requests, authorization headers, device identification, and Server-Sent Events (SSE).
 */

class SIHApiClient {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.sseSource = null;
    this.listeners = new Map();
  }

  getOrCreateDeviceId() {
    const key = window.SIH_CONFIG.STORAGE_KEYS.DEVICE_ID;
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }

  getAuthToken() {
    return localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.AUTH_TOKEN) || '';
  }

  setAuthSession(token, user) {
    if (token) {
      localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.AUTH_USER);
    }
  }

  getCurrentUser() {
    const raw = localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.AUTH_USER);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const url = (window.SIH_CONFIG.API_BASE || '') + endpoint;
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-Id': this.deviceId,
      ...(options.headers || {})
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.setAuthSession(null, null);
          window.dispatchEvent(new CustomEvent('sih:unauthorized'));
        }
        const message = data && data.error ? data.error : `HTTP ${response.status}: ${response.statusText}`;
        const err = new Error(message);
        err.status = response.status;
        err.details = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  }

  // --- Participant Endpoints ---
  async checkCooldown() {
    return this.request('/api/cooldown');
  }

  async lookupTable(table) {
    return this.request(`/api/teams/lookup?table=${encodeURIComponent(table)}`);
  }

  async lookupTeam(team) {
    return this.request(`/api/teams/lookup?team=${encodeURIComponent(team)}`);
  }

  async lookupLeader(leader) {
    return this.request(`/api/teams/lookup?leader=${encodeURIComponent(leader)}`);
  }

  async submitTicket(ticketData) {
    return this.request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
  }

  async getTicket(ticketId) {
    return this.request(`/api/tickets/${encodeURIComponent(ticketId)}`);
  }

  // --- Admin / Volunteer Endpoints ---
  async login(accessKey) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ key: accessKey })
    });
    if (res.token && res.user) {
      this.setAuthSession(res.token, res.user);
    }
    return res;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.setAuthSession(null, null);
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async getTickets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.venue && filters.venue !== 'all') params.append('venue', filters.venue);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/tickets${qs}`);
  }

  async updateTicket(ticketId, updates) {
    return this.request(`/api/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async getStats() {
    return this.request('/api/stats');
  }

  // --- Superadmin Endpoints ---
  async getUsers() {
    return this.request('/api/admin/users');
  }

  async createUser(userData) {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async toggleUser(userId, active) {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    });
  }

  async getAuditLogs() {
    return this.request('/api/admin/audit');
  }

  getExportUrl() {
    const token = this.getAuthToken();
    return `/api/export?token=${encodeURIComponent(token)}`;
  }

  // --- Real-time Server-Sent Events (SSE) ---
  subscribeEvents(callbacks = {}) {
    if (this.sseSource) {
      this.sseSource.close();
    }

    const url = (window.SIH_CONFIG.API_BASE || '') + '/api/events';
    try {
      this.sseSource = new EventSource(url);

      this.sseSource.addEventListener('ticket_created', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (callbacks.onTicketCreated) callbacks.onTicketCreated(data);
        } catch (err) {
          console.error('[SSE] Failed parsing ticket_created data', err);
        }
      });

      this.sseSource.addEventListener('ticket_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (callbacks.onTicketUpdated) callbacks.onTicketUpdated(data);
        } catch (err) {
          console.error('[SSE] Failed parsing ticket_updated data', err);
        }
      });

      this.sseSource.onopen = () => {
        if (callbacks.onOpen) callbacks.onOpen();
      };

      this.sseSource.onerror = (err) => {
        if (callbacks.onError) callbacks.onError(err);
      };
    } catch (e) {
      console.warn('[SSE] EventSource not supported or failed to initialize', e);
    }
  }

  unsubscribeEvents() {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
  }
}

window.api = new SIHApiClient();
