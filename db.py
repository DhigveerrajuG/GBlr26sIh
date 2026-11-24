"""
db.py - Robust SQLite Database Module for SIH Support Desk
Zero external dependencies (uses Python built-in sqlite3, hashlib, secrets).
Features:
- SQLite with WAL (Write-Ahead Logging) for high concurrency
- Atomic transactions
- Strong Role-Based Access Control (RBAC) with hashed access keys
- Sessions with cryptographic tokens and expiration
- Audit logging
- Auto-migration from legacy data/database.json
"""

import os
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'support_desk.db')
LEGACY_JSON_PATH = os.path.join(DATA_DIR, 'database.json')

def hash_key(key: str) -> str:
    """Hash an access key using SHA-256."""
    return hashlib.sha256(key.strip().encode('utf-8')).hexdigest()

def get_connection() -> sqlite3.Connection:
    """Return an SQLite connection configured with WAL mode and foreign keys."""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn

def init_db():
    """Initialize database tables and indexes."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Tickets table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id TEXT UNIQUE NOT NULL,
                timestamp TEXT NOT NULL,
                team_name TEXT NOT NULL,
                team_no TEXT NOT NULL,
                category TEXT NOT NULL,
                issue TEXT NOT NULL,
                venue TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Ongoing', 'Solved', 'Escalated')),
                priority TEXT NOT NULL DEFAULT 'Normal' CHECK(priority IN ('Low', 'Normal', 'High', 'Critical')),
                remarks TEXT DEFAULT '',
                last_updated TEXT NOT NULL,
                handled_by TEXT DEFAULT '',
                handler_role TEXT DEFAULT '',
                device_fingerprint TEXT DEFAULT ''
            );
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_venue ON tickets(venue);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_timestamp ON tickets(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_team_no ON tickets(team_no);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_team_name ON tickets(team_name);")

        # Migrate track and leader_name columns if not present
        cursor.execute("PRAGMA table_info(tickets);")
        columns = [col['name'] for col in cursor.fetchall()]
        if 'track' not in columns:
            cursor.execute("ALTER TABLE tickets ADD COLUMN track TEXT DEFAULT 'software';")
        if 'leader_name' not in columns:
            cursor.execute("ALTER TABLE tickets ADD COLUMN leader_name TEXT DEFAULT '';")
        if 'photo' not in columns:
            cursor.execute("ALTER TABLE tickets ADD COLUMN photo TEXT DEFAULT '';")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_leader_name ON tickets(leader_name);")

        # Users table (Superadmin, Floor Volunteer, Mentor)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                key_prefix TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('superadmin', 'volunteer', 'mentor')),
                active INTEGER NOT NULL DEFAULT 1,
                department TEXT DEFAULT '',
                created_by TEXT DEFAULT 'System',
                created_at TEXT NOT NULL,
                last_login TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_key_hash ON users(key_hash);")

        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_name TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);")

        # Audit Logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                actor_name TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                action TEXT NOT NULL,
                target_id TEXT DEFAULT '',
                details TEXT DEFAULT ''
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);")

        # System Settings / Meta table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # Cooldown submissions table for rate limiting
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS submission_cooldowns (
                device_id TEXT PRIMARY KEY,
                last_submitted TEXT NOT NULL
            );
        """)

        conn.commit()

    # Seed default users and migrate legacy JSON if needed
    seed_default_users()
    migrate_legacy_data()

def seed_default_users():
    """Ensure baseline superadmin, volunteers, and mentors exist."""
    default_accounts = [
        ("Organizer Lead", "SIH-OWNER-2026", "superadmin", "Command Center", "System"),
        ("Floor Volunteer Alex", "VOL-ALEX-2026", "volunteer", "Hall A & B", "System"),
        ("Floor Volunteer Priya", "VOL-PRIYA-2026", "volunteer", "Hall C & Hardware", "System"),
        ("Mentor Dr. Ramesh", "MNT-RAMESH-2026", "mentor", "Hardware & IoT Lab", "System"),
        ("Mentor Sarah", "MNT-SARAH-2026", "mentor", "Software & Cloud", "System")
    ]

    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        for name, key, role, dept, creator in default_accounts:
            k_hash = hash_key(key)
            prefix = key[:7] + '...' if len(key) > 7 else key
            cursor.execute("""
                INSERT OR IGNORE INTO users (name, key_hash, key_prefix, role, active, department, created_by, created_at)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            """, (name, k_hash, prefix, role, dept, creator, now))
        conn.commit()

