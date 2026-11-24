/**
 * config.js - Global Configuration for SIH Support Desk
 */

window.SIH_CONFIG = {
  API_BASE: '',
  COOLDOWN_SECONDS: 300, // 5 minutes cooldown between requests
  POLL_INTERVAL_MS: 10000,

  VENUES: [
    'Main Arena — Hall A',
    'Main Arena — Hall B',
    'Main Arena — Hall C',
    'Hardware Lab 104',
    'Hardware Lab 105',
    'Main Stage',
    'Workshop Area'
  ],

  CATEGORIES: [
    'Wi-Fi & Network',
    'Power Socket / Extension Box',
    'Hardware & Components',
    'Software / Tooling / Environment',
    'Mentor Assistance',
    'Food / Water / Cleanliness',
    'General Query'
  ],

  // Registered Table-to-Team, Leader & Venue mapping for instant autofill.
  // Add your actual hackathon table allocations here:
  // Format: "table_number": { teamName: "Team Name", leaderName: "Leader Name", venue: "Venue Name" }
  KNOWN_TEAMS: {
    // Add your teams here later:
    // "1": { teamName: "Team Name", leaderName: "Leader Name", venue: "Main Arena — Hall A" },
  },

  STORAGE_KEYS: {
    DEVICE_ID: 'sih_device_uuid',
    SAVED_TEAM: 'sih_participant_team',
    SAVED_TABLE: 'sih_participant_table',
    SAVED_LEADER: 'sih_participant_leader',
    SAVED_VENUE: 'sih_participant_venue',
    ACTIVE_TICKET: 'sih_active_ticket_id',
    COOLDOWN_UNTIL: 'sih_cooldown_until',
    AUTH_TOKEN: 'sih_auth_token',
    AUTH_USER: 'sih_auth_user',
    THEME: 'sih_theme_mode',
    SOUND_ENABLED: 'sih_sound_enabled'
  },

  ROLES: {
    SUPERADMIN: 'superadmin',
    VOLUNTEER: 'volunteer',
    MENTOR: 'mentor'
  }
};
