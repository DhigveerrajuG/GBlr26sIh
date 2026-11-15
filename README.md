# 🚀 Smart India Hackathon (SIH) Support Desk

An interactive, high-performance, mobile-first floor helpdesk and issue-resolution platform built for the **Smart India Hackathon (SIH)**. Designed for rapid on-ground triage: participants report issues from their tables via mobile or laptop, while organizers and floor volunteers claim, triage, and resolve complaints in real time from an authenticated mobile command console.

---

## ✨ Features & Architecture

### 📱 Participant Portal (`index.html`)
- **Mobile-First Ergonomics**: Designed for iOS Safari and Android Chrome with thumb-friendly controls, 48px touch targets, and fixed bottom navigation.
- **Quiet Device Auto-Persistence**: Automatically saves `Team Name`, `Table Number`, and selected `Venue` in device `localStorage`. On subsequent QR code scans from the same phone, details are pre-filled quietly without any disruptive banners.
- **Selectable Venue Grid**: Physical locations (`Hall A`, `Hall B`, `Hall C`, `Hardware Lab`, `Stage Area`) are selected via interactive cards rather than typed, ensuring zero typos for floor volunteers.
- **Smart Cooldown Rate Limiting**: Displays dynamic button countdowns (*"You can submit another application in 2m 45s"*) to prevent spam while allowing prompt escalation of urgent table issues.
- **Live Ticket Tracker**: Real-time 3-stage visual progress stepper (`Pending` ➔ `Ongoing` ➔ `Solved`) with auto-polling and volunteer remarks updates.
- **Floor Guide with Live Desk Status**:
  - **Central Helpdesk** (Ground Floor Lobby &mdash; Open 24/7)
  - **Hardware Lab** (Room 104, 1st Floor &mdash; Walk-in with Team ID)
  - **5GHz Wi-Fi Credentials** with 1-tap password copy
  - **Power & Safety Emergency Protocol**

### 🛡️ Volunteer & Admin Command Center (`admin.html`)
- **Individual Volunteer Access Codes**: Every volunteer and organizer is issued their own unique access code (e.g. `VOL-ALEX`, `VOL-PRIYA`, `SIH-OWNER-2026`).
- **1-Tap "Claim Ticket"**: Volunteers walking the floor can claim pending complaints in a single tap, which immediately sets the status to `Ongoing` and attaches their name to prevent duplicate volunteer dispatch.
- **1-Tap "Mark Solved" & Quick Remarks**: Resolving issues with pre-configured chips (*"Spike Guard Replaced"*, *"Wi-Fi AP Rebooted"*, *"Resolved On-Site"*) eliminates typing on mobile keyboards.
- **Live Real-Time Push**: Built-in **Server-Sent Events (SSE)** instantly updates volunteer consoles and sounds an audible alert chime when a new ticket is submitted.
- **Volunteer Management Console**: Superadmins (Owners) can generate new volunteer access codes, copy sharing links, and deactivate/restore access codes in real time.
- **CSV Data Export**: 1-click export of all hackathon complaints, timestamps, venues, categories, volunteer handlers, and resolution remarks.

---

## 📁 Repository Structure

```text
├── package.json               # Node.js dependencies, scripts and metadata
├── server.js                  # Production Node.js REST API & SSE Server
├── data/
│   └── database.json          # Persistent JSON database (tickets & volunteer roster)
├── images/                    # Official transparent SIH logos and assets
│   └── sih_logo_transparent.png
├── css/
│   └── theme.css              # Theme tokens (Warm Sand #F0E0C1, Peacock Teal #007366), typography, animations
├── js/
│   ├── api.js                 # Production API adapter (Node.js REST backend & Google Apps Script)
│   ├── audio.js               # Audio synthesis engine (volunteer chimes & alerts)
│   └── ui-fx.js               # Accessible SVG toasts, modals, and confetti animations
├── index.html                 # Participant Portal (Report Issue, Live Tracker, Floor Guide)
├── admin.html                 # Organizer & Volunteer Command Center
├── apps-script-backend.gs     # Optional Google Sheets Apps Script Web App fallback
└── README.md                  # Documentation
```

---

## ⚡ Quick Start (Node.js Backend)

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- Zero external package dependencies &mdash; the backend runs entirely on standard native Node.js modules for maximum performance and security.

### 1. Start the Server
```bash
# Clone the repository
git clone https://github.com/DhigveerrajuG/GBlr26sIh.git
cd GBlr26sIh

# Start the application
npm start
```
*(Or directly with Node: `node server.js`)*

### 2. Access the Application
- 📋 **Participant Portal**: [http://localhost:8000](http://localhost:8000)
- 🛡️ **Volunteer / Admin Console**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- ⚡ **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🔒 Security & Volunteer Access Management

Access to the Admin Console is protected by role-based authentication.

### Environment Configuration
You can customize sensitive parameters via environment variables when launching the server:

```bash
# Optional environment variables
PORT=8000
OWNER_KEY="YOUR-SECRET-OWNER-KEY"
SHARED_SECRET="YOUR-INTERNAL-SHARED-SECRET"
```

### Volunteer Onboarding Workflow:
1. The **Lead Organizer (Owner)** logs in using the master access code.
2. Click **Manage Volunteers** in the top navigation.
3. Enter the volunteer's name and an optional custom code (e.g. `VOL-SARAH`) or click **Create Volunteer Code** to auto-generate a secure key.
4. Tap **Copy** next to their code and send it privately to the volunteer via WhatsApp or SMS.
5. When the volunteer logs in on their mobile device, their name is saved in `sessionStorage` and automatically assigned whenever they tap **Claim Ticket** on the floor.

---

## 🌐 Google Sheets Integration (Optional Cloud Backup)

If your organizing team prefers backing up tickets directly to Google Sheets:

1. Create a Google Spreadsheet with two sheets:
   - **`Complaints`**: `Timestamp | Ticket ID | Team Name | Table No | Category | Priority | Issue | Venue | Status | Remarks | Updated | Handled By`
   - **`Admins`**: `Name | Key | Role | Active | Added By | Added On`
2. Open **Extensions > Apps Script** in Google Sheets.
3. Paste the contents of [`apps-script-backend.gs`](apps-script-backend.gs).
4. Click **Deploy > New Deployment** as a **Web App** with:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Configure `window.SIH_CONFIG = { scriptUrl: "YOUR_DEPLOYED_URL" }` in your deployment.

---

## 🛠️ REST API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/tickets` | Submit a complaint (validates required fields & applies 3m device cooldown) |
| `GET` | `/api/tickets` | Query tickets (filters: `?status=pending|ongoing|solved`, `?search=`, `?category=`) |
| `GET` | `/api/tickets/:id` | Fetch live details and volunteer remarks for a ticket ID |
| `PATCH`| `/api/tickets/:id` | Update ticket status (`Pending`, `Ongoing`, `Solved`), volunteer remarks, or handler |
| `POST` | `/api/admin/login` | Authenticate an organizer or volunteer access code |
| `GET` | `/api/events` | **Server-Sent Events (SSE)** real-time push stream for ticket arrival & status changes |
| `GET` | `/api/stats` | Aggregated metrics for live hall dashboard |

---

## 📄 License
Designed for Smart India Hackathon (SIH) floor logistics and team support operations.