def migrate_legacy_data():
    """Migrate complaints from legacy database.json if tickets table is empty."""
    if not os.path.exists(LEGACY_JSON_PATH):
        return

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM tickets;")
        count = cursor.fetchone()['count']
        if count > 0:
            return  # Already populated

        try:
            with open(LEGACY_JSON_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
            complaints = data.get('complaints', [])
            for c in complaints:
                cursor.execute("""
                    INSERT OR IGNORE INTO tickets (
                        ticket_id, timestamp, team_name, team_no, category,
                        issue, venue, status, priority, remarks, last_updated,
                        handled_by, handler_role, device_fingerprint
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c.get('ticketId'),
                    c.get('timestamp') or datetime.now(timezone.utc).isoformat(),
                    c.get('teamName', 'Team'),
                    c.get('teamNo', 'Table 0'),
                    c.get('category', 'General Support'),
                    c.get('issue', ''),
                    c.get('venue', 'Main Arena, Hall A'),
                    c.get('status', 'Pending'),
                    c.get('priority', 'Normal'),
                    c.get('remarks', ''),
                    c.get('lastUpdated') or datetime.now(timezone.utc).isoformat(),
                    c.get('handledBy', ''),
                    'volunteer' if c.get('handledBy') else '',
                    'legacy-migration'
                ))
            conn.commit()
            print(f"[DB] Successfully migrated {len(complaints)} legacy tickets.")
        except Exception as e:
            print(f"[DB] Warning: Legacy migration failed: {e}")

# ================= AUTHENTICATION & SESSIONS =================

def authenticate_user(raw_key: str) -> Optional[Dict[str, Any]]:
    """Verify an access key and return the user dict if valid and active."""
    if not raw_key or not isinstance(raw_key, str):
        return None
    k_hash = hash_key(raw_key.strip())
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, role, active, department, created_at
            FROM users
            WHERE key_hash = ? AND active = 1
        """, (k_hash,))
        row = cursor.fetchone()
        if row:
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, row['id']))
            conn.commit()
            return dict(row)
    return None

def create_session(user_id: int, user_name: str, role: str, expiry_hours: int = 24) -> str:
    """Generate a secure cryptographic session token."""
    token = secrets.token_hex(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(hours=expiry_hours)).isoformat()
    now_iso = now.isoformat()

    with get_connection() as conn:
        cursor = conn.cursor()
        # Clean expired sessions
        cursor.execute("DELETE FROM sessions WHERE expires_at < ?", (now_iso,))
        cursor.execute("""
            INSERT INTO sessions (token, user_id, user_name, role, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (token, user_id, user_name, role, now_iso, expires_at))
        conn.commit()
    return token

def get_session(token: str) -> Optional[Dict[str, Any]]:
    """Validate token and return active session details."""
    if not token:
        return None
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.token, s.user_id, s.user_name, s.role, s.expires_at, u.active, u.department
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ? AND u.active = 1
        """, (token, now_iso))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None

def delete_session(token: str) -> bool:
    """Invalidate a session on logout."""
    if not token:
        return False
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        return cursor.rowcount > 0

# ================= USER MANAGEMENT (RBAC) =================

def list_users() -> List[Dict[str, Any]]:
    """List all registered organizers, volunteers, and mentors."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, key_prefix, role, active, department, created_by, created_at, last_login
            FROM users
            ORDER BY role ASC, name ASC
        """)
        return [dict(r) for r in cursor.fetchall()]

