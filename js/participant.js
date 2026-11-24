/**
 * participant.js — Simplified Participant Portal Controller
 */

class ParticipantPortal {
  constructor() {
    this.cooldownTimer = null;
    this.autofillDebounce = null;
    this.activeTicketId = localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.ACTIVE_TICKET) || '';
    this.init();
  }

  init() {
    this.populateVenuesAndCategories();
    this.populateTableSuggestions();
    this.restoreSavedData();
    this.bindAutofill();
    this.bindResetButton();
    this.bindPhotoInput();
    this.bindForm();
    this.bindScrollToForm();
    this.checkCooldown();
    this.bindGuide();

    if (this.activeTicketId) {
      const successCard = document.getElementById('submissionSuccessCard');
      const successId = document.getElementById('successTicketId');
      if (successCard && successId) {
        successId.textContent = this.activeTicketId;
        successCard.style.display = 'block';
      }
    }
  }

  populateVenuesAndCategories() {
    const venue = document.getElementById('venueSelect');
    const cat = document.getElementById('category');

    if (venue) {
      venue.innerHTML = `<option value="" disabled selected>Select venue / hall...</option>` +
        window.SIH_CONFIG.VENUES.map(v => `<option value="${v}">${v}</option>`).join('');
    }

    if (cat) {
      cat.innerHTML = `<option value="" disabled selected>Select issue type...</option>` +
        window.SIH_CONFIG.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  }

  populateTableSuggestions() {
    const dlTable = document.getElementById('tableSuggestions');
    const dlTeam = document.getElementById('teamSuggestions');
    const dlLeader = document.getElementById('leaderSuggestions');
    const known = window.SIH_CONFIG.KNOWN_TEAMS || {};

    if (dlTable) {
      const tableOpts = [];
      for (const num of Object.keys(known).sort((a, b) => Number(a) - Number(b))) {
        const lead = known[num].leaderName ? ` (${known[num].leaderName})` : '';
        tableOpts.push(`<option value="Table ${num}">Table ${num} — ${known[num].teamName}${lead}</option>`);
      }
      dlTable.innerHTML = tableOpts.join('');
    }

    if (dlTeam) {
      const teamOpts = [];
      for (const num of Object.keys(known).sort((a, b) => Number(a) - Number(b))) {
        const lead = known[num].leaderName ? ` (${known[num].leaderName})` : '';
        teamOpts.push(`<option value="${known[num].teamName}">Table ${num} — ${known[num].venue}${lead}</option>`);
      }
      dlTeam.innerHTML = teamOpts.join('');
    }

    if (dlLeader) {
      const leaderOpts = [];
      for (const num of Object.keys(known).sort((a, b) => Number(a) - Number(b))) {
        if (known[num].leaderName) {
          leaderOpts.push(`<option value="${known[num].leaderName}">${known[num].leaderName} — ${known[num].teamName} (Table ${num})</option>`);
        }
      }
      dlLeader.innerHTML = leaderOpts.join('');
    }
  }

  setVenue(venueStr) {
    const venueSelect = document.getElementById('venueSelect');
    if (!venueSelect || !venueStr) return;

    const raw = venueStr.trim().toLowerCase();

    // 1. Exact match
    for (const opt of venueSelect.options) {
      if (opt.value && opt.value.toLowerCase() === raw) {
        venueSelect.value = opt.value;
        this.highlightField(venueSelect);
        return;
      }
    }

    // 2. Keyword detection for halls & labs
    const venueKeywords = [
      { keys: ['hall a'], match: 'Main Arena — Hall A' },
      { keys: ['hall b'], match: 'Main Arena — Hall B' },
      { keys: ['hall c'], match: 'Main Arena — Hall C' },
      { keys: ['104'], match: 'Hardware Lab 104' },
      { keys: ['105', '1st floor'], match: 'Hardware Lab 105' },
      { keys: ['stage'], match: 'Main Stage' },
      { keys: ['workshop'], match: 'Workshop Area' }
    ];

    for (const item of venueKeywords) {
      if (item.keys.some(k => raw.includes(k))) {
        for (const opt of venueSelect.options) {
          if (opt.value === item.match || opt.value.includes(item.match)) {
            venueSelect.value = opt.value;
            this.highlightField(venueSelect);
            return;
          }
        }
      }
    }

    // 3. Normalized alphanumeric fallback
    const cleanRaw = raw.replace(/[^a-z0-9]/g, '');
    for (const opt of venueSelect.options) {
      const cleanOpt = opt.value.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanOpt && (cleanOpt.includes(cleanRaw) || cleanRaw.includes(cleanOpt))) {
        venueSelect.value = opt.value;
        this.highlightField(venueSelect);
        return;
      }
    }
  }

  highlightField(el) {
    if (!el) return;
    el.classList.remove('pop-anim');
    void el.offsetWidth;
    el.classList.add('pop-anim');
  }

  bindAutofill() {
    const teamNoInput = document.getElementById('teamNo');
    const teamNameInput = document.getElementById('teamName');
    const leaderNameInput = document.getElementById('leaderName');
    const venueSelect = document.getElementById('venueSelect');
    const notice = document.getElementById('autofillNotice');
    const noticeTeam = document.getElementById('autofillTeamName');

    if (!teamNoInput || !teamNameInput) return;

    let isUpdating = false;

    // Lookup by Table Number
    const performTableLookup = async (val) => {
      if (isUpdating || !val || !val.trim()) {
        if (!val || !val.trim()) if (notice) notice.style.display = 'none';
        return;
      }

      const match = val.match(/\d+/);
      const tableNum = match ? match[0] : val.trim();
      const known = window.SIH_CONFIG.KNOWN_TEAMS || {};

      let result = known[tableNum] || null;

      if (!result && window.api && window.api.lookupTable) {
        try {
          const resp = await window.api.lookupTable(tableNum);
          if (resp && resp.found && resp.data) {
            result = {
              teamName: resp.data.team_name,
              leaderName: resp.data.leader_name || '',
              venue: resp.data.venue
            };
          }
        } catch (e) {}
      }

      if (result) {
        isUpdating = true;
        if (teamNameInput) {
          teamNameInput.value = result.teamName;
          this.highlightField(teamNameInput);
        }

        if (leaderNameInput && result.leaderName) {
          leaderNameInput.value = result.leaderName;
          this.highlightField(leaderNameInput);
        }

        if (result.venue) {
          this.setVenue(result.venue);
        }

        if (notice && noticeTeam) {
          const currentVenue = venueSelect ? venueSelect.value : result.venue;
          const leadStr = result.leaderName ? ` • Leader: ${result.leaderName}` : '';
          noticeTeam.textContent = `${result.teamName}${leadStr} • ${currentVenue}`;
          notice.style.display = 'block';
        }
        setTimeout(() => { isUpdating = false; }, 100);
      }
    };

    // Lookup by Team Name
    const performTeamLookup = async (val) => {
      if (isUpdating || !val || val.trim().length < 2) return;

      const trimmed = val.trim().toLowerCase();
      const known = window.SIH_CONFIG.KNOWN_TEAMS || {};

      let foundNum = null;
      let foundData = null;

      for (const [num, data] of Object.entries(known)) {
        if (data.teamName.toLowerCase() === trimmed) {
          foundNum = num;
          foundData = data;
          break;
        }
      }

      if (!foundData) {
        for (const [num, data] of Object.entries(known)) {
          if (data.teamName.toLowerCase().startsWith(trimmed) || data.teamName.toLowerCase().includes(trimmed)) {
            foundNum = num;
            foundData = data;
            break;
          }
        }
      }

      if (!foundData && window.api && window.api.lookupTeam) {
        try {
          const resp = await window.api.lookupTeam(val.trim());
          if (resp && resp.found && resp.data) {
            foundNum = resp.data.team_no;
            foundData = {
              teamName: val.trim(),
              leaderName: resp.data.leader_name || '',
              venue: resp.data.venue
            };
          }
        } catch (e) {}
      }

      if (foundData) {
        isUpdating = true;
        if (teamNoInput) {
          teamNoInput.value = foundNum.startsWith('Table') ? foundNum : `Table ${foundNum}`;
          this.highlightField(teamNoInput);
        }

        if (leaderNameInput && foundData.leaderName) {
          leaderNameInput.value = foundData.leaderName;
          this.highlightField(leaderNameInput);
        }

        if (foundData.venue) {
          this.setVenue(foundData.venue);
        }

        if (notice && noticeTeam) {
          const tLabel = foundNum.startsWith('Table') ? foundNum : `Table ${foundNum}`;
          const currentVenue = venueSelect ? venueSelect.value : foundData.venue;
          const leadStr = foundData.leaderName ? ` • Leader: ${foundData.leaderName}` : '';
          noticeTeam.textContent = `${tLabel}${leadStr} • ${currentVenue}`;
          notice.style.display = 'block';
        }
        setTimeout(() => { isUpdating = false; }, 100);
      }
    };

    // Lookup by Team Leader Name
    const performLeaderLookup = async (val) => {
      if (isUpdating || !val || val.trim().length < 2) return;

      const trimmed = val.trim().toLowerCase();
      const known = window.SIH_CONFIG.KNOWN_TEAMS || {};

      let foundNum = null;
      let foundData = null;

      for (const [num, data] of Object.entries(known)) {
        if (data.leaderName && data.leaderName.toLowerCase() === trimmed) {
          foundNum = num;
          foundData = data;
          break;
        }
      }

      if (!foundData) {
        for (const [num, data] of Object.entries(known)) {
          if (data.leaderName && (data.leaderName.toLowerCase().startsWith(trimmed) || data.leaderName.toLowerCase().includes(trimmed))) {
            foundNum = num;
            foundData = data;
            break;
          }
        }
      }

      if (!foundData && window.api && window.api.lookupLeader) {
        try {
          const resp = await window.api.lookupLeader(val.trim());
          if (resp && resp.found && resp.data) {
            foundNum = resp.data.team_no;
            foundData = {
              teamName: resp.data.team_name,
              leaderName: resp.data.leader_name || val.trim(),
              venue: resp.data.venue
            };
          }
        } catch (e) {}
      }

      if (foundData) {
        isUpdating = true;
        if (teamNoInput) {
          teamNoInput.value = foundNum.startsWith('Table') ? foundNum : `Table ${foundNum}`;
          this.highlightField(teamNoInput);
        }

        if (teamNameInput) {
          teamNameInput.value = foundData.teamName;
          this.highlightField(teamNameInput);
        }

        if (foundData.venue) {
          this.setVenue(foundData.venue);
        }

        if (notice && noticeTeam) {
          const tLabel = foundNum.startsWith('Table') ? foundNum : `Table ${foundNum}`;
          const currentVenue = venueSelect ? venueSelect.value : foundData.venue;
          noticeTeam.textContent = `${tLabel} • ${foundData.teamName} • ${currentVenue}`;
          notice.style.display = 'block';
        }
        setTimeout(() => { isUpdating = false; }, 100);
      }
    };

    teamNoInput.addEventListener('input', (e) => {
      const match = e.target.value.match(/\d+/);
      const tableNum = match ? match[0] : e.target.value.trim();
      const known = window.SIH_CONFIG.KNOWN_TEAMS || {};
      if (known[tableNum]) {
        clearTimeout(this.autofillDebounce);
        performTableLookup(e.target.value);
      } else {
        clearTimeout(this.autofillDebounce);
        this.autofillDebounce = setTimeout(() => performTableLookup(e.target.value), 200);
      }
    });

    teamNoInput.addEventListener('change', (e) => {
      performTableLookup(e.target.value);
    });

    teamNameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      const known = window.SIH_CONFIG.KNOWN_TEAMS || {};
      const exact = Object.values(known).some(d => d.teamName.toLowerCase() === val);
      if (exact) {
        clearTimeout(this.autofillDebounce);
        performTeamLookup(e.target.value);
      } else {
        clearTimeout(this.autofillDebounce);
        this.autofillDebounce = setTimeout(() => performTeamLookup(e.target.value), 200);
      }
    });

    teamNameInput.addEventListener('change', (e) => {
      performTeamLookup(e.target.value);
    });

    if (leaderNameInput) {
      leaderNameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        const known = window.SIH_CONFIG.KNOWN_TEAMS || {};
        const exact = Object.values(known).some(d => d.leaderName && d.leaderName.toLowerCase() === val);
        if (exact) {
          clearTimeout(this.autofillDebounce);
          performLeaderLookup(e.target.value);
        } else {
          clearTimeout(this.autofillDebounce);
          this.autofillDebounce = setTimeout(() => performLeaderLookup(e.target.value), 200);
        }
      });

      leaderNameInput.addEventListener('change', (e) => {
        performLeaderLookup(e.target.value);
      });
    }
  }

  bindResetButton() {
    const resetBtn = document.getElementById('resetFormBtn');
    const form = document.getElementById('ticketForm');
    const notice = document.getElementById('autofillNotice');
    const successCard = document.getElementById('submissionSuccessCard');

    if (!resetBtn || !form) return;

    resetBtn.addEventListener('click', () => {
      form.reset();
      this.clearPhoto();
      if (notice) notice.style.display = 'none';
      if (successCard) successCard.style.display = 'none';

      localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_TEAM);
      localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_TABLE);
      localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_LEADER);
      localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_VENUE);

      window.ui.showToast('Form cleared.', 'info');
      document.getElementById('teamNo')?.focus();
    });
  }

  bindPhotoInput() {
    const input = document.getElementById('photoInput');
    const previewContainer = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('photoPreviewImg');
    const previewName = document.getElementById('photoPreviewName');
    const previewSize = document.getElementById('photoPreviewSize');
    const removeBtn = document.getElementById('btnRemovePhoto');

    this.currentPhotoData = '';
    if (!input) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        this.clearPhoto();
        return;
      }

      if (!file.type.startsWith('image/')) {
        window.ui.showToast('Please select an image file (PNG/JPEG).', 'error');
        this.clearPhoto();
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          this.currentPhotoData = compressed;

          if (previewImg) previewImg.src = compressed;
          if (previewName) previewName.textContent = file.name;
          if (previewSize) {
            const kb = Math.round((compressed.length * 0.75) / 1024);
            previewSize.textContent = `${kb} KB (Ready to upload)`;
          }
          if (previewContainer) previewContainer.style.display = 'flex';
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.clearPhoto();
      });
    }
  }

  clearPhoto() {
    this.currentPhotoData = '';
    const input = document.getElementById('photoInput');
    const previewContainer = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('photoPreviewImg');
    if (input) input.value = '';
    if (previewImg) previewImg.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
  }

  restoreSavedData() {
    const t = document.getElementById('teamName');
    const n = document.getElementById('teamNo');
    const l = document.getElementById('leaderName');
    const v = document.getElementById('venueSelect');

    const st = localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_TEAM);
    const sn = localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_TABLE);
    const sl = localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_LEADER);
    const sv = localStorage.getItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_VENUE);

    if (sn && n) n.value = sn;
    if (st && t) t.value = st;
    if (sl && l) l.value = sl;
    if (sv && v) {
      for (let o of v.options) {
        if (o.value === sv) { v.value = sv; break; }
      }
    }
  }

  async checkCooldown() {
    const key = window.SIH_CONFIG.STORAGE_KEYS.COOLDOWN_UNTIL;
    const until = Number(localStorage.getItem(key)) || 0;
    const now = Date.now();

    if (until > now) {
      const remaining = Math.ceil((until - now) / 1000);
      this.startCooldownTimer(remaining);
      return;
    }

    try {
      const r = await window.api.checkCooldown();
      if (!r.can_submit && r.remaining_seconds > 0) {
        this.startCooldownTimer(r.remaining_seconds);
      }
    } catch (e) {}
  }

  startCooldownTimer(sec) {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);

    const btn = document.getElementById('submitTicketBtn');
    const card = document.getElementById('cooldownCard');
    const countdown = document.getElementById('cooldownCountdown');
    const progress = document.getElementById('cooldownProgressBar');

    const totalSec = window.SIH_CONFIG.COOLDOWN_SECONDS || 300;
    let rem = sec;

    const until = Date.now() + (rem * 1000);
    localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.COOLDOWN_UNTIL, String(until));

    if (card) card.style.display = 'block';

    const tick = () => {
      if (rem <= 0) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
        localStorage.removeItem(window.SIH_CONFIG.STORAGE_KEYS.COOLDOWN_UNTIL);

        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Submit Request';
        }
        if (card) card.style.display = 'none';

        window.ui.showToast('Cooldown ended. You can submit another request now.', 'success');
        if (window.sound) window.sound.playSuccess();
        return;
      }

      const m = Math.floor(rem / 60);
      const s = rem % 60;
      const timeStr = `${m}m ${s < 10 ? '0' : ''}${s}s`;

      if (btn) {
        btn.disabled = true;
        btn.textContent = `Wait ${timeStr}`;
      }

      if (countdown) countdown.textContent = timeStr;

      if (progress) {
        const pct = Math.max(0, Math.min(100, (rem / totalSec) * 100));
        progress.style.width = `${pct}%`;
      }

      rem--;
    };

    tick();
    this.cooldownTimer = setInterval(tick, 1000);
  }

  bindForm() {
    const form = document.getElementById('ticketForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.cooldownTimer) {
        window.ui.showToast('Please wait for the cooldown to finish.', 'error');
        return;
      }

      const teamNo = document.getElementById('teamNo').value.trim();
      const teamName = document.getElementById('teamName').value.trim();
      const leaderName = document.getElementById('leaderName') ? document.getElementById('leaderName').value.trim() : '';
      const venue = document.getElementById('venueSelect').value;
      const category = document.getElementById('category').value;
      const issue = document.getElementById('issue').value.trim();

      if (!teamName || !teamNo || !venue || !category || !issue) {
        window.ui.showToast('Please fill in all required fields.', 'error');
        return;
      }

      localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_TEAM, teamName);
      localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_TABLE, teamNo);
      if (leaderName) {
        localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_LEADER, leaderName);
      }
      localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.SAVED_VENUE, venue);

      const btn = document.getElementById('submitTicketBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        const res = await window.api.submitTicket({
          teamName,
          teamNo,
          leaderName,
          venue,
          category,
          issue,
          photo: this.currentPhotoData || '',
          track: 'general'
        });

        window.ui.showToast(`Request submitted! Ticket: ${res.ticket.ticket_id}`, 'success');
        if (window.sound) window.sound.playSuccess();

        // Clear photo & issue description
        this.clearPhoto();
        document.getElementById('issue').value = '';

        this.activeTicketId = res.ticket.ticket_id;
        localStorage.setItem(window.SIH_CONFIG.STORAGE_KEYS.ACTIVE_TICKET, this.activeTicketId);

        // Start cooldown
        this.startCooldownTimer(window.SIH_CONFIG.COOLDOWN_SECONDS);
      } catch (err) {
        window.ui.showToast(err.message || 'Submission failed.', 'error');
        btn.disabled = false;
        btn.textContent = 'Submit Request';
      }
    });
  }

  bindScrollToForm() {
    const btn = document.getElementById('btnScrollToForm');
    if (btn) {
      btn.addEventListener('click', () => {
        const formCard = document.getElementById('helpdeskCard');
        if (formCard) {
          formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const teamNoInput = document.getElementById('teamNo');
        if (teamNoInput) {
          setTimeout(() => teamNoInput.focus(), 350);
        }
      });
    }
  }

  bindGuide() {
    document.getElementById('copyWifiBtn')?.addEventListener('click', () => {
      window.ui.copyText('[Arena Wi-Fi Password]', 'Wi-Fi Password placeholder copied!');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.portal = new ParticipantPortal();
});
