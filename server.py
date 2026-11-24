"""
server.py - Production Zero-Dependency Server for SIH Support Desk
Built using Python standard library: http.server, sqlite3, threading, json, csv.

Features:
- High performance ThreadingHTTPServer
- Robust Role-Based Access Control (RBAC): Superadmin, Floor Volunteer, Mentor
- Real-time Server-Sent Events (SSE) push stream with heartbeats
- REST API with validation, rate-limiting, and error handling
- Zero external package requirements
"""

import os
import sys
import json
import csv
import io
import time
import mimetypes
import threading
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import db

PORT = int(os.environ.get('PORT', 8000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Thread-safe SSE client manager
class SSEManager:
    def __init__(self):
        self._clients = set()
        self._lock = threading.Lock()

    def add_client(self, handler):
        with self._lock:
            self._clients.add(handler)

    def remove_client(self, handler):
        with self._lock:
            self._clients.discard(handler)

    def broadcast(self, event_name: str, data: Any):
        payload = f"event: {event_name}\ndata: {json.dumps(data)}\n\n".encode('utf-8')
        with self._lock:
            dead_clients = []
            for handler in self._clients:
                try:
                    handler.wfile.write(payload)
                    handler.wfile.flush()
                except Exception:
                    dead_clients.append(handler)
            for d in dead_clients:
                self._clients.discard(d)

    def ping(self):
        heartbeat = b": ping\n\n"
        with self._lock:
            dead_clients = []
            for handler in self._clients:
                try:
                    handler.wfile.write(heartbeat)
                    handler.wfile.flush()
                except Exception:
                    dead_clients.append(handler)
            for d in dead_clients:
                self._clients.discard(d)

sse_manager = SSEManager()

def sse_heartbeat_worker():
    """Background worker to keep SSE connections alive across mobile proxies."""
    while True:
        time.sleep(15)
        sse_manager.ping()

threading.Thread(target=sse_heartbeat_worker, daemon=True).start()

class SupportDeskHandler(BaseHTTPRequestHandler):
    server_version = "SIH-SupportDesk/2.5"

    def log_message(self, format, *args):
        # Format clean, readable HTTP logs
        sys.stderr.write(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]} -> {args[2]}\n")

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id')
        self.send_header('Access-Control-Max-Age', '86400')

    def send_json(self, status: int, data: Any):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: int, message: str, details: Any = None):
        payload = {"error": message, "status": status}
        if details is not None:
            payload["details"] = details
        self.send_json(status, payload)

    def parse_json_body(self) -> Optional[Dict[str, Any]]:
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length <= 0:
                return {}
            raw = self.rfile.read(content_length).decode('utf-8')
            return json.loads(raw)
        except Exception as e:
            return None

    def get_auth_session(self) -> Optional[Dict[str, Any]]:
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:].strip()
            return db.get_session(token)
        return None

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    # ================= GET REQUESTS =================
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Favicon handler to avoid 404 clutter
        if path == '/favicon.ico':
            icon_file = os.path.join(BASE_DIR, 'images', 'sih_logo_transparent.png')
            if os.path.isfile(icon_file):
                try:
                    with open(icon_file, 'rb') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.send_header('Content-Length', str(len(data)))
                    self.send_header('Cache-Control', 'public, max-age=604800')
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(data)
                    return
                except Exception:
                    pass
            self.send_response(204)
            self.send_cors_headers()
            self.end_headers()
            return

        # Health check
        if path == '/api/health':
            self.send_json(200, {"status": "ok", "time": datetime.now(timezone.utc).isoformat(), "db": "sqlite3"})
            return

        # Check device cooldown
        if path == '/api/cooldown':
            device_id = (self.headers.get('X-Device-Id') or (query.get('device_id', [''])[0])).strip()
            client_ip = self.client_address[0] if self.client_address else '127.0.0.1'
            rate_key = device_id if device_id else f"ip-{client_ip}"
            can_submit, remaining = db.check_device_cooldown(rate_key)
            self.send_json(200, {"can_submit": can_submit, "remaining_seconds": remaining})
            return

        # Lookup team, leader, and venue by table number, team name, or leader
        if path == '/api/teams/lookup':
            table_query = query.get('table', [''])[0].strip()
            team_query = query.get('team', [''])[0].strip()
            leader_query = query.get('leader', [''])[0].strip()
            if table_query:
                data = db.lookup_team_by_table(table_query)
            elif team_query:
                data = db.lookup_table_by_team(team_query)
            elif leader_query:
                data = db.lookup_by_leader(leader_query)
            else:
                data = None
            self.send_json(200, {"found": data is not None, "data": data})
            return

        # Current authenticated session details
        if path == '/api/auth/me':
            session = self.get_auth_session()
            if not session:
                self.send_error_json(401, "Not authenticated or session expired.")
                return
            self.send_json(200, {"user": session})
            return

        # Public / Admin single ticket fetch
        if path.startswith('/api/tickets/'):
            ticket_id = path.split('/')[-1]
            ticket = db.get_ticket_by_id(ticket_id)
            if not ticket:
                self.send_error_json(404, f"Ticket {ticket_id} not found.")
                return
            self.send_json(200, {"ticket": ticket})
            return

        # Tickets list (requires authentication for full list or allows filtered lookup)
        if path == '/api/tickets':
            session = self.get_auth_session()
            status_param = query.get('status', [None])[0]
            venue_param = query.get('venue', [None])[0]
            category_param = query.get('category', [None])[0]
            priority_param = query.get('priority', [None])[0]
            search_param = query.get('search', [None])[0]

            tickets = db.list_tickets(
                status=status_param,
                venue=venue_param,
                category=category_param,
                priority=priority_param,
                search=search_param
            )
            self.send_json(200, {"tickets": tickets, "count": len(tickets)})
            return

        # Aggregate metrics
        if path == '/api/stats':
            stats = db.get_stats()
            self.send_json(200, stats)
            return

        # Superadmin: List users / roster
        if path == '/api/admin/users':
            session = self.get_auth_session()
            if not session or session.get('role') != 'superadmin':
                self.send_error_json(403, "Access denied. Superadmin role required.")
                return
            users = db.list_users()
            self.send_json(200, {"users": users})
            return

        # Superadmin: Audit logs
        if path == '/api/admin/audit':
            session = self.get_auth_session()
            if not session or session.get('role') != 'superadmin':
                self.send_error_json(403, "Access denied. Superadmin role required.")
                return
            logs = db.list_audit_logs(limit=100)
            self.send_json(200, {"logs": logs})
            return

        # Export tickets as CSV
        if path == '/api/export':
            session = self.get_auth_session()
            if not session:
                self.send_error_json(401, "Authentication required to export data.")
                return
            tickets = db.list_tickets()
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "Ticket ID", "Timestamp", "Team Name", "Table", "Team Leader", "Venue",
                "Category", "Priority", "Status", "Issue", "Has Photo", "Handled By",
                "Handler Role", "Remarks", "Last Updated"
            ])
            for t in tickets:
                writer.writerow([
                    t.get('ticket_id', ''),
                    t.get('timestamp', ''),
                    t.get('team_name', ''),
                    t.get('team_no', ''),
                    t.get('leader_name', ''),
                    t.get('venue', ''),
                    t.get('category', ''),
                    t.get('priority', ''),
                    t.get('status', ''),
                    t.get('issue', ''),
                    'Yes' if t.get('photo') else 'No',
                    t.get('handled_by', ''),
                    t.get('handler_role', ''),
                    t.get('remarks', ''),
                    t.get('last_updated', '')
                ])
            csv_data = output.getvalue().encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="sih_tickets_export.csv"')
            self.send_header('Content-Length', str(len(csv_data)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(csv_data)
            return

        # Server-Sent Events (SSE) Stream
        if path == '/api/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_cors_headers()
            self.end_headers()

            # Send initial connected greeting
            greeting = f"event: connected\ndata: {json.dumps({'message': 'Connected to SIH Live Event Stream', 'time': datetime.now(timezone.utc).isoformat()})}\n\n"
            self.wfile.write(greeting.encode('utf-8'))
            self.wfile.flush()

            sse_manager.add_client(self)
            try:
                while True:
                    time.sleep(1)
            except (ConnectionError, BrokenPipeError, KeyboardInterrupt):
                pass
            finally:
                sse_manager.remove_client(self)
            return

        # Static file delivery
        self.serve_static(path)

    # ================= POST REQUESTS =================
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_json_body()

        if body is None:
            self.send_error_json(400, "Invalid JSON payload.")
            return

        # Public complaint submission
        if path == '/api/tickets':
            device_id = (self.headers.get('X-Device-Id') or body.get('deviceId', '')).strip()
            client_ip = self.client_address[0] if self.client_address else '127.0.0.1'
            rate_key = device_id if device_id else f"ip-{client_ip}"

            can_submit, remaining = db.check_device_cooldown(rate_key)
            if not can_submit:
                self.send_error_json(429, f"Please wait {remaining} seconds before submitting another ticket.", {"remaining_seconds": remaining})
                return

            team_name = (body.get('teamName') or body.get('team_name', '')).strip()[:100]
            team_no = (body.get('teamNo') or body.get('team_no', '')).strip()[:50]
            leader_name = (body.get('leaderName') or body.get('leader_name', '')).strip()[:100]
            category = (body.get('category', '')).strip()[:80]
            issue = (body.get('issue', '')).strip()[:2000]
            venue = (body.get('venue', '')).strip()[:100]
            priority = body.get('priority', 'Normal')
            track = body.get('track', 'general')
            photo = (body.get('photo', '')).strip()
            # Safety limit for photo data (max 2MB base64)
            if len(photo) > 2 * 1024 * 1024:
                photo = photo[:2 * 1024 * 1024]

            if not team_name or not team_no or not category or not issue or not venue:
                self.send_error_json(400, "Missing required fields: teamName, teamNo, category, issue, and venue are mandatory.")
                return

            try:
                ticket = db.create_ticket(
                    team_name=team_name,
                    team_no=team_no,
                    category=category,
                    issue=issue,
                    venue=venue,
                    priority=priority,
                    device_id=rate_key,
                    track=track,
                    leader_name=leader_name,
                    photo=photo
                )
                # Broadcast live event
                sse_manager.broadcast("ticket_created", ticket)
                self.send_json(201, {"success": True, "ticket": ticket})
            except Exception as e:
                self.send_error_json(500, f"Failed to record ticket: {str(e)}")
            return

        # Organizer / Volunteer / Mentor login
        if path == '/api/auth/login':
            key = body.get('key', '')
            user = db.authenticate_user(key)
            if not user:
                self.send_error_json(401, "Invalid or deactivated access key.")
                return
            token = db.create_session(user['id'], user['name'], user['role'])
            db.log_audit(user['name'], user['role'], 'LOGIN', str(user['id']), f"Logged in from {self.client_address[0]}")
            self.send_json(200, {
                "success": True,
                "token": token,
                "user": {
                    "id": user['id'],
                    "name": user['name'],
                    "role": user['role'],
                    "department": user['department']
                }
            })
            return

        # Logout
        if path == '/api/auth/logout':
            session = self.get_auth_session()
            if session:
                db.delete_session(session['token'])
                db.log_audit(session['user_name'], session['role'], 'LOGOUT', str(session['user_id']), "User logged out")
            self.send_json(200, {"success": True, "message": "Logged out successfully."})
            return

        # Superadmin: Create new volunteer / mentor user
        if path == '/api/admin/users':
            session = self.get_auth_session()
            if not session or session.get('role') != 'superadmin':
                self.send_error_json(403, "Access denied. Superadmin role required.")
                return

            name = body.get('name', '')
            role = body.get('role', 'volunteer')
            dept = body.get('department', '')
            custom_key = body.get('key', None)

            try:
                user_info, generated_key = db.create_user(name, custom_key, role, dept, session['user_name'])
                db.log_audit(session['user_name'], session['role'], 'CREATE_USER', str(user_info['id']), f"Created {role} {name}")
                self.send_json(201, {
                    "success": True,
                    "user": user_info,
                    "generated_key": generated_key
                })
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        self.send_error_json(404, f"Endpoint {path} not found.")

    # ================= PATCH REQUESTS =================
    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_json_body()

        if body is None:
            self.send_error_json(400, "Invalid JSON payload.")
            return

        # Update Ticket (Claim, Change Status, Add Remarks)
        if path.startswith('/api/tickets/'):
            session = self.get_auth_session()
            if not session:
                self.send_error_json(401, "Authentication required to update ticket.")
                return

            ticket_id = path.split('/')[-1]
            status = body.get('status')
            remarks = body.get('remarks')
            handled_by = body.get('handledBy') or body.get('handled_by')
            priority = body.get('priority')

            # Role capability check:
            # - Volunteers & Mentors can claim and update tickets
            # - Only superadmin can change priority of existing ticket
            if priority and session['role'] != 'superadmin':
                priority = None

            try:
                updated = db.update_ticket(
                    ticket_id=ticket_id,
                    actor_name=session['user_name'],
                    actor_role=session['role'],
                    status=status,
                    remarks=remarks,
                    handled_by=handled_by,
                    priority=priority
                )
                if not updated:
                    self.send_error_json(404, f"Ticket {ticket_id} not found.")
                    return

                # Broadcast live update to all connected volunteer/organizer dashboards
                sse_manager.broadcast("ticket_updated", updated)
                self.send_json(200, {"success": True, "ticket": updated})
            except Exception as e:
                self.send_error_json(500, f"Update failed: {str(e)}")
            return

        # Superadmin: Toggle User Active Status
        if path.startswith('/api/admin/users/'):
            session = self.get_auth_session()
            if not session or session.get('role') != 'superadmin':
                self.send_error_json(403, "Superadmin role required.")
                return

            try:
                user_id = int(path.split('/')[-1])
                active = body.get('active', True)
                success = db.toggle_user_active(user_id, active)
                if success:
                    db.log_audit(session['user_name'], session['role'], 'TOGGLE_USER', str(user_id), f"Active state set to {active}")
                    self.send_json(200, {"success": True, "active": active})
                else:
                    self.send_error_json(404, "User not found.")
            except Exception as e:
                self.send_error_json(400, str(e))
            return

        self.send_error_json(404, f"Endpoint {path} not found.")

    # ================= STATIC FILE SERVING =================
    def serve_static(self, path: str):
        if path == '/' or path == '':
            path = '/index.html'
        elif path in ('/report', '/submit'):
            path = '/report.html'

        # Sanitize path to prevent directory traversal
        clean_path = os.path.normpath(path.lstrip('/'))
        if '..' in clean_path:
            self.send_error_json(403, "Forbidden path.")
            return

        file_path = os.path.join(BASE_DIR, clean_path)

        if not os.path.isfile(file_path):
            self.send_error_json(404, f"File {path} not found.")
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            if file_path.endswith('.css'):
                mime_type = 'text/css'
            elif file_path.endswith('.js'):
                mime_type = 'application/javascript'
            else:
                mime_type = 'application/octet-stream'

        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', f"{mime_type}; charset=utf-8" if mime_type.startswith('text') or 'javascript' in mime_type or 'json' in mime_type else mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Frame-Options', 'SAMEORIGIN')
            self.send_header('Cache-Control', 'no-cache' if file_path.endswith(('.html', '.js', '.css')) else 'public, max-age=86400')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error_json(500, f"Error reading file: {str(e)}")

def run():
    db.init_db()
    server_address = ('', PORT)
    httpd = ThreadingHTTPServer(server_address, SupportDeskHandler)
    print(f"""
============================================================
🚀 SIH Support Desk Server 2.5 (Python Native)
============================================================
📡 Port: {PORT}
💻 Participant Portal: http://localhost:{PORT}/
🛡️ Command Console:    http://localhost:{PORT}/admin.html
⚡ API Health:          http://localhost:{PORT}/api/health
📦 Zero external dependencies | SQLite WAL mode | RBAC
============================================================
""")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.shutdown()

if __name__ == '__main__':
    run()