def create_user(name: str, custom_key: Optional[str], role: str, department: str, created_by: str) -> Tuple[Dict[str, Any], str]:
    """Create a new volunteer, mentor, or superadmin with a unique key."""
    if role not in ('superadmin', 'volunteer', 'mentor'):
        raise ValueError("Invalid role. Must be 'superadmin', 'volunteer', or 'mentor'.")
    name = name.strip()
    if not name:
        raise ValueError("User name cannot be empty.")

    if not custom_key or not custom_key.strip():
        prefix = 'VOL' if role == 'volunteer' else ('MNT' if role == 'mentor' else 'ADM')
        raw_key = f"{prefix}-{secrets.token_hex(4).upper()}"
    else:
        raw_key = custom_key.strip()

    k_hash = hash_key(raw_key)
    prefix = raw_key[:7] + '...' if len(raw_key) > 7 else raw_key
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (name, key_hash, key_prefix, role, active, department, created_by, created_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        """, (name, k_hash, prefix, role, department or '', created_by, now))
        new_id = cursor.lastrowid
        conn.commit()

    return {"id": new_id, "name": name, "role": role, "department": department, "key_prefix": prefix}, raw_key

def toggle_user_active(user_id: int, active: bool) -> bool:
    """Deactivate or activate an organizer/volunteer."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET active = ? WHERE id = ?", (1 if active else 0, user_id))
        if not active:
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0

# ================= TICKETS CRUD =================

def get_next_ticket_id() -> str:
    """Generate next sequential ticket ID (e.g. SIH-0006)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(id) as max_id FROM tickets;")
        row = cursor.fetchone()
        next_num = (row['max_id'] or 0) + 1
        return f"SIH-{next_num:04d}"

def check_device_cooldown(device_id: str, cooldown_seconds: int = 300) -> Tuple[bool, int]:
    """Check if device is rate-limited. Returns (can_submit, remaining_seconds)."""
    if not device_id:
        return True, 0
    now = datetime.now(timezone.utc)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT last_submitted FROM submission_cooldowns WHERE device_id = ?", (device_id,))
        row = cursor.fetchone()
        if not row:
            return True, 0
        try:
            last_time = datetime.fromisoformat(row['last_submitted'])
            diff = (now - last_time).total_seconds()
            if diff < cooldown_seconds:
                return False, int(cooldown_seconds - diff)
        except Exception:
            pass
    return True, 0

def update_device_cooldown(device_id: str):
    """Record current submission timestamp for rate limiting."""
    if not device_id:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO submission_cooldowns (device_id, last_submitted)
            VALUES (?, ?)
            ON CONFLICT(device_id) DO UPDATE SET last_submitted = excluded.last_submitted
        """, (device_id, now_iso))
        conn.commit()

# Registered Table-to-Team, Leader & Venue mapping for instant autofill.
# Add your actual hackathon table allocations here:
# Format: "table_number": {"team_name": "Team Name", "leader_name": "Leader Name", "venue": "Venue Name"}
KNOWN_TEAMS_MAP = {
    # Add your team allocations here later:
    # "1": {"team_name": "Team Name", "leader_name": "Leader Name", "venue": "Main Arena — Hall A"},
}

def create_ticket(team_name: str, team_no: str, category: str, issue: str, venue: str, priority: str = 'Normal', device_id: str = '', track: str = 'software', leader_name: str = '', photo: str = '') -> Dict[str, Any]:
    """Insert a new ticket with track, leader, and photo awareness."""
    ticket_id = get_next_ticket_id()
    now_iso = datetime.now(timezone.utc).isoformat()

    valid_priorities = ('Low', 'Normal', 'High', 'Critical')
    if priority not in valid_priorities:
        priority = 'Normal'

    track = track.lower().strip() if track else 'software'
    if track not in ('software', 'hardware'):
        track = 'software'

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tickets (
                ticket_id, timestamp, team_name, team_no, category, issue, venue,
                status, priority, remarks, last_updated, handled_by, handler_role, device_fingerprint, track, leader_name, photo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, '', ?, '', '', ?, ?, ?, ?)
        """, (ticket_id, now_iso, team_name.strip(), team_no.strip(), category.strip(),
              issue.strip(), venue.strip(), priority, now_iso, device_id, track, leader_name.strip(), photo.strip()))
        conn.commit()

    if device_id:
        update_device_cooldown(device_id)

    log_audit('Participant', 'participant', 'CREATE_TICKET', ticket_id, f"Created {ticket_id} for {team_name} ({team_no})")
    return get_ticket_by_id(ticket_id)

def get_ticket_by_id(ticket_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve full ticket details by ticket_id."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tickets WHERE ticket_id = ?", (ticket_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def lookup_team_by_table(table_str: str) -> Optional[Dict[str, str]]:
    """Look up team_name, venue, and leader_name by table number."""
    if not table_str:
        return None
    import re
    digits = re.findall(r'\d+', table_str)
    search_num = digits[0] if digits else table_str.strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT team_name, venue, leader_name FROM tickets
            WHERE team_no LIKE ? OR team_no LIKE ?
            ORDER BY timestamp DESC LIMIT 1
        """, (f"%{search_num}%", f"Table {search_num}"))
        row = cursor.fetchone()
        if row and row['team_name']:
            leader = row['leader_name'] if 'leader_name' in row.keys() and row['leader_name'] else KNOWN_TEAMS_MAP.get(search_num, {}).get("leader_name", "")
            return {
                "team_name": row['team_name'],
                "venue": row['venue'],
                "leader_name": leader
            }

    if search_num in KNOWN_TEAMS_MAP:
        k = KNOWN_TEAMS_MAP[search_num]
        return {
            "team_name": k["team_name"],
            "venue": k["venue"],
            "leader_name": k.get("leader_name", "")
        }
    return None

