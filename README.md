# 🚀 SIH Support Desk — On-Ground Helpdesk & Issue Resolution Portal

An interactive, animated, high-performance helpdesk and issue-reporting platform built for the **Smart India Hackathon (SIH)**. Designed for rapid on-ground triage: participants log complaints from their tables, while organizers and technical volunteers manage and resolve issues in real time through an authenticated command center.

---

## ✨ Features & Visual Highlights

- **Authentic Hackathon Theme**: Styled in warm sand/parchment (`#F0E0C1`) with rich deep peacock teal (`#007366`) and warm amber/gold accents (`#D97706` / `#F59E0B`).
- **Dynamic Animations & Effects**:
  - Floating ambient light orbs in the background.
  - Category selector cards with animated bounce, custom icons, and elevation shadows.
  - Buttons with interactive hover shimmer sweep, tactile click spring, and loading spinners.
  - **Confetti explosion** upon successful ticket dispatch!
  - **Live Ticket Tracker**: 3-step visual milestone stepper (`Received` ➔ `Volunteer Dispatched` ➔ `Resolved`).
  - Toast notifications system with slide-in physics and auto-dismiss progress bar.
  - Synthesized Web Audio UI sound effects (toggleable directly in the navbar).
- **Full-Stack Architecture**:
  - **Backend**: High-performance Node.js REST API with file-based persistence (`data/database.json`), Server-Sent Events (SSE) for live real-time push updates, rate-limiting, and honeypot bot filtering.
  - **Frontend**: Clean modern JavaScript/TypeScript-ready UI, zero external frontend framework dependencies, completely responsive across phones, tablets, and desktops.
  - **Google Apps Script Dual-Compatibility**: Seamlessly connects to either the local Node backend OR Google Sheets via Apps Script (`apps-script-backend.gs`).

---

## 📁 Project Structure

```text
├── package.json               # Node.js project configuration and scripts
├── server.js                  # Node.js Backend (REST API, SSE, Static Server)
├── data/
│   └── database.json          # Persistent JSON database (auto-seeded)
├── images/                    # Static assets & SIH logos
│   └── sih_logo_transparent.png
├── css/
│   └── theme.css              # Core theme variables, typography, keyframes & components
├── js/
│   ├── audio.js               # Web Audio API sound synthesizer
│   ├── ui-fx.js               # Toast system, confetti engine, helpers
│   └── api.js                 # Unified API client (Node backend, Apps Script, local demo)
├── index.html                 # Participant Portal (Report Issue, Live Tracker, Floor Guide)
├── admin.html                 # Admin Dashboard (Live Console, KPI Stats, Inspector Modal)
├── apps-script-backend.gs     # Google Apps Script Web App API
└── README.md                  # Documentation
```

---

## ⚡ Quick Start (Node.js Backend)

Ensure Node.js (v18+) is installed. No external packages required — the server uses built-in high-performance modules!

```bash
# 1. Start the server
npm start

# Or directly:
node server.js
```

Then open in your browser:

- 📋 **Participant Portal**: [http://localhost:8000](http://localhost:8000)
- 🛡️ **Admin Dashboard**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- ⚡ **Health API**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🔑 Access Keys (Pre-Seeded for Demo)

The system comes pre-configured with default keys:

| Role | Name | Access Key | Permissions |
| :--- | :--- | :--- | :--- |
| **Owner** | `Organizer Lead` | `SIH-OWNER-2026` | Full access, manage admins, generate keys |
| **Admin** | `Desk Volunteer Alex` | `SIH-ADMIN-2026` | View tickets, assign, update status & remarks |

*(Owners can generate additional keys and revoke keys directly inside the **Manage Admins** panel on the dashboard).*

---

## 🌐 Google Sheets & Apps Script Deployment (Optional)

If you prefer backing your data in Google Sheets:

1. Create a Google Spreadsheet with two tabs:
   - **`Complaints`**:
     ```text
     Timestamp | Ticket ID | Team Name | Table No | Category | Priority | Issue | Venue | Status | Remarks | Updated | Handled By
     ```
   - **`Admins`**:
     ```text
     Name | Key | Role | Active | Added By | Added On
     ```
2. In Google Sheets, navigate to **Extensions > Apps Script**.
3. Paste the contents of `apps-script-backend.gs`.
4. Deploy as **Web App** with:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Copy the deployment URL (`.../exec`) and set `window.SIH_CONFIG = { scriptUrl: 'YOUR_URL' }` or update `js/api.js`.

---

## 🛠️ REST API Reference (Node Backend)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/tickets` | Submit a new complaint (rate-limited per device) |
| `GET` | `/api/tickets` | List tickets (supports `?status=`, `?category=`, `?search=`) |
| `GET` | `/api/tickets/:id` | Lookup a single ticket by ticket ID (e.g. `SIH-0001`) |
| `PATCH` | `/api/tickets/:id` | Update ticket status, remarks, or assigned handler |
| `GET` | `/api/stats` | Aggregated analytics (totals, category breakdown) |
| `POST` | `/api/admin/login` | Authenticate admin key |
| `GET` | `/api/events` | **Server-Sent Events (SSE)** for real-time live push alerts |

---

## 📱 Mobile & Tablet Responsive

Both the participant issue form and the organizer dashboard are 100% responsive, optimized for on-the-go smartphones, tablets, and laptop screens during high-intensity hackathon operations.
