/**
 * admin.js - Simplified Command Center Controller (No Priority, Clean UI)
 */

class AdminConsole {
  constructor() {
    this.currentUser = null;
    this.tickets = [];
    this.currentTicket = null;
    this.titleFlashTimer = null;
    this.originalTitle = document.title;
    this.lastSevereCategory = null;
    this.severeAlertAcknowledgedCategory = null;
    this.activeFilter = {
      status: 'all',
      venue: 'all',
      search: ''
    };

    this.init();
  }

  async init() {
    this.bindLogin();
    this.bindFilters();
    this.bindModals();
    this.bindActions();
    this.bindNotificationControls();

    const token = window.api.getAuthToken();
    if (token) {
      try {
        const me = await window.api.getMe();
        this.onAuthenticated(me.user);
      } catch (e) {
        window.api.setAuthSession(null, null);
        this.showLoginView();
      }
    } else {
      this.showLoginView();
    }
  }

  showLoginView() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    const badge = document.getElementById('userBadge');
    if (badge) badge.style.display = 'none';
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    const portalBtn = document.getElementById('portalBtn');
    if (portalBtn) portalBtn.style.display = 'inline-flex';
    document.querySelectorAll('.superadmin-only').forEach(el => el.style.display = 'none');
    window.api.unsubscribeEvents();
  }

  showDashboardView() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
  }

  bindLogin() {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = document.getElementById('adminAccessKey').value.trim();
      if (!key) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';

      try {
        const res = await window.api.login(key);
        window.ui.showToast(`Logged in as ${res.user.name}`, 'success');
        this.onAuthenticated(res.user);
      } catch (err) {
        window.ui.showToast(err.message || 'Invalid access key.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });

    document.querySelectorAll('.quick-key-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('adminAccessKey').value = chip.dataset.key;
        form.requestSubmit();
      });
    });
  }

  onAuthenticated(user) {
    this.currentUser = user;
    this.showDashboardView();
    this.renderUserProfile(user);
    this.applyRolePrivileges(user.role);

    this.refreshTickets();
    this.refreshStats();
    this.connectLiveStream();
  }

  renderUserProfile(user) {
    const badge = document.getElementById('userBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    const portalBtn = document.getElementById('portalBtn');

    if (badge) {
      badge.textContent = `${user.name} (${user.role})`;
      badge.style.display = 'inline-block';
    }
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-flex';
      logoutBtn.onclick = async () => {
        await window.api.logout();
        this.currentUser = null;
        this.showLoginView();
      };
    }
    if (portalBtn) {
      portalBtn.style.display = 'none';
    }
  }

  applyRolePrivileges(role) {
    const isSuperadmin = (role === 'superadmin');
    document.querySelectorAll('.superadmin-only').forEach(el => {
      el.style.display = isSuperadmin ? 'inline-flex' : 'none';
    });
  }

  connectLiveStream() {
    window.api.subscribeEvents({
      onOpen: () => {
        // Automatically sync fresh data whenever SSE connects or reconnects
        this.refreshTickets();
        this.refreshStats();
      },
      onTicketCreated: (ticket) => {
        // 1. Play audible alert chime
        if (window.sound) window.sound.playAlert();

        // 2. In-app toast notice
        window.ui.showToast(`New Ticket: ${ticket.ticket_id} from ${ticket.team_name} (${ticket.team_no})`, 'info');

        // 3. Native desktop notification (for background/minimized tabs)
        this.sendDesktopNotification(ticket);

        // 4. Flash browser tab title if not focused
        if (document.hidden) {
          this.flashTabTitle(`NEW TICKET: ${ticket.ticket_id}`);
        }

        // 5. Update UI
        this.prependTicket(ticket);
        this.refreshStats();
      },
      onTicketUpdated: (ticket) => {
        this.updateLocalTicket(ticket);
        this.refreshStats();
      }
    });
  }

  sendDesktopNotification(ticket) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(`Issue: ${ticket.ticket_id} (${ticket.team_no})`, {
        body: `${ticket.team_name} at ${ticket.venue}\n${ticket.category}: ${ticket.issue}`,
        icon: 'images/sih_logo_transparent.png',
        tag: ticket.ticket_id,
        renotify: true
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('[Notification] Failed to create desktop notification', e);
    }
  }

  flashTabTitle(alertText) {
    if (this.titleFlashTimer) clearInterval(this.titleFlashTimer);
    let flash = false;
    this.titleFlashTimer = setInterval(() => {
      document.title = flash ? alertText : this.originalTitle;
      flash = !flash;
    }, 1000);

    const onFocus = () => {
      if (this.titleFlashTimer) {
        clearInterval(this.titleFlashTimer);
        this.titleFlashTimer = null;
        document.title = this.originalTitle;
      }
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
  }

  bindNotificationControls() {
    const btnSound = document.getElementById('btnToggleSound');

    // Update initial sound button state
    if (btnSound && window.sound) {
      btnSound.textContent = window.sound.enabled ? 'Alerts: On' : 'Alerts: Muted';
      btnSound.title = window.sound.enabled ? 'Sound alerts: Enabled' : 'Sound alerts: Muted';

      btnSound.addEventListener('click', async () => {
        const enabled = window.sound.toggleSound();
        btnSound.textContent = enabled ? 'Alerts: On' : 'Alerts: Muted';
        btnSound.title = enabled ? 'Sound alerts: Enabled' : 'Sound alerts: Muted';
        window.ui.showToast(enabled ? 'Sound alerts active' : 'Sound alerts muted', 'info');

        // Request desktop notification permission gracefully if not yet decided
        if (enabled && 'Notification' in window && Notification.permission === 'default') {
          try {
            await Notification.requestPermission();
          } catch (e) {}
        }
      });
    }
  }

  async refreshTickets() {
    try {
      const res = await window.api.getTickets(this.activeFilter);
      this.tickets = res.tickets || [];
      this.renderTickets(this.tickets);
    } catch (err) {
      window.ui.showToast('Failed to load tickets: ' + err.message, 'error');
    }
  }

  async refreshStats() {
    try {
      const stats = await window.api.getStats();
      document.getElementById('statTotal').textContent = stats.total || 0;
      document.getElementById('statPending').textContent = stats.pending || 0;
      document.getElementById('statOngoing').textContent = stats.ongoing || 0;
      document.getElementById('statSolved').textContent = stats.solved || 0;
    } catch (e) {
      // stats error catch
    }
  }

  renderTickets(tickets) {
    const container = document.getElementById('ticketsContainer');
    if (!container) return;

    if (!tickets || tickets.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 32px 16px;">
          <p style="color: var(--text-muted); font-size: 0.9rem;">No complaints in this view.</p>
        </div>
      `;
      this.renderHeatmap();
      this.checkSevereOutageAlert();
      return;
    }

    container.innerHTML = tickets.map(t => this.createTicketCardHtml(t)).join('');
    this.bindTicketEvents(container);
    this.renderHeatmap();
    this.checkSevereOutageAlert();
  }

  createTicketCardHtml(t) {
    const isPending = t.status === 'Pending';
    const isOngoing = t.status === 'Ongoing';
    const isSolved = t.status === 'Solved';
    const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="ticket-row" data-id="${t.ticket_id}">
        <div class="ticket-row-header">
          <div class="ticket-row-title">
            <span class="ticket-row-table">${window.ui.escapeHtml(t.team_no)}</span>
            <span class="ticket-row-team">${window.ui.escapeHtml(t.team_name)}</span>
            ${t.leader_name ? `<span style="font-size:0.82rem;color:var(--text-secondary);font-weight:500;">(Leader: ${window.ui.escapeHtml(t.leader_name)})</span>` : ''}
            <span class="ticket-row-id">#${t.ticket_id}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
            <span style="font-size:0.75rem;color:var(--text-muted);">${timeStr}</span>
          </div>
        </div>

        <div class="ticket-row-meta">
          <span>${window.ui.escapeHtml(t.venue)}</span>
          <span>&bull;</span>
          <span>${window.ui.escapeHtml(t.category)}</span>
        </div>

        <div class="ticket-row-body">
          ${window.ui.escapeHtml(t.issue)}
        </div>

        ${t.photo ? `
          <div style="margin-top: 8px;">
            <button type="button" class="btn btn-outline btn-sm btn-view-photo" data-photo="${t.photo}" data-id="${t.ticket_id}" style="display:inline-flex; align-items:center; gap:6px; padding:3px 10px; font-size:0.78rem;">
              View Attached Photo
            </button>
          </div>
        ` : ''}

        ${t.remarks ? `
          <div class="ticket-row-remarks">
            <span>Note:</span> <span>${window.ui.escapeHtml(t.remarks)}</span>
          </div>
        ` : ''}

        <div class="ticket-row-footer">
          <div class="ticket-row-handler">
            ${t.handled_by ? `<span>Assigned to <strong>${window.ui.escapeHtml(t.handled_by)}</strong></span>` : '<span style="color:var(--text-muted);">Unassigned</span>'}
          </div>

          <div style="display:flex;gap:6px;">
            ${isPending ? `
              <button class="btn btn-primary btn-sm btn-claim" data-id="${t.ticket_id}">
                Claim
              </button>
            ` : ''}

            ${!isSolved ? `
              <button class="btn btn-success btn-sm btn-resolve" data-id="${t.ticket_id}">
                Solve
              </button>
            ` : ''}

            <button class="btn btn-outline btn-sm btn-details" data-id="${t.ticket_id}" title="Edit note or status">
              Note
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindTicketEvents(container) {
    container.querySelectorAll('.btn-claim').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tid = btn.dataset.id;
        btn.disabled = true;
        try {
          await window.api.updateTicket(tid, {
            status: 'Ongoing',
            handledBy: this.currentUser.name
          });
          window.ui.showToast(`Claimed ${tid}!`, 'success');
          if (window.sound) window.sound.playSuccess();
        } catch (err) {
          window.ui.showToast(err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    container.querySelectorAll('.btn-resolve').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openResolutionModal(btn.dataset.id, 'Solved');
      });
    });

    container.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openResolutionModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-view-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const photo = btn.getAttribute('data-photo');
        const id = btn.getAttribute('data-id');
        const img = document.getElementById('photoModalImg');
        const title = document.getElementById('photoModalTitle');
        if (img) img.src = photo;
        if (title) title.textContent = `Attached Photo (#${id})`;
        window.ui.openModal('photoViewModal');
      });
    });
  }

  renderHeatmap() {
    const container = document.getElementById('venueHeatmapContainer');
    const summary = document.getElementById('heatmapSummary');
    const alertBanner = document.getElementById('preventiveAlertBanner');
    const alertText = document.getElementById('preventiveAlertText');
    const alertBtn = document.getElementById('btnFilterAlertVenue');
    if (!container) return;

    const trackedVenues = [
      { id: 'Hall A', label: 'Hall A', pattern: /hall\s*a/i },
      { id: 'Hall B', label: 'Hall B', pattern: /hall\s*b/i },
      { id: 'Hall C', label: 'Hall C', pattern: /hall\s*c/i },
      { id: 'Lab 104', label: 'Lab 104', pattern: /104/i },
      { id: 'Lab 105', label: 'Lab 105', pattern: /105/i },
      { id: 'Workshop', label: 'Workshop', pattern: /workshop/i },
      { id: 'Stage', label: 'Stage', pattern: /stage/i }
    ];

    const counts = {};
    const wifiPowerCounts = {};
    trackedVenues.forEach(v => { counts[v.id] = 0; wifiPowerCounts[v.id] = 0; });

    (this.tickets || []).forEach(t => {
      if (t.status === 'Pending' || t.status === 'Ongoing') {
        const vRaw = t.venue || '';
        const cat = (t.category || '').toLowerCase();
        const isWifiOrPower = cat.includes('wi-fi') || cat.includes('wifi') || cat.includes('power') || cat.includes('socket');

        trackedVenues.forEach(v => {
          if (v.pattern.test(vRaw)) {
            counts[v.id] = (counts[v.id] || 0) + 1;
            if (isWifiOrPower) {
              wifiPowerCounts[v.id] = (wifiPowerCounts[v.id] || 0) + 1;
            }
          }
        });
      }
    });

    let alertVenue = null;
    let maxIssues = 0;
    trackedVenues.forEach(v => {
      const active = counts[v.id] || 0;
      const wp = wifiPowerCounts[v.id] || 0;
      if ((active >= 3 || wp >= 2) && active > maxIssues) {
        alertVenue = v;
        maxIssues = active;
      }
    });

    if (alertBanner) {
      if (alertVenue) {
        alertBanner.style.display = 'block';
        if (alertText) {
          alertText.textContent = `High concentration of ${maxIssues} active issues in ${alertVenue.label}. Check hall access point router and power grid.`;
        }
        if (alertBtn) {
          alertBtn.onclick = () => {
            const select = document.getElementById('filterVenue');
            if (select) {
              select.value = alertVenue.id;
              select.dispatchEvent(new Event('change'));
            }
          };
        }
      } else {
        alertBanner.style.display = 'none';
      }
    }

    container.innerHTML = trackedVenues.map(v => {
      const count = counts[v.id] || 0;
      let badgeBg = 'var(--bg-subtle)';
      let badgeColor = 'var(--text-muted)';

      if (count >= 3) {
        badgeBg = '#FEE2E2';
        badgeColor = '#DC2626';
      } else if (count >= 1) {
        badgeBg = '#FEF3C7';
        badgeColor = '#D97706';
      } else {
        badgeBg = 'var(--primary-green-light)';
        badgeColor = 'var(--primary-green)';
      }

      return `
        <button type="button" class="heatmap-chip" data-venue="${v.id}" style="display:inline-flex; align-items:center; gap:8px; padding:6px 12px; background:${badgeBg}; border:1px solid var(--border-color); border-radius:var(--radius-sm); cursor:pointer; font-size:0.82rem; font-weight:600; color:var(--text-main); transition:all 0.2s ease;">
          <span>${v.label}</span>
          <span style="font-family:var(--font-mono); font-size:0.78rem; font-weight:700; color:${badgeColor}; background:rgba(255,255,255,0.7); padding:1px 6px; border-radius:10px;">${count}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.heatmap-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const venue = chip.getAttribute('data-venue');
        const select = document.getElementById('filterVenue');
        if (select) {
          select.value = venue;
          select.dispatchEvent(new Event('change'));
        }
      });
    });

    if (summary) {
      const totalActive = Object.values(counts).reduce((a, b) => a + b, 0);
      summary.textContent = totalActive === 0 ? 'All halls operating normally' : `${totalActive} total active floor issue(s)`;
    }
  }

  checkSevereOutageAlert() {
    const banner = document.getElementById('severeOutageBanner');
    const textEl = document.getElementById('severeOutageText');
    const teamsListEl = document.getElementById('severeOutageTeamsList');
    const filterBtn = document.getElementById('btnFilterSevereCategory');
    const ackBtn = document.getElementById('btnAcknowledgeSevere');

    if (!banner) return;

    // Group active tickets by normalized category
    // Active tickets = Pending or Ongoing
    const categoryTeamMap = {};

    (this.tickets || []).forEach(t => {
      if (t.status === 'Pending' || t.status === 'Ongoing') {
        const cat = (t.category || 'General').trim();
        if (!categoryTeamMap[cat]) {
          categoryTeamMap[cat] = new Set();
        }
        const teamIdentifier = t.team_no ? `${t.team_no} (${t.team_name})` : t.team_name;
        categoryTeamMap[cat].add(teamIdentifier);
      }
    });

    // Alert threshold: More than 7 distinct teams reporting a similar category (>7, i.e. 8+)
    const SEVERE_THRESHOLD = 7;
    let severeCategory = null;
    let severeTeams = [];

    for (const [cat, teamsSet] of Object.entries(categoryTeamMap)) {
      if (teamsSet.size > SEVERE_THRESHOLD) {
        if (!severeCategory || teamsSet.size > severeTeams.length) {
          severeCategory = cat;
          severeTeams = Array.from(teamsSet);
        }
      }
    }

    if (severeCategory && severeTeams.length > SEVERE_THRESHOLD) {
      banner.style.display = 'block';

      if (textEl) {
        textEl.textContent = `${severeTeams.length} teams are currently reporting similar '${severeCategory}' issues across the arena! This exceeds the threshold of 7 teams and indicates a venue-wide failure. Immediate organizer & NOC intervention required.`;
      }

      if (teamsListEl) {
        const preview = severeTeams.slice(0, 8).join(' • ');
        const extra = severeTeams.length > 8 ? ` • and ${severeTeams.length - 8} more` : '';
        teamsListEl.textContent = `Affected Teams (${severeTeams.length}): ${preview}${extra}`;
      }

      if (filterBtn) {
        filterBtn.onclick = () => {
          const searchInput = document.getElementById('searchTickets');
          if (searchInput) {
            searchInput.value = severeCategory;
            this.activeFilter.search = severeCategory;
            this.refreshTickets();
          }
        };
      }

      if (ackBtn) {
        ackBtn.onclick = () => {
          banner.style.display = 'none';
          this.severeAlertAcknowledgedCategory = severeCategory;
        };
      }

      // If this is a newly detected severe category (and not acknowledged), play alarm and notify
      if (this.lastSevereCategory !== severeCategory && this.severeAlertAcknowledgedCategory !== severeCategory) {
        this.lastSevereCategory = severeCategory;

        if (window.sound?.playSevereOutage) {
          window.sound.playSevereOutage();
        } else if (window.sound?.playCritical) {
          window.sound.playCritical();
        }

        this.flashTabTitle(`CRITICAL: ${severeTeams.length} TEAMS REPORTING ${severeCategory.toUpperCase()}!`);
        this.sendDesktopNotification({
          ticket_id: 'SYSTEM-ALERT',
          team_no: `${severeTeams.length} Teams`,
          team_name: 'CRITICAL OUTAGE',
          venue: 'All Arena Halls',
          category: severeCategory,
          issue: `Severe cluster: ${severeTeams.length} teams reporting similar ${severeCategory} issues!`
        });
      }
    } else {
      banner.style.display = 'none';
      this.lastSevereCategory = null;
    }
  }

  prependTicket(ticket) {
    this.tickets.unshift(ticket);
    this.refreshTickets();
  }

  updateLocalTicket(updatedTicket) {
    const idx = this.tickets.findIndex(t => t.ticket_id === updatedTicket.ticket_id);
    if (idx !== -1) {
      this.tickets[idx] = updatedTicket;
      this.renderTickets(this.tickets);
    }
  }

  bindFilters() {
    document.querySelectorAll('.filter-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter.status = btn.dataset.status;
        this.refreshTickets();
      });
    });

    const venueSelect = document.getElementById('filterVenue');
    if (venueSelect) {
      venueSelect.addEventListener('change', () => {
        this.activeFilter.venue = venueSelect.value;
        this.refreshTickets();
      });
    }

    const searchInput = document.getElementById('searchTickets');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.activeFilter.search = searchInput.value.trim();
          this.refreshTickets();
        }, 250);
      });
    }
  }

  openResolutionModal(ticketId, targetStatus = null) {
    const ticket = this.tickets.find(t => t.ticket_id === ticketId);
    if (!ticket) return;

    this.currentTicket = ticket;
    document.getElementById('modalTicketId').textContent = ticket.ticket_id;
    const leadInfo = ticket.leader_name ? ` • Leader: ${ticket.leader_name}` : '';
    document.getElementById('modalTeam').textContent = `${ticket.team_name} (${ticket.team_no})${leadInfo} - ${ticket.venue}`;
    document.getElementById('modalIssue').textContent = ticket.issue;
    document.getElementById('modalStatusSelect').value = targetStatus || ticket.status;
    document.getElementById('modalRemarksInput').value = ticket.remarks || '';

    window.ui.openModal('resolveModal');
  }

  bindModals() {
    const resolveForm = document.getElementById('resolveTicketForm');
    if (resolveForm) {
      resolveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.currentTicket) return;

        const status = document.getElementById('modalStatusSelect').value;
        const remarks = document.getElementById('modalRemarksInput').value.trim();
        const submitBtn = resolveForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        try {
          await window.api.updateTicket(this.currentTicket.ticket_id, {
            status,
            remarks,
            handledBy: this.currentUser.name
          });
          window.ui.showToast(`Updated ${this.currentTicket.ticket_id}`, 'success');
          if (window.sound) window.sound.playSuccess();
          window.ui.closeModal('resolveModal');
        } catch (err) {
          window.ui.showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    document.querySelectorAll('.chip-btn[data-remark]').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.remark;
        const input = document.getElementById('modalRemarksInput');
        input.value = input.value ? `${input.value}. ${text}` : text;
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.ui.closeModal(btn.dataset.closeModal);
      });
    });
  }

  bindActions() {
    document.getElementById('btnManageRoster')?.addEventListener('click', () => {
      window.ui.openModal('rosterModal');
      this.loadRosterList();
    });

    document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('newUserName').value.trim();
      const role = document.getElementById('newUserRole').value;
      const dept = document.getElementById('newUserDept').value.trim();
      const key = document.getElementById('newUserCustomKey').value.trim();

      try {
        const res = await window.api.createUser({ name, role, department: dept, key });
        window.ui.showToast(`Created ${name}! Key: ${res.generated_key}`, 'success');
        document.getElementById('createUserForm').reset();
        this.loadRosterList();
      } catch (err) {
        window.ui.showToast(err.message, 'error');
      }
    });

    document.getElementById('btnExportCsv')?.addEventListener('click', async () => {
      try {
        await window.api.downloadExport();
      } catch (err) {
        window.ui.showToast(`Export failed: ${err.message}`, 'error');
      }
    });
  }

  async loadRosterList() {
    const container = document.getElementById('rosterListContainer');
    if (!container) return;

    try {
      const res = await window.api.getUsers();
      container.innerHTML = res.users.map(u => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 6px;">
          <div>
            <strong>${window.ui.escapeHtml(u.name)}</strong>
            <span class="role-badge role-${u.role}" style="margin-left: 4px;">${u.role}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${u.key_prefix}</div>
          </div>
          ${u.role !== 'superadmin' ? `
            <button class="btn btn-outline btn-sm btn-toggle-user" data-id="${u.id}" data-active="${u.active}">
              ${u.active ? 'Deactivate' : 'Activate'}
            </button>
          ` : '<span style="font-size: 0.75rem; color: var(--text-muted);">Admin</span>'}
        </div>
      `).join('');

      container.querySelectorAll('.btn-toggle-user').forEach(b => {
        b.addEventListener('click', async () => {
          const uid = b.dataset.id;
          const current = b.dataset.active === '1';
          await window.api.toggleUser(uid, !current);
          this.loadRosterList();
        });
      });
    } catch (err) {
      container.innerHTML = `<p style="color: var(--status-critical);">${err.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminConsole = new AdminConsole();
});