def lookup_table_by_team(team_str: str) -> Optional[Dict[str, str]]:
    """Look up table_no, venue, and leader_name by team name."""
    if not team_str or len(team_str.strip()) < 2:
        return None
    raw = team_str.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT team_no, venue, leader_name FROM tickets
            WHERE LOWER(team_name) LIKE ?
            ORDER BY timestamp DESC LIMIT 1
        """, (f"%{raw}%",))
        row = cursor.fetchone()
        if row and row['team_no']:
            leader = row['leader_name'] if 'leader_name' in row.keys() and row['leader_name'] else ''
            if not leader:
                for k, v in KNOWN_TEAMS_MAP.items():
                    if v['team_name'].lower() in raw or raw in v['team_name'].lower():
                        leader = v.get('leader_name', '')
                        break
            return {"team_no": row['team_no'], "venue": row['venue'], "leader_name": leader}

    for k, v in KNOWN_TEAMS_MAP.items():
        if v['team_name'].lower() in raw or raw in v['team_name'].lower():
            return {
                "team_no": f"Table {k}",
                "venue": v["venue"],
                "leader_name": v.get("leader_name", "")
            }
    return None

def lookup_by_leader(leader_str: str) -> Optional[Dict[str, str]]:
    """Look up table_no, team_name, and venue by leader name."""
    if not leader_str or len(leader_str.strip()) < 2:
        return None
    raw = leader_str.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT team_no, team_name, venue, leader_name FROM tickets
            WHERE LOWER(leader_name) LIKE ?
            ORDER BY timestamp DESC LIMIT 1
        """, (f"%{raw}%",))
        row = cursor.fetchone()
        if row and row['team_no']:
            return {
                "team_no": row['team_no'],
                "team_name": row['team_name'],
                "venue": row['venue'],
                "leader_name": row['leader_name']
            }

    for k, v in KNOWN_TEAMS_MAP.items():
        l_name = v.get("leader_name", "").lower()
        if l_name and (l_name in raw or raw in l_name):
            return {
                "team_no": f"Table {k}",
                "team_name": v["team_name"],
                "venue": v["venue"],
                "leader_name": v["leader_name"]
            }
    return None

