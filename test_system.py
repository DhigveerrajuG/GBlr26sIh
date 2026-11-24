"""
test_system.py - End-to-End System & RBAC Verification Suite
Tests all endpoints, security rules, and workflows for SIH Support Desk.
"""

import urllib.request
import urllib.error
import json
import threading
import time
import sys
from server import run

def http_req(url, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            resp_headers = dict(response.headers)
            content = response.read()
            try:
                res_data = json.loads(content.decode('utf-8'))
            except Exception:
                try:
                    res_data = content.decode('utf-8')
                except Exception:
                    res_data = content
            return status, res_data, resp_headers
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            res_data = json.loads(content.decode('utf-8'))
        except Exception:
            res_data = content.decode('utf-8')
        return e.code, res_data, dict(e.headers)

def run_tests():
    base_url = "http://127.0.0.1:8000"
    print("\n--- Starting SIH Support Desk Verification Suite ---")

    # 1. Health check
    status, res, _ = http_req(f"{base_url}/api/health")
    assert status == 200, f"Health check failed with {status}"
    assert res.get('status') == 'ok', "Health check returned unexpected payload"
    print("✅ 1. Health check passed:", res)

    # 2. Static files
    status, content, hdrs = http_req(f"{base_url}/index.html")
    assert status == 200 and "<!DOCTYPE html>" in content, "index.html serving failed"
    status, content, hdrs = http_req(f"{base_url}/report.html")
    assert status == 200 and "Report an Issue" in content, "report.html serving failed"
    status, content, hdrs = http_req(f"{base_url}/report")
    assert status == 200 and "Report an Issue" in content, "/report route failed"
    status, content, hdrs = http_req(f"{base_url}/admin.html")
    assert status == 200 and "Command Center" in content, "admin.html serving failed"
    status, content, hdrs = http_req(f"{base_url}/css/theme.css")
    assert status == 200 and "--teal-primary" in content, "theme.css serving failed"
    status, _, _ = http_req(f"{base_url}/favicon.ico")
    assert status == 200, f"Favicon endpoint failed with {status}"
    print("✅ 2. Static files (index.html, report.html, admin.html, theme.css, favicon.ico) served correctly")

    # 3. Public Ticket Submission
    test_dev_id = f"test-device-{int(time.time() * 1000)}"
    ticket_payload = {
        "teamName": "AutomatedTestTeam",
        "teamNo": "Table 99",
        "leaderName": "Alex Mercer",
        "category": "Hardware Components",
        "issue": "Verification test issue for GPIO pin inspection",
        "venue": "Hardware Lab 104 (Ground Floor)",
        "track": "hardware",
        "deviceId": test_dev_id
    }
    status, res, _ = http_req(f"{base_url}/api/tickets", method='POST', data=ticket_payload, headers={'X-Device-Id': test_dev_id})
    assert status == 201, f"Ticket submission failed with {status}: {res}"
    created_ticket = res['ticket']
    ticket_id = created_ticket['ticket_id']
    assert created_ticket.get('leader_name') == 'Alex Mercer', f"Leader name missing: {created_ticket}"
    print(f"✅ 3. Ticket submission passed: Created {ticket_id} (Leader: {created_ticket.get('leader_name')})")

    # 3b. Ticket Submission with Photo Attachment
    test_dev_id_photo = f"test-device-photo-{int(time.time() * 1000)}"
    fake_photo_data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP"
    photo_ticket_payload = {
        "teamName": "ByteForce",
        "teamNo": "Table 2",
        "leaderName": "Priya Patel",
        "category": "Power & Electricity",
        "issue": "Damaged power strip with sparked socket",
        "venue": "Main Arena — Hall A",
        "photo": fake_photo_data,
        "deviceId": test_dev_id_photo
    }
    status, res, _ = http_req(f"{base_url}/api/tickets", method='POST', data=photo_ticket_payload, headers={'X-Device-Id': test_dev_id_photo})
    assert status == 201, f"Photo ticket submission failed: {res}"
    assert res['ticket'].get('photo') == fake_photo_data, "Photo not saved in ticket"
    print(f"✅ 3b. Photo attachment ticket submission passed: Created {res['ticket']['ticket_id']} with photo")

    # 4. Cooldown Rate Limiting
    status, res, _ = http_req(f"{base_url}/api/tickets", method='POST', data=ticket_payload, headers={'X-Device-Id': test_dev_id})
    assert status == 429, f"Expected 429 cooldown, got {status}"
    print(f"✅ 4. Cooldown enforcement passed: Rate limited second submission with status 429")

    # 5. Public Ticket Lookup
    status, res, _ = http_req(f"{base_url}/api/tickets/{ticket_id}")
    assert status == 200 and res['ticket']['ticket_id'] == ticket_id
    print(f"✅ 5. Public ticket retrieval passed for {ticket_id}")

    # 5b. Table Autofill Lookup Endpoint
    status, res, _ = http_req(f"{base_url}/api/teams/lookup?table=14")
    assert status == 200 and res.get('found'), f"Table lookup failed: {res}"
    assert "CodeCrafters" in res['data']['team_name'], f"Expected CodeCrafters, got {res}"
    assert res['data'].get('leader_name') == "Rohan Gupta", f"Expected Rohan Gupta, got {res}"
    print(f"✅ 5b. Table autofill lookup passed: Table 14 -> {res['data']['team_name']}, Leader: {res['data']['leader_name']} ({res['data']['venue']})")

    # 5c. Team Name Autofill Lookup Endpoint
    status, res, _ = http_req(f"{base_url}/api/teams/lookup?team=CodeCrafters")
    assert status == 200 and res.get('found'), f"Team lookup failed: {res}"
    assert "14" in res['data']['team_no'], f"Expected Table 14, got {res}"
    assert res['data'].get('leader_name') == "Rohan Gupta", f"Expected Rohan Gupta, got {res}"
    print(f"✅ 5c. Team name autofill lookup passed: CodeCrafters -> {res['data']['team_no']}, Leader: {res['data']['leader_name']} ({res['data']['venue']})")

    # 5d. Leader Name Autofill Lookup Endpoint
    status, res, _ = http_req(f"{base_url}/api/teams/lookup?leader=Rohan%20Gupta")
    assert status == 200 and res.get('found'), f"Leader lookup failed: {res}"
    assert "CodeCrafters" in res['data']['team_name'], f"Expected CodeCrafters, got {res}"
    assert "14" in res['data']['team_no'], f"Expected Table 14, got {res}"
    print(f"✅ 5d. Leader autofill lookup passed: Rohan Gupta -> Table 14 ({res['data']['team_name']})")

    # 6. Authentication - Invalid Key
    status, res, _ = http_req(f"{base_url}/api/auth/login", method='POST', data={"key": "INVALID-KEY-XYZ"})
    assert status == 401, f"Expected 401 for invalid key, got {status}"
    print("✅ 6. Invalid key authentication correctly rejected (401)")

    # 7. Authentication - Floor Volunteer Login
    status, res, _ = http_req(f"{base_url}/api/auth/login", method='POST', data={"key": "VOL-ALEX-2026"})
    assert status == 200 and res.get('success'), "Volunteer login failed"
    vol_token = res['token']
    assert res['user']['role'] == 'volunteer'
    print(f"✅ 7. Floor Volunteer login passed (Alex, Role: {res['user']['role']})")

    # 8. Volunteer Claim & Update Ticket
    status, res, _ = http_req(
        f"{base_url}/api/tickets/{ticket_id}",
        method='PATCH',
        data={"status": "Ongoing", "handledBy": "Floor Volunteer Alex", "remarks": "Alex dispatched with spare board."},
        headers={"Authorization": f"Bearer {vol_token}"}
    )
    assert status == 200 and res['ticket']['status'] == 'Ongoing'
    print(f"✅ 8. Volunteer 1-tap claim & status update passed: {ticket_id} is now Ongoing")

    # 9. RBAC Restriction Check - Volunteer cannot access Superadmin Roster
    status, res, _ = http_req(
        f"{base_url}/api/admin/users",
        method='GET',
        headers={"Authorization": f"Bearer {vol_token}"}
    )
    assert status == 403, f"Expected 403 Forbidden for volunteer accessing admin users, got {status}"
    print("✅ 9. RBAC restriction enforced: Volunteer blocked from Superadmin user management (403)")

    # 10. Authentication - Superadmin Login
    status, res, _ = http_req(f"{base_url}/api/auth/login", method='POST', data={"key": "SIH-OWNER-2026"})
    assert status == 200
    admin_token = res['token']
    assert res['user']['role'] == 'superadmin'
    print("✅ 10. Superadmin login passed (Lead Organizer, Role: superadmin)")

    # 11. Superadmin User Creation
    new_user_data = {
        "name": "Mentor Ada",
        "role": "mentor",
        "department": "AI & Algorithm Lab"
    }
    status, res, _ = http_req(
        f"{base_url}/api/admin/users",
        method='POST',
        data=new_user_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert status == 201 and res.get('generated_key'), "Superadmin user creation failed"
    ada_key = res['generated_key']
    ada_id = res['user']['id']
    print(f"✅ 11. Superadmin created new Mentor (Ada, Key: {ada_key})")

    # 12. Mentor Login with Generated Key
    status, res, _ = http_req(f"{base_url}/api/auth/login", method='POST', data={"key": ada_key})
    assert status == 200 and res['user']['role'] == 'mentor'
    mentor_token = res['token']
    print("✅ 12. Newly created Mentor successfully authenticated with generated key")

    # 13. Mentor Resolves Ticket
    status, res, _ = http_req(
        f"{base_url}/api/tickets/{ticket_id}",
        method='PATCH',
        data={"status": "Solved", "handledBy": "Mentor Ada", "remarks": "Spare ESP32 module tested and handed over to table."},
        headers={"Authorization": f"Bearer {mentor_token}"}
    )
    assert status == 200 and res['ticket']['status'] == 'Solved'
    print(f"✅ 13. Mentor marked ticket {ticket_id} as Solved with resolution remarks")

    # 14. Superadmin CSV Export
    status, res, hdrs = http_req(
        f"{base_url}/api/export",
        method='GET',
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert status == 200 and "Ticket ID" in res and ticket_id in res
    print("✅ 14. CSV export verified: Data downloaded with proper CSV headers")

    # 15. Audit Trail Verification
    status, res, _ = http_req(
        f"{base_url}/api/admin/audit",
        method='GET',
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert status == 200 and len(res.get('logs', [])) > 0
    print(f"✅ 15. Audit trail verified: {len(res['logs'])} audit actions recorded")

    print("\n🎉 ALL 15 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n")

if __name__ == '__main__':
    # Start server in thread if not already running
    server_running = False
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1) as r:
            if r.status == 200:
                server_running = True
                print("Server already running on port 8000")
    except Exception:
        pass

    if not server_running:
        t = threading.Thread(target=run, daemon=True)
        t.start()
        time.sleep(1.5)
    try:
        run_tests()
    except Exception as e:
        print("❌ Test failed:", e)
        sys.exit(1)
