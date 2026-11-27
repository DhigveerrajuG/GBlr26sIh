# SIH Support Desk

Real-time floor helpdesk and issue-resolution platform for Smart India Hackathon (SIH).

**Venture Development Centre**, GITAM University Bengaluru.

---

## Overview

A lightweight, zero-dependency floor support platform designed for high-density hackathons. Participants submit table issues with photo evidence and track resolution status in real time. Floor volunteers and organizers triage, claim, and resolve tickets from an authenticated mobile command console.

### Key Capabilities
- **GITAM Brand Theme**: Visual identity built on the official **GITAM University logo & brand guidelines** (Primary GITAM Green `#007366` and Antique Beige `#F4E4C9` with clean, accessible light surfaces).
- **Participant Portal (`index.html`, `report.html`)**:
  - Instant ticket reporting with optional photo/screenshot attachment.
  - 3-way autofill across Table Number, Team Name, and Team Leader.
  - Live ticket status tracking and cooldown rate-limiting.
- **Organizer Command Center (`admin.html`)**:
  - Live ticket queue with real-time SSE updates and audio alerts.
  - 1-tap ticket claim and resolution with preset remarks.
  - Role-based access control (Superadmin, Volunteer, Tech Mentor).
  - Hall problem heatmap and critical cluster outage alerts (>7 teams reporting similar issues).
  - Team roster access key management and CSV export.
- **Pure Standard Library**: Runs on Python 3.8+ with zero external packages (`http.server`, `sqlite3` WAL mode).

---

## Quick Start

### 1. Run the Server
```bash
python server.py
```

### 2. Access Portals
- **Participant Portal**: [http://localhost:8000](http://localhost:8000)
- **Report Issue**: [http://localhost:8000/report.html](http://localhost:8000/report.html)
- **Command Center**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 3. Run Verification Tests
```bash
python test_system.py
```

---

## Default Access Keys

| Role | Access Key | Permissions |
| :--- | :--- | :--- |
| **Superadmin (Lead Organizer)** | `SIH-OWNER-2026` | Full access, roster management, CSV export, audit trail |
| **Floor Volunteer** | `VOL-ALEX-2026` | Claim tickets, update status, add resolution notes |
| **Tech Mentor** | `MNT-RAMESH-2026` | Claim tickets, resolve technical and hardware issues |

---

## License

Restrictive Proprietary License. Copyright &copy; 2026 DhigveerrajuG. Venture Development Centre, GITAM University Bengaluru. All Rights Reserved. See [LICENSE](LICENSE) for details.
