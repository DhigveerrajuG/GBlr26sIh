# SIH Support Desk

A lightweight, high-performance issue-reporting portal for on-ground SIH hackathon support. Participants submit complaints through `index.html`; organizers manage tickets in real time through `admin.html`. Data storage, concurrency locks, and authentication are powered by Google Apps Script and a linked Google Sheet.

---

## Project Structure

- `index.html` - Participant complaint portal with balanced 2-column quick-selection grids, digital ticket pass generation, and celebration confetti.
- `admin.html` - Authenticated organizer dashboard featuring SWR 0ms instant boot, background sync queue, audio chimes, status/venue filters, and live search.
- `apps-script-backend.gs` - Google Apps Script Web App API backend with chunked caching, lock-safe writes, and admin role management.
- `images/` - Logos and branding assets (`sih_logo_transparent.png`).

---

## Venues & Categories

### Venues
- 📚 **Library**
- 🚀 **Alpha Space**
- 🌌 **Gamma Space Square**
- ⚡ **Gamma Space**

### Issue Categories
- 📶 **Wi-Fi** (`Internet / Wi-Fi`)
- ⚡ **Electricity** (`Power / Electrical`)
- 💻 **Tech Support** (`Tech Support`)
- 🔌 **Hardware Components** (`Hardware Components`)
- ❓ **Other** (`Other`)

---

## How It Works

1. A participant enters their team name and table number, taps their category and venue from the balanced grid selectors, and describes the issue.
2. The frontend validates inputs and submits to the Apps Script Web App backend.
3. The backend safely locks the spreadsheet, generates an incremental ticket reference (e.g. `SIH-0001`), appends the record, and clears stale caches.
4. The participant receives an official Digital Support Ticket pass with their ticket reference and one-click copy button.
5. Organizers signed in to `admin.html` receive new tickets with optional audio alerts, filter by status or venue, search by team/table, and manage resolution statuses.

---

## Google Sheet Setup

Create a Google Spreadsheet with these two tabs and the exact header columns:

### `Complaints` tab:
```text
Timestamp | Ticket ID | Team Name | Table No | Category | Reserved | Issue | Venue | Status | Remarks | Updated | Handled By
```

### `Admins` tab:
```text
Name | Key | Role | Active | Added By | Added On
```

Add at least one initial Owner to `Admins`:
```text
Organizer Name | YOUR_OWNER_KEY | Owner | Yes | Setup | 2026-01-01
```

---

## Apps Script Deployment

1. In your Google Spreadsheet, navigate to **Extensions > Apps Script**.
2. Replace all script code with the contents of `apps-script-backend.gs`.
3. Verify that `SHARED_SECRET` in `apps-script-backend.gs` matches `SHARED_SECRET` in `index.html`.
4. Click **Deploy > New deployment**:
   - **Type**: Web app
   - **Execute as**: Me
   - **Who has access**: Anyone
5. Copy the generated Web App URL (`.../exec`).
6. Paste the URL into `SCRIPT_URL` in both `index.html` and `admin.html`.

---

## Running Locally

To run locally with Python:

```bash
python -m http.server 8080
```

Then visit:
- Participant Portal: `http://localhost:8080/index.html`
- Organizer Dashboard: `http://localhost:8080/admin.html`

---

## Deploying to GitHub Pages

You can host the frontend for free directly on GitHub Pages:
1. In your repository on GitHub, navigate to **Settings** → **Pages**.
2. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (or your feature branch), folder `/ (root)`
3. Click **Save**.

Your portal will be live at:
- **Participant Portal:** `https://<username>.github.io/<repo-name>/`
- **Organizer Dashboard:** `https://<username>.github.io/<repo-name>/admin.html`

---

## 🤝 Contributors & Acknowledgements

- **[DhigveerrajuG](https://github.com/DhigveerrajuG)** — Project Creator & Lead Developer
- **[Antigravity](https://deepmind.google/) (Google DeepMind)** — AI Pair Programmer & Code Assistant
- **[Claude](https://www.anthropic.com/claude)** (Anthropic) — AI Pair Programmer & Code Assistant


