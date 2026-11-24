# 🚀 Smart India Hackathon (SIH) Support Desk 2.5

An interactive, high-performance, mobile-first floor helpdesk and issue-resolution platform built for the **Smart India Hackathon (SIH)**. Designed for rapid on-ground triage: participants report issues from their tables via mobile or laptop, while floor volunteers and tech mentors claim, triage, and resolve complaints in real time from an authenticated mobile command console.

---

## ✨ Features & Architecture

### 📱 Participant Portal (`index.html`)
- **Mobile-First Ergonomics**: Designed for iOS Safari and Android Chrome with thumb-friendly controls, 48px touch targets, and fixed bottom navigation.
- **Quiet Device Auto-Persistence**: Automatically saves `Team Name`, `Table Number`, and selected `Venue` in device `localStorage`. On subsequent scans or visits, details are pre-filled quietly without disruptive banners.
- **Selectable Venue Grid**: Physical locations (`Hall A`, `Hall B`, `Hall C`, `Hardware Lab`, `Stage Area`) are selected via interactive cards rather than typed, ensuring zero typos for floor volunteers.
- **Smart Cooldown Rate Limiting**: Displays dynamic button countdowns (*"Cooldown Active (2m 45s)"*) to prevent spam while allowing prompt escalation of urgent table issues.
- **Live Ticket Tracker**: Real-time 3-stage visual progress stepper (`Submitted` ➔ `Volunteer Dispatched` ➔ `Resolved`) with auto-polling and volunteer remarks updates.
- **Floor Guide with Live Desk Status**:
  - **Central Helpdesk** (Ground Floor Lobby &mdash; Open 24/7)
  - **Hardware Lab** (Room 104, 1st Floor &mdash; Walk-in with Team ID)
  - **5GHz Wi-Fi Credentials** with 1-tap password copy
  - **Power & Safety Emergency Protocol**

### 🛡️ Volunteer & Organizer Command Center (`admin.html`)
- **Robust Role-Based Access Control (RBAC)**:
  - **👑 Superadmin / Lead Organizer** (`SIH-OWNER-2026`): Full management privileges, team roster creation, key revocation, priority override, system audit trail, and CSV export.
  - **🏃 Floor Volunteer** (`VOL-ALEX-2026`, `VOL-PRIYA-2026`): 1-tap ticket claim, ongoing dispatch status, and quick resolution remarks.
  - **💻 Tech Mentor / Specialist** (`MNT-RAMESH-2026`, `MNT-SARAH-2026`): Specialized for software, hardware, IoT, and cloud issues.
- **1-Tap "Claim Ticket"**: Volunteers walking the floor can claim pending complaints in a single tap, immediately setting status to `Ongoing` and attaching their name to prevent duplicate volunteer dispatch.
- **1-Tap "Mark Solved" & Quick Remarks**: Resolving issues with pre-configured chips (*"Spike Guard Replaced"*, *"AP Rebooted"*, *"Spare ESP32 Issued"*, *"Resolved On-Site"*) eliminates typing on mobile keyboards.
- **Live Real-Time Push**: Built-in **Server-Sent Events (SSE)** instantly updates volunteer consoles with audio alert chimes when a new ticket is submitted.
- **Team Roster Management**: Superadmins can generate new volunteer and mentor access codes, copy keys, and deactivate/restore codes in real time.
- **CSV Data Export & Audit Logs**: 1-click export of all hackathon complaints and full chronological audit logs.

---

## 📁 Repository Structure

```text
├── server.py                  # Production native Python server (REST API, SSE, RBAC, static files)
├── db.py                      # Robust SQLite database module (WAL mode, migrations, sessions, audit)
├── test_system.py             # Automated end-to-end test suite (15 verification tests)
├── package.json               # Project scripts and configuration
├── data/
│   └── support_desk.db        # ACID SQLite database with WAL journal mode
├── images/                    # Official transparent SIH logos and assets
│   └── sih_logo_transparent.png
├── css/
│   ├── theme.css              # Design tokens (Teal, Amber, Warm Sand, Dark/Light mode tokens)
│   ├── layout.css             # App shell, headers, grid layouts, mobile bottom nav
│   └── components.css         # Reusable cards, venue grid, steppers, badges, modals, toasts
├── js/
│   ├── config.js              # Global configuration, venue options, role constants
│   ├── api.js                 # Unified Fetch REST client and Server-Sent Events subscriber
│   ├── audio.js               # Web Audio API alert synthesizer (zero audio file dependencies)
│   ├── ui-fx.js               # Dark/Light theme manager, toasts, modals, confetti
│   ├── participant.js         # Participant portal controller
│   └── admin.js               # Command center controller with RBAC
├── index.html                 # Participant Portal
└── admin.html                 # Organizer & Volunteer Command Center
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.8+ installed (zero external pip packages required &mdash; runs purely on the standard library!)

### 1. Launch the Server
```bash
python server.py
```
*(Or via npm: `npm start`)*

### 2. Access the Application
- 📋 **Participant Portal**: [http://localhost:8000](http://localhost:8000)
- 🛡️ **Volunteer / Admin Console**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- ⚡ **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 3. Run Automated Tests
```bash
python test_system.py
```

---

## 🔑 Default Access Keys for Setup

| Role | Name | Access Key |
| :--- | :--- | :--- |
| **Superadmin (Lead Organizer)** | Organizer Lead | `SIH-OWNER-2026` |
| **Floor Volunteer** | Floor Volunteer | `VOL-ALEX-2026` |
| **Tech Mentor** | Tech Mentor | `MNT-RAMESH-2026` |

---

## 📄 License
Restrictive Proprietary License. Copyright &copy; 2026 DhigveerrajuG. Developed by DhigveerrajuG for VDC, GITAM University Bengaluru. All Rights Reserved. Unauthorized copying, modification, distribution, or commercial exploitation is strictly prohibited. See [LICENSE](LICENSE) for details.