def list_tickets(status: Optional[str] = None, venue: Optional[str] = None, category: Optional[str] = None,
                 priority: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Query tickets with flexible filtering and sorting (most recent first)."""
    query = "SELECT * FROM tickets WHERE 1=1"
    params = []

    if status and status.lower() != 'all':
        query += " AND status = ?"
        params.append(status.capitalize())
    if venue and venue.lower() != 'all':
        query += " AND venue LIKE ?"
        params.append(f"%{venue}%")
    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)
    if priority and priority.lower() != 'all':
        query += " AND priority = ?"
        params.append(priority.capitalize())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query += " AND (ticket_id LIKE ? OR team_name LIKE ? OR team_no LIKE ? OR issue LIKE ? OR remarks LIKE ? OR handled_by LIKE ?)"
        params.extend([term, term, term, term, term, term])

    query += " ORDER BY id DESC"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]

def update_ticket(ticket_id: str, actor_name: str, actor_role: str,
                  status: Optional[str] = None, remarks: Optional[str] = None,
                  handled_by: Optional[str] = None, priority: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Update ticket status, remarks, or assigned handler with audit logging."""
    existing = get_ticket_by_id(ticket_id)
    if not existing:
        return None

    updates = []
    params = []
    now_iso = datetime.now(timezone.utc).isoformat()

    if status and status in ('Pending', 'Ongoing', 'Solved', 'Escalated'):
        updates.append("status = ?")
        params.append(status)

    if remarks is not None:
        updates.append("remarks = ?")
        params.append(remarks.strip())

    if handled_by is not None:
        updates.append("handled_by = ?")
        params.append(handled_by.strip())
        updates.append("handler_role = ?")
        params.append(actor_role)

    if priority and priority in ('Low', 'Normal', 'High', 'Critical'):
        updates.append("priority = ?")
        params.append(priority)

    if not updates:
        return existing

    updates.append("last_updated = ?")
    params.append(now_iso)
    params.append(ticket_id)

    query = f"UPDATE tickets SET {', '.join(updates)} WHERE ticket_id = ?"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()

    changes = []
    if status and status != existing['status']:
        changes.append(f"status: {existing['status']} -> {status}")
    if handled_by and handled_by != existing['handled_by']:
        changes.append(f"handler: {handled_by}")
    if remarks and remarks != existing['remarks']:
        changes.append(f"remarks updated")

    log_audit(actor_name, actor_role, 'UPDATE_TICKET', ticket_id, ", ".join(changes) or "Ticket updated")
    return get_ticket_by_id(ticket_id)

# ================= AUDIT & STATS =================

def log_audit(actor_name: str, actor_role: str, action: str, target_id: str = '', details: str = ''):
    """Record an audit trail log."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, actor_name, actor_role, action, target_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now_iso, actor_name, actor_role, action, target_id, details))
        conn.commit()

def list_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent audit logs."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?
        """, (limit,))
        return [dict(r) for r in cursor.fetchall()]

def get_stats() -> Dict[str, Any]:
    """Calculate aggregated metrics for the dashboard."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Ongoing' THEN 1 ELSE 0 END) as ongoing,
                SUM(CASE WHEN status = 'Solved' THEN 1 ELSE 0 END) as solved,
                SUM(CASE WHEN priority = 'Critical' AND status != 'Solved' THEN 1 ELSE 0 END) as critical_active
            FROM tickets;
        """)
        counts = dict(cursor.fetchone())

        cursor.execute("""
            SELECT category, COUNT(*) as count 
            FROM tickets 
            GROUP BY category 
            ORDER BY count DESC;
        """)
        by_category = {r['category']: r['count'] for r in cursor.fetchall()}

        cursor.execute("""
            SELECT venue, COUNT(*) as count 
            FROM tickets 
            GROUP BY venue 
            ORDER BY count DESC;
        """)
        by_venue = {r['venue']: r['count'] for r in cursor.fetchall()}

        cursor.execute("""
            SELECT handled_by, COUNT(*) as count 
            FROM tickets 
            WHERE status = 'Solved' AND handled_by != '' 
            GROUP BY handled_by 
            ORDER BY count DESC LIMIT 5;
        """)
        leaderboard = [{ "name": r['handled_by'], "solved": r['count'] } for r in cursor.fetchall()]

        return {
            "total": counts['total'] or 0,
            "pending": counts['pending'] or 0,
            "ongoing": counts['ongoing'] or 0,
            "solved": counts['solved'] or 0,
            "critical_active": counts['critical_active'] or 0,
            "by_category": by_category,
            "by_venue": by_venue,
            "leaderboard": leaderboard
        }

if __name__ == '__main__':
    print("[DB] Initializing database...")
    init_db()
    stats = get_stats()
    print("[DB] Initialization complete. Current stats:", stats)
    users = list_users()
    print(f"[DB] Registered users count: {len(users)}")
